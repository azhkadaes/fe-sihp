import { apiFetch, type ApiEnvelope } from '@/lib/api';
import type { TempatUsaha } from '@/types';

export interface ApiTempatUsaha {
  id: string;
  id_pasar: string;
  nama: string;
  pemilik?: string | null;
  status: number;
}

export function mapTempatUsahaFromApi(
  item: ApiTempatUsaha,
  extras?: Partial<Pick<TempatUsaha, 'nama_narahubung' | 'nomor_narahubung' | 'berjualan_sejak'>>,
): TempatUsaha {
  return {
    id: item.id,
    nama: item.nama,
    nama_pemilik: item.pemilik ?? '',
    nama_narahubung: extras?.nama_narahubung ?? '',
    nomor_narahubung: extras?.nomor_narahubung ?? '',
    berjualan_sejak: extras?.berjualan_sejak ?? '',
    is_active: item.status,
    pasar_id: item.id_pasar,
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

export async function fetchTempatUsahaList(params?: {
  name?: string;
  id_pasar?: string;
  status?: number;
  limit?: number;
}): Promise<TempatUsaha[]> {
  const searchParams = new URLSearchParams();
  if (params?.name) searchParams.set('name', params.name);
  if (params?.id_pasar) searchParams.set('id_pasar', params.id_pasar);
  if (params?.status !== undefined) searchParams.set('status', String(params.status));
  searchParams.set('limit', String(params?.limit ?? 1000));

  const res = await apiFetch(`/v1/admin/tempat-usaha?${searchParams}`);
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal memuat data tempat usaha'));
  }

  const body = (await res.json()) as ApiEnvelope<ApiTempatUsaha[]>;
  const data = body.data ?? [];
  return Array.isArray(data) ? data.map((item) => mapTempatUsahaFromApi(item)) : [];
}

export async function createTempatUsahaApi(data: Omit<TempatUsaha, 'id'>): Promise<TempatUsaha> {
  const res = await apiFetch('/v1/admin/tempat-usaha', {
    method: 'POST',
    body: JSON.stringify({
      id_pasar: data.pasar_id,
      nama: data.nama,
      pemilik: data.nama_pemilik || undefined,
    }),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal menambah tempat usaha'));
  }

  const body = (await res.json()) as ApiEnvelope<ApiTempatUsaha>;
  if (!body.data) {
    throw new Error('Respons server tidak valid');
  }

  return mapTempatUsahaFromApi(body.data, {
    nama_narahubung: data.nama_narahubung,
    nomor_narahubung: data.nomor_narahubung,
    berjualan_sejak: data.berjualan_sejak,
  });
}

export async function updateTempatUsahaApi(id: string, data: Partial<TempatUsaha>): Promise<TempatUsaha> {
  const payload: Record<string, unknown> = {};
  if (data.pasar_id !== undefined) payload.id_pasar = data.pasar_id;
  if (data.nama !== undefined) payload.nama = data.nama;
  if (data.nama_pemilik !== undefined) payload.pemilik = data.nama_pemilik;
  if (data.is_active !== undefined) payload.status = data.is_active;

  const res = await apiFetch(`/v1/admin/tempat-usaha/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal memperbarui tempat usaha'));
  }

  const body = (await res.json()) as ApiEnvelope<ApiTempatUsaha>;
  if (!body.data) {
    throw new Error('Respons server tidak valid');
  }

  return mapTempatUsahaFromApi(body.data, {
    nama_narahubung: data.nama_narahubung,
    nomor_narahubung: data.nomor_narahubung,
    berjualan_sejak: data.berjualan_sejak,
  });
}

export async function deleteTempatUsahaApi(id: string): Promise<void> {
  const res = await apiFetch(`/v1/admin/tempat-usaha/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal menghapus tempat usaha'));
  }
}














