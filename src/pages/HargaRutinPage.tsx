import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import type { HargaRutin, KelasKomoditas } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { CalendarIcon, Plus, Pencil, Trash2, Search, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const kelasOptions: KelasKomoditas[] = ['besar', 'menengah', 'kecil'];

export default function HargaRutinPage() {
  const { hargaRutin, addHargaRutin, updateHargaRutin, deleteHargaRutin, pasar, komoditas, tempatUsaha, komoditasDijual } = useData();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(1);
  const [reviewOpen, setReviewOpen] = useState(false);

  // Step 1 fields
  const [namaEnumerator, setNamaEnumerator] = useState('');
  const [tanggal, setTanggal] = useState<Date | undefined>(undefined);
  const [pasarId, setPasarId] = useState('');

  // Step 2 fields
  const [komoditasId, setKomoditasId] = useState('');
  const [kelasKomoditas, setKelasKomoditas] = useState<KelasKomoditas | ''>('');
  const [tempatUsahaId, setTempatUsahaId] = useState('');
  const [harga, setHarga] = useState<number>(0);

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);

  const tanggalStr = tanggal ? format(tanggal, 'yyyy-MM-dd') : '';

  // Filter komoditas by pasar (through tempat usaha & komoditas dijual)
  const tuForPasar = tempatUsaha.filter(t => t.pasar_id === pasarId);
  const kdForPasar = komoditasDijual.filter(kd => tuForPasar.some(t => t.id === kd.tempat_usaha_id));
  const komoditasForPasar = komoditas.filter(k => kdForPasar.some(kd => kd.komoditas_id === k.id));

  // Filter tempat usaha by pasar + komoditas + kelas
  const tuFiltered = useMemo(() => {
    if (!komoditasId || !kelasKomoditas) return [];
    return tempatUsaha.filter(t => {
      if (t.pasar_id !== pasarId) return false;
      return komoditasDijual.some(kd =>
        kd.tempat_usaha_id === t.id && kd.komoditas_id === komoditasId
      );
    });
  }, [pasarId, komoditasId, kelasKomoditas, tempatUsaha, komoditasDijual]);

  // Already used kelas for same date+pasar+komoditas
  const usedKelas = useMemo(() => {
    if (!tanggalStr || !pasarId || !komoditasId) return new Set<string>();
    return new Set(
      hargaRutin
        .filter(h => h.tanggal === tanggalStr && h.pasar_id === pasarId && h.komoditas_id === komoditasId && h.id !== editingId)
        .map(h => h.kelas_komoditas)
    );
  }, [hargaRutin, tanggalStr, pasarId, komoditasId, editingId]);

  // Same-day same-pasar same-komoditas entries
  const sameDayEntries = useMemo(() => {
    if (!tanggalStr || !pasarId || !komoditasId) return [];
    return hargaRutin.filter(h =>
      h.tanggal === tanggalStr && h.pasar_id === pasarId && h.komoditas_id === komoditasId
    );
  }, [hargaRutin, tanggalStr, pasarId, komoditasId]);

  const filtered = hargaRutin.filter(h => {
    const kom = komoditas.find(k => k.id === h.komoditas_id);
    const pas = pasar.find(p => p.id === h.pasar_id);
    const q = search.toLowerCase();
    return (
      h.nama_enumerator.toLowerCase().includes(q) ||
      (kom?.nama || '').toLowerCase().includes(q) ||
      (pas?.nama || '').toLowerCase().includes(q)
    );
  });

  const resetForm = () => {
    setStep(1); setNamaEnumerator(''); setTanggal(undefined); setPasarId('');
    setKomoditasId(''); setKelasKomoditas(''); setTempatUsahaId(''); setHarga(0);
    setEditingId(null);
  };

  const openForm = () => { resetForm(); setShowForm(true); };

  const openEdit = (h: HargaRutin) => {
    if (h.status === 'finalisasi') return;
    setEditingId(h.id);
    setNamaEnumerator(h.nama_enumerator);
    setTanggal(new Date(h.tanggal));
    setPasarId(h.pasar_id);
    setKomoditasId(h.komoditas_id);
    setKelasKomoditas(h.kelas_komoditas);
    setTempatUsahaId(h.tempat_usaha_id);
    setHarga(h.harga);
    setStep(2);
    setShowForm(true);
  };

  const handleStep1Next = () => {
    if (!namaEnumerator.trim() || !tanggal || !pasarId) {
      toast.error('Lengkapi semua field');
      return;
    }
    setStep(2);
  };

  const handleReview = () => {
    if (!komoditasId || !kelasKomoditas || !tempatUsahaId || harga <= 0) {
      toast.error('Lengkapi semua field');
      return;
    }
    if (usedKelas.has(kelasKomoditas) && !editingId) {
      toast.error(`Kelas ${kelasKomoditas} sudah diinput untuk komoditas ini hari ini`);
      return;
    }
    setReviewOpen(true);
  };

  const handleFinalize = () => {
    const data = {
      nama_enumerator: namaEnumerator,
      tanggal: tanggalStr,
      pasar_id: pasarId,
      komoditas_id: komoditasId,
      kelas_komoditas: kelasKomoditas as KelasKomoditas,
      tempat_usaha_id: tempatUsahaId,
      harga,
      status: 'finalisasi' as const,
    };
    if (editingId) {
      updateHargaRutin(editingId, data);
      toast.success('Data diperbarui & difinalisasi');
    } else {
      addHargaRutin(data);
      toast.success('Data difinalisasi');
    }
    setReviewOpen(false);
    // Reset step 2 fields but stay on step 2
    setKomoditasId(''); setKelasKomoditas(''); setTempatUsahaId(''); setHarga(0); setEditingId(null);
  };

  const pasarName = pasar.find(p => p.id === pasarId)?.nama || '-';
  const komoditasName = komoditas.find(k => k.id === komoditasId)?.nama || '-';
  const tuName = tempatUsaha.find(t => t.id === tempatUsahaId)?.nama || '-';

  if (showForm) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">
            {editingId ? 'Edit Harga Rutin' : 'Tambah Harga Rutin'}
          </h1>
          <Button variant="ghost" onClick={() => { setShowForm(false); resetForm(); }}>Batal</Button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-sm">
          <span className={cn('px-3 py-1 rounded-full text-xs font-medium', step === 1 ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground')}>1. Info Dasar</span>
          <span className={cn('px-3 py-1 rounded-full text-xs font-medium', step === 2 ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground')}>2. Data Harga</span>
        </div>

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
                    <Button variant="outline" className={cn('w-full justify-start text-left', !tanggal && 'text-muted-foreground')}>
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

        {step === 2 && (
          <>
            <Card>
              <CardContent className="p-4 space-y-4">
                <p className="text-sm text-muted-foreground">
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

            {/* Same day entries */}
            {sameDayEntries.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Data hari ini - {komoditasName}</h3>
                {sameDayEntries.map(entry => (
                  <Card key={entry.id} className="border-accent/30">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge variant={entry.status === 'finalisasi' ? 'default' : 'secondary'} className={entry.status === 'finalisasi' ? 'bg-success text-success-foreground' : ''}>
                            {entry.kelas_komoditas}
                          </Badge>
                          <p className="text-sm mt-1">Rp {entry.harga.toLocaleString('id-ID')}</p>
                        </div>
                        <Badge variant={entry.status === 'finalisasi' ? 'default' : 'outline'} className={entry.status === 'finalisasi' ? 'bg-success/20 text-success' : ''}>
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

        {/* Review modal */}
        <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Review Data</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Enumerator:</span><span className="font-medium">{namaEnumerator}</span>
                <span className="text-muted-foreground">Tanggal:</span><span className="font-medium">{tanggal ? format(tanggal, 'PPP', { locale: localeId }) : '-'}</span>
                <span className="text-muted-foreground">Pasar:</span><span className="font-medium">{pasarName}</span>
                <span className="text-muted-foreground">Komoditas:</span><span className="font-medium">{komoditasName}</span>
                <span className="text-muted-foreground">Kelas:</span><span className="font-medium capitalize">{kelasKomoditas}</span>
                <span className="text-muted-foreground">Tempat Usaha:</span><span className="font-medium">{tuName}</span>
                <span className="text-muted-foreground">Harga:</span><span className="font-medium">Rp {harga.toLocaleString('id-ID')}</span>
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

  // List view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Harga Rutin</h1>
        <Button onClick={openForm} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4 mr-1" /> Tambah
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="space-y-3">
        {filtered.sort((a, b) => b.tanggal.localeCompare(a.tanggal)).map(h => {
          const kom = komoditas.find(k => k.id === h.komoditas_id);
          const pas = pasar.find(p => p.id === h.pasar_id);
          const isFinal = h.status === 'finalisasi';
          return (
            <Card key={h.id} className={cn(isFinal && 'border-success/30')}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{kom?.nama || '-'}</h3>
                      <Badge variant={isFinal ? 'default' : 'outline'} className={cn('text-xs', isFinal ? 'bg-success/20 text-success border-success/30' : '')}>
                        {isFinal ? <><CheckCircle className="h-3 w-3 mr-1" />Finalisasi</> : <><Clock className="h-3 w-3 mr-1" />Dalam Proses</>}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {pas?.nama} • <span className="capitalize">{h.kelas_komoditas}</span> • {h.tanggal}
                    </p>
                    <p className="text-lg font-bold text-accent mt-1">Rp {h.harga.toLocaleString('id-ID')}</p>
                    <p className="text-xs text-muted-foreground">{h.nama_enumerator}</p>
                  </div>
                  {!isFinal && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(h)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Hapus?</AlertDialogTitle><AlertDialogDescription>Data akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => { deleteHargaRutin(h.id); toast.success('Dihapus'); }}>Hapus</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Belum ada data harga rutin.</p>}
      </div>
    </div>
  );
}
