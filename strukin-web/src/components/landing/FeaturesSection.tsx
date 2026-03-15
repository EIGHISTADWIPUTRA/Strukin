import { Camera, FolderOpen, BarChart3, Wallet, PlusCircle, Shield } from "lucide-react";

const features = [
  {
    icon: Camera,
    title: "AI OCR",
    highlight: "Foto Struk, Beres.",
    description: "Ambil foto struk belanja—AI baca merchant, nominal, dan tanggal secara otomatis.",
    color: "bg-primary/20 text-primary",
  },
  {
    icon: FolderOpen,
    title: "Custom Categories",
    highlight: "Bikin Kategori Suka-suka.",
    description: "Makanan, transport, belanja—atau buat sendiri. Atur icon dan warna sesuai keinginan.",
    color: "bg-violet-100 text-violet-600",
  },
  {
    icon: BarChart3,
    title: "Visual Dashboard",
    highlight: "Pantau Keuangan Real-time.",
    description: "Grafik pemasukan & pengeluaran per kategori, harian sampai tahunan di satu layar.",
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    icon: PlusCircle,
    title: "Input Manual",
    highlight: "Pemasukan & Pengeluaran.",
    description: "Tambah transaksi manual kapan saja, bisa sertakan foto atau tanpa foto.",
    color: "bg-blue-100 text-blue-600",
  },
  {
    icon: Wallet,
    title: "Income & Expense",
    highlight: "Surplus atau Defisit?",
    description: "Pantau keseimbangan keuanganmu—lihat apakah pemasukan lebih besar dari pengeluaran.",
    color: "bg-amber-100 text-amber-600",
  },
  {
    icon: Shield,
    title: "Data Aman",
    highlight: "Terenkripsi & Privat.",
    description: "Data keuanganmu tersimpan aman dengan autentikasi Supabase dan enkripsi end-to-end.",
    color: "bg-rose-100 text-rose-600",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-20 sm:py-24 bg-background-light" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">
            Semua yang Perlu, Satu Aplikasi
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">
            Dari struk ke insight—tanpa ribet. Modern fintech, fokus ke kamu.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${f.color}`}>
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">{f.title}</h3>
              <p className="text-primary font-bold text-base mb-2">{f.highlight}</p>
              <p className="text-slate-600 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
