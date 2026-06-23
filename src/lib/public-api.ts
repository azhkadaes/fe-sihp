import { getApiBaseUrl, type ApiEnvelope } from '@/lib/api';
import { mapPasarFromApi, type ApiPasar } from '@/lib/pasar-api';
import { mapTempatUsahaFromApi, type ApiTempatUsaha } from '@/lib/tempat-usaha-api';
import type { Pasar, TempatUsaha } from '@/types';

export interface PublicOverview {
  pasar_active_count: number;
  tempat_usaha_active_count: number;
  komoditas_count: number;
}

export interface PublicKomoditasListItem {
  id: string;
  nama: string;
  satuan_dasar: string;
  gambar?: string | null;
  harga_pelaporan_terbaru?: number | null;
  harga_pelaporan_terkecil?: number | null;
  harga_pelaporan_terbesar?: number | null;
  harga_pelaporan_avg?: number | null;
  tanggal_pelaporan_terbaru?: string | null;
}

export interface PublicHargaStat {
  tanggal?: string | null;
  harga_rata_rata?: number | null;
}

export interface PublicKomoditasDetail {
  komoditas: {
    id: string;
    nama: string;
    satuan_dasar: string;
    gambar: string;
  };
  latest: PublicHargaStat;
  avg_nd?: number | null;
  min_nd?: number | null;
  max_nd?: number | null;
  days: number;
}

export interface PublicTempatUsahaKomoditas {
  id: string;
  nama: string;
  satuan?: string | null;
  gambar_url?: string | null;
  latest: PublicHargaStat;
}

export interface PublicTempatUsahaDetail {
  tempat_usaha: TempatUsaha;
  pasar: Pasar;
  komoditas: PublicTempatUsahaKomoditas[];
}

interface PaginatedEnvelope<T> extends ApiEnvelope<T> {
  page?: {
    offset: number;
    limit: number;
    count: number;
    order_by: string;
  };
}

