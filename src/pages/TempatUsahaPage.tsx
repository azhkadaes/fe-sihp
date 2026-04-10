/**
 * TempatUsahaPage — Halaman CRUD Tempat Usaha.
 * Menampilkan daftar toko/pedagang beserta komoditas yang dijual.
 * Mendukung sub-CRUD komoditas dijual dengan klasifikasi kelas otomatis.
 *
 * Warna kelas komoditas (konsisten di seluruh aplikasi):
 * - Besar: Gold (kelas-besar) — pedagang besar dengan harga tinggi
 * - Menengah: Biru (kelas-menengah) — pedagang menengah
 * - Kecil: Abu (kelas-kecil) — pedagang kecil dengan harga rendah
 */
import { useState, useRef } from 'react';
import { useData } from '@/contexts/DataContext';
import type { TempatUsaha, KomoditasDijual } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, Pencil, Trash2, Search, ChevronRight, ArrowLeft, Download, Upload, ArrowUpDown, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { exportToCSV, parseCSV } from '@/lib/csv-utils';

/** Form default untuk tempat usaha baru */
const emptyTU: Omit<TempatUsaha, 'id'> = { nama: '', nama_pemilik: '', nama_narahubung: '', nomor_narahubung: '', berjualan_sejak: '', is_active: 1, pasar_id: '' };

/** Form default untuk komoditas dijual baru */
const emptyKD: Omit<KomoditasDijual, 'id'> = {
  tempat_usaha_id: '', komoditas_id: '', harga_normal: 0, harga_mahal: 0,
  satuan_stok: 'kg', nilai_stok: 0, nilai_periode: 0, lokasi_supplier: '',
  pola_distribusi: 0, standardized_stock_periode: 0, is_active: true,
};

/**
 * Helper: mendapatkan style warna untuk badge kelas komoditas.
 * Menggunakan token dari design system (--kelas-besar, --kelas-menengah, --kelas-kecil).
 */
const getKelasStyle = (kelas: string) => {
  switch (kelas) {
    case 'besar': return 'border-kelas-besar text-kelas-besar bg-kelas-besar/10';
    case 'menengah': return 'border-kelas-menengah text-kelas-menengah bg-kelas-menengah/10';
    case 'kecil': return 'border-kelas-kecil text-kelas-kecil bg-kelas-kecil/10';
    default: return '';
  }
};

