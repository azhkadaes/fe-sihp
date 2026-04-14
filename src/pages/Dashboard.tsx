/**
 * Dashboard — Halaman ringkasan harga pangan.
 * Menampilkan kartu statistik (pasar, komoditas, tempat usaha)
 * dan kartu komoditas dengan tren harga.
 */
import { useData } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Package, FileText, Info, Store, Building2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { komoditas, pasar, tempatUsaha, hargaPelaporan } = useData();
  const [selectedPasar, setSelectedPasar] = useState<string>('all');

  /* ===== Statistik ringkasan ===== */
  const stats = [
    { label: 'Pasar Aktif', value: pasar.filter(p => p.is_active).length, icon: Store, color: 'text-accent' },
    { label: 'Komoditas', value: komoditas.length, icon: Package, color: 'text-success' },
    { label: 'Tempat Usaha', value: tempatUsaha.filter(t => t.is_active).length, icon: Building2, color: 'text-info' },
  ];

  /* ===== Filter data berdasarkan pasar ===== */
  const filteredPelaporan = useMemo(() => {
    let data = hargaPelaporan;
    if (selectedPasar !== 'all') data = data.filter(h => h.pasar_id === selectedPasar);
    return data;
  }, [hargaPelaporan, selectedPasar]);

  /* ===== Kalkulasi kartu ringkasan per komoditas ===== */
  const summaryCards = useMemo(() => {
    return komoditas.map(k => {
      const entries = filteredPelaporan
        .filter(h => h.komoditas_id === k.id)
        .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

      const latest = entries[entries.length - 1];
      const prev = entries[entries.length - 2];

      let trend: 'naik' | 'turun' | 'stabil' = 'stabil';
      let diff = 0;
      let pct = 0;
      if (latest && prev) {
        diff = latest.harga_rata_rata - prev.harga_rata_rata;
        pct = prev.harga_rata_rata > 0 ? (diff / prev.harga_rata_rata) * 100 : 0;
        trend = diff > 0 ? 'naik' : diff < 0 ? 'turun' : 'stabil';
      }
      return { komoditas: k, latest, trend, diff, pct, entries };
    });
  }, [komoditas, filteredPelaporan]);

  /* ===== Helper warna tren ===== */
  const getTrendColor = (trend: 'naik' | 'turun' | 'stabil') => {
    switch (trend) {
      case 'naik': return 'text-danger';
      case 'turun': return 'text-success';
      case 'stabil': return 'text-warning';
    }
  };

  /* ===== Export PDF ===== */
  const handleExportPDF = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const pasarName = selectedPasar === 'all' ? 'Semua Pasar' : pasar.find(p => p.id === selectedPasar)?.nama || '-';

    const summaryRows = summaryCards.filter(s => s.latest).map((s, i) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${s.komoditas.nama}</td>
        <td>${s.komoditas.satuan_dasar}</td>
        <td class="num">Rp ${s.latest!.harga_rata_rata.toLocaleString('id-ID')}</td>
        <td class="num" style="color:${s.trend === 'naik' ? '#dc2626' : s.trend === 'turun' ? '#16a34a' : '#d97706'}">${s.trend === 'stabil' ? '0,00%' : `${s.pct >= 0 ? '↑' : '↓'} ${Math.abs(s.pct).toFixed(2)}%`}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Laporan Dashboard</title>
<style>@page{size:A4;margin:2cm}body{font-family:'Times New Roman',serif;font-size:12pt;color:#000}.header{text-align:center;margin-bottom:24px;border-bottom:3px double #000;padding-bottom:16px}.header h1{font-size:16pt;margin:0 0 4px;text-transform:uppercase}.header h2{font-size:13pt;margin:0 0 8px;font-weight:normal}.header p{font-size:10pt;margin:2px 0;color:#333}table{width:100%;border-collapse:collapse;margin:16px 0;font-size:10pt}th,td{border:1px solid #333;padding:6px 8px}th{background:#f0f0f0;font-weight:bold;text-align:center}td.num{text-align:right}.footer{margin-top:40px;text-align:right;font-size:10pt}.footer .sign{margin-top:60px}</style>
</head><body>
<div class="header"><h1>Laporan Ringkasan Harga Pangan</h1><h2>Sistem Informasi Harga Pangan</h2><p>Tanggal: ${dateStr}</p><p>Filter: ${pasarName}</p></div>
<table><thead><tr><th>No</th><th>Komoditas</th><th>Satuan</th><th>Harga Rata-rata</th><th>Perubahan</th></tr></thead>
<tbody>${summaryRows || '<tr><td colspan="5" style="text-align:center">Belum ada data</td></tr>'}</tbody></table>
<div class="footer"><p>${dateStr}</p><p>Petugas Pelaporan,</p><div class="sign"><p>( ............................ )</p><p>NIP. ........................</p></div></div>
</body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) { printWindow.document.write(html); printWindow.document.close(); printWindow.print(); }
    toast.success('Laporan dibuka');
  };

  /* ===== Render ===== */
  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard Harga Pangan</h1>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-1" /> Laporan
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={selectedPasar} onValueChange={setSelectedPasar}>
            <SelectTrigger className="w-full sm:w-44 h-9 text-sm">
              <SelectValue placeholder="Semua Pasar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Pasar</SelectItem>
              {pasar.map(p => <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ===== Kartu Statistik Ringkasan ===== */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ===== Kartu Ringkasan Komoditas ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {summaryCards.map(({ komoditas: k, latest, trend, pct, diff }) => (
          <Card key={k.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-0">
              <div className="aspect-[4/3] bg-muted/50 flex items-center justify-center overflow-hidden">
                {k.gambar ? (
                  <img src={k.gambar} alt={k.nama} className="w-full h-full object-cover" />
                ) : (
                  <Package className="h-10 w-10 text-muted-foreground/40" />
                )}
              </div>
              <div className="p-3 space-y-1.5">
                <h3 className="text-sm font-semibold leading-tight truncate">{k.nama}</h3>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-bold">
                    {latest ? `Rp ${latest.harga_rata_rata.toLocaleString('id-ID')}` : '-'}
                  </p>
                  <span className="text-xs text-muted-foreground">/ {k.satuan_dasar}</span>
                  {latest && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="ml-auto p-0.5 rounded-full hover:bg-muted transition-colors" aria-label="Info update terakhir">
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="top" className="w-auto text-xs p-2">
                        <p className="font-medium">Update terakhir:</p>
                        <p className="text-muted-foreground">{new Date(latest.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {trend === 'naik' && <TrendingUp className="h-3.5 w-3.5 text-danger" />}
                  {trend === 'turun' && <TrendingDown className="h-3.5 w-3.5 text-success" />}
                  {trend === 'stabil' && <Minus className="h-3.5 w-3.5 text-warning" />}
                  <span className={`text-xs font-semibold ${getTrendColor(trend)}`}>
                    {trend === 'stabil' ? '0,00%' : `${pct >= 0 ? '↑' : '↓'} ${Math.abs(pct).toFixed(2)}%`}
                  </span>
                  {diff !== 0 && (
                    <span className={`text-[10px] ${getTrendColor(trend)}`}>
                      (Rp {diff > 0 ? '+' : ''}{Math.round(diff).toLocaleString('id-ID')})
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* State kosong */}
      {summaryCards.every(s => !s.latest) && (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Belum ada data harga pelaporan.</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Finalisasi harga rutin untuk melihat dashboard.</p>
          </CardContent>
        </Card>
      )}

      {/* Legenda */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Keterangan Indikator</h3>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-danger" />
              <span className="text-danger font-medium">Harga Naik</span>
              <span className="text-muted-foreground">— Negatif bagi konsumen</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-success" />
              <span className="text-success font-medium">Harga Turun</span>
              <span className="text-muted-foreground">— Positif bagi konsumen</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Minus className="h-3.5 w-3.5 text-warning" />
              <span className="text-warning font-medium">Stabil</span>
              <span className="text-muted-foreground">— Tidak ada perubahan</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