async function publicFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`);
  if (!res.ok) {
    throw new Error(`Gagal memuat data publik (${res.status})`);
  }
  const body = (await res.json()) as ApiEnvelope<T>;
  if (!body.success) {
    throw new Error(body.message || 'Gagal memuat data publik');
  }
  return body.data as T;
}

async function publicFetchPaginated<T>(path: string): Promise<{ data: T; count: number }> {
  const res = await fetch(`${getApiBaseUrl()}${path}`);
  if (!res.ok) {
    throw new Error(`Gagal memuat data publik (${res.status})`);
  }
  const body = (await res.json()) as PaginatedEnvelope<T>;
  if (!body.success) {
    throw new Error(body.message || 'Gagal memuat data publik');
  }
  return {
    data: (body.data ?? []) as T,
    count: body.page?.count ?? (Array.isArray(body.data) ? body.data.length : 0),
  };
}

export async function fetchPublicOverview(): Promise<PublicOverview> {
  return publicFetch<PublicOverview>('/v1/public/overview');
}

export async function fetchPublicKomoditasList(params?: {
  nama?: string;
  name?: string;
  id_pasar?: string;
  id_tempat_usaha?: string;
  limit?: number;
  page?: number;
}): Promise<{ items: PublicKomoditasListItem[]; count: number }> {
  const searchParams = new URLSearchParams();
  const nama = params?.nama ?? params?.name;
  if (nama) searchParams.set('nama', nama);
  if (params?.id_pasar) searchParams.set('id_pasar', params.id_pasar);
  if (params?.id_tempat_usaha) {
    searchParams.set('id_tempat_usaha', params.id_tempat_usaha);
  }
  searchParams.set('limit', String(params?.limit ?? 50));
  if (params?.page) searchParams.set('page', String(params.page));

  const { data, count } = await publicFetchPaginated<PublicKomoditasListItem[]>(
    `/v1/public/komoditas?${searchParams}`,
  );
  return {
    items: Array.isArray(data) ? data : [],
    count,
  };
}

export async function fetchAllPublicKomoditas(params?: {
  nama?: string;
  name?: string;
  id_pasar?: string;
  id_tempat_usaha?: string;
}): Promise<{ items: PublicKomoditasListItem[]; count: number }> {
  const limit = 50;
  let page = 1;
  let count = 0;
  const items: PublicKomoditasListItem[] = [];

  while (true) {
    const batch = await fetchPublicKomoditasList({ ...params, limit, page });
    count = batch.count;
    items.push(...batch.items);
    if (items.length >= count || batch.items.length < limit) {
      break;
    }
    page += 1;
  }

  return { items, count };
}

export interface PublicTrendPoint {
  tanggal: string;
  harga_rata_rata: number;
}

export async function fetchPublicKomoditasTrend(
  id: string,
  params?: { days?: number; id_pasar?: string },
): Promise<PublicTrendPoint[]> {
  const searchParams = new URLSearchParams();
  if (params?.days) searchParams.set('days', String(params.days));
  if (params?.id_pasar) searchParams.set('id_pasar', params.id_pasar);

  const query = searchParams.toString();
  const res = await fetch(
    `${getApiBaseUrl()}/v1/public/komoditas/${id}/trend${query ? `?${query}` : ''}`,
  );
  if (!res.ok) {
    throw new Error(`Gagal memuat tren komoditas (${res.status})`);
  }

  const body = (await res.json()) as ApiEnvelope<
    Array<{ tanggal: string; harga_rata_rata: number }>
  >;
  if (!body.success) {
    throw new Error(body.message || 'Gagal memuat tren komoditas');
  }

  const data = body.data ?? [];
  return Array.isArray(data)
    ? data.map((point) => ({
        tanggal: point.tanggal?.slice(0, 10) ?? '',
        harga_rata_rata: point.harga_rata_rata,
      }))
    : [];
}

export async function fetchPublicKomoditasDetail(
  id: string,
  params?: { id_pasar?: string; days?: number },
): Promise<PublicKomoditasDetail> {
  const searchParams = new URLSearchParams();
  if (params?.id_pasar) searchParams.set('id_pasar', params.id_pasar);
  if (params?.days) searchParams.set('days', String(params.days));

  const query = searchParams.toString();
  const raw = await publicFetch<{
    komoditas: {
      id: string;
      nama: string;
      satuan?: string | null;
      gambar_url?: string | null;
    };
    latest: PublicHargaStat;
    avg_nd?: number | null;
    min_nd?: number | null;
    max_nd?: number | null;
    days: number;
  }>(`/v1/public/komoditas/${id}${query ? `?${query}` : ''}`);

  return {
    komoditas: {
      id: raw.komoditas.id,
      nama: raw.komoditas.nama,
      satuan_dasar: raw.komoditas.satuan || 'kg',
      gambar: raw.komoditas.gambar_url || '',
    },
    latest: raw.latest ?? {},
    avg_nd: raw.avg_nd,
    min_nd: raw.min_nd,
    max_nd: raw.max_nd,
    days: raw.days,
  };
}

export interface PublicPasarListItem {
  id: string;
  nama: string;
  alamat: string;
  is_active: number;
  longitude: number;
  latitude: number;
  total_tempat_usaha: number;
  total_komoditas: number;
}

export interface PublicTempatUsahaListItem {
  id: string;
  nama: string;
  pasar_id: string;
  pasar_nama: string;
}

export async function fetchPublicPasarList(): Promise<{
  items: PublicPasarListItem[];
  count: number;
}> {
  const res = await fetch(`${getApiBaseUrl()}/v1/public/pasar`);
  if (!res.ok) {
    throw new Error(`Gagal memuat data pasar (${res.status})`);
  }
  const body = (await res.json()) as ApiEnvelope<PublicPasarListItem[]>;
  if (!body.success) {
    throw new Error(body.message || 'Gagal memuat data pasar');
  }
  const items = Array.isArray(body.data) ? body.data : [];
  return { items, count: items.length };
}

export async function fetchPublicTempatUsahaList(params?: {
  nama?: string;
  name?: string;
  id_pasar?: string;
  limit?: number;
  page?: number;
}): Promise<{ items: PublicTempatUsahaListItem[]; count: number }> {
  const searchParams = new URLSearchParams();
  const nama = params?.nama ?? params?.name;
  if (nama) searchParams.set('nama', nama);
  if (params?.id_pasar) searchParams.set('id_pasar', params.id_pasar);
  searchParams.set('limit', String(params?.limit ?? 50));
  if (params?.page) searchParams.set('page', String(params.page));

  const { data, count } = await publicFetchPaginated<PublicTempatUsahaListItem[]>(
    `/v1/public/tempat-usaha?${searchParams}`,
  );
  return {
    items: Array.isArray(data) ? data : [],
    count,
  };
}

export async function fetchAllPublicTempatUsaha(params?: {
  nama?: string;
  name?: string;
  id_pasar?: string;
}): Promise<{ items: PublicTempatUsahaListItem[]; count: number }> {
  const limit = 50;
  let page = 1;
  let count = 0;
  const items: PublicTempatUsahaListItem[] = [];

  while (true) {
    const batch = await fetchPublicTempatUsahaList({ ...params, limit, page });
    count = batch.count;
    items.push(...batch.items);
    if (items.length >= count || batch.items.length < limit) {
      break;
    }
    page += 1;
  }

  return { items, count };
}

export async function fetchPublicTempatUsahaDetail(
  id: string,
  params?: { limit?: number },
): Promise<PublicTempatUsahaDetail> {
  const searchParams = new URLSearchParams();
  searchParams.set('limit', String(params?.limit ?? 1000));

  const raw = await publicFetch<{
    tempat_usaha: ApiTempatUsaha;
    pasar: ApiPasar;
    komoditas: PublicTempatUsahaKomoditas[];
  }>(`/v1/public/tempat-usaha/${id}?${searchParams}`);

  return {
    tempat_usaha: mapTempatUsahaFromApi(raw.tempat_usaha),
    pasar: mapPasarFromApi(raw.pasar),
    komoditas: raw.komoditas ?? [],
  };
}
