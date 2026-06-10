/** Nama komoditas harus persis sama dengan model API (underscore + kapital awal). */
export const PREDICT_COMMODITIES = [
  "Bawang_Merah_Ukuran_Sedang",
  "Bawang_Merah",
  "Bawang_Putih_Ukuran_Sedang",
  "Bawang_Putih",
  "Beras_Kualitas_Bawah_I",
  "Beras_Kualitas_Bawah_II",
  "Beras_Kualitas_Medium_I",
  "Beras_Kualitas_Super_I",
  "Beras_Kualitas_Super_II",
  "Beras",
  "Cabai_Merah_Besar",
  "Cabai_Merah",
  "Cabai_Rawit_Hijau",
  "Cabai_Rawit_Merah",
  "Cabai_Rawit",
  "Daging_Ayam_Ras_Segar",
  "Daging_Ayam",
  "Daging_Sapi_Kualitas_1",
  "Daging_Sapi_Kualitas_2",
  "Daging_Sapi",
  "Gula_Pasir_Kualitas_Premium",
  "Gula_Pasir_Lokal",
  "Gula_Pasir",
  "Minyak_Goreng_Kemasan_Bermerk_1",
  "Minyak_Goreng_Kemasan_Bermerk_2",
  "Minyak_Goreng",
  "Telur_Ayam_Ras_Segar",
  "Telur_Ayam",
] as const;

export type PredictCommodity = (typeof PREDICT_COMMODITIES)[number];

export function formatCommodityLabel(value: string): string {
  return value.replace(/_/g, " ");
}

export function isPredictCommodity(value: string): value is PredictCommodity {
  return (PREDICT_COMMODITIES as readonly string[]).includes(value);
}
