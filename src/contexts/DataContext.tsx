/**
 * DataContext — Konteks data global untuk seluruh aplikasi.
 * Menyimpan dan mengelola semua data: Pasar, Komoditas, Tempat Usaha,
 * Komoditas Dijual, Harga Rutin, dan Harga Pelaporan.
 * Data disimpan di localStorage untuk persistensi prototype.
 */
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { Pasar, Komoditas, TempatUsaha, KomoditasDijual, HargaRutin, HargaPelaporan, KelasKomoditas } from '@/types';

/* ===== Helper Functions ===== */

/** Memuat data dari localStorage, fallback ke default jika kosong */
function load<T>(key: string, fallback: T[]): T[] {
  try {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : fallback;
  } catch { return fallback; }
}

/** Menyimpan data ke localStorage */
function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

/** Membuat unique ID */
function uid() { return crypto.randomUUID(); }

/* ===== Interface Context ===== */

interface DataContextType {
  pasar: Pasar[]; setPasar: React.Dispatch<React.SetStateAction<Pasar[]>>;
  komoditas: Komoditas[]; setKomoditas: React.Dispatch<React.SetStateAction<Komoditas[]>>;
  tempatUsaha: TempatUsaha[]; setTempatUsaha: React.Dispatch<React.SetStateAction<TempatUsaha[]>>;
  komoditasDijual: KomoditasDijual[]; setKomoditasDijual: React.Dispatch<React.SetStateAction<KomoditasDijual[]>>;
  hargaRutin: HargaRutin[]; setHargaRutin: React.Dispatch<React.SetStateAction<HargaRutin[]>>;
  hargaPelaporan: HargaPelaporan[];
  addPasar: (p: Omit<Pasar, 'id'>) => void;
  updatePasar: (id: string, p: Partial<Pasar>) => void;
  deletePasar: (id: string) => void;
  addKomoditas: (k: Omit<Komoditas, 'id'>) => void;
  updateKomoditas: (id: string, k: Partial<Komoditas>) => void;
  deleteKomoditas: (id: string) => void;
  addTempatUsaha: (t: Omit<TempatUsaha, 'id'>) => void;
  updateTempatUsaha: (id: string, t: Partial<TempatUsaha>) => void;
  deleteTempatUsaha: (id: string) => void;
  addKomoditasDijual: (k: Omit<KomoditasDijual, 'id'>) => void;
  updateKomoditasDijual: (id: string, k: Partial<KomoditasDijual>) => void;
  deleteKomoditasDijual: (id: string) => void;
  addHargaRutin: (h: Omit<HargaRutin, 'id'>) => void;
  updateHargaRutin: (id: string, h: Partial<HargaRutin>) => void;
  deleteHargaRutin: (id: string) => void;
  calculateHargaPelaporan: () => HargaPelaporan[];
  getKelasForTU: (tuId: string) => Record<string, KelasKomoditas>;
}

const DataContext = createContext<DataContextType | null>(null);

/** Hook untuk mengakses DataContext */
export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};

/* ===== Data Dummy ===== */

/**
 * Membuat data dummy lengkap untuk semua entitas.
 * ID bersifat statis agar relasi antar data konsisten.
 */
