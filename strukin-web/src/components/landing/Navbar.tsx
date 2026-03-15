import Link from "next/link";
import { Wallet } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Wallet className="text-slate-900 w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 uppercase">
              STRUKIN
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-slate-800 hover:text-primary font-semibold text-sm transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="bg-primary hover:bg-primary-hover text-slate-900 px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
