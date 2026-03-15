import { Camera, FolderOpen, BarChart3 } from "lucide-react";

export default function FeaturesSection() {
  return (
    <section className="py-24 bg-background-light" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">
            Semua yang Perlu, Satu Aplikasi
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Dari struk ke insight—tanpa ribet. Modern light fintech, fokus ke kamu.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4">
          {/* AI OCR */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col shadow-sm overflow-hidden md:col-span-2 md:row-span-2">
            <div className="flex-1">
              <div className="bg-primary/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                <Camera className="text-primary w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">AI OCR</h3>
              <p className="text-primary font-bold text-lg">Foto Struk, Beres.</p>
              <p className="text-slate-600 mt-2 text-sm">
                Ambil foto struk belanja—AI baca merchant, nominal, dan tanggal.
              </p>
            </div>
            <div className="mt-6 w-full aspect-9/16 max-h-64 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center">
              <div className="w-24 h-24 rounded-2xl bg-slate-200 border border-slate-300" />
            </div>
          </div>
          {/* Custom Categories */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col shadow-sm overflow-hidden md:col-span-2">
            <div className="flex-1">
              <div className="bg-primary/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                <FolderOpen className="text-primary w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Custom Categories</h3>
              <p className="text-primary font-bold text-lg">Bikin Kategori Suka-suka.</p>
              <p className="text-slate-600 mt-2 text-sm">
                Makanan, transport, belanja—atau buat sendiri. Atur icon dan warna.
              </p>
            </div>
            <div className="mt-6 w-full h-32 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-14 h-14 rounded-xl bg-slate-200 border border-slate-300" />
              ))}
            </div>
          </div>
          {/* Visual Dashboard */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col shadow-sm overflow-hidden md:col-span-2">
            <div className="flex-1">
              <div className="bg-primary/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                <BarChart3 className="text-primary w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Visual Dashboard</h3>
              <p className="text-primary font-bold text-lg">Pantau Pengeluaran Real-time.</p>
              <p className="text-slate-600 mt-2 text-sm">
                Grafik per kategori dan tren harian. Sisa budget bulanan jelas di satu layar.
              </p>
            </div>
            <div className="mt-6 w-full h-40 bg-slate-100 rounded-2xl border border-slate-200 flex flex-col justify-end p-4 gap-2">
              <div className="flex items-end gap-2 h-24">
                {["40%", "70%", "50%", "85%", "60%"].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: h }}
                    className="flex-1 rounded-t bg-slate-200 border border-slate-300 max-w-12"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
