/**
 * HargaPelaporanPage — Halaman Harga Pelaporan (read-only).
 * Menampilkan data agregasi harga yang dihitung otomatis dari
 * harga rutin yang sudah difinalisasi.
 *
 * Harga pelaporan = rata-rata dari harga 3 kelas (besar, menengah, kecil)
 * untuk setiap kombinasi tanggal + pasar + komoditas.
 */
import { useData } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';
import { Download, Search, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { exportToCSV } from '@/lib/csv-utils';

export default function HargaPelaporanPage() {
  const { hargaPelaporan, komoditas, pasar } = useData();
  const isMobile = useIsMobile();

  /* ===== State ===== */
  const [detailId, setDetailId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterPasar, setFilterPasar] = useState<string>('all');

  /* ===== Detail lookup ===== */
  const detail = hargaPelaporan.find(h => h.id === detailId);
  const detailKom = detail ? komoditas.find(k => k.id === detail.komoditas_id) : null;
  const detailPas = detail ? pasar.find(p => p.id === detail.pasar_id) : null;

  /* ===== Filter & Sort ===== */
  const filtered = hargaPelaporan
    .filter(h => {
      const kom = komoditas.find(k => k.id === h.komoditas_id);
      const pas = pasar.find(p => p.id === h.pasar_id);
      const q = search.toLowerCase();
      return (kom?.nama || '').toLowerCase().includes(q) || (pas?.nama || '').toLowerCase().includes(q);
    })
    .filter(h => filterPasar === 'all' || h.pasar_id === filterPasar)
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  /* ===== Ekspor CSV ===== */
  const handleExport = () => {
    const data = hargaPelaporan.map(h => ({
      tanggal: h.tanggal,
      komoditas: komoditas.find(k => k.id === h.komoditas_id)?.nama || '',
      pasar: pasar.find(p => p.id === h.pasar_id)?.nama || '',
      harga_besar: h.harga_besar ?? '',
      harga_menengah: h.harga_menengah ?? '',
      harga_kecil: h.harga_kecil ?? '',
      harga_rata_rata: h.harga_rata_rata,
    }));
    exportToCSV(data, 'harga-pelaporan', [
      { key: 'tanggal', label: 'Tanggal' },
      { key: 'komoditas', label: 'Komoditas' },
      { key: 'pasar', label: 'Pasar' },
      { key: 'harga_besar', label: 'Harga Besar' },
      { key: 'harga_menengah', label: 'Harga Menengah' },
      { key: 'harga_kecil', label: 'Harga Kecil' },
      { key: 'harga_rata_rata', label: 'Harga Rata-rata' },
    ]);
    toast.success('Data diekspor');
  };

  /* ===== Ekspor PDF Laporan Formal ===== */
  const handleExportPDF = () => {
    const reportData = filtered.map(h => ({
      tanggal: h.tanggal,
      komoditas: komoditas.find(k => k.id === h.komoditas_id)?.nama || '',
      pasar: pasar.find(p => p.id === h.pasar_id)?.nama || '',
      harga_besar: h.harga_besar,
      harga_menengah: h.harga_menengah,
      harga_kecil: h.harga_kecil,
      harga_rata_rata: h.harga_rata_rata,
    }));

    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    
    // Template HTML laporan pemerintahan formal
    const html = `
<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Laporan Harga Pelaporan</title>
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; }
  .header { text-align: center; margin-bottom: 24px; border-bottom: 3px double #000; padding-bottom: 16px; }
  .header h1 { font-size: 16pt; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px; }
  .header h2 { font-size: 13pt; margin: 0 0 8px; font-weight: normal; }
  .header p { font-size: 10pt; margin: 2px 0; color: #333; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 10pt; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 10pt; }
  th, td { border: 1px solid #333; padding: 6px 8px; }
  th { background: #f0f0f0; font-weight: bold; text-align: center; }
  td.num { text-align: right; }
  .footer { margin-top: 40px; text-align: right; font-size: 10pt; }
  .footer .sign { margin-top: 60px; }
  .summary { margin: 16px 0; font-size: 10pt; }
</style>
</head><body>
<div class="header">
  <h1>Laporan Harga Pelaporan Komoditas</h1>
  <h2>Sistem Informasi Harga Pangan</h2>
  <p>Tanggal Cetak: ${dateStr}</p>
</div>
<div class="summary">
  <p><strong>Jumlah Data:</strong> ${reportData.length} entri</p>
  <p><strong>Filter Pasar:</strong> ${filterPasar === 'all' ? 'Semua Pasar' : pasar.find(p => p.id === filterPasar)?.nama || '-'}</p>
</div>
<table>
  <thead>
    <tr>
      <th>No</th><th>Tanggal</th><th>Komoditas</th><th>Pasar</th>
      <th>Harga Besar</th><th>Harga Menengah</th><th>Harga Kecil</th><th>Rata-rata</th>
    </tr>
  </thead>
  <tbody>
    ${reportData.map((r, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td>${r.tanggal}</td>
      <td>${r.komoditas}</td>
      <td>${r.pasar}</td>
      <td class="num">${r.harga_besar != null ? 'Rp ' + r.harga_besar.toLocaleString('id-ID') : '-'}</td>
      <td class="num">${r.harga_menengah != null ? 'Rp ' + r.harga_menengah.toLocaleString('id-ID') : '-'}</td>
      <td class="num">${r.harga_kecil != null ? 'Rp ' + r.harga_kecil.toLocaleString('id-ID') : '-'}</td>
      <td class="num"><strong>Rp ${r.harga_rata_rata.toLocaleString('id-ID')}</strong></td>
    </tr>`).join('')}
  </tbody>
</table>
<div class="footer">
  <p>${dateStr}</p>
  <p>Petugas Pelaporan,</p>
  <div class="sign">
    <p>( ............................ )</p>
    <p>NIP. ........................</p>
  </div>
</div>
</body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
    toast.success('Laporan PDF dibuka');
  };

  /* ===== Render ===== */
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Harga Pelaporan</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-1" /> Laporan
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-9" />
        </div>
        <Select value={filterPasar} onValueChange={setFilterPasar}>
          <SelectTrigger className="w-32 sm:w-40 h-9"><SelectValue placeholder="Pasar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Pasar</SelectItem>
            {pasar.map(p => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* State kosong */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Belum ada data. Finalisasi harga rutin untuk menghasilkan harga pelaporan.
          </CardContent>
        </Card>
      )}

      {/* ===== Tampilan Data ===== */}
      {isMobile ? (
        /* --- Tampilan kartu untuk mobile --- */
        <div className="space-y-2">
          {filtered.map(h => {
            const kom = komoditas.find(k => k.id === h.komoditas_id);
            const pas = pasar.find(p => p.id === h.pasar_id);
            return (
              <Card key={h.id} className="cursor-pointer hover:border-accent/40 transition-colors" onClick={() => setDetailId(h.id)}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">{kom?.nama || '-'}</h3>
                      <p className="text-xs text-muted-foreground">{pas?.nama} • {h.tanggal}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-accent">Rp {h.harga_rata_rata.toLocaleString('id-ID')}</p>
                      <p className="text-xs text-muted-foreground">Rata-rata</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* --- Tampilan tabel untuk desktop --- */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Komoditas</TableHead>
                <TableHead>Pasar</TableHead>
                <TableHead className="text-right">Besar</TableHead>
                <TableHead className="text-right">Menengah</TableHead>
                <TableHead className="text-right">Kecil</TableHead>
                <TableHead className="text-right">Rata-rata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(h => {
                const kom = komoditas.find(k => k.id === h.komoditas_id);
                const pas = pasar.find(p => p.id === h.pasar_id);
                return (
                  <TableRow key={h.id} className="cursor-pointer hover:bg-accent/5" onClick={() => setDetailId(h.id)}>
                    <TableCell className="text-sm">{h.tanggal}</TableCell>
                    <TableCell className="font-medium text-sm">{kom?.nama || '-'}</TableCell>
                    <TableCell className="text-sm">{pas?.nama || '-'}</TableCell>
                    {/* Harga per kelas — warna sesuai design system */}
                    <TableCell className="text-right text-sm text-kelas-besar">{h.harga_besar != null ? `Rp ${h.harga_besar.toLocaleString('id-ID')}` : '-'}</TableCell>
                    <TableCell className="text-right text-sm text-kelas-menengah">{h.harga_menengah != null ? `Rp ${h.harga_menengah.toLocaleString('id-ID')}` : '-'}</TableCell>
                    <TableCell className="text-right text-sm text-kelas-kecil">{h.harga_kecil != null ? `Rp ${h.harga_kecil.toLocaleString('id-ID')}` : '-'}</TableCell>
                    <TableCell className="text-right font-bold text-accent text-sm">Rp {h.harga_rata_rata.toLocaleString('id-ID')}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ===== Dialog Detail ===== */}
      <Dialog open={!!detailId} onOpenChange={() => setDetailId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detail Harga Pelaporan</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                <span className="text-muted-foreground">Komoditas</span><span className="font-medium">{detailKom?.nama}</span>
                <span className="text-muted-foreground">Pasar</span><span className="font-medium">{detailPas?.nama}</span>
                <span className="text-muted-foreground">Tanggal</span><span className="font-medium">{detail.tanggal}</span>
              </div>
              {/* Breakdown harga per kelas — warna konsisten */}
              <div className="space-y-2">
                <div className="flex justify-between p-3 rounded-lg bg-kelas-besar/10 border border-kelas-besar/20">
                  <span className="text-sm text-kelas-besar font-medium">Kelas Besar</span>
                  <span className="font-medium text-sm">{detail.harga_besar != null ? `Rp ${detail.harga_besar.toLocaleString('id-ID')}` : '-'}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-kelas-menengah/10 border border-kelas-menengah/20">
                  <span className="text-sm text-kelas-menengah font-medium">Kelas Menengah</span>
                  <span className="font-medium text-sm">{detail.harga_menengah != null ? `Rp ${detail.harga_menengah.toLocaleString('id-ID')}` : '-'}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-kelas-kecil/10 border border-kelas-kecil/20">
                  <span className="text-sm text-kelas-kecil font-medium">Kelas Kecil</span>
                  <span className="font-medium text-sm">{detail.harga_kecil != null ? `Rp ${detail.harga_kecil.toLocaleString('id-ID')}` : '-'}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-accent/10 border border-accent/20">
                  <span className="font-semibold text-sm">Rata-rata</span>
                  <span className="font-bold text-accent">Rp {detail.harga_rata_rata.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Legenda kelas */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="text-muted-foreground font-medium">Kelas:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-kelas-besar" />
              <span>Besar — pedagang besar, harga tinggi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-kelas-menengah" />
              <span>Menengah — pedagang menengah</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-kelas-kecil" />
              <span>Kecil — pedagang kecil, harga rendah</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
