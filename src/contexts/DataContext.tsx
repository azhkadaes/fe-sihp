import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Pasar, Komoditas, TempatUsaha, KomoditasDijual, HargaRutin, HargaPelaporan } from '@/types';

function load<T>(key: string, fallback: T[]): T[] {
  try {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : fallback;
  } catch { return fallback; }
}
function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}
function uid() { return crypto.randomUUID(); }

interface DataContextType {
  pasar: Pasar[]; setPasar: React.Dispatch<React.SetStateAction<Pasar[]>>;
  komoditas: Komoditas[]; setKomoditas: React.Dispatch<React.SetStateAction<Komoditas[]>>;
  tempatUsaha: TempatUsaha[]; setTempatUsaha: React.Dispatch<React.SetStateAction<TempatUsaha[]>>;
  komoditasDijual: KomoditasDijual[]; setKomoditasDijual: React.Dispatch<React.SetStateAction<KomoditasDijual[]>>;
  hargaRutin: HargaRutin[]; setHargaRutin: React.Dispatch<React.SetStateAction<HargaRutin[]>>;
  hargaPelaporan: HargaPelaporan[];
  addPasar: (p: Omit<Pasar, 'id'>) => void;
  updatePasar: (id: string, p: Partial<Pasar>) => void;
  deletePasar: (id: string) => void;
  addKomoditas: (k: Omit<Komoditas, 'id'>) => void;
  updateKomoditas: (id: string, k: Partial<Komoditas>) => void;
  deleteKomoditas: (id: string) => void;
  addTempatUsaha: (t: Omit<TempatUsaha, 'id'>) => void;
  updateTempatUsaha: (id: string, t: Partial<TempatUsaha>) => void;
  deleteTempatUsaha: (id: string) => void;
  addKomoditasDijual: (k: Omit<KomoditasDijual, 'id'>) => void;
  updateKomoditasDijual: (id: string, k: Partial<KomoditasDijual>) => void;
  deleteKomoditasDijual: (id: string) => void;
  addHargaRutin: (h: Omit<HargaRutin, 'id'>) => void;
  updateHargaRutin: (id: string, h: Partial<HargaRutin>) => void;
  deleteHargaRutin: (id: string) => void;
  calculateHargaPelaporan: () => HargaPelaporan[];
}

const DataContext = createContext<DataContextType | null>(null);
export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};

