import Link from "next/link";
import { Camera, Sparkles, TrendingUp } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-16 pb-20 lg:pt-28 lg:pb-36 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight text-slate-900 mb-6">
              Kelola Keuangan Jadi{" "}
              <span className="text-primary">Satset</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 mb-10 leading-relaxed">
              Foto struk, beres. Pantau pengeluaran real-time dan bikin kategori suka-suka—semua
              didukung AI. Mulai gratis dengan STRUKIN.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/login"
                className="bg-primary hover:bg-primary-hover text-slate-900 px-8 py-4 rounded-2xl font-bold text-lg shadow-sm border border-primary/20 hover:scale-[1.02] transition-all"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="border-2 border-slate-300 text-slate-900 px-8 py-4 rounded-2xl font-bold text-lg hover:border-primary hover:text-primary transition-all"
              >
                Register
              </Link>
            </div>
          </div>
          <div className="mt-16 lg:mt-0 flex justify-center">
            <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-start gap-4">
                <div className="bg-primary/20 w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
                  <Camera className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">Scan Struk</p>
                  <p className="text-xs text-slate-500 mt-0.5">AI baca otomatis merchant, nominal & tanggal</p>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-start gap-4">
                <div className="bg-emerald-100 w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">Laporan Real-time</p>
                  <p className="text-xs text-slate-500 mt-0.5">Pemasukan vs pengeluaran, harian sampai tahunan</p>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-start gap-4">
                <div className="bg-violet-100 w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">Kategori Custom</p>
                  <p className="text-xs text-slate-500 mt-0.5">Buat kategori sendiri dengan icon & warna</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
