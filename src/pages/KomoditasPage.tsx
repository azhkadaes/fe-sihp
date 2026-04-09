import { useState, useRef } from 'react';
import { useData } from '@/contexts/DataContext';
import type { Komoditas, SatuanDasar } from '@/types';
import { SATUAN_DASAR_OPTIONS } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, Pencil, Trash2, Search, Package, Upload, Download, ArrowUpDown, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { exportToCSV, parseCSV } from '@/lib/csv-utils';

type SortField = 'nama' | 'satuan_dasar';
type SortDir = 'asc' | 'desc';

const emptyKomoditas: Omit<Komoditas, 'id'> = { nama: '', satuan_dasar: 'kg', gambar: '' };

export default function KomoditasPage() {
  const { komoditas, addKomoditas, updateKomoditas, deleteKomoditas } = useData();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Komoditas | null>(null);
  const [form, setForm] = useState<Omit<Komoditas, 'id'>>(emptyKomoditas);
  const [sortField, setSortField] = useState<SortField>('nama');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterSatuan, setFilterSatuan] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const filtered = komoditas
    .filter(k => k.nama.toLowerCase().includes(search.toLowerCase()))
    .filter(k => filterSatuan === 'all' || k.satuan_dasar === filterSatuan)
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      return a[sortField] < b[sortField] ? -1 * mul : a[sortField] > b[sortField] ? 1 * mul : 0;
    });

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const openAdd = () => { setEditing(null); setForm(emptyKomoditas); setDialogOpen(true); };
  const openEdit = (k: Komoditas) => { setEditing(k); setForm({ nama: k.nama, satuan_dasar: k.satuan_dasar, gambar: k.gambar }); setDialogOpen(true); };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Ukuran gambar maksimal 2MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm(prev => ({ ...prev, gambar: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) { toast.error('Nama komoditas wajib diisi'); return; }
    if (editing) { updateKomoditas(editing.id, form); toast.success('Komoditas diperbarui'); }
    else { addKomoditas(form); toast.success('Komoditas ditambahkan'); }
    setDialogOpen(false);
  };

  const handleExport = () => {
    exportToCSV(komoditas, 'komoditas', [
      { key: 'nama', label: 'Nama' },
      { key: 'satuan_dasar', label: 'Satuan Dasar' },
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
          addKomoditas({ nama: r['Nama'].trim(), satuan_dasar: (r['Satuan Dasar'] as SatuanDasar) || 'kg', gambar: '' });
          count++;
        }
      });
      toast.success(`${count} komoditas diimpor`);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Komoditas</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="hidden sm:flex">
            <Download className="h-4 w-4 mr-1" /> Ekspor
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="hidden sm:flex">
            <Upload className="h-4 w-4 mr-1" /> Impor
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAdd} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
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
                  <Label>Satuan Dasar</Label>
                  <Select value={form.satuan_dasar} onValueChange={(v: SatuanDasar) => setForm({ ...form, satuan_dasar: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SATUAN_DASAR_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Gambar</Label>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30 shrink-0">
                      {form.gambar ? (
                        <img src={form.gambar} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => imgInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-1" /> Upload
                      </Button>
                      {form.gambar && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, gambar: '' })} className="text-destructive">
                          Hapus
                        </Button>
                      )}
                    </div>
                  </div>
                  <input ref={imgInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <p className="text-xs text-muted-foreground">Maks 2MB. Format: JPG, PNG, WebP</p>
                </div>
                <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  {editing ? 'Perbarui' : 'Simpan'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search & Filter - compact */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari komoditas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9" />
        </div>
        <Select value={filterSatuan} onValueChange={setFilterSatuan}>
          <SelectTrigger className="w-32 sm:w-40 h-9">
            <SelectValue placeholder="Satuan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            {SATUAN_DASAR_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-9 sm:hidden" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" /> Ekspor
        </Button>
      </div>

      {isMobile ? (
        <div className="space-y-2">
          {filtered.map(k => (
            <Card key={k.id} className="overflow-hidden">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 overflow-hidden">
                  {k.gambar ? <img src={k.gambar} alt={k.nama} className="w-full h-full object-cover" /> : <Package className="h-6 w-6 text-muted-foreground/40" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{k.nama}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{SATUAN_DASAR_OPTIONS.find(o => o.value === k.satuan_dasar)?.label || k.satuan_dasar}</p>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(k)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Hapus Komoditas?</AlertDialogTitle><AlertDialogDescription>Data "{k.nama}" akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={() => { deleteKomoditas(k.id); toast.success('Dihapus'); }}>Hapus</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Tidak ada data.</p>}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Gambar</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('nama')}>
                  Nama <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('satuan_dasar')}>
                  Satuan Dasar <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </TableHead>
                <TableHead className="text-right w-24">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(k => (
                <TableRow key={k.id}>
                  <TableCell>
                    <div className="w-10 h-10 rounded bg-muted/50 flex items-center justify-center overflow-hidden">
                      {k.gambar ? <img src={k.gambar} alt={k.nama} className="w-full h-full object-cover" /> : <Package className="h-4 w-4 text-muted-foreground/40" />}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{k.nama}</TableCell>
                  <TableCell>{SATUAN_DASAR_OPTIONS.find(o => o.value === k.satuan_dasar)?.label || k.satuan_dasar}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(k)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></AlertDialogTrigger>
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
