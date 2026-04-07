import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import type { TempatUsaha, KomoditasDijual, KelasKomoditas } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, Pencil, Trash2, Search, ChevronRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const emptyTU: Omit<TempatUsaha, 'id'> = { nama: '', nama_pemilik: '', nama_narahubung: '', nomor_narahubung: '', berjualan_sejak: '', is_active: 1, pasar_id: '' };

const emptyKD: Omit<KomoditasDijual, 'id'> = {
  tempat_usaha_id: '', komoditas_id: '', harga_normal: 0, harga_mahal: 0,
  satuan_stok: 'kg', nilai_stok: 0, nilai_periode: 0, lokasi_supplier: '',
  pola_distribusi: 0, standardized_stock_periode: 0, kelas_komoditas: 'menengah', is_active: true,
};

export default function TempatUsahaPage() {
  const { tempatUsaha, addTempatUsaha, updateTempatUsaha, deleteTempatUsaha, pasar, komoditas, komoditasDijual, addKomoditasDijual, updateKomoditasDijual, deleteKomoditasDijual } = useData();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TempatUsaha | null>(null);
  const [form, setForm] = useState<Omit<TempatUsaha, 'id'>>(emptyTU);
  const [selectedTU, setSelectedTU] = useState<TempatUsaha | null>(null);
  const [kdDialogOpen, setKdDialogOpen] = useState(false);
  const [editingKD, setEditingKD] = useState<KomoditasDijual | null>(null);
  const [kdForm, setKdForm] = useState<Omit<KomoditasDijual, 'id'>>(emptyKD);

  const filtered = tempatUsaha.filter(t => t.nama.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setEditing(null); setForm(emptyTU); setDialogOpen(true); };
  const openEdit = (t: TempatUsaha) => { setEditing(t); setForm({ nama: t.nama, nama_pemilik: t.nama_pemilik, nama_narahubung: t.nama_narahubung, nomor_narahubung: t.nomor_narahubung, berjualan_sejak: t.berjualan_sejak, is_active: t.is_active, pasar_id: t.pasar_id }); setDialogOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) { toast.error('Nama wajib diisi'); return; }
    if (editing) { updateTempatUsaha(editing.id, form); toast.success('Diperbarui'); }
    else { addTempatUsaha(form); toast.success('Ditambahkan'); }
    setDialogOpen(false);
  };

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

  // Detail view for selected tempat usaha
  if (selectedTU) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSelectedTU(null)}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">{selectedTU.nama}</h1>
            <p className="text-sm text-muted-foreground">Komoditas yang dijual</p>
          </div>
        </div>

        <Button onClick={openAddKD} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4 mr-1" /> Tambah Komoditas
        </Button>

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
              <div className="space-y-2"><Label>Std Stock Periode</Label><Input type="number" step="any" value={kdForm.standardized_stock_periode} onChange={e => setKdForm({ ...kdForm, standardized_stock_periode: parseFloat(e.target.value) || 0 })} /></div>
              <div className="flex items-center gap-2">
                <Switch checked={kdForm.is_active} onCheckedChange={c => setKdForm({ ...kdForm, is_active: c })} />
                <Label>Aktif</Label>
              </div>
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Simpan</Button>
            </form>
          </DialogContent>
        </Dialog>

        <div className="space-y-3">
          {kdForTU.map(kd => {
            const kom = komoditas.find(k => k.id === kd.komoditas_id);
            return (
              <Card key={kd.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{kom?.nama || '-'}</h3>
                      <p className="text-sm text-muted-foreground">Harga: Rp {kd.harga_normal.toLocaleString('id-ID')} - Rp {kd.harga_mahal.toLocaleString('id-ID')}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${kd.is_active ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {kd.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditingKD(kd);
                        setKdForm({ ...kd });
                        setKdDialogOpen(true);
                      }}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
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
          {kdForTU.length === 0 && <p className="text-center text-muted-foreground py-8">Belum ada komoditas dijual.</p>}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Tempat Usaha</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="bg-accent text-accent-foreground hover:bg-accent/90">
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
              <div className="space-y-2"><Label>Nama Pemilik</Label><Input value={form.nama_pemilik} onChange={e => setForm({ ...form, nama_pemilik: e.target.value })} /></div>
              <div className="space-y-2"><Label>Nama Narahubung</Label><Input value={form.nama_narahubung} onChange={e => setForm({ ...form, nama_narahubung: e.target.value })} /></div>
              <div className="space-y-2"><Label>Nomor Narahubung</Label><Input value={form.nomor_narahubung} onChange={e => setForm({ ...form, nomor_narahubung: e.target.value })} /></div>
              <div className="space-y-2"><Label>Berjualan Sejak</Label><Input value={form.berjualan_sejak} onChange={e => setForm({ ...form, berjualan_sejak: e.target.value })} placeholder="2020" /></div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active === 1} onCheckedChange={c => setForm({ ...form, is_active: c ? 1 : 0 })} />
                <Label>Aktif</Label>
              </div>
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">{editing ? 'Perbarui' : 'Simpan'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari tempat usaha..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <div className="space-y-3">
        {filtered.map(t => {
          const pasarName = pasar.find(p => p.id === t.pasar_id)?.nama || '-';
          return (
            <Card key={t.id} className="cursor-pointer hover:border-accent/50 transition-colors" onClick={() => setSelectedTU(t)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{t.nama}</h3>
                    <p className="text-sm text-muted-foreground">Pemilik: {t.nama_pemilik || '-'} • {pasarName}</p>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${t.is_active ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {t.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); openEdit(t); }}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" onClick={e => e.stopPropagation()}><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Hapus?</AlertDialogTitle><AlertDialogDescription>Data akan dihapus.</AlertDialogDescription></AlertDialogHeader>
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
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Tidak ada data.</p>}
      </div>
    </div>
  );
}
