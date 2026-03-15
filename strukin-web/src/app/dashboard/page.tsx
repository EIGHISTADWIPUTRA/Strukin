"use client";

import { useEffect, useState, useCallback } from "react";
import {
  PaginatedTransactions,
  TransactionOut,
  CategoryOut,
  Profile,
  OCRResponse,
} from "@/types/api";
import { apiGet, apiPost, apiPut, apiDelete, apiGetBlob, getAccessToken } from "@/lib/api";
import { getProfile } from "@/lib/profile";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Upload, Loader2, X, Check, Pencil, Trash2, Receipt } from "lucide-react";

function formatIdr(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function useTransactions() {
  const [data, setData] = useState<PaginatedTransactions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await apiGet<PaginatedTransactions>("/api/v1/transactions?page=1&size=100");
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat transaksi");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return { data, loading, error, refresh };
}

function useCategories() {
  const [data, setData] = useState<CategoryOut[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await apiGet<CategoryOut[]>("/api/v1/categories");
        if (!cancelled) setData(res ?? []);
      } catch {
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return { data, loading };
}

function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, []);
  return { profile, loading };
}

export default function DashboardPage() {
  const { data: txData, loading: txLoading, refresh } = useTransactions();
  const { data: categories } = useCategories();
  const { profile } = useProfile();
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [editTx, setEditTx] = useState<TransactionOut | null>(null);
  const [editForm, setEditForm] = useState({ merchant_name: "", amount: "", transaction_date: "", category_id: "" });
  const [editLoading, setEditLoading] = useState(false);

  const [deleteTx, setDeleteTx] = useState<TransactionOut | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const transactions = txData?.items ?? [];
  const totalCount = txData?.total ?? 0;
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const monthTransactions = transactions.filter((t) => {
    const d = t.transaction_date;
    if (!d) return false;
    const dt = new Date(d);
    return dt.getMonth() === thisMonth && dt.getFullYear() === thisYear;
  });
  const totalMonth = monthTransactions.reduce((s, t) => s + (t.amount ?? 0), 0);
  const budget = profile?.monthly_budget ?? 0;
  const remaining = Math.max(0, budget - totalMonth);
  const budgetPercent = budget > 0 ? Math.min(100, (remaining / budget) * 100) : 0;

  const last7Days: { date: string; amount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayTotal = transactions
      .filter((t) => t.transaction_date === dateStr)
      .reduce((s, t) => s + (t.amount ?? 0), 0);
    last7Days.push({ date: dateStr.slice(5), amount: dayTotal });
  }

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const byCategory: Record<string, number> = {};
  monthTransactions.forEach((t) => {
    const key = t.category_id ?? "Lainnya";
    const name = key === "Lainnya" ? "Lainnya" : categoryMap.get(key)?.name ?? key;
    byCategory[name] = (byCategory[name] ?? 0) + (t.amount ?? 0);
  });
  const donutData = Object.entries(byCategory).map(([name, value]) => ({ name, value }));

  const handleOcrSubmit = async () => {
    if (!ocrFile) return;
    setOcrLoading(true);
    setOcrError(null);
    try {
      const form = new FormData();
      form.append("file", ocrFile);
      const res = await apiPost<OCRResponse>("/api/v1/ocr/process", form);
      setOcrResult(res);
      setOcrFile(null);
      await refresh();

      if (res.needs_review) {
        const savedTx = (txData?.items ?? []).find((t) => t.id === res.transaction_id)
          ?? {
            id: res.transaction_id,
            user_id: "",
            category_id: res.category_matched?.id ?? null,
            merchant_name: res.extracted.merchant ?? null,
            amount: res.extracted.total_amount ?? null,
            transaction_date: res.extracted.date ?? null,
            image_path: null,
            raw_ai_output: null,
            created_at: null,
          } as TransactionOut;
        openEdit(savedTx);
        setOcrError(`Data tidak lengkap: ${res.missing_fields.join(", ")}. Silakan lengkapi manual.`);
      } else {
        setModalOpen(true);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal memproses struk";
      if (msg.includes("401") || msg === "Unauthorized") {
        setOcrError("Sesi habis, silakan login lagi.");
      } else {
        setOcrError("AI sibuk atau gagal membaca struk, coba lagi.");
      }
    } finally {
      setOcrLoading(false);
    }
  };

  function openEdit(t: TransactionOut) {
    setEditTx(t);
    setEditForm({
      merchant_name: t.merchant_name ?? "",
      amount: t.amount != null ? String(t.amount) : "",
      transaction_date: t.transaction_date ?? "",
      category_id: t.category_id ?? "",
    });
  }

  async function handleEditSave() {
    if (!editTx) return;
    setEditLoading(true);
    try {
      const body: Record<string, unknown> = {};
      if (editForm.merchant_name) body.merchant_name = editForm.merchant_name;
      if (editForm.amount) body.amount = parseFloat(editForm.amount);
      if (editForm.transaction_date) body.transaction_date = editForm.transaction_date;
      if (editForm.category_id) body.category_id = editForm.category_id;
      await apiPut(`/api/v1/transactions/${editTx.id}`, body);
      setEditTx(null);
      refresh();
    } catch {
      alert("Gagal menyimpan perubahan.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTx) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/api/v1/transactions/${deleteTx.id}`);
      setDeleteTx(null);
      refresh();
    } catch {
      alert("Gagal menghapus transaksi.");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function openReceipt(imagePath: string) {
    setPreviewLoading(true);
    try {
      const url = await apiGetBlob(imagePath);
      setPreviewUrl(url);
    } catch {
      alert("Gagal memuat gambar struk.");
    } finally {
      setPreviewLoading(false);
    }
  }

  const recent = transactions.slice(0, 5);

  return (
    <>
      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Total Pengeluaran (Bulan ini)</p>
          <p className="text-2xl font-bold text-slate-900">
            {txLoading ? "—" : formatIdr(totalMonth)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-2">Sisa Budget</p>
          {budget <= 0 ? (
            <p className="text-slate-500 text-sm">Set budget di profile</p>
          ) : (
            <>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${budgetPercent}%` }}
                />
              </div>
              <p className="text-sm font-semibold text-slate-700 mt-2">{formatIdr(remaining)}</p>
            </>
          )}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Jumlah Struk</p>
          <p className="text-2xl font-bold text-slate-900">{txLoading ? "—" : totalCount}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Pengeluaran per Kategori</h3>
          {donutData.length === 0 ? (
            <p className="text-slate-500 text-sm py-8 text-center">Belum ada data bulan ini</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={["#A3E635", "#bef264", "#86efac", "#4ade80", "#22c55e"][i % 5]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatIdr(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Tren 7 Hari Terakhir</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={last7Days}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A3E635" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#A3E635" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}`} />
              <Tooltip formatter={(v: number) => [formatIdr(v), "Pengeluaran"]} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#A3E635"
                strokeWidth={2}
                fill="url(#colorAmount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-24">
        <h3 className="font-bold text-slate-900 p-4 border-b border-slate-100">
          Aktivitas Terbaru
        </h3>
        {recent.length === 0 && !txLoading ? (
          <div className="p-12 text-center">
            <img
              src="https://illustrations.popsy.co/amber/receipt.svg"
              alt=""
              className="w-32 h-32 mx-auto mb-4 opacity-80"
            />
            <p className="text-slate-600 mb-2">Belum ada transaksi</p>
            <p className="text-sm text-slate-500">Upload struk pertamamu dengan tombol di bawah.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((t) => (
              <li key={t.id} className="flex items-center gap-4 p-4 hover:bg-slate-50">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-lg shrink-0">
                  {t.category_id ? (categoryMap.get(t.category_id)?.icon ?? "📌") : "📌"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{t.merchant_name ?? "—"}</p>
                  <p className="text-sm text-slate-500">
                    {t.transaction_date ?? "—"} · {t.category_id ? categoryMap.get(t.category_id)?.name ?? "—" : "Lainnya"}
                  </p>
                </div>
                <p className="font-semibold text-slate-900 shrink-0">{t.amount != null ? formatIdr(t.amount) : "—"}</p>
                <div className="flex gap-1 shrink-0">
                  {t.image_path && (
                    <button
                      type="button"
                      onClick={() => openReceipt(t.image_path!)}
                      className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                      aria-label="Lihat Struk"
                    >
                      <Receipt className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(t)}
                    className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    aria-label="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTx(t)}
                    className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    aria-label="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* FAB + hidden file input */}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        id="ocr-file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setOcrFile(f);
          e.target.value = "";
        }}
      />
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {ocrError && (
          <p className="text-sm text-red-600 bg-white border border-red-200 rounded-lg px-3 py-2 shadow">
            {ocrError}
          </p>
        )}
        {ocrFile && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-2 flex items-center gap-2">
            <span className="text-sm text-slate-700 truncate max-w-[180px]">{ocrFile.name}</span>
            <button
              type="button"
              onClick={() => setOcrFile(null)}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Batal"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleOcrSubmit}
              disabled={ocrLoading}
              className="bg-primary hover:bg-primary-hover text-slate-900 px-3 py-1 rounded-lg text-sm font-bold disabled:opacity-70"
            >
              {ocrLoading ? "Proses..." : "Proses"}
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => document.getElementById("ocr-file")?.click()}
          disabled={ocrLoading}
          className="w-14 h-14 bg-primary hover:bg-primary-hover text-slate-900 rounded-full shadow-lg flex items-center justify-center disabled:opacity-70 transition-transform hover:scale-105"
          aria-label="Upload struk"
        >
          {ocrLoading ? (
            <Loader2 className="w-7 h-7 animate-spin" />
          ) : (
            <Upload className="w-7 h-7" />
          )}
        </button>
      </div>

      {/* OCR loading overlay */}
      {ocrLoading && (
        <div className="fixed inset-0 z-40 bg-black/20 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-xl flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="font-medium text-slate-900">AI sedang membaca strukmu...</p>
          </div>
        </div>
      )}

      {/* OCR Confirmation modal */}
      {modalOpen && ocrResult && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Struk berhasil disimpan</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Data yang terbaca: Merchant <strong>{ocrResult.extracted.merchant ?? "—"}</strong>, 
                Nominal <strong>{ocrResult.extracted.total_amount != null ? formatIdr(ocrResult.extracted.total_amount) : "—"}</strong>, 
                Tanggal <strong>{ocrResult.extracted.date ?? "—"}</strong>.
                {ocrResult.category_matched && ` Kategori: ${ocrResult.category_matched.name}.`}
              </p>
            </div>
            <div className="p-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-full bg-primary hover:bg-primary-hover text-slate-900 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editTx && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Edit Transaksi</h3>
              <button type="button" onClick={() => setEditTx(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Merchant</label>
                <input
                  type="text"
                  value={editForm.merchant_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, merchant_name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  value={editForm.amount}
                  onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={editForm.transaction_date}
                  onChange={(e) => setEditForm((f) => ({ ...f, transaction_date: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
                <select
                  value={editForm.category_id}
                  onChange={(e) => setEditForm((f) => ({ ...f, category_id: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">— Pilih kategori —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon ? `${c.icon} ` : ""}{c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => setEditTx(null)}
                className="flex-1 border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleEditSave}
                disabled={editLoading}
                className="flex-1 bg-primary hover:bg-primary-hover text-slate-900 py-3 rounded-xl font-bold disabled:opacity-70 transition-colors"
              >
                {editLoading ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTx && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full">
            <div className="p-6">
              <h3 className="font-bold text-slate-900 mb-2">Hapus Transaksi?</h3>
              <p className="text-sm text-slate-600">
                Transaksi <strong>{deleteTx.merchant_name ?? "—"}</strong> sebesar{" "}
                <strong>{deleteTx.amount != null ? formatIdr(deleteTx.amount) : "—"}</strong> akan dihapus permanen.
              </p>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTx(null)}
                className="flex-1 border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold disabled:opacity-70 transition-colors"
              >
                {deleteLoading ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt preview modal */}
      {(previewUrl || previewLoading) && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-slate-900">Struk Asli</h3>
              <button
                type="button"
                onClick={() => {
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-50">
              {previewLoading ? (
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              ) : previewUrl ? (
                <img src={previewUrl} alt="Struk" className="max-w-full max-h-[70vh] rounded-lg shadow" />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
