# Sistem Informasi Pengelolaan Poin dan Pembinaan Siswa
### SMA Negeri 2 Pangkalan Kuras

Satu project Laravel 11 yang sekaligus menyajikan REST API dan frontend React.
Tidak ada lagi folder terpisah sejajar -- semuanya ada di dalam satu folder project Laravel ini.

```
poin-siswa/                     <- root project (Laravel)
├── app/                        <- kode backend (model, controller, dsb)
├── config/
├── database/                   <- migrasi & data awal (seeder)
├── resources/
│   └── frontend/                <- source code React (Vite) -- TAMPILAN, tidak diubah
│       ├── src/
│       ├── package.json
│       └── vite.config.ts
├── routes/
│   ├── api.php                 <- endpoint REST API
│   └── web.php                 <- menyajikan React setelah di-build
├── public/
│   └── app/                    <- (otomatis terisi setelah "npm run build")
├── artisan
└── composer.json
```

---

## 1. Setup Awal (sekali saja)

**Database MySQL** -- buat database kosong dulu (lewat phpMyAdmin atau command line):

```sql
CREATE DATABASE poin_siswa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Backend:**
```bash
# dari root folder poin-siswa/
composer install
cp .env.example .env
php artisan key:generate
```

Cek isi `.env`, pastikan bagian `DB_` sudah sesuai (defaultnya sudah diarahkan ke MySQL):
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=poin_siswa
DB_USERNAME=root
DB_PASSWORD=
```
Sesuaikan `DB_USERNAME`/`DB_PASSWORD` dengan MySQL Anda (default XAMPP/Laragon biasanya
`root` tanpa password).

```bash
php artisan migrate:fresh --seed
```

**Frontend:**
```bash
cd resources/frontend
npm install
cd ../..
```

> Jika `npm install` di PowerShell Windows gagal dengan error *"running scripts is disabled"*,
> jalankan Command Prompt (`cmd`) sebagai gantinya, atau jalankan sekali di PowerShell Administrator:
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

---

## 2. Mode Pengembangan (dua proses, tetap satu folder project)

**PENTING soal port:** di banyak instalasi Windows, port default Laravel (8000) diblokir izin
akses sistem (bukan dipakai program lain, tapi ditolak Windows). Supaya konsisten, project ini
sudah diatur untuk selalu memakai **port 8001**.

**Terminal 1 (dari root `poin-siswa/`):**
```bash
php artisan serve --port=8001         # -> http://127.0.0.1:8001
```

**Terminal 2:**
```bash
cd resources/frontend
npm run dev                           # -> http://localhost:5173
```

Buka `http://localhost:5173`. Panggilan ke `/api/...` otomatis diteruskan ke backend port 8001
(sudah diatur lewat proxy di `vite.config.ts`), jadi tidak akan kena masalah CORS.

Kalau di komputer Anda port 8000 ternyata BISA dipakai (tidak semua Windows kena masalah ini),
boleh pakai `php artisan serve` biasa tanpa `--port` -- tapi ubah juga port di
`resources/frontend/vite.config.ts` (cari `target: 'http://127.0.0.1:8001'`) supaya cocok.

---

## 3. Mode Produksi / Satu Server Saja

```bash
cd resources/frontend
npm run build                         # hasil otomatis masuk ke public/app
cd ../..
php artisan serve --port=8001         # buka http://127.0.0.1:8001
```

Yang tampil di `http://127.0.0.1:8001` adalah React yang sudah ter-build, disajikan langsung
oleh Laravel lewat `routes/web.php`. Endpoint API tetap di `http://127.0.0.1:8001/api/...`.

Setiap ada perubahan kode di `resources/frontend`, ulangi `npm run build`.

---

## 4. Akun Default (hasil seeder)

| Role | Email | Password |
|---|---|---|
| Admin | admin@sman2.sch.id | admin123 |
| Guru Piket | hadi@sman2.sch.id | piket123 |
| Guru Piket | dewi@sman2.sch.id | piket123 |
| Guru Piket | rina@sman2.sch.id | piket123 |
| Guru Piket | gunawan@sman2.sch.id | piket123 |

Segera ganti password ini sebelum dipakai di server produksi.

---

## 5. Daftar Endpoint API Penting

| Modul | Endpoint |
|---|---|
| Auth | `POST /api/login`, `POST /api/logout`, `GET /api/me` |
| Siswa | `GET/POST/PUT/DELETE /api/students` |
| Jenis Pelanggaran | `GET/POST/PUT/DELETE /api/violation-types` |
| Pelanggaran | `GET/POST/PUT/DELETE /api/violations`, `POST /api/violations/{id}/verify` |
| Bukti Pelanggaran | `GET /api/violations/{id}/evidence` (privat, wajib login) |
| Pembinaan | `GET/POST/PUT/DELETE /api/guidance` |
| Pemanggilan Ortu | `GET/POST/PUT/DELETE /api/parent-summons` |
| Dashboard | `GET /api/dashboard` |
| Portal Publik (tanpa login) | `POST /api/public/cek-poin` |
| Laporan PDF | `GET /api/reports/student/{id}`, `/kelas`, `/periode`, `/kategori`, `/peringatan/{id}`, `/panggilan/{id}` |

RBAC dua role: `admin` (akses penuh) dan `guru_piket` (kelola kasus miliknya sampai diverifikasi admin),
diatur lewat middleware `role:admin` di `routes/api.php`.

---

## 6. Status Koneksi Frontend ↔ Backend

Frontend (`resources/frontend/src/app/App.tsx`) **sudah tersambung sepenuhnya** ke API Laravel
ini lewat lapisan `resources/frontend/src/lib/api.ts`:

- Login memakai token Sanctum sungguhan (`POST /api/login`), sesi dipulihkan otomatis dari
  `localStorage` saat browser dibuka ulang.
- Semua data (siswa, pelanggaran, jenis pelanggaran, pembinaan, pemanggilan orang tua, akun
  pengguna) diambil & disimpan lewat API -- bukan lagi data contoh statis di memori.
- Poin siswa dihitung ulang otomatis oleh backend setiap ada pelanggaran baru/diverifikasi/diedit.
- Bukti foto pelanggaran diunggah & diambil lewat endpoint privat (`/api/violations/{id}/evidence`),
  tidak bisa diakses lewat URL publik.
- Portal cek poin publik (`/api/public/cek-poin`) tidak butuh login sama sekali.
- Laporan PDF tetap dibuat langsung di browser (fitur asli aplikasi) menggunakan data yang sama.

Sudah diuji: `npm install` dan `npm run build` di `resources/frontend/` berjalan sukses tanpa
error, hasilnya otomatis masuk ke `public/app`.
