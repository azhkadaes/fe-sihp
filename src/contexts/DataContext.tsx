/**
 * DataContext — Konteks data global untuk seluruh aplikasi.
 * Menyimpan dan mengelola semua data: Pasar, Komoditas, Tempat Usaha,
 * Komoditas Dijual, Harga Rutin, dan Harga Pelaporan.
 * Data disimpan di localStorage untuk persistensi prototype.
 */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { Pasar, Komoditas, TempatUsaha, KomoditasDijual, HargaRutin, HargaPelaporan, KelasKomoditas, PeriodeUnit } from '@/types';
import { calcStandardizedStockPerDay } from '@/types';
import {
  fetchKomoditasList,
  createKomoditasApi,
  updateKomoditasApi,
  uploadKomoditasGambarApi,
} from '@/lib/komoditas-api';
import {
  fetchPasarList,
  createPasarApi,
  updatePasarApi,
  deletePasarApi,
} from '@/lib/pasar-api';
import {
  fetchTempatUsahaList,
  createTempatUsahaApi,
  updateTempatUsahaApi,
  deleteTempatUsahaApi,
} from '@/lib/tempat-usaha-api';
import {
  fetchKomoditasDijualList,
  createKomoditasDijualApi,
  updateKomoditasDijualApi,
  deleteKomoditasDijualApi,
} from '@/lib/komoditas-dijual-api';
import { getAccessToken } from '@/lib/api';
import { hitungHargaStandar } from '@/types';

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
  refreshPasar: () => Promise<void>;
  refreshKomoditas: () => Promise<void>;
  refreshTempatUsaha: () => Promise<void>;
  refreshKomoditasDijual: (tempatUsahaId?: string) => Promise<void>;
  pasar: Pasar[]; setPasar: React.Dispatch<React.SetStateAction<Pasar[]>>;
  komoditas: Komoditas[]; setKomoditas: React.Dispatch<React.SetStateAction<Komoditas[]>>;
  tempatUsaha: TempatUsaha[]; setTempatUsaha: React.Dispatch<React.SetStateAction<TempatUsaha[]>>;
  komoditasDijual: KomoditasDijual[]; setKomoditasDijual: React.Dispatch<React.SetStateAction<KomoditasDijual[]>>;
  hargaRutin: HargaRutin[]; setHargaRutin: React.Dispatch<React.SetStateAction<HargaRutin[]>>;
  hargaPelaporan: HargaPelaporan[];
  addPasar: (p: Omit<Pasar, 'id'>) => void;
  createPasar: (p: Omit<Pasar, 'id'>) => Promise<Pasar>;
  updatePasar: (id: string, p: Partial<Pasar>) => Promise<Pasar>;
  deletePasar: (id: string) => Promise<void>;
  addKomoditas: (k: Omit<Komoditas, 'id'>) => void;
  createKomoditas: (k: Omit<Komoditas, 'id'>, imageFile?: File | null) => Promise<Komoditas>;
  updateKomoditas: (id: string, k: Partial<Komoditas>, imageFile?: File | null) => Promise<Komoditas>;
  deleteKomoditas: (id: string) => void;
  addTempatUsaha: (t: Omit<TempatUsaha, 'id'>) => void;
  createTempatUsaha: (t: Omit<TempatUsaha, 'id'>) => Promise<TempatUsaha>;
  updateTempatUsaha: (id: string, t: Partial<TempatUsaha>) => Promise<TempatUsaha>;
  deleteTempatUsaha: (id: string) => Promise<void>;
  addKomoditasDijual: (k: Omit<KomoditasDijual, 'id'>) => void;
  createKomoditasDijual: (k: Omit<KomoditasDijual, 'id'>) => Promise<KomoditasDijual>;
  updateKomoditasDijual: (id: string, k: Partial<KomoditasDijual>) => Promise<KomoditasDijual>;
  deleteKomoditasDijual: (id: string) => Promise<void>;
  addHargaRutin: (h: Omit<HargaRutin, 'id'>) => void;
  updateHargaRutin: (id: string, h: Partial<HargaRutin>) => void;
  deleteHargaRutin: (id: string) => void;
  loadHargaRutinReportGroups: () => Promise<HargaRutinReportGroup[]>;
  saveHargaRutinReport: (params: {
    activeBatchId: string | null;
    pasarId: string;
    tanggal: Date;
    enumerator: string;
    signatureData: string;
    finalize: boolean;
    items: {
      komoditasId: string;
      samples: {
        kelas: KelasKomoditas;
        tempatUsahaId: string;
        hargaInput: number;
        jumlahInput: number;
        satuanInput: import('@/types').SatuanDasar;
      }[];
    }[];
    strict: boolean;
  }) => Promise<void>;
  deleteHargaRutinReport: (batchId: string) => Promise<void>;
  calculateHargaPelaporan: () => HargaPelaporan[];
  /** Mendapatkan kelas untuk setiap komoditas yang dijual oleh suatu TU */
  getKelasForTU: (tuId: string) => Record<string, KelasKomoditas>;
  /**
   * Mendapatkan kelas untuk semua TU yang menjual komoditas tertentu di pasar tertentu.
   * Menggunakan distribusi normal (mean ± 0.5*stddev) untuk klasifikasi.
   * Return: Record<tuId, KelasKomoditas>
   */
  getKelasForKomoditasInPasar: (pasarId: string, komoditasId: string) => Record<string, KelasKomoditas>;
}

const DataContext = createContext<DataContextType | null>(null);

/** Hook untuk mengakses DataContext */
export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};

/* ===== Data Dummy ===== */

