"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  PaginatedTransactions,
  TransactionOut,
  CategoryOut,
  OCRResponse,
} from "@/types/api";
import { apiGet, apiPost, apiPut, apiDelete, apiGetBlob, getAccessToken } from "@/lib/api";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import {
  Loader2, X, Check, Pencil, Trash2, Receipt,
  Plus, Camera, FileText, TrendingUp, TrendingDown, ArrowUpDown,
} from "lucide-react";

function formatIdr(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

type TimeRange = "daily" | "weekly" | "monthly" | "yearly";
type KpiRange = "all" | "daily" | "weekly" | "monthly" | "yearly";

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
  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, error, refresh };
}

function useCategories() {
  const [data, setData] = useState<CategoryOut[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await apiGet<CategoryOut[]>("/api/v1/categories");
      setData(res ?? []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, refresh };
}


/** Format tanggal local sebagai YYYY-MM-DD tanpa konversi UTC */
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function filterByRange(transactions: TransactionOut[], range: KpiRange): TransactionOut[] {
  if (range === "all") return transactions.filter((t) => !!t.transaction_date);
  const now = new Date();
  const todayStr = localDateStr(now);

  if (range === "daily") {
    return transactions.filter((t) => t.transaction_date === todayStr);
  }
  if (range === "weekly") {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const weekAgoStr = localDateStr(weekAgo);
    return transactions.filter((t) => t.transaction_date && t.transaction_date >= weekAgoStr && t.transaction_date <= todayStr);
  }
  if (range === "monthly") {
    const y = String(now.getFullYear());
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return transactions.filter((t) => t.transaction_date && t.transaction_date.slice(0, 4) === y && t.transaction_date.slice(5, 7) === m);
  }
  // yearly
  const y = String(now.getFullYear());
  return transactions.filter((t) => t.transaction_date && t.transaction_date.slice(0, 4) === y);
}

function buildChartData(transactions: TransactionOut[], range: TimeRange) {
  const now = new Date();
  const data: { label: string; income: number; expense: number }[] = [];

  if (range === "daily") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = localDateStr(d);
      const dayTx = transactions.filter((t) => t.transaction_date === ds);
      data.push({
        label: ds.slice(5),
        income: dayTx.filter((t) => t.type === "income").reduce((s, t) => s + (t.amount ?? 0), 0),
        expense: dayTx.filter((t) => t.type !== "income").reduce((s, t) => s + (t.amount ?? 0), 0),
      });
    }
  } else if (range === "weekly") {
    for (let w = 3; w >= 0; w--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      const startStr = localDateStr(weekStart);
      const endStr = localDateStr(weekEnd);
      const wTx = transactions.filter((t) => t.transaction_date && t.transaction_date >= startStr && t.transaction_date <= endStr);
      data.push({
        label: `${startStr.slice(5)}`,
        income: wTx.filter((t) => t.type === "income").reduce((s, t) => s + (t.amount ?? 0), 0),
        expense: wTx.filter((t) => t.type !== "income").reduce((s, t) => s + (t.amount ?? 0), 0),
      });
    }
  } else if (range === "monthly") {
    for (let m = 5; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const mTx = transactions.filter((t) => {
        if (!t.transaction_date) return false;
        // parse langsung dari string YYYY-MM-DD, hindari timezone shift
        return t.transaction_date.slice(0, 4) === String(y) && t.transaction_date.slice(5, 7) === mo;
      });
      const label = d.toLocaleDateString("id-ID", { month: "short" });
      data.push({
        label,
        income: mTx.filter((t) => t.type === "income").reduce((s, t) => s + (t.amount ?? 0), 0),
        expense: mTx.filter((t) => t.type !== "income").reduce((s, t) => s + (t.amount ?? 0), 0),
      });
    }
  } else {
    for (let y = 2; y >= 0; y--) {
      const year = now.getFullYear() - y;
      const yTx = transactions.filter((t) => {
        if (!t.transaction_date) return false;
        return parseInt(t.transaction_date.slice(0, 4), 10) === year;
      });
      data.push({
        label: String(year),
        income: yTx.filter((t) => t.type === "income").reduce((s, t) => s + (t.amount ?? 0), 0),
        expense: yTx.filter((t) => t.type !== "income").reduce((s, t) => s + (t.amount ?? 0), 0),
      });
    }
  }
  return data;
}

