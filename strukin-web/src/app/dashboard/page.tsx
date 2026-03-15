"use client";

import { useEffect, useState, useCallback } from "react";
import {
  PaginatedTransactions,
  TransactionOut,
  CategoryOut,
  Profile,
  OCRResponse,
} from "@/types/api";
import { apiGet, apiPost, getAccessToken } from "@/lib/api";
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
import { Upload, Loader2, X, Check } from "lucide-react";

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
      setModalOpen(true);
      setOcrFile(null);
      refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal memproses struk";
      setOcrError(msg.includes("401") || msg === "Unauthorized" ? "Sesi habis, silakan login lagi." : "AI sibuk, coba lagi.");
    } finally {
      setOcrLoading(false);
    }
  };

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
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-lg">
                  {t.category_id ? (categoryMap.get(t.category_id)?.icon ?? "📌") : "📌"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{t.merchant_name ?? "—"}</p>
                  <p className="text-sm text-slate-500">
                    {t.transaction_date ?? "—"} · {t.category_id ? categoryMap.get(t.category_id)?.name ?? "—" : "Lainnya"}
                  </p>
                </div>
                <p className="font-semibold text-slate-900">{t.amount != null ? formatIdr(t.amount) : "—"}</p>
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

      {/* Confirmation modal */}
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
              <p className="text-sm text-slate-500">
                Transaksi sudah tersimpan. Ubah data bisa lewat fitur edit (jika tersedia).
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
    </>
  );
}
