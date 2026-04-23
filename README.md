# Sistem Informasi Harga Pangan 

Dashboard admin berbasis React + TypeScript untuk mengelola data pasar, komoditas, tempat usaha, input harga rutin, dan menghasilkan harga pelaporan secara otomatis dari data yang sudah difinalisasi.

## Daftar Isi

- [Tentang Proyek](#tentang-proyek)
- [Fitur Utama](#fitur-utama)
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Arsitektur Aplikasi](#arsitektur-aplikasi)
- [Daftar Halaman dan Route](#daftar-halaman-dan-route)
- [Persiapan Lingkungan](#persiapan-lingkungan)
- [Instalasi dan Menjalankan Proyek](#instalasi-dan-menjalankan-proyek)
- [Akun Demo](#akun-demo)
- [Daftar Script NPM](#daftar-script-npm)
- [Pengujian dan Linting](#pengujian-dan-linting)
- [Penyimpanan Data](#penyimpanan-data)
- [Struktur Proyek](#struktur-proyek)
- [Troubleshooting](#troubleshooting)
- [Catatan Keamanan](#catatan-keamanan)
- [Rencana Pengembangan](#rencana-pengembangan)

## Tentang Proyek

Sistem ini membantu alur kerja admin untuk:

- Mengelola data master pasar
- Mengelola data komoditas
- Mengelola data tempat usaha
- Mengelola relasi komoditas yang dijual per tempat usaha
- Mencatat harga rutin harian
- Menghasilkan harga pelaporan berbasis rata-rata dari data berstatus finalisasi

Saat ini aplikasi bersifat front-end first dan menyimpan data di browser menggunakan localStorage.

## Fitur Utama

- Login sederhana dengan proteksi route
- Tema light/dark
- CRUD untuk entitas utama:
  - Pasar
  - Komoditas
  - Tempat Usaha
  - Komoditas Dijual
  - Harga Rutin
- Klasifikasi kelas komoditas otomatis: `besar`, `menengah`, `kecil`
- Perhitungan harga pelaporan otomatis dari data harga rutin yang sudah finalisasi
- Data mock bawaan untuk demo dan pengembangan lokal

## Teknologi yang Digunakan

- React 18
- TypeScript
- Vite 5
- Tailwind CSS
- shadcn/ui + Radix UI
- React Router v6
- TanStack Query
- Vitest + Testing Library
- Playwright (dependency siap digunakan)

## Arsitektur Aplikasi

Provider di root aplikasi dibungkus dengan urutan berikut:

1. `QueryClientProvider`
2. `ThemeProvider`
3. `AuthProvider`
4. `DataProvider`
5. `TooltipProvider`
6. Router + route pages

Konteks global utama:

- `AuthContext`: mengelola status login, proses login, dan logout.
- `ThemeContext`: mengelola mode tema dan persistensi preferensi tema.
- `DataContext`: mengelola state domain, operasi CRUD, klasifikasi kelas komoditas, dan kalkulasi harga pelaporan.

## Daftar Halaman dan Route

Route publik:

- `/login`

Route terproteksi:

- `/dashboard`
- `/pasar`
- `/komoditas`
- `/tempat-usaha`
- `/harga-rutin`
- `/harga-pelaporan`

Fallback route:

- `*` (halaman not found)

## Persiapan Lingkungan

- Node.js 20+ (disarankan)
- npm 10+ (disarankan)

## Instalasi dan Menjalankan Proyek

1. Install dependensi:

```bash
npm install
```

2. Jalankan server development:

```bash
npm run dev
```

3. Buka aplikasi di browser:

```text
http://localhost:5173
```

## Akun Demo

Untuk kebutuhan lokal/demo, kredensial login saat ini masih hardcoded:

- Email: `admin@admin.com`
- Password: `admin123`

## Daftar Script NPM

Menjalankan mode development:

```bash
npm run dev
```

Build produksi:

```bash
npm run build
```

Build mode development:

```bash
npm run build:dev
```

Preview hasil build:

```bash
npm run preview
```

Linting:

```bash
npm run lint
```

Menjalankan test sekali:

```bash
npm run test
```

Menjalankan test mode watch:

```bash
npm run test:watch
```

## Pengujian dan Linting

Pengujian menggunakan Vitest dengan setup di folder `src/test`.

Jalankan test:

```bash
npm run test
```

Jalankan lint:

```bash
npm run lint
```

## Penyimpanan Data

Data aplikasi disimpan di localStorage browser.

Key yang digunakan antara lain:

- `auth`
- `theme`
- `pasar`
- `komoditas`
- `tempatUsaha`
- `komoditasDijual`
- `hargaRutin`

Catatan perilaku data:

- Jika key belum ada, aplikasi mengisi data awal menggunakan mock data.
- `hargaPelaporan` dihitung dari entri `hargaRutin` dengan status `finalisasi`.
- Saat logout, key `auth` akan dihapus.

Untuk reset data demo, bersihkan localStorage dari browser DevTools.

## Struktur Proyek

```text
src/
  components/        Komponen UI reusable dan layout
  contexts/          Provider global (auth, data, tema)
  hooks/             Custom hooks
  lib/               Utility helpers
  pages/             Halaman berdasarkan route
  test/              Setup dan unit test
  types/             Definisi tipe TypeScript
```

File penting:

- `src/App.tsx` - konfigurasi provider dan route utama
- `src/contexts/AuthContext.tsx` - logika autentikasi
- `src/contexts/DataContext.tsx` - store data, CRUD, dan kalkulasi
- `src/contexts/ThemeContext.tsx` - manajemen tema

## Troubleshooting

Jika port 5173 sudah digunakan:

```bash
npm run dev -- --port 5174
```

Jika muncul warning Browserslist outdated:

```bash
npx update-browserslist-db@latest
```

Jika instalasi dependensi gagal di Windows:

- Tutup aplikasi yang mengunci folder `node_modules`.
- Hapus `node_modules` dan lockfile, lalu install ulang.
- Jalankan terminal sebagai Administrator bila diperlukan.

Clean reinstall (Git Bash):

```bash
rm -rf node_modules package-lock.json
npm install
```

Clean reinstall (PowerShell):

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

## Catatan Keamanan

- Mekanisme auth saat ini belum production-grade.
- Kredensial masih hardcoded untuk keperluan demo.
- Penyimpanan auth/data di localStorage belum aman untuk production.

Sebelum produksi, integrasikan backend API dan mekanisme autentikasi yang aman (misalnya token berbasis HTTP-only cookie, validasi server-side, dan kontrol akses berbasis role).

## Rencana Pengembangan

README ini dapat ditingkatkan lagi dengan:

- Dokumentasi kontrak API (request/response)
- Panduan deployment (Vercel, Netlify, Docker)
- Panduan kontribusi tim (flow branch, checklist PR, standar code review)
