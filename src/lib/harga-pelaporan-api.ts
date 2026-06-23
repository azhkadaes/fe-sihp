import { apiFetch, type ApiEnvelope } from '@/lib/api';
import { parseApiDate } from '@/lib/pengumpulan-data-api';
import type { HargaPelaporan } from '@/types';

export interface ApiHargaPelaporan {
  id: string;
  tanggal: string;
  pasar_id: string;
  komoditas_id: string;
  harga_besar?: number | null;
  harga_menengah?: number | null;
  harga_kecil?: number | null;
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

function calculateHargaRataRata(
  kelas: Pick<HargaPelaporan, 'harga_besar' | 'harga_menengah' | 'harga_kecil'>,
): number {
  const prices = [kelas.harga_besar, kelas.harga_menengah, kelas.harga_kecil].filter(
    (p): p is number => p != null,
  );
  if (prices.length === 0) return 0;
  return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
}

export function mapHargaPelaporanFromApi(item: ApiHargaPelaporan): HargaPelaporan {
  const kelas = {
    harga_besar: item.harga_besar ?? null,
    harga_menengah: item.harga_menengah ?? null,
    harga_kecil: item.harga_kecil ?? null,
  };

  return {
    id: item.id,
    tanggal: parseApiDate(item.tanggal),
    pasar_id: item.pasar_id,
    komoditas_id: item.komoditas_id,
    harga_rata_rata: calculateHargaRataRata(kelas),
    ...kelas,
  };
}

export async function fetchHargaPelaporanList(params?: {
  id_pasar?: string;
  id_komoditas?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<HargaPelaporan[]> {
  const searchParams = new URLSearchParams();
  if (params?.id_pasar) searchParams.set('id_pasar', params.id_pasar);
  if (params?.id_komoditas) searchParams.set('id_komoditas', params.id_komoditas);
  if (params?.from) searchParams.set('from', params.from);
  if (params?.to) searchParams.set('to', params.to);
  searchParams.set('limit', String(params?.limit ?? 10000));

  const res = await apiFetch(`/v1/admin/harga-pelaporan?${searchParams}`);
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal memuat data harga pelaporan'));
  }

  const body = (await res.json()) as ApiPaginatedEnvelope<ApiHargaPelaporan[]>;
  const data = body.data ?? [];
  return Array.isArray(data) ? data.map(mapHargaPelaporanFromApi) : [];
}

export async function fetchHargaPelaporanById(id: string): Promise<HargaPelaporan> {
  const res = await apiFetch(`/v1/admin/harga-pelaporan/${id}`);
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Gagal memuat detail harga pelaporan'));
  }

  const body = (await res.json()) as ApiEnvelope<ApiHargaPelaporan>;
  if (!body.data) throw new Error('Respons server tidak valid');
  return mapHargaPelaporanFromApi(body.data);
}

export async function loadHargaPelaporanPageData(params?: {
  id_pasar?: string;
}): Promise<HargaPelaporan[]> {
  return fetchHargaPelaporanList({
    id_pasar: params?.id_pasar,
    limit: 10000,
  });
}
