import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-center">
          <div className="max-w-2xl">
            <h1 className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight text-slate-900 mb-6">
              Kelola Keuangan Jadi{" "}
              <span className="text-primary">Satset</span>
            </h1>
            <p className="text-lg text-slate-600 mb-10 leading-relaxed">
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
            <div
              className="w-full max-w-[280px] aspect-[9/18] bg-slate-100 rounded-[2.5rem] border-8 border-slate-200 shadow-2xl flex items-center justify-center"
              aria-hidden
            >
              <div className="w-24 h-24 rounded-2xl bg-slate-200 border border-slate-300" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