function generateMockData() {
  const pasarIds = ['psr-001', 'psr-002', 'psr-003', 'psr-004', 'psr-005'];
  const mockPasar: Pasar[] = [
    { id: pasarIds[0], nama: 'Pasar Andir', longitude: 107.5731, latitude: -6.9147, alamat: 'Jl. Andir No. 1, Bandung', is_active: 1 },
    { id: pasarIds[1], nama: 'Pasar Kosambi', longitude: 107.6089, latitude: -6.9175, alamat: 'Jl. Ahmad Yani No. 221, Bandung', is_active: 1 },
    { id: pasarIds[2], nama: 'Pasar Caringin', longitude: 107.5819, latitude: -6.9350, alamat: 'Jl. Soekarno Hatta No. 525, Bandung', is_active: 1 },
    { id: pasarIds[3], nama: 'Pasar Sederhana', longitude: 107.5955, latitude: -6.8945, alamat: 'Jl. Sederhana No. 35, Bandung', is_active: 1 },
    { id: pasarIds[4], nama: 'Pasar Ciroyom', longitude: 107.5920, latitude: -6.9110, alamat: 'Jl. Ciroyom No. 15, Bandung', is_active: 0 },
  ];

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

  const tuIds = [
    'tu-001', 'tu-002', 'tu-003', 'tu-004', 'tu-005', 'tu-006',
    'tu-007', 'tu-008', 'tu-009', 'tu-010', 'tu-011', 'tu-012',
  ];
  const mockTempatUsaha: TempatUsaha[] = [
    { id: tuIds[0], nama: 'Toko Berkah Jaya', nama_pemilik: 'H. Ahmad', nama_narahubung: 'H. Ahmad', nomor_narahubung: '081234567890', berjualan_sejak: '2015-03-10', is_active: 1, pasar_id: pasarIds[0] },
    { id: tuIds[1], nama: 'Toko Makmur', nama_pemilik: 'Ibu Siti', nama_narahubung: 'Ibu Siti', nomor_narahubung: '081234567891', berjualan_sejak: '2018-07-15', is_active: 1, pasar_id: pasarIds[0] },
    { id: tuIds[2], nama: 'Toko Sejahtera', nama_pemilik: 'Pak Udin', nama_narahubung: 'Dedi', nomor_narahubung: '081234567892', berjualan_sejak: '2020-01-05', is_active: 1, pasar_id: pasarIds[0] },
    { id: tuIds[3], nama: 'Toko Sari Rasa', nama_pemilik: 'Ibu Nining', nama_narahubung: 'Ibu Nining', nomor_narahubung: '081345678901', berjualan_sejak: '2012-05-20', is_active: 1, pasar_id: pasarIds[1] },
    { id: tuIds[4], nama: 'Toko Mulia', nama_pemilik: 'H. Kosim', nama_narahubung: 'Ade', nomor_narahubung: '081345678902', berjualan_sejak: '2016-11-08', is_active: 1, pasar_id: pasarIds[1] },
    { id: tuIds[5], nama: 'Toko Melati', nama_pemilik: 'Ibu Rina', nama_narahubung: 'Ibu Rina', nomor_narahubung: '081345678903', berjualan_sejak: '2019-02-14', is_active: 1, pasar_id: pasarIds[1] },
    { id: tuIds[6], nama: 'Toko Abadi', nama_pemilik: 'Pak Joko', nama_narahubung: 'Pak Joko', nomor_narahubung: '081456789012', berjualan_sejak: '2010-08-01', is_active: 1, pasar_id: pasarIds[2] },
    { id: tuIds[7], nama: 'Toko Sentosa', nama_pemilik: 'Ibu Dewi', nama_narahubung: 'Sari', nomor_narahubung: '081456789013', berjualan_sejak: '2017-04-22', is_active: 1, pasar_id: pasarIds[2] },
    { id: tuIds[8], nama: 'Toko Bintang', nama_pemilik: 'Pak Rudi', nama_narahubung: 'Pak Rudi', nomor_narahubung: '081456789014', berjualan_sejak: '2021-06-10', is_active: 0, pasar_id: pasarIds[2] },
    { id: tuIds[9], nama: 'Toko Cempaka', nama_pemilik: 'Ibu Ani', nama_narahubung: 'Ibu Ani', nomor_narahubung: '081567890123', berjualan_sejak: '2014-09-30', is_active: 1, pasar_id: pasarIds[3] },
    { id: tuIds[10], nama: 'Toko Harapan', nama_pemilik: 'Pak Dadan', nama_narahubung: 'Pak Dadan', nomor_narahubung: '081567890124', berjualan_sejak: '2019-12-01', is_active: 1, pasar_id: pasarIds[3] },
    { id: tuIds[11], nama: 'Toko Rejeki', nama_pemilik: 'Ibu Yanti', nama_narahubung: 'Ibu Yanti', nomor_narahubung: '081567890125', berjualan_sejak: '2022-03-15', is_active: 1, pasar_id: pasarIds[3] },
  ];

  // Komoditas dijual — pola_distribusi sebagai string, periode_unit ditambahkan
  const mockKomoditasDijual: KomoditasDijual[] = [
    { id: 'kd-001', tempat_usaha_id: tuIds[0], komoditas_id: komIds[0], harga_normal: 14000, harga_mahal: 16000, satuan_stok: 'kg', nilai_stok: 500, nilai_periode: 1, periode_unit: 'minggu', lokasi_supplier: 'Subang', pola_distribusi: 'pembelian_produsen', standardized_stock_periode: 71.4, is_active: true },
    { id: 'kd-002', tempat_usaha_id: tuIds[1], komoditas_id: komIds[0], harga_normal: 13000, harga_mahal: 14500, satuan_stok: 'kg', nilai_stok: 300, nilai_periode: 1, periode_unit: 'minggu', lokasi_supplier: 'Karawang', pola_distribusi: 'pemesanan_produsen', standardized_stock_periode: 42.9, is_active: true },
    { id: 'kd-003', tempat_usaha_id: tuIds[2], komoditas_id: komIds[0], harga_normal: 12500, harga_mahal: 13500, satuan_stok: 'kg', nilai_stok: 150, nilai_periode: 1, periode_unit: 'minggu', lokasi_supplier: 'Cianjur', pola_distribusi: 'pembelian_pasar', standardized_stock_periode: 21.4, is_active: true },

    { id: 'kd-004', tempat_usaha_id: tuIds[0], komoditas_id: komIds[1], harga_normal: 55000, harga_mahal: 80000, satuan_stok: 'kg', nilai_stok: 100, nilai_periode: 3, periode_unit: 'hari', lokasi_supplier: 'Garut', pola_distribusi: 'pembelian_pasar', standardized_stock_periode: 33.3, is_active: true },
    { id: 'kd-005', tempat_usaha_id: tuIds[1], komoditas_id: komIds[1], harga_normal: 50000, harga_mahal: 70000, satuan_stok: 'kg', nilai_stok: 60, nilai_periode: 3, periode_unit: 'hari', lokasi_supplier: 'Garut', pola_distribusi: 'pembelian_produsen', standardized_stock_periode: 20, is_active: true },
    { id: 'kd-006', tempat_usaha_id: tuIds[2], komoditas_id: komIds[1], harga_normal: 45000, harga_mahal: 65000, satuan_stok: 'kg', nilai_stok: 30, nilai_periode: 3, periode_unit: 'hari', lokasi_supplier: 'Tasikmalaya', pola_distribusi: 'pembelian_pasar', standardized_stock_periode: 10, is_active: true },

    { id: 'kd-007', tempat_usaha_id: tuIds[3], komoditas_id: komIds[0], harga_normal: 14500, harga_mahal: 16500, satuan_stok: 'kg', nilai_stok: 600, nilai_periode: 1, periode_unit: 'minggu', lokasi_supplier: 'Subang', pola_distribusi: 'pemesanan_supplier', standardized_stock_periode: 85.7, is_active: true },
    { id: 'kd-008', tempat_usaha_id: tuIds[4], komoditas_id: komIds[0], harga_normal: 13500, harga_mahal: 15000, satuan_stok: 'kg', nilai_stok: 350, nilai_periode: 1, periode_unit: 'minggu', lokasi_supplier: 'Karawang', pola_distribusi: 'rutin_produsen', standardized_stock_periode: 50, is_active: true },
    { id: 'kd-009', tempat_usaha_id: tuIds[5], komoditas_id: komIds[0], harga_normal: 12000, harga_mahal: 13000, satuan_stok: 'kg', nilai_stok: 200, nilai_periode: 1, periode_unit: 'minggu', lokasi_supplier: 'Cianjur', pola_distribusi: 'pembelian_pasar', standardized_stock_periode: 28.6, is_active: true },

    { id: 'kd-010', tempat_usaha_id: tuIds[3], komoditas_id: komIds[2], harga_normal: 38000, harga_mahal: 50000, satuan_stok: 'kg', nilai_stok: 80, nilai_periode: 5, periode_unit: 'hari', lokasi_supplier: 'Brebes', pola_distribusi: 'rutin_supplier', standardized_stock_periode: 16, is_active: true },
    { id: 'kd-011', tempat_usaha_id: tuIds[4], komoditas_id: komIds[2], harga_normal: 35000, harga_mahal: 45000, satuan_stok: 'kg', nilai_stok: 50, nilai_periode: 5, periode_unit: 'hari', lokasi_supplier: 'Brebes', pola_distribusi: 'pembelian_pasar', standardized_stock_periode: 10, is_active: true },
    { id: 'kd-012', tempat_usaha_id: tuIds[5], komoditas_id: komIds[2], harga_normal: 32000, harga_mahal: 40000, satuan_stok: 'kg', nilai_stok: 25, nilai_periode: 5, periode_unit: 'hari', lokasi_supplier: 'Cirebon', pola_distribusi: 'pembelian_pasar', standardized_stock_periode: 5, is_active: true },

    { id: 'kd-013', tempat_usaha_id: tuIds[6], komoditas_id: komIds[3], harga_normal: 18000, harga_mahal: 22000, satuan_stok: 'liter', nilai_stok: 200, nilai_periode: 1, periode_unit: 'minggu', lokasi_supplier: 'Jakarta', pola_distribusi: 'pemesanan_supplier', standardized_stock_periode: 28.6, is_active: true },
    { id: 'kd-014', tempat_usaha_id: tuIds[7], komoditas_id: komIds[3], harga_normal: 17000, harga_mahal: 20000, satuan_stok: 'liter', nilai_stok: 120, nilai_periode: 1, periode_unit: 'minggu', lokasi_supplier: 'Jakarta', pola_distribusi: 'rutin_supplier', standardized_stock_periode: 17.1, is_active: true },
    { id: 'kd-015', tempat_usaha_id: tuIds[8], komoditas_id: komIds[3], harga_normal: 16000, harga_mahal: 18500, satuan_stok: 'liter', nilai_stok: 50, nilai_periode: 1, periode_unit: 'minggu', lokasi_supplier: 'Surabaya', pola_distribusi: 'pembelian_pasar', standardized_stock_periode: 7.1, is_active: true },

    { id: 'kd-016', tempat_usaha_id: tuIds[6], komoditas_id: komIds[4], harga_normal: 16000, harga_mahal: 18000, satuan_stok: 'kg', nilai_stok: 300, nilai_periode: 1, periode_unit: 'minggu', lokasi_supplier: 'Cirebon', pola_distribusi: 'rutin_produsen', standardized_stock_periode: 42.9, is_active: true },
    { id: 'kd-017', tempat_usaha_id: tuIds[7], komoditas_id: komIds[4], harga_normal: 15000, harga_mahal: 17000, satuan_stok: 'kg', nilai_stok: 150, nilai_periode: 1, periode_unit: 'minggu', lokasi_supplier: 'Cirebon', pola_distribusi: 'pembelian_pasar', standardized_stock_periode: 21.4, is_active: true },

    { id: 'kd-018', tempat_usaha_id: tuIds[9], komoditas_id: komIds[5], harga_normal: 36000, harga_mahal: 42000, satuan_stok: 'kg', nilai_stok: 80, nilai_periode: 3, periode_unit: 'hari', lokasi_supplier: 'Lembang', pola_distribusi: 'pembelian_produsen', standardized_stock_periode: 26.7, is_active: true },
    { id: 'kd-019', tempat_usaha_id: tuIds[10], komoditas_id: komIds[5], harga_normal: 34000, harga_mahal: 38000, satuan_stok: 'kg', nilai_stok: 50, nilai_periode: 3, periode_unit: 'hari', lokasi_supplier: 'Lembang', pola_distribusi: 'rutin_produsen', standardized_stock_periode: 16.7, is_active: true },
    { id: 'kd-020', tempat_usaha_id: tuIds[11], komoditas_id: komIds[5], harga_normal: 32000, harga_mahal: 36000, satuan_stok: 'kg', nilai_stok: 30, nilai_periode: 3, periode_unit: 'hari', lokasi_supplier: 'Ciwidey', pola_distribusi: 'pembelian_pasar', standardized_stock_periode: 10, is_active: true },

    { id: 'kd-021', tempat_usaha_id: tuIds[9], komoditas_id: komIds[6], harga_normal: 28000, harga_mahal: 32000, satuan_stok: 'kg', nilai_stok: 100, nilai_periode: 5, periode_unit: 'hari', lokasi_supplier: 'Sumedang', pola_distribusi: 'rutin_supplier', standardized_stock_periode: 20, is_active: true },
    { id: 'kd-022', tempat_usaha_id: tuIds[10], komoditas_id: komIds[6], harga_normal: 27000, harga_mahal: 30000, satuan_stok: 'kg', nilai_stok: 60, nilai_periode: 5, periode_unit: 'hari', lokasi_supplier: 'Sumedang', pola_distribusi: 'pembelian_pasar', standardized_stock_periode: 12, is_active: true },
    { id: 'kd-023', tempat_usaha_id: tuIds[11], komoditas_id: komIds[6], harga_normal: 26000, harga_mahal: 29000, satuan_stok: 'kg', nilai_stok: 40, nilai_periode: 5, periode_unit: 'hari', lokasi_supplier: 'Garut', pola_distribusi: 'pembelian_pasar', standardized_stock_periode: 8, is_active: true },

    { id: 'kd-024', tempat_usaha_id: tuIds[0], komoditas_id: komIds[7], harga_normal: 35000, harga_mahal: 45000, satuan_stok: 'kg', nilai_stok: 70, nilai_periode: 5, periode_unit: 'hari', lokasi_supplier: 'Import China', pola_distribusi: 'pemesanan_supplier', standardized_stock_periode: 14, is_active: true },
    { id: 'kd-025', tempat_usaha_id: tuIds[1], komoditas_id: komIds[7], harga_normal: 33000, harga_mahal: 42000, satuan_stok: 'kg', nilai_stok: 40, nilai_periode: 5, periode_unit: 'hari', lokasi_supplier: 'Import China', pola_distribusi: 'pemesanan_supplier', standardized_stock_periode: 8, is_active: true },
    { id: 'kd-026', tempat_usaha_id: tuIds[2], komoditas_id: komIds[7], harga_normal: 30000, harga_mahal: 38000, satuan_stok: 'kg', nilai_stok: 20, nilai_periode: 5, periode_unit: 'hari', lokasi_supplier: 'Import China', pola_distribusi: 'pembelian_pasar', standardized_stock_periode: 4, is_active: true },
  ];

  // Harga Rutin dummy
  const today = new Date();
  const mockHargaRutin: HargaRutin[] = [];
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  };

  const berasHargaBesar = [15500, 15200, 15300, 15800, 15600, 15400, 15700];
  const berasHargaMenengah = [14000, 13800, 13900, 14200, 14100, 14000, 14300];
  const berasHargaKecil = [13000, 12800, 12900, 13200, 13100, 13000, 13100];

  for (let i = 6; i >= 0; i--) {
    const tgl = daysAgo(i);
    mockHargaRutin.push(
      { id: `hr-beras-b-${i}`, nama_enumerator: 'Andi Surveyor', tanggal: tgl, pasar_id: pasarIds[0], komoditas_id: komIds[0], kelas_komoditas: 'besar', tempat_usaha_id: tuIds[0], harga_input: berasHargaBesar[6 - i], jumlah_input: 1, satuan_input: 'kg', harga: berasHargaBesar[6 - i], status: 'finalisasi' },
      { id: `hr-beras-m-${i}`, nama_enumerator: 'Andi Surveyor', tanggal: tgl, pasar_id: pasarIds[0], komoditas_id: komIds[0], kelas_komoditas: 'menengah', tempat_usaha_id: tuIds[1], harga_input: berasHargaMenengah[6 - i], jumlah_input: 1, satuan_input: 'kg', harga: berasHargaMenengah[6 - i], status: 'finalisasi' },
      { id: `hr-beras-k-${i}`, nama_enumerator: 'Andi Surveyor', tanggal: tgl, pasar_id: pasarIds[0], komoditas_id: komIds[0], kelas_komoditas: 'kecil', tempat_usaha_id: tuIds[2], harga_input: berasHargaKecil[6 - i], jumlah_input: 1, satuan_input: 'kg', harga: berasHargaKecil[6 - i], status: 'finalisasi' },
    );
  }

  const cabaiHargaBesar = [75000, 72000, 68000, 65000, 60000, 58000, 55000];
  const cabaiHargaMenengah = [65000, 63000, 60000, 58000, 55000, 52000, 50000];
  const cabaiHargaKecil = [55000, 53000, 50000, 48000, 46000, 45000, 43000];

  for (let i = 6; i >= 0; i--) {
    const tgl = daysAgo(i);
    mockHargaRutin.push(
      { id: `hr-cabai-b-${i}`, nama_enumerator: 'Budi Petugas', tanggal: tgl, pasar_id: pasarIds[0], komoditas_id: komIds[1], kelas_komoditas: 'besar', tempat_usaha_id: tuIds[0], harga_input: cabaiHargaBesar[6 - i], jumlah_input: 1, satuan_input: 'kg', harga: cabaiHargaBesar[6 - i], status: 'finalisasi' },
      { id: `hr-cabai-m-${i}`, nama_enumerator: 'Budi Petugas', tanggal: tgl, pasar_id: pasarIds[0], komoditas_id: komIds[1], kelas_komoditas: 'menengah', tempat_usaha_id: tuIds[1], harga_input: cabaiHargaMenengah[6 - i], jumlah_input: 1, satuan_input: 'kg', harga: cabaiHargaMenengah[6 - i], status: 'finalisasi' },
      { id: `hr-cabai-k-${i}`, nama_enumerator: 'Budi Petugas', tanggal: tgl, pasar_id: pasarIds[0], komoditas_id: komIds[1], kelas_komoditas: 'kecil', tempat_usaha_id: tuIds[2], harga_input: cabaiHargaKecil[6 - i], jumlah_input: 1, satuan_input: 'kg', harga: cabaiHargaKecil[6 - i], status: 'finalisasi' },
    );
  }

  const bawangHargaBesar = [42000, 43000, 44000, 46000, 47000, 48000, 50000];
  const bawangHargaMenengah = [38000, 39000, 40000, 41000, 42000, 43000, 44000];
  const bawangHargaKecil = [34000, 35000, 35500, 36000, 37000, 38000, 39000];

  for (let i = 6; i >= 0; i--) {
    const tgl = daysAgo(i);
    mockHargaRutin.push(
      { id: `hr-bawang-b-${i}`, nama_enumerator: 'Cici Enumerator', tanggal: tgl, pasar_id: pasarIds[1], komoditas_id: komIds[2], kelas_komoditas: 'besar', tempat_usaha_id: tuIds[3], harga_input: bawangHargaBesar[6 - i], jumlah_input: 1, satuan_input: 'kg', harga: bawangHargaBesar[6 - i], status: 'finalisasi' },
      { id: `hr-bawang-m-${i}`, nama_enumerator: 'Cici Enumerator', tanggal: tgl, pasar_id: pasarIds[1], komoditas_id: komIds[2], kelas_komoditas: 'menengah', tempat_usaha_id: tuIds[4], harga_input: bawangHargaMenengah[6 - i], jumlah_input: 1, satuan_input: 'kg', harga: bawangHargaMenengah[6 - i], status: 'finalisasi' },
      { id: `hr-bawang-k-${i}`, nama_enumerator: 'Cici Enumerator', tanggal: tgl, pasar_id: pasarIds[1], komoditas_id: komIds[2], kelas_komoditas: 'kecil', tempat_usaha_id: tuIds[5], harga_input: bawangHargaKecil[6 - i], jumlah_input: 1, satuan_input: 'kg', harga: bawangHargaKecil[6 - i], status: 'finalisasi' },
    );
  }

  const minyakHargaBesar = [20000, 20000, 20000, 20000, 20000, 20000, 20000];
  const minyakHargaMenengah = [18500, 18500, 18500, 18500, 18500, 18500, 18500];
  const minyakHargaKecil = [17000, 17000, 17000, 17000, 17000, 17000, 17000];

  for (let i = 6; i >= 0; i--) {
    const tgl = daysAgo(i);
    mockHargaRutin.push(
      { id: `hr-minyak-b-${i}`, nama_enumerator: 'Dedi Surveyor', tanggal: tgl, pasar_id: pasarIds[2], komoditas_id: komIds[3], kelas_komoditas: 'besar', tempat_usaha_id: tuIds[6], harga_input: minyakHargaBesar[6 - i], jumlah_input: 1, satuan_input: 'liter', harga: minyakHargaBesar[6 - i], status: 'finalisasi' },
      { id: `hr-minyak-m-${i}`, nama_enumerator: 'Dedi Surveyor', tanggal: tgl, pasar_id: pasarIds[2], komoditas_id: komIds[3], kelas_komoditas: 'menengah', tempat_usaha_id: tuIds[7], harga_input: minyakHargaMenengah[6 - i], jumlah_input: 1, satuan_input: 'liter', harga: minyakHargaMenengah[6 - i], status: 'finalisasi' },
      { id: `hr-minyak-k-${i}`, nama_enumerator: 'Dedi Surveyor', tanggal: tgl, pasar_id: pasarIds[2], komoditas_id: komIds[3], kelas_komoditas: 'kecil', tempat_usaha_id: tuIds[8], harga_input: minyakHargaKecil[6 - i], jumlah_input: 1, satuan_input: 'liter', harga: minyakHargaKecil[6 - i], status: 'finalisasi' },
    );
  }

  const ayamHargaBesar = [38000, 38500, 39000, 39000, 39500, 40000, 41000];
  const ayamHargaMenengah = [35000, 35500, 36000, 36000, 36500, 37000, 37500];
  const ayamHargaKecil = [33000, 33000, 33500, 34000, 34000, 34500, 35000];

  for (let i = 6; i >= 0; i--) {
    const tgl = daysAgo(i);
    mockHargaRutin.push(
      { id: `hr-ayam-b-${i}`, nama_enumerator: 'Evi Petugas', tanggal: tgl, pasar_id: pasarIds[3], komoditas_id: komIds[5], kelas_komoditas: 'besar', tempat_usaha_id: tuIds[9], harga_input: ayamHargaBesar[6 - i], jumlah_input: 1, satuan_input: 'kg', harga: ayamHargaBesar[6 - i], status: 'finalisasi' },
      { id: `hr-ayam-m-${i}`, nama_enumerator: 'Evi Petugas', tanggal: tgl, pasar_id: pasarIds[3], komoditas_id: komIds[5], kelas_komoditas: 'menengah', tempat_usaha_id: tuIds[10], harga_input: ayamHargaMenengah[6 - i], jumlah_input: 1, satuan_input: 'kg', harga: ayamHargaMenengah[6 - i], status: 'finalisasi' },
      { id: `hr-ayam-k-${i}`, nama_enumerator: 'Evi Petugas', tanggal: tgl, pasar_id: pasarIds[3], komoditas_id: komIds[5], kelas_komoditas: 'kecil', tempat_usaha_id: tuIds[11], harga_input: ayamHargaKecil[6 - i], jumlah_input: 1, satuan_input: 'kg', harga: ayamHargaKecil[6 - i], status: 'finalisasi' },
    );
  }

  mockHargaRutin.push(
    { id: 'hr-proses-1', nama_enumerator: 'Fani Petugas', tanggal: daysAgo(0), pasar_id: pasarIds[1], komoditas_id: komIds[0], kelas_komoditas: 'besar', tempat_usaha_id: tuIds[3], harga_input: 15800, jumlah_input: 1, satuan_input: 'kg', harga: 15800, status: 'dalam_proses' },
    { id: 'hr-proses-2', nama_enumerator: 'Fani Petugas', tanggal: daysAgo(0), pasar_id: pasarIds[1], komoditas_id: komIds[0], kelas_komoditas: 'menengah', tempat_usaha_id: tuIds[4], harga_input: 14100, jumlah_input: 1, satuan_input: 'kg', harga: 14100, status: 'dalam_proses' },
  );

  return { mockPasar, mockKomoditas, mockTempatUsaha, mockKomoditasDijual, mockHargaRutin };
}

