import { apiFetch, type ApiEnvelope } from '@/lib/api';
import type { KomoditasDijual, PeriodeUnit } from '@/types';

/** Shape respons dari backend GET/POST/PUT /admin/komoditas-dijual */
export interface ApiKomoditasDijual {
  id: string;
  id_tempat_usaha: string;
  id_komoditas: string;
  harga_normal: number;
  harga_mahal: number;
  harga_avg?: number | null;
  satuan_stok: string;
  nilai_stok: number;
  /** Backend menyebut ini satuan_periode; frontend menyebut periode_unit */
  satuan_periode: string;
  nilai_periode: number;
  lokasi_supplier: string;
  pola_distribusi?: string | null;
  standardized_stock_periode: number;
  kelas_komoditas?: string | null;
  status: number;
}

export function mapKomoditasDijualFromApi(item: ApiKomoditasDijual): KomoditasDijual {
  return {
    id: item.id,
    tempat_usaha_id: item.id_tempat_usaha,
    komoditas_id: item.id_komoditas,
    is_active: item.status === 1,
    harga_normal: item.harga_normal ?? 0,
    harga_mahal: item.harga_mahal ?? 0,
    satuan_stok: item.satuan_stok || 'kg',
    nilai_stok: item.nilai_stok ?? 0,
    nilai_periode: item.nilai_periode ?? 1,
    periode_unit: (item.satuan_periode || 'minggu') as PeriodeUnit,
    lokasi_supplier: item.lokasi_supplier || '',
    pola_distribusi: item.pola_distribusi || '',
    standardized_stock_periode: item.standardized_stock_periode ?? 0,
  };
}

async function parseApiError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as ApiEnvelope;
    return body.message || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchKomoditasDijualList(params?: {
  id_tempat_usaha?: string;
  id_komoditas?: string;
  status?: number;
  limit?: number;
}): Promise<KomoditasDijual[]> {
  const searchParams = new URLSearchParams();
  if (params?.id_tempat_usaha) searchParams.set('id_tempat_usaha', params.id_tempat_usaha);
  if (params?.id_komoditas) searchParams.set('id_komoditas', params.id_komoditas);
  if (params?.status !== undefined) searchParams.set('status', String(params.status));
  searchParams.set('limit', String(params?.limit ?? 1000));

  const res = await apiFetch(`/v1/admin/komoditas-dijual?${searchParams}`);
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal memuat data komoditas dijual'));
  }

  const body = (await res.json()) as ApiEnvelope<ApiKomoditasDijual[]>;
  const data = body.data ?? [];
  return Array.isArray(data) ? data.map(mapKomoditasDijualFromApi) : [];
}

export async function createKomoditasDijualApi(
  data: Omit<KomoditasDijual, 'id'>,
): Promise<KomoditasDijual> {
  const res = await apiFetch('/v1/admin/komoditas-dijual', {
    method: 'POST',
    body: JSON.stringify({
      id_tempat_usaha: data.tempat_usaha_id,
      id_komoditas: data.komoditas_id,
      harga_normal: data.harga_normal,
      harga_mahal: data.harga_mahal,
      satuan_stok: data.satuan_stok || 'kg',
      nilai_stok: data.nilai_stok,
      satuan_periode: data.periode_unit || 'minggu',
      nilai_periode: data.nilai_periode,
      lokasi_supplier: data.lokasi_supplier || '',
      pola_distribusi: data.pola_distribusi || undefined,
      standardized_stock_periode: data.standardized_stock_periode || undefined,
      status: data.is_active ? 1 : 0,
    }),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal menambah komoditas dijual'));
  }

  const body = (await res.json()) as ApiEnvelope<ApiKomoditasDijual>;
  if (!body.data) {
    throw new Error('Respons server tidak valid');
  }

  return mapKomoditasDijualFromApi(body.data);
}

export async function updateKomoditasDijualApi(
  id: string,
  data: Partial<KomoditasDijual>,
): Promise<KomoditasDijual> {
  const payload: Record<string, unknown> = {};
  if (data.harga_normal !== undefined) payload.harga_normal = data.harga_normal;
  if (data.harga_mahal !== undefined) payload.harga_mahal = data.harga_mahal;
  if (data.satuan_stok !== undefined) payload.satuan_stok = data.satuan_stok;
  if (data.nilai_stok !== undefined) payload.nilai_stok = data.nilai_stok;
  if (data.periode_unit !== undefined) payload.satuan_periode = data.periode_unit;
  if (data.nilai_periode !== undefined) payload.nilai_periode = data.nilai_periode;
  if (data.lokasi_supplier !== undefined) payload.lokasi_supplier = data.lokasi_supplier;
  if (data.pola_distribusi !== undefined) payload.pola_distribusi = data.pola_distribusi || null;
  if (data.standardized_stock_periode !== undefined) payload.standardized_stock_periode = data.standardized_stock_periode;
  if (data.is_active !== undefined) payload.status = data.is_active ? 1 : 0;

  const res = await apiFetch(`/v1/admin/komoditas-dijual/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal memperbarui komoditas dijual'));
  }

  const body = (await res.json()) as ApiEnvelope<ApiKomoditasDijual>;
  if (!body.data) {
    throw new Error('Respons server tidak valid');
  }

  return mapKomoditasDijualFromApi(body.data);
}

export async function deleteKomoditasDijualApi(id: string): Promise<void> {
  const res = await apiFetch(`/v1/admin/komoditas-dijual/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal menghapus komoditas dijual'));
  }
}
