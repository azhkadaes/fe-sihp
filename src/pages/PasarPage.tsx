import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import type { Pasar } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, Pencil, Trash2, MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';

const emptyPasar = { nama: '', longitude: 0, latitude: 0, alamat: '', is_active: 1 };

export default function PasarPage() {
  const { pasar, addPasar, updatePasar, deletePasar } = useData();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Pasar | null>(null);
  const [form, setForm] = useState<Omit<Pasar, 'id'>>(emptyPasar);

  const filtered = pasar.filter(p => p.nama.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => { setEditing(null); setForm(emptyPasar); setDialogOpen(true); };
  const openEdit = (p: Pasar) => { setEditing(p); setForm({ nama: p.nama, longitude: p.longitude, latitude: p.latitude, alamat: p.alamat, is_active: p.is_active }); setDialogOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) { toast.error('Nama pasar wajib diisi'); return; }
    if (editing) {
      updatePasar(editing.id, form);
      toast.success('Pasar berhasil diperbarui');
    } else {
      addPasar(form);
      toast.success('Pasar berhasil ditambahkan');
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deletePasar(id);
    toast.success('Pasar berhasil dihapus');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Pasar</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4 mr-1" /> Tambah
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Pasar' : 'Tambah Pasar'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nama</Label>
                <Input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Alamat</Label>
                <Input value={form.alamat} onChange={e => setForm({ ...form, alamat: e.target.value })} />
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

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari pasar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isMobile ? (
        <div className="space-y-3">
          {filtered.map(p => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{p.nama}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> {p.alamat || '-'}
                    </p>
                    <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {p.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Pasar?</AlertDialogTitle>
                          <AlertDialogDescription>Data "{p.nama}" akan dihapus permanen.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(p.id)}>Hapus</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Tidak ada data pasar.</p>}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Alamat</TableHead>
                <TableHead>Longitude</TableHead>
                <TableHead>Latitude</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nama}</TableCell>
                  <TableCell>{p.alamat || '-'}</TableCell>
                  <TableCell>{p.longitude}</TableCell>
                  <TableCell>{p.latitude}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {p.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Pasar?</AlertDialogTitle>
                          <AlertDialogDescription>Data "{p.nama}" akan dihapus permanen.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(p.id)}>Hapus</AlertDialogAction>
                        </AlertDialogFooter>
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
