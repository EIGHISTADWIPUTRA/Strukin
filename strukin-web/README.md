# Strukin Web

Aplikasi web **STRUKIN** — kelola keuangan dengan AI: foto struk, beres. Next.js (App Router), Supabase Auth, integrasi ke backend FastAPI.

## Setup

1. **Env**

   ```bash
   cp .env.example .env.local
   ```

   Isi di `.env.local`:

   - `NEXT_PUBLIC_API_URL` — base URL backend (mis. `http://localhost:8000`)
   - `NEXT_PUBLIC_SUPABASE_URL` — URL proyek Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key Supabase

2. **Install & jalankan**

   ```bash
   npm install
   npm run dev
   ```

   Buka [http://localhost:3000](http://localhost:3000).

## Halaman

- **/** — Landing: Hero “Kelola Keuangan Jadi Satset” + Features Bento (AI OCR, Custom Categories, Visual Dashboard). CTA Login/Register.
- **/login**, **/register** — Auth via Supabase. Setelah login redirect ke `/dashboard`.
- **/dashboard** — Hanya untuk user login. KPI (Total Pengeluaran bulan ini, Sisa Budget, Jumlah Struk), chart pengeluaran per kategori & tren 7 hari, tabel 5 transaksi terbaru, FAB upload struk → OCR → modal konfirmasi.

## Backend

Backend (strukin-backend) harus jalan dan bisa diakses dari browser (CORS). Endpoint yang dipakai:

- `POST /api/v1/ocr/process` — upload gambar struk (Bearer token).
- `GET /api/v1/transactions?page=1&size=100`
- `GET /api/v1/categories`

Profile (monthly_budget) dibaca dari tabel Supabase `profiles` via client (RLS).
