import { apiFetch, getAccessToken, getApiBaseUrl, type ApiEnvelope } from '@/lib/api';
import type { Komoditas, SatuanDasar } from '@/types';

export interface ApiKomoditas {
  id: string;
  nama: string;
  satuan?: string | null;
  gambar_url?: string | null;
}

export function mapKomoditasFromApi(item: ApiKomoditas): Komoditas {
  return {
    id: item.id,
    nama: item.nama,
    satuan_dasar: (item.satuan || 'kg') as SatuanDasar,
    gambar: item.gambar_url || '',
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

export async function fetchKomoditasList(params?: { name?: string; limit?: number }): Promise<Komoditas[]> {
  const searchParams = new URLSearchParams();
  if (params?.name) searchParams.set('name', params.name);
  searchParams.set('limit', String(params?.limit ?? 1000));

  const res = await apiFetch(`/v1/admin/komoditas?${searchParams}`);
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal memuat data komoditas'));
  }

  const body = (await res.json()) as ApiEnvelope<ApiKomoditas[]>;
  const data = body.data ?? [];
  return Array.isArray(data) ? data.map(mapKomoditasFromApi) : [];
}

export async function createKomoditasApi(data: {
  nama: string;
  satuan_dasar: SatuanDasar;
}): Promise<Komoditas> {
  const res = await apiFetch('/v1/admin/komoditas', {
    method: 'POST',
    body: JSON.stringify({
      nama: data.nama,
      satuan: data.satuan_dasar,
    }),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal menambah komoditas'));
  }

  const body = (await res.json()) as ApiEnvelope<ApiKomoditas>;
  if (!body.data) {
    throw new Error('Respons server tidak valid');
  }
  return mapKomoditasFromApi(body.data);
}

export async function updateKomoditasApi(
  id: string,
  data: { nama?: string; satuan_dasar?: SatuanDasar },
): Promise<Komoditas> {
  const payload: Record<string, string> = {};
  if (data.nama !== undefined) payload.nama = data.nama;
  if (data.satuan_dasar !== undefined) payload.satuan = data.satuan_dasar;

  const res = await apiFetch(`/v1/admin/komoditas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal memperbarui komoditas'));
  }

  const body = (await res.json()) as ApiEnvelope<ApiKomoditas>;
  if (!body.data) {
    throw new Error('Respons server tidak valid');
  }
  return mapKomoditasFromApi(body.data);
}

export async function uploadKomoditasGambarApi(id: string, file: File): Promise<Komoditas> {
  const formData = new FormData();
  formData.append('gambar', file);

  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${getApiBaseUrl()}/v1/admin/komoditas/${id}/gambar`, {
    method: 'POST',
    headers,
    body: formData,
  }).catch(() => {
    throw new Error('Koneksi terputus saat upload. Pastikan backend sudah di-restart dan MinIO berjalan.');
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal mengunggah gambar'));
  }

  const body = (await res.json()) as ApiEnvelope<ApiKomoditas>;
  if (!body.data) {
    throw new Error('Respons server tidak valid');
  }
  return mapKomoditasFromApi(body.data);
}
