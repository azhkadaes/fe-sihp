import { apiFetch, type ApiEnvelope } from '@/lib/api';
import type { Pasar } from '@/types';

export interface ApiPasar {
  id: string;
  nama: string;
  alamat?: string | null;
  longitude?: number;
  latitude?: number;
  status: number;
}

export function mapPasarFromApi(item: ApiPasar): Pasar {
  return {
    id: item.id,
    nama: item.nama,
    alamat: item.alamat ?? '',
    is_active: item.status,
    longitude: item.longitude ?? 0,
    latitude: item.latitude ?? 0,
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

export async function fetchPasarList(params?: { name?: string; status?: number; limit?: number }): Promise<Pasar[]> {
  const searchParams = new URLSearchParams();
  if (params?.name) searchParams.set('name', params.name);
  if (params?.status !== undefined) searchParams.set('status', String(params.status));
  searchParams.set('limit', String(params?.limit ?? 1000));

  const res = await apiFetch(`/v1/admin/pasar?${searchParams}`);
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal memuat data pasar'));
  }

  const body = (await res.json()) as ApiEnvelope<ApiPasar[]>;
  const data = body.data ?? [];
  return Array.isArray(data) ? data.map((item) => mapPasarFromApi(item)) : [];
}

export async function createPasarApi(data: Omit<Pasar, 'id'>): Promise<Pasar> {
  const res = await apiFetch('/v1/admin/pasar', {
    method: 'POST',
    body: JSON.stringify({
      nama: data.nama,
      alamat: data.alamat || undefined,
      longitude: data.longitude,
      latitude: data.latitude,
    }),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal menambah pasar'));
  }

  const body = (await res.json()) as ApiEnvelope<ApiPasar>;
  if (!body.data) {
    throw new Error('Respons server tidak valid');
  }

  return mapPasarFromApi(body.data);
}

export async function updatePasarApi(id: string, data: Partial<Pasar>): Promise<Pasar> {
  const payload: Record<string, unknown> = {};
  if (data.nama !== undefined) payload.nama = data.nama;
  if (data.alamat !== undefined) payload.alamat = data.alamat;
  if (data.is_active !== undefined) payload.status = data.is_active;
  if (data.longitude !== undefined) payload.longitude = data.longitude;
  if (data.latitude !== undefined) payload.latitude = data.latitude;

  const res = await apiFetch(`/v1/admin/pasar/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal memperbarui pasar'));
  }

  const body = (await res.json()) as ApiEnvelope<ApiPasar>;
  if (!body.data) {
    throw new Error('Respons server tidak valid');
  }

  return mapPasarFromApi(body.data);
}

export async function deletePasarApi(id: string): Promise<void> {
  const res = await apiFetch(`/v1/admin/pasar/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal menghapus pasar'));
  }
}