/* ===== Provider Component ===== */

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const defaults = generateMockData();

  const [pasar, setPasar] = useState<Pasar[]>(() => load('pasar', defaults.mockPasar));
  const [komoditas, setKomoditas] = useState<Komoditas[]>(() => load('komoditas', defaults.mockKomoditas));
  const [tempatUsaha, setTempatUsaha] = useState<TempatUsaha[]>(() => load('tempatUsaha', defaults.mockTempatUsaha));
  const [komoditasDijual, setKomoditasDijual] = useState<KomoditasDijual[]>(() => load('komoditasDijual', defaults.mockKomoditasDijual));
  const [hargaRutin, setHargaRutin] = useState<HargaRutin[]>(() => load('hargaRutin', defaults.mockHargaRutin));

  const persist = useCallback(<T,>(key: string, setter: React.Dispatch<React.SetStateAction<T[]>>, updater: (prev: T[]) => T[]) => {
    setter(prev => {
      const next = updater(prev);
      save(key, next);
      return next;
    });
  }, []);

  /* ===== CRUD Pasar (via /v1/admin/pasar) ===== */
  const addPasar = (p: Omit<Pasar, 'id'>) => persist('pasar', setPasar, prev => [...prev, { ...p, id: uid() }]);

  const refreshPasar = useCallback(async () => {
    if (!getAccessToken()) return;

    try {
      const mapped = await fetchPasarList();
      setPasar(mapped);
      save('pasar', mapped);
    } catch {
      // biarkan data lokal tetap jika API gagal
    }
  }, []);

  const createPasar = useCallback(async (p: Omit<Pasar, 'id'>): Promise<Pasar> => {
    const created = await createPasarApi(p);
    persist('pasar', setPasar, prev => [...prev, created]);
    return created;
  }, [persist]);

  const updatePasar = useCallback(async (id: string, p: Partial<Pasar>): Promise<Pasar> => {
    const updated = await updatePasarApi(id, p);
    persist('pasar', setPasar, prev => prev.map(x => x.id === id ? updated : x));
    return updated;
  }, [persist]);

  const deletePasar = useCallback(async (id: string): Promise<void> => {
    await deletePasarApi(id);
    persist('pasar', setPasar, prev => prev.map(x => x.id === id ? { ...x, is_active: 0 } : x));
  }, [persist]);

  const refreshKomoditas = useCallback(async () => {
    try {
      const mapped = await fetchKomoditasList();
      setKomoditas(mapped);
      save('komoditas', mapped);
    } catch {
      // gagal ambil, biarkan data lokal tetap
    }
  }, []);

  // Jalankan sekali saat provider mount (komoditas saja; pasar di-load di PasarPage)
  useEffect(() => {
    void refreshKomoditas();
  }, [refreshKomoditas]);

  /* ===== CRUD Komoditas ===== */
  const addKomoditas = (k: Omit<Komoditas, 'id'>) => persist('komoditas', setKomoditas, prev => [...prev, { ...k, id: uid() }]);

  const createKomoditas = useCallback(async (
    k: Omit<Komoditas, 'id'>,
    imageFile?: File | null,
  ): Promise<Komoditas> => {
    let created = await createKomoditasApi({
      nama: k.nama,
      satuan_dasar: k.satuan_dasar,
    });

    if (imageFile) {
      created = await uploadKomoditasGambarApi(created.id, imageFile);
    }

    persist('komoditas', setKomoditas, prev => [...prev, created]);
    return created;
  }, [persist]);

  const updateKomoditas = useCallback(async (
    id: string,
    k: Partial<Komoditas>,
    imageFile?: File | null,
  ): Promise<Komoditas> => {
    let updated = await updateKomoditasApi(id, {
      nama: k.nama,
      satuan_dasar: k.satuan_dasar,
    });

    if (imageFile) {
      updated = await uploadKomoditasGambarApi(id, imageFile);
    }

    persist('komoditas', setKomoditas, prev => prev.map(x => x.id === id ? updated : x));
    return updated;
  }, [persist]);

  const deleteKomoditas = (id: string) => persist('komoditas', setKomoditas, prev => prev.filter(x => x.id !== id));

  /* ===== CRUD Tempat Usaha (via /v1/admin/tempat-usaha) ===== */
  const addTempatUsaha = (t: Omit<TempatUsaha, 'id'>) => persist('tempatUsaha', setTempatUsaha, prev => [...prev, { ...t, id: uid() }]);

  const refreshTempatUsaha = useCallback(async () => {
    if (!getAccessToken()) return;

    try {
      const mapped = await fetchTempatUsahaList();
      setTempatUsaha(prev => {
        const merged = mapped.map(item => {
          const existing = prev.find(x => x.id === item.id);
          return {
            ...item,
            nama_narahubung: existing?.nama_narahubung ?? item.nama_narahubung,
            nomor_narahubung: existing?.nomor_narahubung ?? item.nomor_narahubung,
            berjualan_sejak: existing?.berjualan_sejak ?? item.berjualan_sejak,
          };
        });
        save('tempatUsaha', merged);
        return merged;
      });
    } catch {
      // biarkan data lokal tetap jika API gagal
    }
  }, []);

  const createTempatUsaha = useCallback(async (t: Omit<TempatUsaha, 'id'>): Promise<TempatUsaha> => {
    const created = await createTempatUsahaApi(t);
    persist('tempatUsaha', setTempatUsaha, prev => [...prev, created]);
    return created;
  }, [persist]);

  const updateTempatUsaha = useCallback(async (id: string, t: Partial<TempatUsaha>): Promise<TempatUsaha> => {
    const existing = tempatUsaha.find(x => x.id === id);
    const updated = await updateTempatUsahaApi(id, t);
    const mapped: TempatUsaha = {
      ...updated,
      nama_narahubung: t.nama_narahubung ?? existing?.nama_narahubung ?? updated.nama_narahubung,
      nomor_narahubung: t.nomor_narahubung ?? existing?.nomor_narahubung ?? updated.nomor_narahubung,
      berjualan_sejak: t.berjualan_sejak ?? existing?.berjualan_sejak ?? updated.berjualan_sejak,
    };
    persist('tempatUsaha', setTempatUsaha, prev => prev.map(x => x.id === id ? mapped : x));
    return mapped;
  }, [persist, tempatUsaha]);

  const deleteTempatUsaha = useCallback(async (id: string): Promise<void> => {
    await deleteTempatUsahaApi(id);
    persist('tempatUsaha', setTempatUsaha, prev => prev.map(x => x.id === id ? { ...x, is_active: 0 } : x));
  }, [persist]);

  /* ===== CRUD Komoditas Dijual (via /v1/admin/komoditas-dijual) ===== */

  const refreshKomoditasDijual = useCallback(async (tempatUsahaId?: string) => {
    if (!getAccessToken()) return;

    try {
      const mapped = await fetchKomoditasDijualList(
        tempatUsahaId ? { id_tempat_usaha: tempatUsahaId } : undefined,
      );

      setKomoditasDijual(prev => {
        if (tempatUsahaId) {
          const others = prev.filter(kd => kd.tempat_usaha_id !== tempatUsahaId);
          const next = [...others, ...mapped];
          save('komoditasDijual', next);
          return next;
        }
        save('komoditasDijual', mapped);
        return mapped;
      });
    } catch {
      // biarkan data lokal tetap jika API gagal
    }
  }, []);

  const refreshKomoditasDijual = useCallback(async (tempatUsahaId?: string) => {
    if (!getAccessToken()) return;

    try {
      const mapped = await fetchKomoditasDijualList(
        tempatUsahaId ? { id_tempat_usaha: tempatUsahaId } : undefined,
      );

      setKomoditasDijual(prev => {
        if (tempatUsahaId) {
          const others = prev.filter(kd => kd.tempat_usaha_id !== tempatUsahaId);
          const next = [...others, ...mapped];
          save('komoditasDijual', next);
          return next;
        }
        save('komoditasDijual', mapped);
        return mapped;
      });
    } catch {
      // biarkan data lokal tetap jika API gagal
    }
  }, []);

  const addKomoditasDijual = (k: Omit<KomoditasDijual, 'id'>) => {
    const newItem = { ...k, id: uid() };
    newItem.standardized_stock_periode = calcStandardizedStockPerDay(newItem.nilai_stok, newItem.nilai_periode, newItem.periode_unit);
    persist('komoditasDijual', setKomoditasDijual, prev => [...prev, newItem]);
  };

  const createKomoditasDijual = useCallback(async (k: Omit<KomoditasDijual, 'id'>): Promise<KomoditasDijual> => {
    const withStd: Omit<KomoditasDijual, 'id'> = {
      ...k,
      standardized_stock_periode: calcStandardizedStockPerDay(k.nilai_stok, k.nilai_periode, k.periode_unit),
    };
    const created = await createKomoditasDijualApi(withStd);
    persist('komoditasDijual', setKomoditasDijual, prev => [...prev, created]);
    return created;
  }, [persist]);

  const updateKomoditasDijual = useCallback(async (id: string, k: Partial<KomoditasDijual>): Promise<KomoditasDijual> => {
    if (!komoditasDijual.find(x => x.id === id)) {
      throw new Error('Komoditas dijual tidak ditemukan');
    }
    const updated = await updateKomoditasDijualApi(id, k);
    persist('komoditasDijual', setKomoditasDijual, prev => prev.map(x => x.id === id ? updated : x));
    return updated;
  }, [komoditasDijual, persist]);

  const deleteKomoditasDijual = useCallback(async (id: string): Promise<void> => {
    await deleteKomoditasDijualApi(id);
    persist('komoditasDijual', setKomoditasDijual, prev => prev.filter(x => x.id !== id));
  }, [persist]);

  const deleteKomoditasDijual = useCallback(async (id: string): Promise<void> => {
    await deleteKomoditasDijualApi(id);
    persist('komoditasDijual', setKomoditasDijual, prev => prev.filter(x => x.id !== id));
  }, [persist]);

  /* ===== CRUD Harga Rutin (legacy local) ===== */
  const addHargaRutin = (h: Omit<HargaRutin, 'id'>) => persist('hargaRutin', setHargaRutin, prev => [...prev, { ...h, id: uid() }]);
  const updateHargaRutin = (id: string, h: Partial<HargaRutin>) => persist('hargaRutin', setHargaRutin, prev => prev.map(x => x.id === id ? { ...x, ...h } : x));
  const deleteHargaRutin = (id: string) => persist('hargaRutin', setHargaRutin, prev => prev.filter(x => x.id !== id));

  const loadHargaRutinReportGroups = useCallback(async (): Promise<HargaRutinReportGroup[]> => {
    if (!getAccessToken()) return [];

    const [batches, allEntries] = await Promise.all([
      fetchPengumpulanDataList({ limit: 1000 }),
      fetchHargaRutinList({ limit: 10000 }),
    ]);

    const entriesByBatch = new Map<string, typeof allEntries>();
    allEntries.forEach((entry) => {
      const list = entriesByBatch.get(entry.id_pengumpulan_data) ?? [];
      list.push(entry);
      entriesByBatch.set(entry.id_pengumpulan_data, list);
    });

    return batches
      .map((batch) => {
        const meta = decodeCatatan(batch.catatan);
        return {
          id: batch.id,
          tanggal: parseApiDate(batch.tanggal),
          pasarId: batch.id_pasar,
          enumerator: meta.enumerator,
          signatureData: meta.signature_url ?? meta.signature_data,
          status: batch.status === 1 ? 'final' as const : 'draft' as const,
          entries: entriesByBatch.get(batch.id) ?? [],
        };
      })
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, []);

  const saveHargaRutinReport = useCallback(async (params: {
    activeBatchId: string | null;
    pasarId: string;
    tanggal: Date;
    enumerator: string;
    signatureData: string;
    finalize: boolean;
    items: {
      komoditasId: string;
      samples: {
        kelas: KelasKomoditas;
        tempatUsahaId: string;
        hargaInput: number;
        jumlahInput: number;
        satuanInput: import('@/types').SatuanDasar;
      }[];
    }[];
    strict: boolean;
  }) => {
    const desired: {
      komoditasId: string;
      kelas: KelasKomoditas;
      tempatUsahaId: string;
      harga: number;
    }[] = [];

    params.items.forEach((item) => {
      const kom = komoditas.find((k) => k.id === item.komoditasId);
      const satuanDasar = kom?.satuan_dasar ?? 'kg';
      item.samples.forEach((sample) => {
        if (!sample.tempatUsahaId || sample.hargaInput <= 0 || sample.jumlahInput <= 0) return;
        const harga = hitungHargaStandar(
          sample.hargaInput,
          sample.jumlahInput,
          sample.satuanInput,
          satuanDasar,
        );
        if (harga < 1) return;
        desired.push({
          komoditasId: item.komoditasId,
          kelas: sample.kelas,
          tempatUsahaId: sample.tempatUsahaId,
          harga,
        });
      });
    });

    if (params.finalize && desired.length === 0) {
      throw new Error('Tidak ada data harga yang valid untuk disimpan');
    }

    const catatanMeta = {
      enumerator: params.enumerator.trim(),
      ...(params.signatureData && !params.signatureData.startsWith('data:')
        ? { signature_url: params.signatureData }
        : {}),
    };
    const catatan = encodeCatatan(catatanMeta);
    let batchId = params.activeBatchId;

    if (!batchId) {
      const created = await createPengumpulanDataApi({
        id_pasar: params.pasarId,
        tanggal: formatDateForApi(params.tanggal),
        catatan,
      });
      batchId = created.id;
    } else {
      await updatePengumpulanDataApi(batchId, { catatan });
    }

    if (params.signatureData.startsWith('data:')) {
      const file = await dataUrlToFile(params.signatureData);
      await uploadPengumpulanTandaTanganApi(batchId, file);
    }

    const existing = await fetchHargaRutinList({ id_pengumpulan_data: batchId });
    const desiredKeys = new Set(desired.map((r) => `${r.komoditasId}__${r.kelas}`));

    for (const ex of existing) {
      const key = `${ex.id_komoditas}__${ex.kelas_komoditas}`;
      if (!desiredKeys.has(key)) {
        await deleteHargaRutinApi(ex.id);
      }
    }

    for (const row of desired) {
      const ex = existing.find(
        (e) => e.id_komoditas === row.komoditasId && e.kelas_komoditas === row.kelas,
      );
      if (ex) {
        if (ex.harga !== row.harga || ex.id_tempat_usaha !== row.tempatUsahaId) {
          await updateHargaRutinApi(ex.id, {
            id_tempat_usaha: row.tempatUsahaId,
            harga: row.harga,
          });
        }
      } else {
        await createHargaRutinApi({
          id_pengumpulan_data: batchId,
          id_tempat_usaha: row.tempatUsahaId,
          id_komoditas: row.komoditasId,
          kelas_komoditas: row.kelas,
          harga: row.harga,
        });
      }
    }

    if (params.finalize) {
      await finalizePengumpulanDataApi(batchId);
    }
  }, [komoditas]);

  const deleteHargaRutinReport = useCallback(async (batchId: string) => {
    await deletePengumpulanDataApi(batchId);
  }, []);

  /* ===== Klasifikasi Kelas Otomatis — Distribusi Normal ===== */
  /**
   * Mengklasifikasikan tempat usaha berdasarkan distribusi normal harga rata-rata.
   * Untuk semua TU yang menjual komoditas yang sama di pasar yang sama:
   * 1. Hitung avg harga = (harga_normal + harga_mahal) / 2 untuk setiap TU
   * 2. Hitung mean dan stddev dari semua avg harga
   * 3. Klasifikasi:
   *    - avg > mean + 0.5*stddev → "besar"
   *    - avg < mean - 0.5*stddev → "kecil"
   *    - sisanya → "menengah"
   * Jika hanya 1-2 TU, gunakan pembagian rata.
   */
  const classifyByNormalDist = useCallback((items: { tuId: string; avg: number }[]): Record<string, KelasKomoditas> => {
    const result: Record<string, KelasKomoditas> = {};
    if (items.length === 0) return result;

    if (items.length === 1) {
      result[items[0].tuId] = 'menengah';
      return result;
    }

    if (items.length === 2) {
      const sorted = [...items].sort((a, b) => b.avg - a.avg);
      result[sorted[0].tuId] = 'besar';
      result[sorted[1].tuId] = 'kecil';
      return result;
    }

    // Hitung mean
    const mean = items.reduce((s, i) => s + i.avg, 0) / items.length;
    // Hitung standard deviation
    const variance = items.reduce((s, i) => s + (i.avg - mean) ** 2, 0) / items.length;
    const stddev = Math.sqrt(variance);

    const upperBound = mean + 0.5 * stddev;
    const lowerBound = mean - 0.5 * stddev;

    items.forEach(item => {
      if (item.avg > upperBound) result[item.tuId] = 'besar';
      else if (item.avg < lowerBound) result[item.tuId] = 'kecil';
      else result[item.tuId] = 'menengah';
    });

    return result;
  }, []);

  /**
   * Mendapatkan kelas untuk semua TU yang menjual komoditas tertentu di pasar tertentu.
   */
  const getKelasForKomoditasInPasar = useCallback((pasarId: string, komoditasId: string): Record<string, KelasKomoditas> => {
    const allKDs = komoditasDijual.filter(kd => {
      if (kd.komoditas_id !== komoditasId || !kd.is_active) return false;
      const tu = tempatUsaha.find(t => t.id === kd.tempat_usaha_id);
      return tu && tu.pasar_id === pasarId && tu.is_active === 1;
    });

    const withKelas = allKDs.filter(kd => kd.kelas_komoditas);
    if (withKelas.length > 0 && withKelas.length === allKDs.length) {
      const result: Record<string, KelasKomoditas> = {};
      allKDs.forEach(kd => {
        if (kd.kelas_komoditas) result[kd.tempat_usaha_id] = kd.kelas_komoditas;
      });
      return result;
    }

    const items = allKDs.map(kd => ({
      tuId: kd.tempat_usaha_id,
      avg: (kd.harga_normal + kd.harga_mahal) / 2,
    }));

    return classifyByNormalDist(items);
  }, [tempatUsaha, komoditasDijual, classifyByNormalDist]);

  /** Mendapatkan kelas untuk setiap komoditas yang dijual oleh suatu TU */
  const getKelasForTU = useCallback((tuId: string): Record<string, KelasKomoditas> => {
    const tu = tempatUsaha.find(t => t.id === tuId);
    if (!tu) return {};
    const result: Record<string, KelasKomoditas> = {};
    const tuKDs = komoditasDijual.filter(kd => kd.tempat_usaha_id === tuId);

    tuKDs.forEach(kd => {
      const kelasMap = getKelasForKomoditasInPasar(tu.pasar_id, kd.komoditas_id);
      if (kelasMap[tuId]) result[kd.komoditas_id] = kelasMap[tuId];
    });

    return result;
  }, [tempatUsaha, komoditasDijual, getKelasForKomoditasInPasar]);

  /* ===== Kalkulasi Harga Pelaporan ===== */
  const calculateHargaPelaporan = useCallback((): HargaPelaporan[] => {
    const finalized = hargaRutin.filter(h => h.status === 'finalisasi');
    const grouped: Record<string, HargaRutin[]> = {};
    finalized.forEach(h => {
      const key = `${h.tanggal}_${h.pasar_id}_${h.komoditas_id}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(h);
    });

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

  const hargaPelaporan = calculateHargaPelaporan();

  return (
    <DataContext.Provider value={{
      pasar, setPasar, komoditas, setKomoditas, tempatUsaha, setTempatUsaha,
      komoditasDijual, setKomoditasDijual, hargaRutin, setHargaRutin, hargaPelaporan,
      refreshPasar, refreshKomoditas, refreshTempatUsaha, refreshKomoditasDijual,
      addPasar, createPasar, updatePasar, deletePasar,
      addKomoditas, createKomoditas, updateKomoditas, deleteKomoditas,
      addTempatUsaha, createTempatUsaha, updateTempatUsaha, deleteTempatUsaha,
      addKomoditasDijual, createKomoditasDijual, updateKomoditasDijual, deleteKomoditasDijual,
      addHargaRutin, updateHargaRutin, deleteHargaRutin, calculateHargaPelaporan,
      getKelasForTU, getKelasForKomoditasInPasar,
    }}>
      {children}
    </DataContext.Provider>
  );
};
