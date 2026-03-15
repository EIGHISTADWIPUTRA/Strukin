# Strukin Backend

Backend REST API untuk **Strukin** — asisten keuangan berbasis AI. Stack: FastAPI (async), Supabase, Qwen-VL via Alibaba DashScope, Pillow. Dioptimalkan untuk lingkungan ~2GB RAM.

## Ringkasan Fitur

- **OCR Receipt** — `POST /api/v1/ocr/process`: upload gambar struk → resize/compress (Pillow, max 1024px, JPEG 80) → ekstraksi data via Qwen-VL → simpan transaksi + kategori yang cocok.
- **Kategori** — `GET /api/v1/categories` (global + custom user), `POST /api/v1/categories` (buat kategori custom).
- **Riwayat Transaksi** — `GET /api/v1/transactions` dengan paginasi.
- **Auth** — Semua endpoint (kecuali `/health`, `/docs`, `/redoc`) memerlukan `Authorization: Bearer <Supabase JWT>`.

## Panduan Instalasi (venv)

### 1. Persiapan

- Python **3.10 atau lebih baru** terpasang.
- Di Windows: pastikan Python ada di PATH (opsional: centang “Add Python to PATH” saat instalasi).

### 2. Buat dan aktifkan virtual environment

**Windows (PowerShell):**

```powershell
cd e:\Strukin\strukin-backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**Windows (CMD):**

```cmd
cd e:\Strukin\strukin-backend
python -m venv .venv
.venv\Scripts\activate.bat
```

**Linux / macOS:**

```bash
cd /path/to/strukin-backend
python3 -m venv .venv
source .venv/bin/activate
```

Setelah diaktifkan, prompt biasanya menampilkan `(.venv)` di depan path.

### 3. Upgrade pip (disarankan)

```powershell
python -m pip install --upgrade pip
```

### 4. Pasang dependensi

```powershell
pip install -r requirements.txt
```

### 5. Konfigurasi environment

```powershell
copy .env.example .env
```

Edit `.env` dan isi:

- `SUPABASE_URL` — URL proyek Supabase (mis. `https://xxxx.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (Dashboard → Settings → API)
- `SUPABASE_JWT_SECRET` — JWT Secret (Dashboard → Settings → API → JWT Secret)
- `DASHSCOPE_API_KEY` — API key Alibaba Cloud DashScope
- `DASHSCOPE_MODEL` — (opsional) Model VL, default: `qwen-vl-max`

Jangan commit file `.env`.

### 6. Skema database (Supabase)

Jalankan skema SQL sekali di Supabase:

1. Buka **Supabase Dashboard** → **SQL Editor**.
2. Salin isi `supabase/schema.sql`.
3. Jalankan script untuk membuat tabel `profiles`, `categories`, `transactions` dan kebijakan RLS.

### 7. Jalankan server

```powershell
python main.py
```

Atau dengan uvicorn langsung:

```powershell
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
```

- API: `http://localhost:8000`
- Docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

### 8. Nonaktifkan venv

Selesai bekerja:

```powershell
deactivate
```

---

## Struktur Proyek

```
strukin-backend/
├── main.py                 # Entry point, middleware, exception handlers
├── core/
│   ├── config.py           # Settings & env (pydantic-settings)
│   └── security.py         # JWT verification middleware (Supabase)
├── api/
│   ├── routes/             # ocr, categories, transactions
│   └── deps.py             # get_current_user dependency
├── services/
│   ├── ai_service.py       # Pillow resize + DashScope Qwen-VL
│   └── db_service.py       # Supabase async CRUD
├── models/
│   └── schemas.py         # Pydantic request/response
├── supabase/
│   └── schema.sql         # DDL + RLS untuk Supabase
├── .env.example
├── requirements.txt
└── README.md
```

## Endpoint Ringkas

| Method | Path | Auth | Keterangan |
|--------|------|------|------------|
| GET | `/health` | Tidak | Health check |
| POST | `/api/v1/ocr/process` | Bearer | Upload gambar struk → OCR + simpan transaksi |
| GET | `/api/v1/categories` | Bearer | Daftar kategori (global + user) |
| POST | `/api/v1/categories` | Bearer | Buat kategori custom |
| GET | `/api/v1/transactions` | Bearer | Riwayat transaksi (query: `page`, `size`) |

Semua query ke Supabase memakai `user_id` dari JWT sehingga selaras dengan RLS.
