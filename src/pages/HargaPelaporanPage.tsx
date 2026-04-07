import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function HargaPelaporanPage() {
  const { hargaPelaporan, komoditas, pasar } = useData();
  const isMobile = useIsMobile();
  const [detailId, setDetailId] = useState<string | null>(null);

  const detail = hargaPelaporan.find(h => h.id === detailId);
  const detailKom = detail ? komoditas.find(k => k.id === detail.komoditas_id) : null;
  const detailPas = detail ? pasar.find(p => p.id === detail.pasar_id) : null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Harga Pelaporan</h1>

      {hargaPelaporan.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Belum ada data. Finalisasi harga rutin untuk menghasilkan harga pelaporan.
          </CardContent>
        </Card>
      )}

      {isMobile ? (
        <div className="space-y-3">
          {hargaPelaporan.sort((a, b) => b.tanggal.localeCompare(a.tanggal)).map(h => {
            const kom = komoditas.find(k => k.id === h.komoditas_id);
            const pas = pasar.find(p => p.id === h.pasar_id);
            return (
              <Card key={h.id} className="cursor-pointer hover:border-accent/50 transition-colors" onClick={() => setDetailId(h.id)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{kom?.nama || '-'}</h3>
                      <p className="text-sm text-muted-foreground">{pas?.nama} • {h.tanggal}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-accent">Rp {h.harga_rata_rata.toLocaleString('id-ID')}</p>
                      <p className="text-xs text-muted-foreground">Rata-rata</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
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
              {hargaPelaporan.sort((a, b) => b.tanggal.localeCompare(a.tanggal)).map(h => {
                const kom = komoditas.find(k => k.id === h.komoditas_id);
                const pas = pasar.find(p => p.id === h.pasar_id);
                return (
                  <TableRow key={h.id} className="cursor-pointer hover:bg-accent/10" onClick={() => setDetailId(h.id)}>
                    <TableCell>{h.tanggal}</TableCell>
                    <TableCell className="font-medium">{kom?.nama || '-'}</TableCell>
                    <TableCell>{pas?.nama || '-'}</TableCell>
                    <TableCell className="text-right">{h.harga_besar != null ? `Rp ${h.harga_besar.toLocaleString('id-ID')}` : '-'}</TableCell>
                    <TableCell className="text-right">{h.harga_menengah != null ? `Rp ${h.harga_menengah.toLocaleString('id-ID')}` : '-'}</TableCell>
                    <TableCell className="text-right">{h.harga_kecil != null ? `Rp ${h.harga_kecil.toLocaleString('id-ID')}` : '-'}</TableCell>
                    <TableCell className="text-right font-bold text-accent">Rp {h.harga_rata_rata.toLocaleString('id-ID')}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={!!detailId} onOpenChange={() => setDetailId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Harga Pelaporan</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Komoditas:</span><span className="font-medium">{detailKom?.nama}</span>
                <span className="text-muted-foreground">Pasar:</span><span className="font-medium">{detailPas?.nama}</span>
                <span className="text-muted-foreground">Tanggal:</span><span className="font-medium">{detail.tanggal}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between p-3 rounded-lg bg-muted">
                  <span>Kelas Besar</span>
                  <span className="font-medium">{detail.harga_besar != null ? `Rp ${detail.harga_besar.toLocaleString('id-ID')}` : '-'}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-muted">
                  <span>Kelas Menengah</span>
                  <span className="font-medium">{detail.harga_menengah != null ? `Rp ${detail.harga_menengah.toLocaleString('id-ID')}` : '-'}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-muted">
                  <span>Kelas Kecil</span>
                  <span className="font-medium">{detail.harga_kecil != null ? `Rp ${detail.harga_kecil.toLocaleString('id-ID')}` : '-'}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-accent/20 border border-accent/30">
                  <span className="font-semibold">Rata-rata</span>
                  <span className="font-bold text-accent">Rp {detail.harga_rata_rata.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
