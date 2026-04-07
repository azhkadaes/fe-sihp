import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import type { Komoditas } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, Pencil, Trash2, Search, Package } from 'lucide-react';
import { toast } from 'sonner';

const emptyKomoditas = { nama: '', standardized_unit: 1, gambar: '' };

export default function KomoditasPage() {
  const { komoditas, addKomoditas, updateKomoditas, deleteKomoditas } = useData();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Komoditas | null>(null);
  const [form, setForm] = useState<Omit<Komoditas, 'id'>>(emptyKomoditas);

  const filtered = komoditas.filter(k => k.nama.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setEditing(null); setForm(emptyKomoditas); setDialogOpen(true); };
  const openEdit = (k: Komoditas) => { setEditing(k); setForm({ nama: k.nama, standardized_unit: k.standardized_unit, gambar: k.gambar }); setDialogOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) { toast.error('Nama komoditas wajib diisi'); return; }
    if (editing) { updateKomoditas(editing.id, form); toast.success('Komoditas diperbarui'); }
    else { addKomoditas(form); toast.success('Komoditas ditambahkan'); }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Komoditas</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-1" /> Tambah
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Edit Komoditas' : 'Tambah Komoditas'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nama</Label>
                <Input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Satuan Standar</Label>
                <Input type="number" value={form.standardized_unit} onChange={e => setForm({ ...form, standardized_unit: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="space-y-2">
                <Label>URL Gambar</Label>
                <Input value={form.gambar} onChange={e => setForm({ ...form, gambar: e.target.value })} placeholder="https://..." />
              </div>
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                {editing ? 'Perbarui' : 'Simpan'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari komoditas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isMobile ? (
        <div className="space-y-3">
          {filtered.map(k => (
            <Card key={k.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                  {k.gambar ? <img src={k.gambar} alt={k.nama} className="w-10 h-10 object-cover rounded" /> : <Package className="h-5 w-5 text-accent" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{k.nama}</h3>
                  <p className="text-sm text-muted-foreground">Satuan: {k.standardized_unit}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(k)}><Pencil className="h-4 w-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Hapus Komoditas?</AlertDialogTitle><AlertDialogDescription>Data "{k.nama}" akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => { deleteKomoditas(k.id); toast.success('Dihapus'); }}>Hapus</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Tidak ada data.</p>}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader><TableRow><TableHead>Gambar</TableHead><TableHead>Nama</TableHead><TableHead>Satuan Standar</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map(k => (
                <TableRow key={k.id}>
                  <TableCell>
                    <div className="w-10 h-10 rounded bg-accent/20 flex items-center justify-center">
                      {k.gambar ? <img src={k.gambar} alt={k.nama} className="w-8 h-8 object-cover rounded" /> : <Package className="h-4 w-4 text-accent" />}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{k.nama}</TableCell>
                  <TableCell>{k.standardized_unit}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(k)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Hapus?</AlertDialogTitle><AlertDialogDescription>Data "{k.nama}" akan dihapus.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => { deleteKomoditas(k.id); toast.success('Dihapus'); }}>Hapus</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