function generateMockData() {
  // --- Pasar: 5 pasar di Bandung ---
  const pasarIds = ['psr-001', 'psr-002', 'psr-003', 'psr-004', 'psr-005'];
  const mockPasar: Pasar[] = [
    { id: pasarIds[0], nama: 'Pasar Andir', longitude: 107.5731, latitude: -6.9147, alamat: 'Jl. Andir No. 1, Bandung', is_active: 1 },
    { id: pasarIds[1], nama: 'Pasar Kosambi', longitude: 107.6089, latitude: -6.9175, alamat: 'Jl. Ahmad Yani No. 221, Bandung', is_active: 1 },
    { id: pasarIds[2], nama: 'Pasar Caringin', longitude: 107.5819, latitude: -6.9350, alamat: 'Jl. Soekarno Hatta No. 525, Bandung', is_active: 1 },
    { id: pasarIds[3], nama: 'Pasar Sederhana', longitude: 107.5955, latitude: -6.8945, alamat: 'Jl. Sederhana No. 35, Bandung', is_active: 1 },
    { id: pasarIds[4], nama: 'Pasar Ciroyom', longitude: 107.5920, latitude: -6.9110, alamat: 'Jl. Ciroyom No. 15, Bandung', is_active: 0 },
  ];

  // --- Komoditas: 8 komoditas pangan utama ---
  const komIds = ['kom-001', 'kom-002', 'kom-003', 'kom-004', 'kom-005', 'kom-006', 'kom-007', 'kom-008'];
  const mockKomoditas: Komoditas[] = [
    { id: komIds[0], nama: 'Beras Premium', satuan_dasar: 'kg', gambar: '' },
    { id: komIds[1], nama: 'Cabai Merah Keriting', satuan_dasar: 'kg', gambar: '' },
    { id: komIds[2], nama: 'Bawang Merah', satuan_dasar: 'kg', gambar: '' },
    { id: komIds[3], nama: 'Minyak Goreng', satuan_dasar: 'liter', gambar: '' },
    { id: komIds[4], nama: 'Gula Pasir', satuan_dasar: 'kg', gambar: '' },
    { id: komIds[5], nama: 'Daging Ayam', satuan_dasar: 'kg', gambar: '' },
    { id: komIds[6], nama: 'Telur Ayam', satuan_dasar: 'kg', gambar: '' },
    { id: komIds[7], nama: 'Bawang Putih', satuan_dasar: 'kg', gambar: '' },
  ];

  // --- Tempat Usaha: 12 toko di berbagai pasar ---
  const tuIds = [
    'tu-001', 'tu-002', 'tu-003', 'tu-004', 'tu-005', 'tu-006',
    'tu-007', 'tu-008', 'tu-009', 'tu-010', 'tu-011', 'tu-012',
  ];
  const mockTempatUsaha: TempatUsaha[] = [
    // Pasar Andir — 3 toko
    { id: tuIds[0], nama: 'Toko Berkah Jaya', nama_pemilik: 'H. Ahmad', nama_narahubung: 'H. Ahmad', nomor_narahubung: '081234567890', berjualan_sejak: '2015-03-10', is_active: 1, pasar_id: pasarIds[0] },
    { id: tuIds[1], nama: 'Toko Makmur', nama_pemilik: 'Ibu Siti', nama_narahubung: 'Ibu Siti', nomor_narahubung: '081234567891', berjualan_sejak: '2018-07-15', is_active: 1, pasar_id: pasarIds[0] },
    { id: tuIds[2], nama: 'Toko Sejahtera', nama_pemilik: 'Pak Udin', nama_narahubung: 'Dedi', nomor_narahubung: '081234567892', berjualan_sejak: '2020-01-05', is_active: 1, pasar_id: pasarIds[0] },
    // Pasar Kosambi — 3 toko
    { id: tuIds[3], nama: 'Toko Sari Rasa', nama_pemilik: 'Ibu Nining', nama_narahubung: 'Ibu Nining', nomor_narahubung: '081345678901', berjualan_sejak: '2012-05-20', is_active: 1, pasar_id: pasarIds[1] },
    { id: tuIds[4], nama: 'Toko Mulia', nama_pemilik: 'H. Kosim', nama_narahubung: 'Ade', nomor_narahubung: '081345678902', berjualan_sejak: '2016-11-08', is_active: 1, pasar_id: pasarIds[1] },
    { id: tuIds[5], nama: 'Toko Melati', nama_pemilik: 'Ibu Rina', nama_narahubung: 'Ibu Rina', nomor_narahubung: '081345678903', berjualan_sejak: '2019-02-14', is_active: 1, pasar_id: pasarIds[1] },
    // Pasar Caringin — 3 toko
    { id: tuIds[6], nama: 'Toko Abadi', nama_pemilik: 'Pak Joko', nama_narahubung: 'Pak Joko', nomor_narahubung: '081456789012', berjualan_sejak: '2010-08-01', is_active: 1, pasar_id: pasarIds[2] },
    { id: tuIds[7], nama: 'Toko Sentosa', nama_pemilik: 'Ibu Dewi', nama_narahubung: 'Sari', nomor_narahubung: '081456789013', berjualan_sejak: '2017-04-22', is_active: 1, pasar_id: pasarIds[2] },
    { id: tuIds[8], nama: 'Toko Bintang', nama_pemilik: 'Pak Rudi', nama_narahubung: 'Pak Rudi', nomor_narahubung: '081456789014', berjualan_sejak: '2021-06-10', is_active: 0, pasar_id: pasarIds[2] },
    // Pasar Sederhana — 3 toko
    { id: tuIds[9], nama: 'Toko Cempaka', nama_pemilik: 'Ibu Ani', nama_narahubung: 'Ibu Ani', nomor_narahubung: '081567890123', berjualan_sejak: '2014-09-30', is_active: 1, pasar_id: pasarIds[3] },
    { id: tuIds[10], nama: 'Toko Harapan', nama_pemilik: 'Pak Dadan', nama_narahubung: 'Pak Dadan', nomor_narahubung: '081567890124', berjualan_sejak: '2019-12-01', is_active: 1, pasar_id: pasarIds[3] },
    { id: tuIds[11], nama: 'Toko Rejeki', nama_pemilik: 'Ibu Yanti', nama_narahubung: 'Ibu Yanti', nomor_narahubung: '081567890125', berjualan_sejak: '2022-03-15', is_active: 1, pasar_id: pasarIds[3] },
  ];

  // --- Komoditas Dijual: setiap toko menjual beberapa komoditas ---
  // Harga bervariasi agar klasifikasi kelas besar/menengah/kecil berfungsi
  const mockKomoditasDijual: KomoditasDijual[] = [
    // Pasar Andir — Beras Premium (3 toko, harga berbeda → klasifikasi otomatis)
    { id: 'kd-001', tempat_usaha_id: tuIds[0], komoditas_id: komIds[0], harga_normal: 14000, harga_mahal: 16000, satuan_stok: 'kg', nilai_stok: 500, nilai_periode: 7, lokasi_supplier: 'Subang', pola_distribusi: 2, standardized_stock_periode: 71.4, is_active: true },
    { id: 'kd-002', tempat_usaha_id: tuIds[1], komoditas_id: komIds[0], harga_normal: 13000, harga_mahal: 14500, satuan_stok: 'kg', nilai_stok: 300, nilai_periode: 7, lokasi_supplier: 'Karawang', pola_distribusi: 3, standardized_stock_periode: 42.9, is_active: true },
    { id: 'kd-003', tempat_usaha_id: tuIds[2], komoditas_id: komIds[0], harga_normal: 12500, harga_mahal: 13500, satuan_stok: 'kg', nilai_stok: 150, nilai_periode: 7, lokasi_supplier: 'Cianjur', pola_distribusi: 1, standardized_stock_periode: 21.4, is_active: true },

    // Pasar Andir — Cabai Merah (3 toko)
    { id: 'kd-004', tempat_usaha_id: tuIds[0], komoditas_id: komIds[1], harga_normal: 55000, harga_mahal: 80000, satuan_stok: 'kg', nilai_stok: 100, nilai_periode: 3, lokasi_supplier: 'Garut', pola_distribusi: 1, standardized_stock_periode: 33.3, is_active: true },
    { id: 'kd-005', tempat_usaha_id: tuIds[1], komoditas_id: komIds[1], harga_normal: 50000, harga_mahal: 70000, satuan_stok: 'kg', nilai_stok: 60, nilai_periode: 3, lokasi_supplier: 'Garut', pola_distribusi: 2, standardized_stock_periode: 20, is_active: true },
    { id: 'kd-006', tempat_usaha_id: tuIds[2], komoditas_id: komIds[1], harga_normal: 45000, harga_mahal: 65000, satuan_stok: 'kg', nilai_stok: 30, nilai_periode: 3, lokasi_supplier: 'Tasikmalaya', pola_distribusi: 1, standardized_stock_periode: 10, is_active: true },

    // Pasar Kosambi — Beras Premium (3 toko)
    { id: 'kd-007', tempat_usaha_id: tuIds[3], komoditas_id: komIds[0], harga_normal: 14500, harga_mahal: 16500, satuan_stok: 'kg', nilai_stok: 600, nilai_periode: 7, lokasi_supplier: 'Subang', pola_distribusi: 3, standardized_stock_periode: 85.7, is_active: true },
    { id: 'kd-008', tempat_usaha_id: tuIds[4], komoditas_id: komIds[0], harga_normal: 13500, harga_mahal: 15000, satuan_stok: 'kg', nilai_stok: 350, nilai_periode: 7, lokasi_supplier: 'Karawang', pola_distribusi: 2, standardized_stock_periode: 50, is_active: true },
    { id: 'kd-009', tempat_usaha_id: tuIds[5], komoditas_id: komIds[0], harga_normal: 12000, harga_mahal: 13000, satuan_stok: 'kg', nilai_stok: 200, nilai_periode: 7, lokasi_supplier: 'Cianjur', pola_distribusi: 1, standardized_stock_periode: 28.6, is_active: true },

    // Pasar Kosambi — Bawang Merah (3 toko)
    { id: 'kd-010', tempat_usaha_id: tuIds[3], komoditas_id: komIds[2], harga_normal: 38000, harga_mahal: 50000, satuan_stok: 'kg', nilai_stok: 80, nilai_periode: 5, lokasi_supplier: 'Brebes', pola_distribusi: 2, standardized_stock_periode: 16, is_active: true },
    { id: 'kd-011', tempat_usaha_id: tuIds[4], komoditas_id: komIds[2], harga_normal: 35000, harga_mahal: 45000, satuan_stok: 'kg', nilai_stok: 50, nilai_periode: 5, lokasi_supplier: 'Brebes', pola_distribusi: 1, standardized_stock_periode: 10, is_active: true },
    { id: 'kd-012', tempat_usaha_id: tuIds[5], komoditas_id: komIds[2], harga_normal: 32000, harga_mahal: 40000, satuan_stok: 'kg', nilai_stok: 25, nilai_periode: 5, lokasi_supplier: 'Cirebon', pola_distribusi: 1, standardized_stock_periode: 5, is_active: true },

    // Pasar Caringin — Minyak Goreng (3 toko)
    { id: 'kd-013', tempat_usaha_id: tuIds[6], komoditas_id: komIds[3], harga_normal: 18000, harga_mahal: 22000, satuan_stok: 'liter', nilai_stok: 200, nilai_periode: 7, lokasi_supplier: 'Jakarta', pola_distribusi: 3, standardized_stock_periode: 28.6, is_active: true },
    { id: 'kd-014', tempat_usaha_id: tuIds[7], komoditas_id: komIds[3], harga_normal: 17000, harga_mahal: 20000, satuan_stok: 'liter', nilai_stok: 120, nilai_periode: 7, lokasi_supplier: 'Jakarta', pola_distribusi: 2, standardized_stock_periode: 17.1, is_active: true },
    { id: 'kd-015', tempat_usaha_id: tuIds[8], komoditas_id: komIds[3], harga_normal: 16000, harga_mahal: 18500, satuan_stok: 'liter', nilai_stok: 50, nilai_periode: 7, lokasi_supplier: 'Surabaya', pola_distribusi: 1, standardized_stock_periode: 7.1, is_active: true },

    // Pasar Caringin — Gula Pasir (2 toko)
    { id: 'kd-016', tempat_usaha_id: tuIds[6], komoditas_id: komIds[4], harga_normal: 16000, harga_mahal: 18000, satuan_stok: 'kg', nilai_stok: 300, nilai_periode: 7, lokasi_supplier: 'Cirebon', pola_distribusi: 2, standardized_stock_periode: 42.9, is_active: true },
    { id: 'kd-017', tempat_usaha_id: tuIds[7], komoditas_id: komIds[4], harga_normal: 15000, harga_mahal: 17000, satuan_stok: 'kg', nilai_stok: 150, nilai_periode: 7, lokasi_supplier: 'Cirebon', pola_distribusi: 1, standardized_stock_periode: 21.4, is_active: true },

    // Pasar Sederhana — Daging Ayam (3 toko)
    { id: 'kd-018', tempat_usaha_id: tuIds[9], komoditas_id: komIds[5], harga_normal: 36000, harga_mahal: 42000, satuan_stok: 'kg', nilai_stok: 80, nilai_periode: 3, lokasi_supplier: 'Lembang', pola_distribusi: 1, standardized_stock_periode: 26.7, is_active: true },
    { id: 'kd-019', tempat_usaha_id: tuIds[10], komoditas_id: komIds[5], harga_normal: 34000, harga_mahal: 38000, satuan_stok: 'kg', nilai_stok: 50, nilai_periode: 3, lokasi_supplier: 'Lembang', pola_distribusi: 2, standardized_stock_periode: 16.7, is_active: true },
    { id: 'kd-020', tempat_usaha_id: tuIds[11], komoditas_id: komIds[5], harga_normal: 32000, harga_mahal: 36000, satuan_stok: 'kg', nilai_stok: 30, nilai_periode: 3, lokasi_supplier: 'Ciwidey', pola_distribusi: 1, standardized_stock_periode: 10, is_active: true },

    // Pasar Sederhana — Telur Ayam (3 toko)
    { id: 'kd-021', tempat_usaha_id: tuIds[9], komoditas_id: komIds[6], harga_normal: 28000, harga_mahal: 32000, satuan_stok: 'kg', nilai_stok: 100, nilai_periode: 5, lokasi_supplier: 'Sumedang', pola_distribusi: 2, standardized_stock_periode: 20, is_active: true },
    { id: 'kd-022', tempat_usaha_id: tuIds[10], komoditas_id: komIds[6], harga_normal: 27000, harga_mahal: 30000, satuan_stok: 'kg', nilai_stok: 60, nilai_periode: 5, lokasi_supplier: 'Sumedang', pola_distribusi: 1, standardized_stock_periode: 12, is_active: true },
    { id: 'kd-023', tempat_usaha_id: tuIds[11], komoditas_id: komIds[6], harga_normal: 26000, harga_mahal: 29000, satuan_stok: 'kg', nilai_stok: 40, nilai_periode: 5, lokasi_supplier: 'Garut', pola_distribusi: 1, standardized_stock_periode: 8, is_active: true },

    // Beberapa tambahan Bawang Putih
    { id: 'kd-024', tempat_usaha_id: tuIds[0], komoditas_id: komIds[7], harga_normal: 35000, harga_mahal: 45000, satuan_stok: 'kg', nilai_stok: 70, nilai_periode: 5, lokasi_supplier: 'Import China', pola_distribusi: 3, standardized_stock_periode: 14, is_active: true },
    { id: 'kd-025', tempat_usaha_id: tuIds[1], komoditas_id: komIds[7], harga_normal: 33000, harga_mahal: 42000, satuan_stok: 'kg', nilai_stok: 40, nilai_periode: 5, lokasi_supplier: 'Import China', pola_distribusi: 2, standardized_stock_periode: 8, is_active: true },
    { id: 'kd-026', tempat_usaha_id: tuIds[2], komoditas_id: komIds[7], harga_normal: 30000, harga_mahal: 38000, satuan_stok: 'kg', nilai_stok: 20, nilai_periode: 5, lokasi_supplier: 'Import China', pola_distribusi: 1, standardized_stock_periode: 4, is_active: true },
  ];

  // --- Harga Rutin: data 7 hari terakhir, semua sudah difinalisasi ---
  // Dibuat untuk beberapa pasar dan komoditas agar dashboard terisi
  const today = new Date();
  const mockHargaRutin: HargaRutin[] = [];

  /** Helper: membuat tanggal X hari lalu dalam format YYYY-MM-DD */
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  };

  // Data harga 7 hari — Pasar Andir, Beras Premium (3 kelas)
  const berasHargaBesar = [15500, 15200, 15300, 15800, 15600, 15400, 15700];
  const berasHargaMenengah = [14000, 13800, 13900, 14200, 14100, 14000, 14300];
  const berasHargaKecil = [13000, 12800, 12900, 13200, 13100, 13000, 13100];

  for (let i = 6; i >= 0; i--) {
    const tgl = daysAgo(i);
    // Beras Premium — 3 kelas
    mockHargaRutin.push(
      { id: `hr-beras-b-${i}`, nama_enumerator: 'Andi Surveyor', tanggal: tgl, pasar_id: pasarIds[0], komoditas_id: komIds[0], kelas_komoditas: 'besar', tempat_usaha_id: tuIds[0], harga: berasHargaBesar[6 - i], status: 'finalisasi' },
      { id: `hr-beras-m-${i}`, nama_enumerator: 'Andi Surveyor', tanggal: tgl, pasar_id: pasarIds[0], komoditas_id: komIds[0], kelas_komoditas: 'menengah', tempat_usaha_id: tuIds[1], harga: berasHargaMenengah[6 - i], status: 'finalisasi' },
      { id: `hr-beras-k-${i}`, nama_enumerator: 'Andi Surveyor', tanggal: tgl, pasar_id: pasarIds[0], komoditas_id: komIds[0], kelas_komoditas: 'kecil', tempat_usaha_id: tuIds[2], harga: berasHargaKecil[6 - i], status: 'finalisasi' },
    );
  }

  // Data harga 7 hari — Pasar Andir, Cabai Merah Keriting
  const cabaiHargaBesar = [75000, 72000, 68000, 65000, 60000, 58000, 55000]; // tren turun
  const cabaiHargaMenengah = [65000, 63000, 60000, 58000, 55000, 52000, 50000];
  const cabaiHargaKecil = [55000, 53000, 50000, 48000, 46000, 45000, 43000];

  for (let i = 6; i >= 0; i--) {
    const tgl = daysAgo(i);
    mockHargaRutin.push(
      { id: `hr-cabai-b-${i}`, nama_enumerator: 'Budi Petugas', tanggal: tgl, pasar_id: pasarIds[0], komoditas_id: komIds[1], kelas_komoditas: 'besar', tempat_usaha_id: tuIds[0], harga: cabaiHargaBesar[6 - i], status: 'finalisasi' },
      { id: `hr-cabai-m-${i}`, nama_enumerator: 'Budi Petugas', tanggal: tgl, pasar_id: pasarIds[0], komoditas_id: komIds[1], kelas_komoditas: 'menengah', tempat_usaha_id: tuIds[1], harga: cabaiHargaMenengah[6 - i], status: 'finalisasi' },
      { id: `hr-cabai-k-${i}`, nama_enumerator: 'Budi Petugas', tanggal: tgl, pasar_id: pasarIds[0], komoditas_id: komIds[1], kelas_komoditas: 'kecil', tempat_usaha_id: tuIds[2], harga: cabaiHargaKecil[6 - i], status: 'finalisasi' },
    );
  }

  // Data harga 7 hari — Pasar Kosambi, Bawang Merah
  const bawangHargaBesar = [42000, 43000, 44000, 46000, 47000, 48000, 50000]; // tren naik
  const bawangHargaMenengah = [38000, 39000, 40000, 41000, 42000, 43000, 44000];
  const bawangHargaKecil = [34000, 35000, 35500, 36000, 37000, 38000, 39000];

  for (let i = 6; i >= 0; i--) {
    const tgl = daysAgo(i);
    mockHargaRutin.push(
      { id: `hr-bawang-b-${i}`, nama_enumerator: 'Cici Enumerator', tanggal: tgl, pasar_id: pasarIds[1], komoditas_id: komIds[2], kelas_komoditas: 'besar', tempat_usaha_id: tuIds[3], harga: bawangHargaBesar[6 - i], status: 'finalisasi' },
      { id: `hr-bawang-m-${i}`, nama_enumerator: 'Cici Enumerator', tanggal: tgl, pasar_id: pasarIds[1], komoditas_id: komIds[2], kelas_komoditas: 'menengah', tempat_usaha_id: tuIds[4], harga: bawangHargaMenengah[6 - i], status: 'finalisasi' },
      { id: `hr-bawang-k-${i}`, nama_enumerator: 'Cici Enumerator', tanggal: tgl, pasar_id: pasarIds[1], komoditas_id: komIds[2], kelas_komoditas: 'kecil', tempat_usaha_id: tuIds[5], harga: bawangHargaKecil[6 - i], status: 'finalisasi' },
    );
  }

  // Data harga 7 hari — Pasar Caringin, Minyak Goreng (stabil)
  const minyakHargaBesar = [20000, 20000, 20000, 20000, 20000, 20000, 20000];
  const minyakHargaMenengah = [18500, 18500, 18500, 18500, 18500, 18500, 18500];
  const minyakHargaKecil = [17000, 17000, 17000, 17000, 17000, 17000, 17000];

  for (let i = 6; i >= 0; i--) {
    const tgl = daysAgo(i);
    mockHargaRutin.push(
      { id: `hr-minyak-b-${i}`, nama_enumerator: 'Dedi Surveyor', tanggal: tgl, pasar_id: pasarIds[2], komoditas_id: komIds[3], kelas_komoditas: 'besar', tempat_usaha_id: tuIds[6], harga: minyakHargaBesar[6 - i], status: 'finalisasi' },
      { id: `hr-minyak-m-${i}`, nama_enumerator: 'Dedi Surveyor', tanggal: tgl, pasar_id: pasarIds[2], komoditas_id: komIds[3], kelas_komoditas: 'menengah', tempat_usaha_id: tuIds[7], harga: minyakHargaMenengah[6 - i], status: 'finalisasi' },
      { id: `hr-minyak-k-${i}`, nama_enumerator: 'Dedi Surveyor', tanggal: tgl, pasar_id: pasarIds[2], komoditas_id: komIds[3], kelas_komoditas: 'kecil', tempat_usaha_id: tuIds[8], harga: minyakHargaKecil[6 - i], status: 'finalisasi' },
    );
  }

  // Data harga 7 hari — Pasar Sederhana, Daging Ayam (naik ringan)
  const ayamHargaBesar = [38000, 38500, 39000, 39000, 39500, 40000, 41000];
  const ayamHargaMenengah = [35000, 35500, 36000, 36000, 36500, 37000, 37500];
  const ayamHargaKecil = [33000, 33000, 33500, 34000, 34000, 34500, 35000];

  for (let i = 6; i >= 0; i--) {
    const tgl = daysAgo(i);
    mockHargaRutin.push(
      { id: `hr-ayam-b-${i}`, nama_enumerator: 'Evi Petugas', tanggal: tgl, pasar_id: pasarIds[3], komoditas_id: komIds[5], kelas_komoditas: 'besar', tempat_usaha_id: tuIds[9], harga: ayamHargaBesar[6 - i], status: 'finalisasi' },
      { id: `hr-ayam-m-${i}`, nama_enumerator: 'Evi Petugas', tanggal: tgl, pasar_id: pasarIds[3], komoditas_id: komIds[5], kelas_komoditas: 'menengah', tempat_usaha_id: tuIds[10], harga: ayamHargaMenengah[6 - i], status: 'finalisasi' },
      { id: `hr-ayam-k-${i}`, nama_enumerator: 'Evi Petugas', tanggal: tgl, pasar_id: pasarIds[3], komoditas_id: komIds[5], kelas_komoditas: 'kecil', tempat_usaha_id: tuIds[11], harga: ayamHargaKecil[6 - i], status: 'finalisasi' },
    );
  }

  // Tambah beberapa entry "dalam_proses" untuk hari ini
  mockHargaRutin.push(
    { id: 'hr-proses-1', nama_enumerator: 'Fani Petugas', tanggal: daysAgo(0), pasar_id: pasarIds[1], komoditas_id: komIds[0], kelas_komoditas: 'besar', tempat_usaha_id: tuIds[3], harga: 15800, status: 'dalam_proses' },
    { id: 'hr-proses-2', nama_enumerator: 'Fani Petugas', tanggal: daysAgo(0), pasar_id: pasarIds[1], komoditas_id: komIds[0], kelas_komoditas: 'menengah', tempat_usaha_id: tuIds[4], harga: 14100, status: 'dalam_proses' },
  );

  return { mockPasar, mockKomoditas, mockTempatUsaha, mockKomoditasDijual, mockHargaRutin };
}

