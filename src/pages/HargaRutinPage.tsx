/**
 * HargaRutinPage — Halaman CRUD Harga Rutin.
 * Multi-step form: Step 1 (info dasar) → Step 2 (data harga) → Review → Finalisasi.
 *
 * Status warna:
 * - Finalisasi (hijau/success): data sudah dikonfirmasi, read-only
 * - Dalam Proses (kuning/warning): masih bisa diedit/dihapus
 *
 * Kelas komoditas warna:
 * - Besar (gold/kelas-besar), Menengah (biru/kelas-menengah), Kecil (abu/kelas-kecil)
 */
import { useState, useMemo, useRef } from 'react';
import { useData } from '@/contexts/DataContext';
import type { HargaRutin, KelasKomoditas, SatuanDasar } from '@/types';
import { SATUAN_DASAR_OPTIONS, KONVERSI_SATUAN, hitungHargaStandar } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { CalendarIcon, Plus, Pencil, Trash2, Search, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { exportToCSV, parseCSV } from '@/lib/csv-utils';

const kelasOptions: KelasKomoditas[] = ['besar', 'menengah', 'kecil'];

/** Helper: mendapatkan style warna untuk badge kelas */
const getKelasStyle = (kelas: string) => {
  switch (kelas) {
    case 'besar': return 'border-kelas-besar text-kelas-besar bg-kelas-besar/10';
    case 'menengah': return 'border-kelas-menengah text-kelas-menengah bg-kelas-menengah/10';
    case 'kecil': return 'border-kelas-kecil text-kelas-kecil bg-kelas-kecil/10';
    default: return '';
  }
};

/** Helper: mendapatkan style warna untuk badge status */
const getStatusStyle = (status: string) => {
  switch (status) {
    case 'finalisasi': return 'bg-success/15 text-success border-success/20';
    case 'dalam_proses': return 'bg-warning/15 text-warning border-warning/20';
    default: return '';
  }
};

export default function HargaRutinPage() {
  const { hargaRutin, addHargaRutin, updateHargaRutin, deleteHargaRutin, pasar, komoditas, tempatUsaha, komoditasDijual } = useData();

  /* ===== State form ===== */
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(1);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPasar, setFilterPasar] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [namaEnumerator, setNamaEnumerator] = useState('');
  const [tanggal, setTanggal] = useState<Date | undefined>(undefined);
  const [pasarId, setPasarId] = useState('');
  const [komoditasId, setKomoditasId] = useState('');
  const [kelasKomoditas, setKelasKomoditas] = useState<KelasKomoditas | ''>('');
  const [tempatUsahaId, setTempatUsahaId] = useState('');
  const [harga, setHarga] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  const tanggalStr = tanggal ? format(tanggal, 'yyyy-MM-dd') : '';

  /* ===== Filter dropdown berdasarkan relasi data ===== */
  // Tempat usaha di pasar terpilih
  const tuForPasar = tempatUsaha.filter(t => t.pasar_id === pasarId);
  // Komoditas yang dijual di pasar terpilih
  const kdForPasar = komoditasDijual.filter(kd => tuForPasar.some(t => t.id === kd.tempat_usaha_id));
  const komoditasForPasar = komoditas.filter(k => kdForPasar.some(kd => kd.komoditas_id === k.id));

  // Tempat usaha yang menjual komoditas terpilih
  const tuFiltered = useMemo(() => {
    if (!komoditasId || !kelasKomoditas) return [];
    return tempatUsaha.filter(t => {
      if (t.pasar_id !== pasarId) return false;
      return komoditasDijual.some(kd => kd.tempat_usaha_id === t.id && kd.komoditas_id === komoditasId);
    });
  }, [pasarId, komoditasId, kelasKomoditas, tempatUsaha, komoditasDijual]);

  /** Kelas yang sudah diinput untuk kombinasi tanggal+pasar+komoditas ini */
  const usedKelas = useMemo(() => {
    if (!tanggalStr || !pasarId || !komoditasId) return new Set<string>();
    return new Set(
      hargaRutin
        .filter(h => h.tanggal === tanggalStr && h.pasar_id === pasarId && h.komoditas_id === komoditasId && h.id !== editingId)
        .map(h => h.kelas_komoditas)
    );
  }, [hargaRutin, tanggalStr, pasarId, komoditasId, editingId]);

  /** Entry hari ini untuk komoditas & pasar yang sama — ditampilkan di bawah form */
  const sameDayEntries = useMemo(() => {
    if (!tanggalStr || !pasarId || !komoditasId) return [];
    return hargaRutin.filter(h => h.tanggal === tanggalStr && h.pasar_id === pasarId && h.komoditas_id === komoditasId);
  }, [hargaRutin, tanggalStr, pasarId, komoditasId]);

  /* ===== Filter & Sort daftar utama ===== */
  const filtered = hargaRutin
    .filter(h => {
      const kom = komoditas.find(k => k.id === h.komoditas_id);
      const pas = pasar.find(p => p.id === h.pasar_id);
      const q = search.toLowerCase();
      return h.nama_enumerator.toLowerCase().includes(q) || (kom?.nama || '').toLowerCase().includes(q) || (pas?.nama || '').toLowerCase().includes(q);
    })
    .filter(h => filterStatus === 'all' || h.status === filterStatus)
    .filter(h => filterPasar === 'all' || h.pasar_id === filterPasar)
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  /* ===== Handler form ===== */
  const resetForm = () => {
    setStep(1); setNamaEnumerator(''); setTanggal(undefined); setPasarId('');
    setKomoditasId(''); setKelasKomoditas(''); setTempatUsahaId(''); setHarga(0); setEditingId(null);
  };

  const openForm = () => { resetForm(); setShowForm(true); };

  /** Buka form edit — hanya untuk status "dalam_proses" */
  const openEdit = (h: HargaRutin) => {
    if (h.status === 'finalisasi') return;
    setEditingId(h.id); setNamaEnumerator(h.nama_enumerator);
    setTanggal(new Date(h.tanggal)); setPasarId(h.pasar_id);
    setKomoditasId(h.komoditas_id); setKelasKomoditas(h.kelas_komoditas);
    setTempatUsahaId(h.tempat_usaha_id); setHarga(h.harga);
    setStep(2); setShowForm(true);
  };

  const handleStep1Next = () => {
    if (!namaEnumerator.trim() || !tanggal || !pasarId) { toast.error('Lengkapi semua field'); return; }
    setStep(2);
  };

  /** Validasi sebelum review */
  const handleReview = () => {
    if (!komoditasId || !kelasKomoditas || !tempatUsahaId || harga <= 0) { toast.error('Lengkapi semua field'); return; }
    if (usedKelas.has(kelasKomoditas) && !editingId) { toast.error(`Kelas ${kelasKomoditas} sudah diinput untuk komoditas ini hari ini`); return; }
    setReviewOpen(true);
  };

  /** Finalisasi data — simpan dengan status "finalisasi" */
  const handleFinalize = () => {
    const data = {
      nama_enumerator: namaEnumerator, tanggal: tanggalStr, pasar_id: pasarId,
      komoditas_id: komoditasId, kelas_komoditas: kelasKomoditas as KelasKomoditas,
      tempat_usaha_id: tempatUsahaId, harga, status: 'finalisasi' as const,
    };
    if (editingId) { updateHargaRutin(editingId, data); toast.success('Diperbarui & difinalisasi'); }
    else { addHargaRutin(data); toast.success('Data difinalisasi'); }
    setReviewOpen(false);
    // Reset hanya field step 2, tetap di step 2 untuk input kelas berikutnya
    setKomoditasId(''); setKelasKomoditas(''); setTempatUsahaId(''); setHarga(0); setEditingId(null);
  };

  /* ===== Ekspor CSV ===== */
  const handleExport = () => {
    const data = hargaRutin.map(h => ({
      ...h,
      komoditas_nama: komoditas.find(k => k.id === h.komoditas_id)?.nama || '',
      pasar_nama: pasar.find(p => p.id === h.pasar_id)?.nama || '',
      tempat_usaha_nama: tempatUsaha.find(t => t.id === h.tempat_usaha_id)?.nama || '',
    }));
    exportToCSV(data, 'harga-rutin', [
      { key: 'tanggal', label: 'Tanggal' },
      { key: 'nama_enumerator', label: 'Enumerator' },
      { key: 'pasar_nama', label: 'Pasar' },
      { key: 'komoditas_nama', label: 'Komoditas' },
      { key: 'kelas_komoditas', label: 'Kelas' },
      { key: 'tempat_usaha_nama', label: 'Tempat Usaha' },
      { key: 'harga', label: 'Harga' },
      { key: 'status', label: 'Status' },
    ]);
    toast.success('Data diekspor');
  };

  /* ===== Lookup nama untuk review ===== */
  const pasarName = pasar.find(p => p.id === pasarId)?.nama || '-';
  const komoditasName = komoditas.find(k => k.id === komoditasId)?.nama || '-';
  const tuName = tempatUsaha.find(t => t.id === tempatUsahaId)?.nama || '-';

  /* ===== Render: Form Multi-step ===== */
  if (showForm) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        {/* Header form */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">{editingId ? 'Edit Harga Rutin' : 'Tambah Harga Rutin'}</h1>
          <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); resetForm(); }}>Batal</Button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          <span className={cn('px-3 py-1 rounded-full text-xs font-medium transition-colors', step === 1 ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground')}>1. Info Dasar</span>
          <span className={cn('px-3 py-1 rounded-full text-xs font-medium transition-colors', step === 2 ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground')}>2. Data Harga</span>
        </div>

        {/* ===== Step 1: Info Dasar ===== */}
        {step === 1 && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Nama Enumerator</Label>
                <Input value={namaEnumerator} onChange={e => setNamaEnumerator(e.target.value)} placeholder="Masukkan nama" />
              </div>
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !tanggal && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {tanggal ? format(tanggal, 'PPP', { locale: localeId }) : 'Pilih tanggal'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={tanggal} onSelect={setTanggal} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Pasar</Label>
                <Select value={pasarId} onValueChange={setPasarId}>
                  <SelectTrigger><SelectValue placeholder="Pilih pasar" /></SelectTrigger>
                  <SelectContent>{pasar.filter(p => p.is_active).map(p => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={handleStep1Next} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Lanjut</Button>
            </CardContent>
          </Card>
        )}

        {/* ===== Step 2: Data Harga ===== */}
        {step === 2 && (
          <>
            <Card>
              <CardContent className="p-4 space-y-4">
                {/* Ringkasan step 1 */}
                <p className="text-xs text-muted-foreground border-b pb-2">
                  {namaEnumerator} • {tanggal ? format(tanggal, 'PPP', { locale: localeId }) : ''} • {pasarName}
                </p>
                <div className="space-y-2">
                  <Label>Komoditas</Label>
                  <Select value={komoditasId} onValueChange={v => { setKomoditasId(v); setKelasKomoditas(''); setTempatUsahaId(''); }}>
                    <SelectTrigger><SelectValue placeholder="Pilih komoditas" /></SelectTrigger>
                    <SelectContent>
                      {(komoditasForPasar.length > 0 ? komoditasForPasar : komoditas).map(k => (
                        <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Kelas Komoditas</Label>
                  <Select value={kelasKomoditas} onValueChange={v => { setKelasKomoditas(v as KelasKomoditas); setTempatUsahaId(''); }}>
                    <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                    <SelectContent>
                      {/* Kelas yang sudah diinput ditandai disabled */}
                      {kelasOptions.map(k => (
                        <SelectItem key={k} value={k} disabled={usedKelas.has(k)}>
                          {k.charAt(0).toUpperCase() + k.slice(1)} {usedKelas.has(k) ? '(sudah diinput)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tempat Usaha</Label>
                  <Select value={tempatUsahaId} onValueChange={setTempatUsahaId}>
                    <SelectTrigger><SelectValue placeholder="Pilih tempat usaha" /></SelectTrigger>
                    <SelectContent>
                      {tuFiltered.map(t => <SelectItem key={t.id} value={t.id}>{t.nama}</SelectItem>)}
                      {tuFiltered.length === 0 && <SelectItem value="_none" disabled>Tidak ada data</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Harga (Rp)</Label>
                  <Input type="number" value={harga || ''} onChange={e => setHarga(parseFloat(e.target.value) || 0)} placeholder="0" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Kembali</Button>
                  <Button onClick={handleReview} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">Lanjut</Button>
                </div>
              </CardContent>
            </Card>

            {/* Entry hari ini untuk komoditas yang sama */}
            {sameDayEntries.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground">Data hari ini — {komoditasName}</h3>
                {sameDayEntries.map(entry => (
                  <Card key={entry.id} className="border-accent/20">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          {/* Badge kelas — warna sesuai design system */}
                          <Badge variant="outline" className={cn('text-xs capitalize', getKelasStyle(entry.kelas_komoditas))}>
                            {entry.kelas_komoditas}
                          </Badge>
                          <p className="text-sm mt-1 font-medium">Rp {entry.harga.toLocaleString('id-ID')}</p>
                        </div>
                        {/* Badge status */}
                        <Badge variant="outline" className={cn('text-xs', getStatusStyle(entry.status))}>
                          {entry.status === 'finalisasi' ? 'Final' : 'Proses'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== Dialog Review Sebelum Finalisasi ===== */}
        <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Review Data</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                <span className="text-muted-foreground">Enumerator</span><span className="font-medium">{namaEnumerator}</span>
                <span className="text-muted-foreground">Tanggal</span><span className="font-medium">{tanggal ? format(tanggal, 'PPP', { locale: localeId }) : '-'}</span>
                <span className="text-muted-foreground">Pasar</span><span className="font-medium">{pasarName}</span>
                <span className="text-muted-foreground">Komoditas</span><span className="font-medium">{komoditasName}</span>
                <span className="text-muted-foreground">Kelas</span><span className="font-medium capitalize">{kelasKomoditas}</span>
                <span className="text-muted-foreground">Tempat Usaha</span><span className="font-medium">{tuName}</span>
                <span className="text-muted-foreground">Harga</span><span className="font-bold text-accent">Rp {harga.toLocaleString('id-ID')}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewOpen(false)}>Kembali</Button>
              <Button onClick={handleFinalize} className="bg-accent text-accent-foreground hover:bg-accent/90">Finalisasi</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* ===== Render: Daftar Harga Rutin ===== */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Harga Rutin</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="hidden sm:flex">
            <Download className="h-4 w-4 mr-1" /> Ekspor
          </Button>
          <Button onClick={openForm} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-1" /> Tambah
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-28 sm:w-40 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="dalam_proses">Proses</SelectItem>
            <SelectItem value="finalisasi">Final</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPasar} onValueChange={setFilterPasar}>
          <SelectTrigger className="w-28 sm:w-40 h-9"><SelectValue placeholder="Pasar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            {pasar.map(p => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-9 sm:hidden" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" /> Ekspor
        </Button>
      </div>

      {/* Daftar kartu harga rutin */}
      <div className="space-y-2">
        {filtered.map(h => {
          const kom = komoditas.find(k => k.id === h.komoditas_id);
          const pas = pasar.find(p => p.id === h.pasar_id);
          const isFinal = h.status === 'finalisasi';
          return (
            <Card key={h.id} className={cn('transition-colors', isFinal && 'border-success/20')}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{kom?.nama || '-'}</h3>
                      {/* Badge kelas — warna konsisten */}
                      <Badge variant="outline" className={cn('text-xs capitalize', getKelasStyle(h.kelas_komoditas))}>
                        {h.kelas_komoditas}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pas?.nama} • {h.tanggal} • {h.nama_enumerator}
                    </p>
                    <p className="text-sm font-bold mt-1 text-accent">Rp {h.harga.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Badge status — hijau final, kuning proses */}
                    <Badge variant="outline" className={cn('text-xs', getStatusStyle(h.status))}>
                      {isFinal ? 'Final' : 'Proses'}
                    </Badge>
                    {/* Aksi edit & hapus — hanya untuk status "dalam_proses" */}
                    {!isFinal && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(h)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Hapus?</AlertDialogTitle><AlertDialogDescription>Data akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => { deleteHargaRutin(h.id); toast.success('Dihapus'); }}>Hapus</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Tidak ada data.</p>}
      </div>

      {/* Legenda indikator */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="text-muted-foreground font-medium">Status:</span>
            <Badge variant="outline" className={cn('text-xs', getStatusStyle('finalisasi'))}>Finalisasi</Badge>
            <Badge variant="outline" className={cn('text-xs', getStatusStyle('dalam_proses'))}>Dalam Proses</Badge>
            <span className="text-muted-foreground font-medium ml-2">Kelas:</span>
            <Badge variant="outline" className={cn('text-xs capitalize', getKelasStyle('besar'))}>Besar</Badge>
            <Badge variant="outline" className={cn('text-xs capitalize', getKelasStyle('menengah'))}>Menengah</Badge>
            <Badge variant="outline" className={cn('text-xs capitalize', getKelasStyle('kecil'))}>Kecil</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