const TIME_LABELS: Record<TimeRange, string> = {
  daily: "Harian",
  weekly: "Mingguan",
  monthly: "Bulanan",
  yearly: "Tahunan",
};

const KPI_LABELS: Record<KpiRange, string> = {
  all: "Semua",
  daily: "Hari Ini",
  weekly: "Minggu Ini",
  monthly: "Bulan Ini",
  yearly: "Tahun Ini",
};

function TypeToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex rounded-lg border border-slate-200 overflow-hidden">
      <button type="button" onClick={() => onChange("expense")} className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${value === "expense" ? "bg-red-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
        <TrendingDown className="w-4 h-4 inline mr-1" />Pengeluaran
      </button>
      <button type="button" onClick={() => onChange("income")} className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${value === "income" ? "bg-emerald-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
        <TrendingUp className="w-4 h-4 inline mr-1" />Pemasukan
      </button>
    </div>
  );
}

function CategorySelect({ value, onValueChange, categories, showNew, setShowNew, newForm, setNewForm, newLoading, onCreateNew }: {
  value: string; onValueChange: (v: string) => void;
  categories: CategoryOut[];
  showNew: boolean; setShowNew: (v: boolean) => void;
  newForm: { name: string; icon: string; color: string }; setNewForm: (fn: (f: { name: string; icon: string; color: string }) => { name: string; icon: string; color: string }) => void;
  newLoading: boolean; onCreateNew: () => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
      <select value={value} onChange={(e) => e.target.value === "__new__" ? setShowNew(true) : onValueChange(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary">
        <option value="">— Pilih kategori —</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.name}</option>)}
        <option value="__new__">+ Buat Kategori Baru</option>
      </select>
      {showNew && (
        <div className="mt-3 border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
          <p className="text-sm font-medium text-slate-700">Kategori Baru</p>
          <input type="text" placeholder="Nama kategori" value={newForm.name} onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary" />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1">Icon</label>
              <input type="text" value={newForm.icon} onChange={(e) => setNewForm((f) => ({ ...f, icon: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary" maxLength={4} />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1">Warna</label>
              <input type="color" value={newForm.color} onChange={(e) => setNewForm((f) => ({ ...f, color: e.target.value }))}
                className="w-full h-[42px] border border-slate-200 rounded-lg cursor-pointer" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowNew(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-white">Batal</button>
            <button type="button" onClick={onCreateNew} disabled={newLoading || !newForm.name.trim()} className="flex-1 bg-primary hover:bg-primary-hover text-slate-900 py-2 rounded-lg text-sm font-bold disabled:opacity-50">{newLoading ? "Membuat..." : "Buat"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { data: txData, loading: txLoading, refresh } = useTransactions();
  const { data: categories, refresh: refreshCategories } = useCategories();
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [editTx, setEditTx] = useState<TransactionOut | null>(null);
  const [editForm, setEditForm] = useState({ type: "expense", merchant_name: "", amount: "", transaction_date: "", category_id: "" });
  const [editLoading, setEditLoading] = useState(false);

  const [deleteTx, setDeleteTx] = useState<TransactionOut | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatForm, setNewCatForm] = useState({ name: "", icon: "📌", color: "#6B7280" });
  const [newCatLoading, setNewCatLoading] = useState(false);

  const [fabOpen, setFabOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ type: "expense", merchant_name: "", amount: "", transaction_date: "", category_id: "" });
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualShowNewCat, setManualShowNewCat] = useState(false);
  const [manualNewCatForm, setManualNewCatForm] = useState({ name: "", icon: "📌", color: "#6B7280" });
  const [manualNewCatLoading, setManualNewCatLoading] = useState(false);

  const [timeRange, setTimeRange] = useState<TimeRange>("daily");
  const [kpiRange, setKpiRange] = useState<KpiRange>("monthly");

  const transactions = txData?.items ?? [];

  const kpiTransactions = useMemo(() => filterByRange(transactions, kpiRange), [transactions, kpiRange]);

  const totalIncome = kpiTransactions.filter((t) => t.type === "income").reduce((s, t) => s + (t.amount ?? 0), 0);
  const totalExpense = kpiTransactions.filter((t) => t.type !== "income").reduce((s, t) => s + (t.amount ?? 0), 0);
  const netBalance = totalIncome - totalExpense;

  const chartData = useMemo(() => buildChartData(transactions, timeRange), [transactions, timeRange]);

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const expenseByCategory: Record<string, number> = {};
  kpiTransactions.filter((t) => t.type !== "income").forEach((t) => {
    const key = t.category_id ?? "Lainnya";
    const name = key === "Lainnya" ? "Lainnya" : (categoryMap.get(key)?.name ?? "Lainnya");
    expenseByCategory[name] = (expenseByCategory[name] ?? 0) + (t.amount ?? 0);
  });
  const expenseDonut = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));

  const incomeByCategory: Record<string, number> = {};
  kpiTransactions.filter((t) => t.type === "income").forEach((t) => {
    const key = t.category_id ?? "Lainnya";
    const name = key === "Lainnya" ? "Lainnya" : (categoryMap.get(key)?.name ?? "Lainnya");
    incomeByCategory[name] = (incomeByCategory[name] ?? 0) + (t.amount ?? 0);
  });
  const incomeDonut = Object.entries(incomeByCategory).map(([name, value]) => ({ name, value }));

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
      refresh();
      if (res.needs_review) {
        // Bangun objek langsung dari response OCR -- jangan pakai txData yang masih stale
        const savedTx: TransactionOut = {
          id: res.transaction_id,
          user_id: "",
          type: (res.extracted.transaction_type as "income" | "expense") ?? "expense",
          category_id: res.category_matched?.id ?? null,
          merchant_name: res.extracted.merchant ?? null,
          amount: res.extracted.total_amount ?? null,
          // Normalisasi tanggal: kirim null jika format tidak jelas, user isi manual
          transaction_date: null,
          image_path: null,
          raw_ai_output: null,
          created_at: null,
        };
        openEdit(savedTx);
        setOcrError(`Data tidak lengkap: ${res.missing_fields.join(", ")}. Silakan lengkapi manual.`);
      } else {
        setModalOpen(true);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal memproses struk";
      setOcrError(msg.includes("401") || msg === "Unauthorized" ? "Sesi habis, silakan login lagi." : "AI sibuk atau gagal membaca struk, coba lagi.");
    } finally {
      setOcrLoading(false);
    }
  };

  function openEdit(t: TransactionOut) {
    setEditTx(t);
    setEditForm({
      type: t.type ?? "expense",
      merchant_name: t.merchant_name ?? "",
      amount: t.amount != null ? String(t.amount) : "",
      transaction_date: t.transaction_date ?? "",
      category_id: t.category_id ?? "",
    });
  }

  async function handleEditSave() {
    if (!editTx) return;
    if (!editForm.merchant_name.trim()) { alert("Merchant tidak boleh kosong."); return; }
    if (!editForm.amount || parseFloat(editForm.amount) <= 0) { alert("Nominal harus lebih dari 0."); return; }
    if (!editForm.transaction_date) { alert("Tanggal tidak boleh kosong."); return; }
    setEditLoading(true);
    try {
      const body: Record<string, unknown> = {
        type: editForm.type,
        merchant_name: editForm.merchant_name.trim(),
        amount: parseFloat(editForm.amount),
        transaction_date: editForm.transaction_date,
        category_id: editForm.category_id || null,
      };
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

  async function handleCreateCategory() {
    if (!newCatForm.name.trim()) return;
    setNewCatLoading(true);
    try {
      const created = await apiPost<CategoryOut>("/api/v1/categories", { name: newCatForm.name.trim(), icon: newCatForm.icon || "📌", color: newCatForm.color || "#6B7280" });
      await refreshCategories();
      setEditForm((f) => ({ ...f, category_id: created.id }));
      setNewCatForm({ name: "", icon: "📌", color: "#6B7280" });
      setShowNewCat(false);
    } catch {
      alert("Gagal membuat kategori. Mungkin nama sudah ada.");
    } finally {
      setNewCatLoading(false);
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

  async function handleManualSubmit() {
    if (!manualForm.merchant_name.trim() || !manualForm.amount || !manualForm.transaction_date) {
      alert("Merchant, nominal, dan tanggal wajib diisi.");
      return;
    }
    setManualLoading(true);
    try {
      const form = new FormData();
      form.append("type", manualForm.type);
      form.append("merchant_name", manualForm.merchant_name.trim());
      form.append("amount", manualForm.amount);
      form.append("transaction_date", manualForm.transaction_date);
      if (manualForm.category_id) form.append("category_id", manualForm.category_id);
      if (manualFile) form.append("file", manualFile);
      await apiPost<TransactionOut>("/api/v1/transactions", form);
      setManualOpen(false);
      setManualForm({ type: "expense", merchant_name: "", amount: "", transaction_date: "", category_id: "" });
      setManualFile(null);
      refresh();
    } catch {
      alert("Gagal menyimpan transaksi.");
    } finally {
      setManualLoading(false);
    }
  }

  async function handleManualCreateCategory() {
    if (!manualNewCatForm.name.trim()) return;
    setManualNewCatLoading(true);
    try {
      const created = await apiPost<CategoryOut>("/api/v1/categories", { name: manualNewCatForm.name.trim(), icon: manualNewCatForm.icon || "📌", color: manualNewCatForm.color || "#6B7280" });
      await refreshCategories();
      setManualForm((f) => ({ ...f, category_id: created.id }));
      setManualNewCatForm({ name: "", icon: "📌", color: "#6B7280" });
      setManualShowNewCat(false);
    } catch {
      alert("Gagal membuat kategori. Mungkin nama sudah ada.");
    } finally {
      setManualNewCatLoading(false);
    }
  }

  const recent = transactions.slice(0, 8);

  // Category CRUD
  const [catManageOpen, setCatManageOpen] = useState(false);
  const [editCat, setEditCat] = useState<CategoryOut | null>(null);
  const [editCatForm, setEditCatForm] = useState({ name: "", icon: "📌", color: "#6B7280" });
  const [editCatLoading, setEditCatLoading] = useState(false);
  const [deleteCat, setDeleteCat] = useState<CategoryOut | null>(null);
  const [deleteCatLoading, setDeleteCatLoading] = useState(false);

  function openEditCat(c: CategoryOut) {
    setEditCat(c);
    setEditCatForm({ name: c.name, icon: c.icon ?? "📌", color: c.color ?? "#6B7280" });
  }

  async function handleEditCatSave() {
    if (!editCat || !editCatForm.name.trim()) return;
    setEditCatLoading(true);
    try {
      await apiPut(`/api/v1/categories/${editCat.id}`, {
        name: editCatForm.name.trim(),
        icon: editCatForm.icon || "📌",
        color: editCatForm.color || "#6B7280",
      });
      setEditCat(null);
      refreshCategories();
    } catch {
      alert("Gagal menyimpan perubahan kategori.");
    } finally {
      setEditCatLoading(false);
    }
  }

  async function handleDeleteCat() {
    if (!deleteCat) return;
    setDeleteCatLoading(true);
    try {
      await apiDelete(`/api/v1/categories/${deleteCat.id}`);
      setDeleteCat(null);
      refreshCategories();
    } catch {
      alert("Gagal menghapus kategori.");
    } finally {
      setDeleteCatLoading(false);
    }
  }

  const userCategories = categories.filter((c) => c.user_id !== null);
  const globalCategories = categories.filter((c) => c.user_id === null);

  return (
    <>
      {/* KPI Time Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold text-slate-900">Ringkasan</h2>
        <div className="flex rounded-lg border border-slate-200 overflow-x-auto no-scrollbar">
          {(["all", "daily", "weekly", "monthly", "yearly"] as KpiRange[]).map((r) => (
            <button key={r} type="button" onClick={() => setKpiRange(r)}
              className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${kpiRange === r ? "bg-primary text-slate-900" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
              {KPI_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0"><TrendingUp className="w-4 h-4 text-emerald-600" /></div>
            <p className="text-xs font-medium text-slate-500">Pemasukan</p>
          </div>
          <p className="text-lg sm:text-xl font-bold text-emerald-600 truncate">{txLoading ? "—" : formatIdr(totalIncome)}</p>
          <p className="text-[10px] text-slate-400 mt-1">{KPI_LABELS[kpiRange]}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0"><TrendingDown className="w-4 h-4 text-red-500" /></div>
            <p className="text-xs font-medium text-slate-500">Pengeluaran</p>
          </div>
          <p className="text-lg sm:text-xl font-bold text-red-500 truncate">{txLoading ? "—" : formatIdr(totalExpense)}</p>
          <p className="text-[10px] text-slate-400 mt-1">{KPI_LABELS[kpiRange]}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${netBalance >= 0 ? "bg-emerald-100" : "bg-red-100"}`}>
              <ArrowUpDown className={`w-4 h-4 ${netBalance >= 0 ? "text-emerald-600" : "text-red-500"}`} />
            </div>
            <p className="text-xs font-medium text-slate-500">Saldo Bersih</p>
          </div>
          <p className={`text-lg sm:text-xl font-bold truncate ${netBalance >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {txLoading ? "—" : `${netBalance >= 0 ? "+" : ""}${formatIdr(netBalance)}`}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">{netBalance >= 0 ? "Surplus" : "Defisit"}</p>
        </div>
      </div>

      {/* Donut Charts — Pengeluaran & Pemasukan per Kategori */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="font-bold text-sm sm:text-base text-slate-900">Pengeluaran per Kategori</h3>
            <span className="text-[10px] sm:text-xs text-slate-400">{KPI_LABELS[kpiRange]}</span>
          </div>
          {expenseDonut.length === 0 ? (
            <p className="text-slate-500 text-sm py-8 text-center">Belum ada data pengeluaran</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={expenseDonut} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" nameKey="name" label={false}>
                    {expenseDonut.map((_, i) => (
                      <Cell key={i} fill={["#ef4444", "#f87171", "#fca5a5", "#f59e0b", "#fb923c", "#3b82f6", "#8b5cf6", "#6b7280"][i % 8]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatIdr(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
                {expenseDonut.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ["#ef4444", "#f87171", "#fca5a5", "#f59e0b", "#fb923c", "#3b82f6", "#8b5cf6", "#6b7280"][i % 8] }} />
                    <span className="truncate max-w-[100px]">{d.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="font-bold text-sm sm:text-base text-slate-900">Pemasukan per Kategori</h3>
            <span className="text-[10px] sm:text-xs text-slate-400">{KPI_LABELS[kpiRange]}</span>
          </div>
          {incomeDonut.length === 0 ? (
            <p className="text-slate-500 text-sm py-8 text-center">Belum ada data pemasukan</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={incomeDonut} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" nameKey="name" label={false}>
                    {incomeDonut.map((_, i) => (
                      <Cell key={i} fill={["#22c55e", "#4ade80", "#86efac", "#A3E635", "#bef264", "#14b8a6", "#0ea5e9", "#6366f1"][i % 8]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatIdr(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
                {incomeDonut.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ["#22c55e", "#4ade80", "#86efac", "#A3E635", "#bef264", "#14b8a6", "#0ea5e9", "#6366f1"][i % 8] }} />
                    <span className="truncate max-w-[100px]">{d.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Manage Categories Button */}
      <div className="flex justify-end mb-4">
        <button type="button" onClick={() => setCatManageOpen(true)}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm hover:shadow transition-all">
          <Pencil className="w-3.5 h-3.5" />Kelola Kategori
        </button>
      </div>

      {/* Tren Keuangan Bar Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-sm sm:text-base text-slate-900">Tren Keuangan</h3>
          <div className="flex rounded-lg border border-slate-200 overflow-x-auto no-scrollbar">
            {(["daily", "weekly", "monthly", "yearly"] as TimeRange[]).map((r) => (
              <button key={r} type="button" onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${timeRange === r ? "bg-primary text-slate-900" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
                {TIME_LABELS[r]}
              </button>
            ))}
          </div>
        </div>
        <div className="-mx-2 sm:mx-0">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ left: -10, right: 4, top: 4, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} />
              <YAxis tick={{ fontSize: 10 }} width={45} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : `${v}`} />
              <Tooltip formatter={(v: number) => formatIdr(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="income" name="Pemasukan" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-24">
        <h3 className="font-bold text-sm sm:text-base text-slate-900 p-4 border-b border-slate-100">Aktivitas Terbaru</h3>
        {recent.length === 0 && !txLoading ? (
          <div className="p-8 sm:p-12 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 sm:w-10 sm:h-10 text-slate-300" />
            </div>
            <p className="text-slate-600 mb-2 text-sm sm:text-base">Belum ada transaksi</p>
            <p className="text-xs sm:text-sm text-slate-500">Tambah transaksi dengan tombol + di bawah.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((t) => (
              <li key={t.id} className="p-3 sm:p-4 hover:bg-slate-50 active:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-base sm:text-lg shrink-0 ${t.type === "income" ? "bg-emerald-100" : "bg-red-50"}`}>
                    {t.type === "income" ? "💰" : (t.category_id ? (categoryMap.get(t.category_id)?.icon ?? "📌") : "📌")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm sm:text-base text-slate-900 truncate">{t.merchant_name ?? "—"}</p>
                      <p className={`font-semibold text-sm sm:text-base shrink-0 ${t.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                        {t.amount != null ? `${t.type === "income" ? "+" : "-"}${formatIdr(t.amount)}` : "—"}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs sm:text-sm text-slate-500 truncate">
                        {t.transaction_date ?? "—"} · {t.type === "income" ? "Pemasukan" : (t.category_id ? categoryMap.get(t.category_id)?.name ?? "—" : "Lainnya")}
                      </p>
                      <div className="flex gap-1 shrink-0">
                        {t.image_path && (
                          <button type="button" onClick={() => openReceipt(t.image_path!)} className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" aria-label="Lihat Struk">
                            <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        )}
                        <button type="button" onClick={() => openEdit(t)} className="p-1.5 sm:p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" aria-label="Edit">
                          <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        <button type="button" onClick={() => setDeleteTx(t)} className="p-1.5 sm:p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors" aria-label="Hapus">
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* FAB */}
      <input type="file" accept="image/*" className="hidden" id="ocr-file" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setOcrFile(f); setFabOpen(false); } e.target.value = ""; }} />
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-2">
        {ocrError && <p className="text-xs sm:text-sm text-red-600 bg-white border border-red-200 rounded-lg px-3 py-2 shadow max-w-[280px] sm:max-w-none">{ocrError}</p>}
        {ocrFile && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 sm:px-4 py-2 flex items-center gap-2">
            <span className="text-xs sm:text-sm text-slate-700 truncate max-w-[120px] sm:max-w-[180px]">{ocrFile.name}</span>
            <button type="button" onClick={() => setOcrFile(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            <button type="button" onClick={handleOcrSubmit} disabled={ocrLoading} className="bg-primary hover:bg-primary-hover text-slate-900 px-3 py-1 rounded-lg text-xs sm:text-sm font-bold disabled:opacity-70">{ocrLoading ? "Proses..." : "Proses"}</button>
          </div>
        )}
        {fabOpen && (
          <div className="flex flex-col items-end gap-2 mb-2">
            <button type="button" onClick={() => document.getElementById("ocr-file")?.click()} className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 hover:bg-slate-50 active:bg-slate-100">
              <Camera className="w-5 h-5 text-primary" /><span className="text-sm font-medium text-slate-900">Scan Struk (AI)</span>
            </button>
            <button type="button" onClick={() => { setManualOpen(true); setFabOpen(false); setManualForm({ type: "expense", merchant_name: "", amount: "", transaction_date: localDateStr(new Date()), category_id: "" }); }}
              className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 hover:bg-slate-50 active:bg-slate-100">
              <FileText className="w-5 h-5 text-blue-600" /><span className="text-sm font-medium text-slate-900">Tambah Manual</span>
            </button>
          </div>
        )}
        <button type="button" onClick={() => setFabOpen(!fabOpen)} disabled={ocrLoading}
          className={`w-12 h-12 sm:w-14 sm:h-14 bg-primary hover:bg-primary-hover text-slate-900 rounded-full shadow-lg flex items-center justify-center disabled:opacity-70 transition-all ${fabOpen ? "rotate-45" : ""}`}>
          {ocrLoading ? <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 animate-spin" /> : <Plus className="w-6 h-6 sm:w-7 sm:h-7" />}
        </button>
      </div>
      {fabOpen && <div className="fixed inset-0 z-40" onClick={() => setFabOpen(false)} />}

      {/* OCR loading */}
      {ocrLoading && (
        <div className="fixed inset-0 z-40 bg-black/20 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-primary animate-spin" /><p className="font-medium text-sm sm:text-base text-slate-900 text-center">AI sedang membaca strukmu...</p>
          </div>
        </div>
      )}

      {/* OCR success modal */}
      {modalOpen && ocrResult && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base text-slate-900">Struk berhasil disimpan</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <p className="text-xs sm:text-sm text-slate-600">
                Merchant <strong>{ocrResult.extracted.merchant ?? "—"}</strong>, Nominal <strong>{ocrResult.extracted.total_amount != null ? formatIdr(ocrResult.extracted.total_amount) : "—"}</strong>, Tanggal <strong>{ocrResult.extracted.date ?? "—"}</strong>.
                {ocrResult.category_matched && ` Kategori: ${ocrResult.category_matched.name}.`}
              </p>
            </div>
            <div className="p-4 sm:p-6 border-t border-slate-100">
              <button type="button" onClick={() => setModalOpen(false)} className="w-full bg-primary hover:bg-primary-hover text-slate-900 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm sm:text-base">
                <Check className="w-5 h-5" />Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editTx && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-bold text-sm sm:text-base text-slate-900">Edit Transaksi</h3>
              <button type="button" onClick={() => setEditTx(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <TypeToggle value={editForm.type} onChange={(v) => setEditForm((f) => ({ ...f, type: v }))} />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Merchant</label>
                <input type="text" value={editForm.merchant_name} onChange={(e) => setEditForm((f) => ({ ...f, merchant_name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nominal (Rp)</label>
                <input type="number" inputMode="numeric" value={editForm.amount} onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                <input type="date" value={editForm.transaction_date} onChange={(e) => setEditForm((f) => ({ ...f, transaction_date: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <CategorySelect value={editForm.category_id} onValueChange={(v) => setEditForm((f) => ({ ...f, category_id: v }))} categories={categories}
                showNew={showNewCat} setShowNew={setShowNewCat} newForm={newCatForm} setNewForm={setNewCatForm} newLoading={newCatLoading} onCreateNew={handleCreateCategory} />
            </div>
            <div className="p-4 sm:p-6 border-t border-slate-100 flex gap-3 sticky bottom-0 bg-white">
              <button type="button" onClick={() => setEditTx(null)} className="flex-1 border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 text-sm sm:text-base">Batal</button>
              <button type="button" onClick={handleEditSave} disabled={editLoading} className="flex-1 bg-primary hover:bg-primary-hover text-slate-900 py-3 rounded-xl font-bold disabled:opacity-70 text-sm sm:text-base">{editLoading ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteTx && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm">
            <div className="p-4 sm:p-6">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 mb-2">Hapus Transaksi?</h3>
              <p className="text-xs sm:text-sm text-slate-600">
                <strong>{deleteTx.merchant_name ?? "—"}</strong> sebesar <strong>{deleteTx.amount != null ? formatIdr(deleteTx.amount) : "—"}</strong> akan dihapus permanen.
              </p>
            </div>
            <div className="p-4 sm:p-6 border-t border-slate-100 flex gap-3">
              <button type="button" onClick={() => setDeleteTx(null)} className="flex-1 border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 text-sm sm:text-base">Batal</button>
              <button type="button" onClick={handleDelete} disabled={deleteLoading} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold disabled:opacity-70 text-sm sm:text-base">{deleteLoading ? "Menghapus..." : "Hapus"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt preview */}
      {(previewUrl || previewLoading) && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm sm:text-base text-slate-900">Struk Asli</h3>
              <button type="button" onClick={() => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-auto p-3 sm:p-4 flex items-center justify-center bg-slate-50">
              {previewLoading ? <Loader2 className="w-10 h-10 text-primary animate-spin" /> : previewUrl ? <img src={previewUrl} alt="Struk" className="max-w-full max-h-[70vh] rounded-lg shadow" /> : null}
            </div>
          </div>
        </div>
      )}

      {/* Manual transaction modal */}
      {manualOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-bold text-sm sm:text-base text-slate-900">Tambah Transaksi Manual</h3>
              <button type="button" onClick={() => setManualOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <TypeToggle value={manualForm.type} onChange={(v) => setManualForm((f) => ({ ...f, type: v }))} />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{manualForm.type === "income" ? "Sumber Pemasukan" : "Merchant / Keterangan"} *</label>
                <input type="text" placeholder={manualForm.type === "income" ? "Contoh: Gaji, Freelance" : "Contoh: Indomaret, Gojek"}
                  value={manualForm.merchant_name} onChange={(e) => setManualForm((f) => ({ ...f, merchant_name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nominal (Rp) *</label>
                <input type="number" inputMode="numeric" placeholder="50000" value={manualForm.amount} onChange={(e) => setManualForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal *</label>
                <input type="date" value={manualForm.transaction_date} onChange={(e) => setManualForm((f) => ({ ...f, transaction_date: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <CategorySelect value={manualForm.category_id} onValueChange={(v) => setManualForm((f) => ({ ...f, category_id: v }))} categories={categories}
                showNew={manualShowNewCat} setShowNew={setManualShowNewCat} newForm={manualNewCatForm} setNewForm={setManualNewCatForm} newLoading={manualNewCatLoading} onCreateNew={handleManualCreateCategory} />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Foto (opsional)</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 border-2 border-dashed border-slate-200 rounded-lg p-3 text-center cursor-pointer hover:border-primary active:border-primary transition-colors">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { setManualFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
                    {manualFile ? <span className="text-xs sm:text-sm text-slate-700 truncate block">{manualFile.name}</span> : <span className="text-xs sm:text-sm text-slate-400">Klik untuk pilih foto</span>}
                  </label>
                  {manualFile && <button type="button" onClick={() => setManualFile(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>}
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6 border-t border-slate-100 flex gap-3 sticky bottom-0 bg-white">
              <button type="button" onClick={() => setManualOpen(false)} className="flex-1 border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 text-sm sm:text-base">Batal</button>
              <button type="button" onClick={handleManualSubmit} disabled={manualLoading} className="flex-1 bg-primary hover:bg-primary-hover text-slate-900 py-3 rounded-xl font-bold disabled:opacity-70 text-sm sm:text-base">{manualLoading ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Categories Modal */}
      {catManageOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[85vh] sm:max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm sm:text-base text-slate-900">Kelola Kategori</h3>
              <button type="button" onClick={() => setCatManageOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {userCategories.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Kategori Kustom</p>
                  <ul className="space-y-2">
                    {userCategories.map((c) => (
                      <li key={c.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <span className="text-lg shrink-0" style={{ color: c.color ?? undefined }}>{c.icon ?? "📌"}</span>
                        <span className="flex-1 text-sm font-medium text-slate-900 truncate">{c.name}</span>
                        <button type="button" onClick={() => openEditCat(c)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" aria-label="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => setDeleteCat(c)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors" aria-label="Hapus">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {globalCategories.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Kategori Bawaan</p>
                  <ul className="space-y-2">
                    {globalCategories.map((c) => (
                      <li key={c.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl opacity-70">
                        <span className="text-lg shrink-0">{c.icon ?? "📌"}</span>
                        <span className="flex-1 text-sm font-medium text-slate-700 truncate">{c.name}</span>
                        <span className="text-[10px] text-slate-400">Bawaan</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {categories.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Belum ada kategori.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editCat && (
        <div className="fixed inset-0 z-60 bg-black/30 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base text-slate-900">Edit Kategori</h3>
              <button type="button" onClick={() => setEditCat(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 sm:p-6 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama</label>
                <input type="text" value={editCatForm.name} onChange={(e) => setEditCatForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Icon</label>
                  <input type="text" value={editCatForm.icon} onChange={(e) => setEditCatForm((f) => ({ ...f, icon: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary" maxLength={4} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Warna</label>
                  <input type="color" value={editCatForm.color} onChange={(e) => setEditCatForm((f) => ({ ...f, color: e.target.value }))}
                    className="w-full h-[42px] border border-slate-200 rounded-lg cursor-pointer" />
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6 border-t border-slate-100 flex gap-3">
              <button type="button" onClick={() => setEditCat(null)} className="flex-1 border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 text-sm">Batal</button>
              <button type="button" onClick={handleEditCatSave} disabled={editCatLoading || !editCatForm.name.trim()} className="flex-1 bg-primary hover:bg-primary-hover text-slate-900 py-3 rounded-xl font-bold disabled:opacity-70 text-sm">{editCatLoading ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Modal */}
      {deleteCat && (
        <div className="fixed inset-0 z-60 bg-black/30 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm">
            <div className="p-4 sm:p-6">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 mb-2">Hapus Kategori?</h3>
              <p className="text-xs sm:text-sm text-slate-600">
                Kategori <strong>{deleteCat.icon} {deleteCat.name}</strong> akan dihapus. Transaksi yang menggunakan kategori ini tidak akan terhapus.
              </p>
            </div>
            <div className="p-4 sm:p-6 border-t border-slate-100 flex gap-3">
              <button type="button" onClick={() => setDeleteCat(null)} className="flex-1 border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 text-sm">Batal</button>
              <button type="button" onClick={handleDeleteCat} disabled={deleteCatLoading} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold disabled:opacity-70 text-sm">{deleteCatLoading ? "Menghapus..." : "Hapus"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