/* ===== Provider Component ===== */

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  /** Membuat data default sekali saat pertama kali dijalankan */
  const defaults = generateMockData();

  // State untuk setiap entitas, dimuat dari localStorage jika ada
  const [pasar, setPasar] = useState<Pasar[]>(() => load('pasar', defaults.mockPasar));
  const [komoditas, setKomoditas] = useState<Komoditas[]>(() => load('komoditas', defaults.mockKomoditas));
  const [tempatUsaha, setTempatUsaha] = useState<TempatUsaha[]>(() => load('tempatUsaha', defaults.mockTempatUsaha));
  const [komoditasDijual, setKomoditasDijual] = useState<KomoditasDijual[]>(() => load('komoditasDijual', defaults.mockKomoditasDijual));
  const [hargaRutin, setHargaRutin] = useState<HargaRutin[]>(() => load('hargaRutin', defaults.mockHargaRutin));

  /**
   * Helper persist: memperbarui state dan menyimpan ke localStorage secara atomik.
   * Menghindari duplikasi kode save di setiap operasi CRUD.
   */
  const persist = useCallback(<T,>(key: string, setter: React.Dispatch<React.SetStateAction<T[]>>, updater: (prev: T[]) => T[]) => {
    setter(prev => {
      const next = updater(prev);
      save(key, next);
      return next;
    });
  }, []);

  /* ===== CRUD Pasar ===== */
  const addPasar = (p: Omit<Pasar, 'id'>) => persist('pasar', setPasar, prev => [...prev, { ...p, id: uid() }]);
  const updatePasar = (id: string, p: Partial<Pasar>) => persist('pasar', setPasar, prev => prev.map(x => x.id === id ? { ...x, ...p } : x));
  const deletePasar = (id: string) => persist('pasar', setPasar, prev => prev.filter(x => x.id !== id));

  /* ===== CRUD Komoditas ===== */
  const addKomoditas = (k: Omit<Komoditas, 'id'>) => persist('komoditas', setKomoditas, prev => [...prev, { ...k, id: uid() }]);
  const updateKomoditas = (id: string, k: Partial<Komoditas>) => persist('komoditas', setKomoditas, prev => prev.map(x => x.id === id ? { ...x, ...k } : x));
  const deleteKomoditas = (id: string) => persist('komoditas', setKomoditas, prev => prev.filter(x => x.id !== id));

  /* ===== CRUD Tempat Usaha ===== */
  const addTempatUsaha = (t: Omit<TempatUsaha, 'id'>) => persist('tempatUsaha', setTempatUsaha, prev => [...prev, { ...t, id: uid() }]);
  const updateTempatUsaha = (id: string, t: Partial<TempatUsaha>) => persist('tempatUsaha', setTempatUsaha, prev => prev.map(x => x.id === id ? { ...x, ...t } : x));
  const deleteTempatUsaha = (id: string) => persist('tempatUsaha', setTempatUsaha, prev => prev.filter(x => x.id !== id));

  /* ===== CRUD Komoditas Dijual ===== */
  /** Menambah komoditas dijual + otomatis menghitung standardized_stock_periode */
  const addKomoditasDijual = (k: Omit<KomoditasDijual, 'id'>) => {
    const newItem = { ...k, id: uid() };
    // Kalkulasi otomatis: stok per periode = nilai_stok / nilai_periode
    newItem.standardized_stock_periode = k.nilai_stok > 0 && k.nilai_periode > 0 ? k.nilai_stok / k.nilai_periode : 0;
    persist('komoditasDijual', setKomoditasDijual, prev => [...prev, newItem]);
  };

  /** Memperbarui komoditas dijual + re-kalkulasi standardized_stock_periode */
  const updateKomoditasDijual = (id: string, k: Partial<KomoditasDijual>) => {
    persist('komoditasDijual', setKomoditasDijual, prev => prev.map(x => {
      if (x.id !== id) return x;
      const updated = { ...x, ...k };
      updated.standardized_stock_periode = updated.nilai_stok > 0 && updated.nilai_periode > 0 ? updated.nilai_stok / updated.nilai_periode : 0;
      return updated;
    }));
  };
  const deleteKomoditasDijual = (id: string) => persist('komoditasDijual', setKomoditasDijual, prev => prev.filter(x => x.id !== id));

  /* ===== CRUD Harga Rutin ===== */
  const addHargaRutin = (h: Omit<HargaRutin, 'id'>) => persist('hargaRutin', setHargaRutin, prev => [...prev, { ...h, id: uid() }]);
  const updateHargaRutin = (id: string, h: Partial<HargaRutin>) => persist('hargaRutin', setHargaRutin, prev => prev.map(x => x.id === id ? { ...x, ...h } : x));
  const deleteHargaRutin = (id: string) => persist('hargaRutin', setHargaRutin, prev => prev.filter(x => x.id !== id));

  /* ===== Klasifikasi Kelas Otomatis ===== */
  /**
   * Mengklasifikasikan tempat usaha ke dalam kelas besar/menengah/kecil
   * berdasarkan rata-rata harga_normal dan harga_mahal komoditas yang dijual.
   *
   * Logika: untuk setiap komoditas di suatu pasar,
   * - Urutkan TU berdasarkan avg harga (descending)
   * - 1/3 teratas = "besar", 1/3 tengah = "menengah", 1/3 bawah = "kecil"
   */
  const getKelasForTU = useCallback((tuId: string): Record<string, KelasKomoditas> => {
    const tu = tempatUsaha.find(t => t.id === tuId);
    if (!tu) return {};
    const result: Record<string, KelasKomoditas> = {};
    const tuKDs = komoditasDijual.filter(kd => kd.tempat_usaha_id === tuId);

    tuKDs.forEach(kd => {
      // Cari semua TU di pasar yang sama yang menjual komoditas yang sama
      const allKDsForKomInPasar = komoditasDijual.filter(otherKd => {
        if (otherKd.komoditas_id !== kd.komoditas_id) return false;
        const otherTU = tempatUsaha.find(t => t.id === otherKd.tempat_usaha_id);
        return otherTU && otherTU.pasar_id === tu.pasar_id;
      });

      if (allKDsForKomInPasar.length === 0) return;

      // Hitung harga rata-rata per TU dan urutkan dari tertinggi
      const tuAvgs = allKDsForKomInPasar.map(item => ({
        tuId: item.tempat_usaha_id,
        avg: (item.harga_normal + item.harga_mahal) / 2
      })).sort((a, b) => b.avg - a.avg);

      // Bagi 3 kelompok berdasarkan urutan
      const total = tuAvgs.length;
      const third = Math.ceil(total / 3);
      const idx = tuAvgs.findIndex(x => x.tuId === tuId);

      if (idx < third) result[kd.komoditas_id] = 'besar';
      else if (idx < third * 2) result[kd.komoditas_id] = 'menengah';
      else result[kd.komoditas_id] = 'kecil';
    });

    return result;
  }, [tempatUsaha, komoditasDijual]);

  /* ===== Kalkulasi Harga Pelaporan ===== */
  /**
   * Menghitung harga pelaporan dari data harga rutin yang sudah difinalisasi.
   * Harga pelaporan = rata-rata dari harga 3 kelas (besar, menengah, kecil)
   * untuk kombinasi tanggal + pasar + komoditas yang sama.
   */
  const calculateHargaPelaporan = useCallback((): HargaPelaporan[] => {
    // Hanya ambil data yang sudah difinalisasi
    const finalized = hargaRutin.filter(h => h.status === 'finalisasi');

    // Kelompokkan berdasarkan tanggal + pasar + komoditas
    const grouped: Record<string, HargaRutin[]> = {};
    finalized.forEach(h => {
      const key = `${h.tanggal}_${h.pasar_id}_${h.komoditas_id}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(h);
    });

    // Hitung rata-rata untuk setiap kelompok
    return Object.entries(grouped).map(([, items]) => {
      const besar = items.find(i => i.kelas_komoditas === 'besar');
      const menengah = items.find(i => i.kelas_komoditas === 'menengah');
      const kecil = items.find(i => i.kelas_komoditas === 'kecil');
      const prices = [besar?.harga, menengah?.harga, kecil?.harga].filter((p): p is number => p != null);
      const avg = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
      return {
        id: uid(),
        tanggal: items[0].tanggal,
        pasar_id: items[0].pasar_id,
        komoditas_id: items[0].komoditas_id,
        harga_rata_rata: Math.round(avg),
        harga_besar: besar?.harga ?? null,
        harga_menengah: menengah?.harga ?? null,
        harga_kecil: kecil?.harga ?? null,
      };
    });
  }, [hargaRutin]);

  /** Harga pelaporan dihitung ulang setiap kali hargaRutin berubah */
  const hargaPelaporan = calculateHargaPelaporan();

  return (
    <DataContext.Provider value={{
      pasar, setPasar, komoditas, setKomoditas, tempatUsaha, setTempatUsaha,
      komoditasDijual, setKomoditasDijual, hargaRutin, setHargaRutin, hargaPelaporan,
      addPasar, updatePasar, deletePasar,
      addKomoditas, updateKomoditas, deleteKomoditas,
      addTempatUsaha, updateTempatUsaha, deleteTempatUsaha,
      addKomoditasDijual, updateKomoditasDijual, deleteKomoditasDijual,
      addHargaRutin, updateHargaRutin, deleteHargaRutin, calculateHargaPelaporan,
      getKelasForTU,
    }}>
      {children}
    </DataContext.Provider>
  );
};