// Generate mock data
function generateMockData() {
  const mockPasar: Pasar[] = [
    { id: uid(), nama: 'Pasar Andir', longitude: 107.5731, latitude: -6.9147, alamat: 'Jl. Andir No. 1, Bandung', is_active: 1 },
    { id: uid(), nama: 'Pasar Kosambi', longitude: 107.6089, latitude: -6.9175, alamat: 'Jl. Ahmad Yani No. 221, Bandung', is_active: 1 },
    { id: uid(), nama: 'Pasar Caringin', longitude: 107.5819, latitude: -6.9350, alamat: 'Jl. Soekarno Hatta No. 525, Bandung', is_active: 1 },
  ];
  const mockKomoditas: Komoditas[] = [
    { id: uid(), nama: 'Beras Premium', standardized_unit: 1, gambar: '' },
    { id: uid(), nama: 'Cabai Merah', standardized_unit: 1, gambar: '' },
    { id: uid(), nama: 'Bawang Merah', standardized_unit: 1, gambar: '' },
    { id: uid(), nama: 'Minyak Goreng', standardized_unit: 1, gambar: '' },
    { id: uid(), nama: 'Gula Pasir', standardized_unit: 1, gambar: '' },
  ];
  return { mockPasar, mockKomoditas };
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const defaults = generateMockData();

  const [pasar, setPasar] = useState<Pasar[]>(() => load('pasar', defaults.mockPasar));
  const [komoditas, setKomoditas] = useState<Komoditas[]>(() => load('komoditas', defaults.mockKomoditas));
  const [tempatUsaha, setTempatUsaha] = useState<TempatUsaha[]>(() => load('tempatUsaha', []));
  const [komoditasDijual, setKomoditasDijual] = useState<KomoditasDijual[]>(() => load('komoditasDijual', []));
  const [hargaRutin, setHargaRutin] = useState<HargaRutin[]>(() => load('hargaRutin', []));

  const persist = useCallback(<T,>(key: string, setter: React.Dispatch<React.SetStateAction<T[]>>, updater: (prev: T[]) => T[]) => {
    setter(prev => {
      const next = updater(prev);
      save(key, next);
      return next;
    });
  }, []);

  const addPasar = (p: Omit<Pasar, 'id'>) => persist('pasar', setPasar, prev => [...prev, { ...p, id: uid() }]);
  const updatePasar = (id: string, p: Partial<Pasar>) => persist('pasar', setPasar, prev => prev.map(x => x.id === id ? { ...x, ...p } : x));
  const deletePasar = (id: string) => persist('pasar', setPasar, prev => prev.filter(x => x.id !== id));

  const addKomoditas = (k: Omit<Komoditas, 'id'>) => persist('komoditas', setKomoditas, prev => [...prev, { ...k, id: uid() }]);
  const updateKomoditas = (id: string, k: Partial<Komoditas>) => persist('komoditas', setKomoditas, prev => prev.map(x => x.id === id ? { ...x, ...k } : x));
  const deleteKomoditas = (id: string) => persist('komoditas', setKomoditas, prev => prev.filter(x => x.id !== id));

  const addTempatUsaha = (t: Omit<TempatUsaha, 'id'>) => persist('tempatUsaha', setTempatUsaha, prev => [...prev, { ...t, id: uid() }]);
  const updateTempatUsaha = (id: string, t: Partial<TempatUsaha>) => persist('tempatUsaha', setTempatUsaha, prev => prev.map(x => x.id === id ? { ...x, ...t } : x));
  const deleteTempatUsaha = (id: string) => persist('tempatUsaha', setTempatUsaha, prev => prev.filter(x => x.id !== id));

  const addKomoditasDijual = (k: Omit<KomoditasDijual, 'id'>) => persist('komoditasDijual', setKomoditasDijual, prev => [...prev, { ...k, id: uid() }]);
  const updateKomoditasDijual = (id: string, k: Partial<KomoditasDijual>) => persist('komoditasDijual', setKomoditasDijual, prev => prev.map(x => x.id === id ? { ...x, ...k } : x));
  const deleteKomoditasDijual = (id: string) => persist('komoditasDijual', setKomoditasDijual, prev => prev.filter(x => x.id !== id));

  const addHargaRutin = (h: Omit<HargaRutin, 'id'>) => persist('hargaRutin', setHargaRutin, prev => [...prev, { ...h, id: uid() }]);
  const updateHargaRutin = (id: string, h: Partial<HargaRutin>) => persist('hargaRutin', setHargaRutin, prev => prev.map(x => x.id === id ? { ...x, ...h } : x));
  const deleteHargaRutin = (id: string) => persist('hargaRutin', setHargaRutin, prev => prev.filter(x => x.id !== id));

  const calculateHargaPelaporan = useCallback((): HargaPelaporan[] => {
    const finalized = hargaRutin.filter(h => h.status === 'finalisasi');
    const grouped: Record<string, HargaRutin[]> = {};
    finalized.forEach(h => {
      const key = `${h.tanggal}_${h.pasar_id}_${h.komoditas_id}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(h);
    });
    return Object.entries(grouped).map(([, items]) => {
      const besar = items.find(i => i.kelas_komoditas === 'besar');
      const menengah = items.find(i => i.kelas_komoditas === 'menengah');
      const kecil = items.find(i => i.kelas_komoditas === 'kecil');
      const prices = [besar?.harga, menengah?.harga, kecil?.harga].filter((p): p is number => p != null);
      const avg = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
      return {
        id: uid(),
        tanggal: items[0].tanggal,
        pasar_id: items[0].pasar_id,
        komoditas_id: items[0].komoditas_id,
        harga_rata_rata: Math.round(avg),
        harga_besar: besar?.harga ?? null,
        harga_menengah: menengah?.harga ?? null,
        harga_kecil: kecil?.harga ?? null,
      };
    });
  }, [hargaRutin]);

  const hargaPelaporan = calculateHargaPelaporan();

  return (
    <DataContext.Provider value={{
      pasar, setPasar, komoditas, setKomoditas, tempatUsaha, setTempatUsaha,
      komoditasDijual, setKomoditasDijual, hargaRutin, setHargaRutin, hargaPelaporan,
      addPasar, updatePasar, deletePasar,
      addKomoditas, updateKomoditas, deleteKomoditas,
      addTempatUsaha, updateTempatUsaha, deleteTempatUsaha,
      addKomoditasDijual, updateKomoditasDijual, deleteKomoditasDijual,
      addHargaRutin, updateHargaRutin, deleteHargaRutin, calculateHargaPelaporan,
    }}>
      {children}
    </DataContext.Provider>
  );
};
