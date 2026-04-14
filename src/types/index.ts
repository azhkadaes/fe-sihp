export interface Pasar {
  id: string;
  nama: string;
  longitude: number;
  latitude: number;
  alamat: string;
  is_active: number;
}

export type SatuanDasar = 'kg' | 'gram' | 'ons' | 'ton' | 'liter' | 'ml';

export const SATUAN_DASAR_OPTIONS: { value: SatuanDasar; label: string }[] = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'gram', label: 'Gram (g)' },
  { value: 'ons', label: 'Ons' },
  { value: 'ton', label: 'Ton' },
  { value: 'liter', label: 'Liter (L)' },
  { value: 'ml', label: 'Mililiter (mL)' },
];

export const KONVERSI_SATUAN: Record<SatuanDasar, { base: 'kg' | 'liter'; factor: number }> = {
  kg:    { base: 'kg',    factor: 1 },
  gram:  { base: 'kg',    factor: 0.001 },
  ons:   { base: 'kg',    factor: 0.1 },
  ton:   { base: 'kg',    factor: 1000 },
  liter: { base: 'liter', factor: 1 },
  ml:    { base: 'liter', factor: 0.001 },
};

export function hitungHargaStandar(
  hargaInput: number,
  jumlahInput: number,
  satuanInput: SatuanDasar,
  satuanDasar: SatuanDasar,
): number {
  if (jumlahInput <= 0) return 0;
  const konversiInput = KONVERSI_SATUAN[satuanInput];
  const konversiDasar = KONVERSI_SATUAN[satuanDasar];
  const jumlahDalamSatuanDasar = (jumlahInput * konversiInput.factor) / konversiDasar.factor;
  return Math.round(hargaInput / jumlahDalamSatuanDasar);
}

export interface Komoditas {
  id: string;
  nama: string;
  satuan_dasar: SatuanDasar;
  gambar: string;
}

export interface TempatUsaha {
  id: string;
  nama: string;
  nama_pemilik: string;
  nama_narahubung: string;
  nomor_narahubung: string;
  berjualan_sejak: string;
  is_active: number;
  pasar_id: string;
}

/** Opsi pola distribusi komoditas */
export const POLA_DISTRIBUSI_OPTIONS = [
  { value: 'pembelian_produsen', label: 'Pembelian dari produsen' },
  { value: 'pembelian_pasar', label: 'Pembelian di pasar' },
  { value: 'pemesanan_produsen', label: 'Pemesanan dari produsen' },
  { value: 'pemesanan_supplier', label: 'Pemesanan dari supplier' },
  { value: 'rutin_produsen', label: 'Rutin dikirim produsen' },
  { value: 'rutin_supplier', label: 'Rutin dikirim supplier' },
  { value: 'produsen_pedagang', label: 'Saya adalah produsen sekaligus pedagang' },
  { value: 'lainnya', label: 'Lainnya' },
];

/** Opsi satuan periode waktu */
export type PeriodeUnit = 'hari' | 'minggu' | '2minggu' | 'bulan';
export const PERIODE_UNIT_OPTIONS: { value: PeriodeUnit; label: string }[] = [
  { value: 'hari', label: 'Hari' },
  { value: 'minggu', label: 'Minggu' },
  { value: '2minggu', label: '2 Minggu' },
  { value: 'bulan', label: 'Bulan' },
];

/** Faktor konversi periode ke hari (untuk standardisasi) */
export const PERIODE_TO_DAYS: Record<PeriodeUnit, number> = {
  hari: 1,
  minggu: 7,
  '2minggu': 14,
  bulan: 30,
};

export interface KomoditasDijual {
  id: string;
  tempat_usaha_id: string;
  komoditas_id: string;
  harga_normal: number;
  harga_mahal: number;
  satuan_stok: string;
  nilai_stok: number;
  /** Jumlah periode (misal: 2) */
  nilai_periode: number;
  /** Satuan periode (misal: 'minggu' → berarti setiap 2 minggu) */
  periode_unit: PeriodeUnit;
  lokasi_supplier: string;
  /** Kode pola distribusi dari POLA_DISTRIBUSI_OPTIONS */
  pola_distribusi: string;
  /** Stok per hari = nilai_stok / (nilai_periode * PERIODE_TO_DAYS[periode_unit]) */
  standardized_stock_periode: number;
  is_active: boolean;
}

export type KelasKomoditas = 'besar' | 'menengah' | 'kecil';

export interface HargaRutin {
  id: string;
  nama_enumerator: string;
  tanggal: string;
  pasar_id: string;
  komoditas_id: string;
  kelas_komoditas: KelasKomoditas;
  tempat_usaha_id: string;
  harga_input: number;
  jumlah_input: number;
  satuan_input: SatuanDasar;
  harga: number;
  status: 'dalam_proses' | 'finalisasi';
}

export interface HargaPelaporan {
  id: string;
  tanggal: string;
  pasar_id: string;
  komoditas_id: string;
  harga_rata_rata: number;
  harga_besar: number | null;
  harga_menengah: number | null;
  harga_kecil: number | null;
}
