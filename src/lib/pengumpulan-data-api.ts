import { apiFetch, getAccessToken, getApiBaseUrl, type ApiEnvelope } from '@/lib/api';
import type { ApiHargaRutin } from '@/lib/harga-rutin-api';

export interface ApiPengumpulanData {
  id: string;
  id_pasar: string;
  tanggal: string;
  status: number;
  catatan?: string | null;
}

export interface HargaRutinMeta {
  enumerator: string;
  signature_url?: string;
  signature_data?: string;
}

export interface HargaRutinReportGroup {
  id: string;
  tanggal: string;
  pasarId: string;
  enumerator: string;
  signatureData?: string;
  status: 'draft' | 'final';
  entries: ApiHargaRutin[];
}

interface ApiPaginatedEnvelope<T> extends ApiEnvelope<T> {
  page?: {
    offset: number;
    limit: number;
    count: number;
    order_by?: string;
  };
}

export function encodeCatatan(meta: HargaRutinMeta): string {
  return JSON.stringify({
    enumerator: meta.enumerator,
    ...(meta.signature_url ? { signature_url: meta.signature_url } : {}),
  });
}

export function decodeCatatan(catatan?: string | null): HargaRutinMeta {
  if (!catatan?.trim()) return { enumerator: '' };
  try {
    const parsed = JSON.parse(catatan) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'enumerator' in parsed &&
      typeof (parsed as HargaRutinMeta).enumerator === 'string'
    ) {
      return parsed as HargaRutinMeta;
    }
  } catch {
    // catatan plain text (legacy)
  }
  return { enumerator: catatan };
}

export function formatDateForApi(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T00:00:00Z`;
}

export function parseApiDate(value: string): string {
  return value.slice(0, 10);
}

export async function dataUrlToFile(dataUrl: string, filename = 'signature.png'): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || 'image/png' });
}

async function parseApiError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as ApiEnvelope;
    return body.message || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchPengumpulanDataList(params?: {
  id_pasar?: string;
  status?: number;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<ApiPengumpulanData[]> {
  const searchParams = new URLSearchParams();
  if (params?.id_pasar) searchParams.set('id_pasar', params.id_pasar);
  if (params?.status !== undefined) searchParams.set('status', String(params.status));
  if (params?.from) searchParams.set('from', params.from);
  if (params?.to) searchParams.set('to', params.to);
  searchParams.set('limit', String(params?.limit ?? 1000));
  searchParams.set('order-by', '-tanggal');

  const res = await apiFetch(`/v1/admin/pengumpulan-data?${searchParams}`);
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal memuat data pengumpulan'));
  }

  const body = (await res.json()) as ApiPaginatedEnvelope<ApiPengumpulanData[]>;
  const data = body.data ?? [];
  return Array.isArray(data) ? data : [];
}

export async function createPengumpulanDataApi(payload: {
  id_pasar: string;
  tanggal: string;
  catatan?: string;
}): Promise<ApiPengumpulanData> {
  const res = await apiFetch('/v1/admin/pengumpulan-data', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal membuat data pengumpulan'));
  }

  const body = (await res.json()) as ApiEnvelope<ApiPengumpulanData>;
  if (!body.data) throw new Error('Respons server tidak valid');
  return body.data;
}

export async function updatePengumpulanDataApi(
  id: string,
  payload: { tanggal?: string; catatan?: string },
): Promise<ApiPengumpulanData> {
  const res = await apiFetch(`/v1/admin/pengumpulan-data/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal memperbarui data pengumpulan'));
  }

  const body = (await res.json()) as ApiEnvelope<ApiPengumpulanData>;
  if (!body.data) throw new Error('Respons server tidak valid');
  return body.data;
}

export async function deletePengumpulanDataApi(id: string): Promise<void> {
  const res = await apiFetch(`/v1/admin/pengumpulan-data/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal menghapus data pengumpulan'));
  }
}

export async function finalizePengumpulanDataApi(
  id: string,
): Promise<{ finalized_komoditas_count: number }> {
  const res = await apiFetch(`/v1/admin/pengumpulan-data/${id}/finalize`, {
    method: 'POST',
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal memfinalisasi data'));
  }

  const body = (await res.json()) as ApiEnvelope<{ finalized_komoditas_count: number }>;
  if (!body.data) throw new Error('Respons server tidak valid');
  return body.data;
}

export async function uploadPengumpulanTandaTanganApi(
  id: string,
  file: File,
): Promise<ApiPengumpulanData> {
  const formData = new FormData();
  formData.append('tanda_tangan', file);

  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(
    `${getApiBaseUrl()}/v1/admin/pengumpulan-data/${id}/tanda-tangan`,
    { method: 'POST', headers, body: formData },
  );

  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal mengunggah tanda tangan'));
  }

  const body = (await res.json()) as ApiEnvelope<ApiPengumpulanData>;
  if (!body.data) throw new Error('Respons server tidak valid');
  return body.data;
}