export default function TempatUsahaPage() {
  const { tempatUsaha, addTempatUsaha, updateTempatUsaha, deleteTempatUsaha, pasar, komoditas, komoditasDijual, addKomoditasDijual, updateKomoditasDijual, deleteKomoditasDijual, getKelasForTU } = useData();
  const isMobile = useIsMobile();

  /* ===== State utama ===== */
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TempatUsaha | null>(null);
  const [form, setForm] = useState<Omit<TempatUsaha, 'id'>>(emptyTU);
  const [sameAsOwner, setSameAsOwner] = useState(true);
  const [selectedTU, setSelectedTU] = useState<TempatUsaha | null>(null);
  const [kdDialogOpen, setKdDialogOpen] = useState(false);
  const [editingKD, setEditingKD] = useState<KomoditasDijual | null>(null);
  const [kdForm, setKdForm] = useState<Omit<KomoditasDijual, 'id'>>(emptyKD);
  const [filterPasar, setFilterPasar] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<'nama' | 'nama_pemilik'>('nama');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [berjualanDate, setBerjualanDate] = useState<Date | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ===== Filter & Sort ===== */
  const filtered = tempatUsaha
    .filter(t => t.nama.toLowerCase().includes(search.toLowerCase()) || t.nama_pemilik.toLowerCase().includes(search.toLowerCase()))
    .filter(t => filterPasar === 'all' || t.pasar_id === filterPasar)
    .filter(t => filterStatus === 'all' || (filterStatus === 'active' ? t.is_active === 1 : t.is_active === 0))
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      return a[sortField].localeCompare(b[sortField]) * mul;
    });

  const toggleSort = (field: 'nama' | 'nama_pemilik') => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  /* ===== Handler form Tempat Usaha ===== */
  const openAdd = () => {
    setEditing(null);
    setForm(emptyTU);
    setSameAsOwner(true);
    setBerjualanDate(undefined);
    setDialogOpen(true);
  };

  const openEdit = (t: TempatUsaha) => {
    setEditing(t);
    setForm({ nama: t.nama, nama_pemilik: t.nama_pemilik, nama_narahubung: t.nama_narahubung, nomor_narahubung: t.nomor_narahubung, berjualan_sejak: t.berjualan_sejak, is_active: t.is_active, pasar_id: t.pasar_id });
    setSameAsOwner(t.nama_pemilik === t.nama_narahubung || !t.nama_narahubung);
    setBerjualanDate(t.berjualan_sejak ? new Date(t.berjualan_sejak) : undefined);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) { toast.error('Nama wajib diisi'); return; }
    // Jika checkbox "sama dengan pemilik" aktif, salin nama_pemilik ke nama_narahubung
    const narahubung = sameAsOwner ? form.nama_pemilik : form.nama_narahubung;
    const data = { ...form, nama_narahubung: narahubung, berjualan_sejak: berjualanDate ? format(berjualanDate, 'yyyy-MM-dd') : form.berjualan_sejak };
    if (editing) { updateTempatUsaha(editing.id, data); toast.success('Diperbarui'); }
    else { addTempatUsaha(data); toast.success('Ditambahkan'); }
    setDialogOpen(false);
  };

  /* ===== Ekspor & Impor CSV ===== */
  const handleExport = () => {
    const data = tempatUsaha.map(t => ({
      ...t,
      pasar_nama: pasar.find(p => p.id === t.pasar_id)?.nama || '',
    }));
    exportToCSV(data, 'tempat-usaha', [
      { key: 'nama', label: 'Nama' },
      { key: 'nama_pemilik', label: 'Pemilik' },
      { key: 'pasar_nama', label: 'Pasar' },
      { key: 'berjualan_sejak', label: 'Berjualan Sejak' },
      { key: 'is_active', label: 'Aktif' },
    ]);
    toast.success('Data diekspor');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCSV(reader.result as string);
      let count = 0;
      rows.forEach(r => {
        if (r['Nama']?.trim()) {
          const matchPasar = pasar.find(p => p.nama === r['Pasar']);
          addTempatUsaha({
            nama: r['Nama'].trim(),
            nama_pemilik: r['Pemilik'] || '',
            nama_narahubung: '',
            nomor_narahubung: '',
            berjualan_sejak: r['Berjualan Sejak'] || '',
            is_active: r['Aktif'] === '0' ? 0 : 1,
            pasar_id: matchPasar?.id || '',
          });
          count++;
        }
      });
      toast.success(`${count} tempat usaha diimpor`);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ===== Sub-CRUD Komoditas Dijual ===== */
  const kdForTU = selectedTU ? komoditasDijual.filter(kd => kd.tempat_usaha_id === selectedTU.id) : [];

  const openAddKD = () => {
    setEditingKD(null);
    setKdForm({ ...emptyKD, tempat_usaha_id: selectedTU!.id });
    setKdDialogOpen(true);
  };

  const handleKDSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingKD) { updateKomoditasDijual(editingKD.id, kdForm); toast.success('Diperbarui'); }
    else { addKomoditasDijual(kdForm); toast.success('Ditambahkan'); }
    setKdDialogOpen(false);
  };

  /* ===== Detail View — Komoditas Dijual ===== */
  if (selectedTU) {
    const tuKelas = getKelasForTU(selectedTU.id);
    return (
      <div className="space-y-4">
        {/* Header detail */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedTU(null)}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">{selectedTU.nama}</h1>
            <p className="text-xs text-muted-foreground">Komoditas yang dijual • {pasar.find(p => p.id === selectedTU.pasar_id)?.nama || '-'}</p>
          </div>
        </div>

        {/* Tombol tambah komoditas */}
        <Button onClick={openAddKD} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4 mr-1" /> Tambah Komoditas
        </Button>

        {/* Dialog form komoditas dijual */}
        <Dialog open={kdDialogOpen} onOpenChange={setKdDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingKD ? 'Edit' : 'Tambah'} Komoditas Dijual</DialogTitle></DialogHeader>
            <form onSubmit={handleKDSubmit} className="space-y-3">
              <div className="space-y-2">
                <Label>Komoditas</Label>
                <Select value={kdForm.komoditas_id} onValueChange={v => setKdForm({ ...kdForm, komoditas_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih komoditas" /></SelectTrigger>
                  <SelectContent>{komoditas.map(k => <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Harga Normal</Label><Input type="number" value={kdForm.harga_normal} onChange={e => setKdForm({ ...kdForm, harga_normal: parseFloat(e.target.value) || 0 })} /></div>
                <div className="space-y-2"><Label>Harga Mahal</Label><Input type="number" value={kdForm.harga_mahal} onChange={e => setKdForm({ ...kdForm, harga_mahal: parseFloat(e.target.value) || 0 })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Satuan Stok</Label>
                  <Select value={kdForm.satuan_stok} onValueChange={v => setKdForm({ ...kdForm, satuan_stok: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kg</SelectItem>
                      <SelectItem value="liter">Liter</SelectItem>
                      <SelectItem value="pcs">Pcs</SelectItem>
                      <SelectItem value="ikat">Ikat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Nilai Stok</Label><Input type="number" step="any" value={kdForm.nilai_stok} onChange={e => setKdForm({ ...kdForm, nilai_stok: parseFloat(e.target.value) || 0 })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Nilai Periode</Label><Input type="number" value={kdForm.nilai_periode} onChange={e => setKdForm({ ...kdForm, nilai_periode: parseInt(e.target.value) || 0 })} /></div>
                <div className="space-y-2"><Label>Pola Distribusi</Label><Input type="number" value={kdForm.pola_distribusi} onChange={e => setKdForm({ ...kdForm, pola_distribusi: parseInt(e.target.value) || 0 })} /></div>
              </div>
              <div className="space-y-2"><Label>Lokasi Supplier</Label><Input value={kdForm.lokasi_supplier} onChange={e => setKdForm({ ...kdForm, lokasi_supplier: e.target.value })} /></div>
              <div className="flex items-center gap-2">
                <Switch checked={kdForm.is_active} onCheckedChange={c => setKdForm({ ...kdForm, is_active: c })} />
                <Label>Aktif</Label>
              </div>
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Simpan</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Legenda kelas komoditas */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-muted-foreground">Kelas:</span>
          <Badge variant="outline" className={`text-xs capitalize ${getKelasStyle('besar')}`}>Besar</Badge>
          <Badge variant="outline" className={`text-xs capitalize ${getKelasStyle('menengah')}`}>Menengah</Badge>
          <Badge variant="outline" className={`text-xs capitalize ${getKelasStyle('kecil')}`}>Kecil</Badge>
        </div>

        {/* Daftar komoditas dijual */}
        <div className="space-y-2">
          {kdForTU.map(kd => {
            const kom = komoditas.find(k => k.id === kd.komoditas_id);
            const kelas = tuKelas[kd.komoditas_id];
            const avgHarga = (kd.harga_normal + kd.harga_mahal) / 2;
            return (
              <Card key={kd.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{kom?.nama || '-'}</h3>
                        {/* Badge kelas — warna sesuai design system */}
                        {kelas && (
                          <Badge variant="outline" className={cn('text-xs capitalize', getKelasStyle(kelas))}>
                            {kelas}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Normal: Rp {kd.harga_normal.toLocaleString('id-ID')} • Mahal: Rp {kd.harga_mahal.toLocaleString('id-ID')}
                      </p>
                      <p className="text-xs text-muted-foreground">Rata-rata: Rp {avgHarga.toLocaleString('id-ID')}</p>
                      {/* Status aktif/nonaktif */}
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${kd.is_active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {kd.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    {/* Aksi edit & hapus */}
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingKD(kd); setKdForm({ ...kd }); setKdDialogOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Hapus?</AlertDialogTitle><AlertDialogDescription>Data akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => { deleteKomoditasDijual(kd.id); toast.success('Dihapus'); }}>Hapus</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {kdForTU.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Belum ada komoditas dijual.</p>}
        </div>
      </div>
    );
  }

  /* ===== List View — Daftar Tempat Usaha ===== */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Tempat Usaha</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="hidden sm:flex">
            <Download className="h-4 w-4 mr-1" /> Ekspor
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="hidden sm:flex">
            <Upload className="h-4 w-4 mr-1" /> Impor
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
          {/* Dialog tambah/edit tempat usaha */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAdd} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4 mr-1" /> Tambah
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Tambah'} Tempat Usaha</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2"><Label>Nama</Label><Input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} required /></div>
                <div className="space-y-2">
                  <Label>Pasar</Label>
                  <Select value={form.pasar_id} onValueChange={v => setForm({ ...form, pasar_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih pasar" /></SelectTrigger>
                    <SelectContent>{pasar.map(p => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {/* Nama Pemilik */}
                <div className="space-y-2">
                  <Label>Nama Pemilik</Label>
                  <Input value={form.nama_pemilik} onChange={e => {
                    const val = e.target.value;
                    setForm(prev => ({ ...prev, nama_pemilik: val, ...(sameAsOwner ? { nama_narahubung: val } : {}) }));
                  }} />
                </div>
                {/* Checkbox: narahubung sama dengan pemilik */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="same-owner" checked={sameAsOwner} onCheckedChange={(v) => {
                      const checked = !!v;
                      setSameAsOwner(checked);
                      if (checked) setForm(prev => ({ ...prev, nama_narahubung: prev.nama_pemilik }));
                    }} />
                    <label htmlFor="same-owner" className="text-sm text-muted-foreground cursor-pointer">
                      Narahubung sama dengan pemilik
                    </label>
                  </div>
                  {/* Input narahubung terpisah — muncul hanya jika nama berbeda */}
                  {!sameAsOwner && (
                    <div className="space-y-2">
                      <Label>Nama Narahubung</Label>
                      <Input value={form.nama_narahubung} onChange={e => setForm({ ...form, nama_narahubung: e.target.value })} />
                    </div>
                  )}
                </div>
                <div className="space-y-2"><Label>Nomor Narahubung</Label><Input value={form.nomor_narahubung} onChange={e => setForm({ ...form, nomor_narahubung: e.target.value })} /></div>
                {/* Calendar picker untuk tanggal berjualan */}
                <div className="space-y-2">
                  <Label>Berjualan Sejak</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !berjualanDate && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {berjualanDate ? format(berjualanDate, 'PPP', { locale: localeId }) : 'Pilih tanggal'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={berjualanDate} onSelect={setBerjualanDate} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active === 1} onCheckedChange={c => setForm({ ...form, is_active: c ? 1 : 0 })} />
                  <Label>Aktif</Label>
                </div>
                <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  {editing ? 'Perbarui' : 'Simpan'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Pencarian & Filter */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari tempat usaha..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9" />
        </div>
        <Select value={filterPasar} onValueChange={setFilterPasar}>
          <SelectTrigger className="w-28 sm:w-36 h-9"><SelectValue placeholder="Pasar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            {pasar.map(p => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-28 sm:w-32 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Daftar tempat usaha */}
      <div className="space-y-2">
        {filtered.map(t => {
          const pas = pasar.find(p => p.id === t.pasar_id);
          const kdCount = komoditasDijual.filter(kd => kd.tempat_usaha_id === t.id).length;
          return (
            <Card key={t.id} className="cursor-pointer hover:border-accent/40 transition-colors" onClick={() => setSelectedTU(t)}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm truncate">{t.nama}</h3>
                      {/* Badge status */}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${t.is_active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {t.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pas?.nama || '-'} • Pemilik: {t.nama_pemilik || '-'} • {kdCount} komoditas
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Tombol edit — stop propagation agar tidak masuk detail */}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); openEdit(t); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Hapus?</AlertDialogTitle><AlertDialogDescription>Data "{t.nama}" akan dihapus.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => { deleteTempatUsaha(t.id); toast.success('Dihapus'); }}>Hapus</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Tidak ada data.</p>}
      </div>
    </div>
  );
}
