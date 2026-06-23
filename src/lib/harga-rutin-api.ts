import { apiFetch, type ApiEnvelope } from '@/lib/api';
import type { KelasKomoditas } from '@/types';

export interface ApiHargaRutin {
  id: string;
  id_pengumpulan_data: string;
  id_tempat_usaha: string;
  id_komoditas: string;
  kelas_komoditas: string;
  harga: number;
}

interface ApiPaginatedEnvelope<T> extends ApiEnvelope<T> {
  page?: {
    offset: number;
    limit: number;
    count: number;
    order_by?: string;
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

export async function fetchHargaRutinList(params?: {
  id_pengumpulan_data?: string;
  id_komoditas?: string;
  id_tempat_usaha?: string;
  limit?: number;
}): Promise<ApiHargaRutin[]> {
  const searchParams = new URLSearchParams();
  if (params?.id_pengumpulan_data) {
    searchParams.set('id_pengumpulan_data', params.id_pengumpulan_data);
  }
  if (params?.id_komoditas) searchParams.set('id_komoditas', params.id_komoditas);
  if (params?.id_tempat_usaha) searchParams.set('id_tempat_usaha', params.id_tempat_usaha);
  searchParams.set('limit', String(params?.limit ?? 10000));

  const res = await apiFetch(`/v1/admin/harga-rutin?${searchParams}`);
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal memuat data harga rutin'));
  }

  const body = (await res.json()) as ApiPaginatedEnvelope<ApiHargaRutin[]>;
  const data = body.data ?? [];
  return Array.isArray(data) ? data : [];
}

export async function createHargaRutinApi(payload: {
  id_pengumpulan_data: string;
  id_tempat_usaha: string;
  id_komoditas: string;
  kelas_komoditas: KelasKomoditas;
  harga: number;
}): Promise<ApiHargaRutin> {
  const res = await apiFetch('/v1/admin/harga-rutin', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      harga: Math.round(payload.harga),
    }),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal menyimpan harga rutin'));
  }

  const body = (await res.json()) as ApiEnvelope<ApiHargaRutin>;
  if (!body.data) throw new Error('Respons server tidak valid');
  return body.data;
}

export async function updateHargaRutinApi(
  id: string,
  payload: {
    id_tempat_usaha?: string;
    kelas_komoditas?: KelasKomoditas;
    harga?: number;
  },
): Promise<ApiHargaRutin> {
  const bodyPayload: Record<string, unknown> = {};
  if (payload.id_tempat_usaha !== undefined) {
    bodyPayload.id_tempat_usaha = payload.id_tempat_usaha;
  }
  if (payload.kelas_komoditas !== undefined) {
    bodyPayload.kelas_komoditas = payload.kelas_komoditas;
  }
  if (payload.harga !== undefined) bodyPayload.harga = Math.round(payload.harga);

  const res = await apiFetch(`/v1/admin/harga-rutin/${id}`, {
    method: 'PUT',
    body: JSON.stringify(bodyPayload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal memperbarui harga rutin'));
  }

  const body = (await res.json()) as ApiEnvelope<ApiHargaRutin>;
  if (!body.data) throw new Error('Respons server tidak valid');
  return body.data;
}

export async function deleteHargaRutinApi(id: string): Promise<void> {
  const res = await apiFetch(`/v1/admin/harga-rutin/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal menghapus harga rutin'));
  }
}
