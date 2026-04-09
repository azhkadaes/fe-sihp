import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Package, Info, FileText } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { useMemo, useState, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { komoditas, pasar, hargaPelaporan } = useData();
  const [selectedPasar, setSelectedPasar] = useState<string>('all');

  const filteredPelaporan = useMemo(() => {
    let data = hargaPelaporan;
    if (selectedPasar !== 'all') data = data.filter(h => h.pasar_id === selectedPasar);
    return data;
  }, [hargaPelaporan, selectedPasar]);

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

  const chartData = useMemo(() => {
    const dates = [...new Set(filteredPelaporan.map(h => h.tanggal))].sort();
    return dates.map(d => {
      const row: Record<string, string | number> = { tanggal: d };
      komoditas.forEach(k => {
        const entry = filteredPelaporan.find(h => h.tanggal === d && h.komoditas_id === k.id);
        row[k.nama] = entry?.harga_rata_rata ?? 0;
      });
      return row;
    });
  }, [filteredPelaporan, komoditas]);

  const colors = ['hsl(36, 61%, 64%)', 'hsl(222, 47%, 30%)', 'hsl(142, 76%, 36%)', 'hsl(0, 84%, 60%)', 'hsl(210, 40%, 50%)', 'hsl(280, 60%, 50%)'];

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
        <td class="num" style="color:${s.trend === 'naik' ? '#dc2626' : s.trend === 'turun' ? '#16a34a' : '#DBAF6C'}">${s.trend === 'stabil' ? '0,00%' : `${s.pct >= 0 ? '↑' : '↓'} ${Math.abs(s.pct).toFixed(2)}%`}</td>
      </tr>`).join('');

    const html = `
<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Laporan Dashboard Harga Pangan</title>
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; }
  .header { text-align: center; margin-bottom: 24px; border-bottom: 3px double #000; padding-bottom: 16px; }
  .header h1 { font-size: 16pt; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px; }
  .header h2 { font-size: 13pt; margin: 0 0 8px; font-weight: normal; }
  .header p { font-size: 10pt; margin: 2px 0; color: #333; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 10pt; }
  th, td { border: 1px solid #333; padding: 6px 8px; }
  th { background: #f0f0f0; font-weight: bold; text-align: center; }
  td.num { text-align: right; }
  .footer { margin-top: 40px; text-align: right; font-size: 10pt; }
  .footer .sign { margin-top: 60px; }
  .section-title { font-size: 13pt; font-weight: bold; margin: 24px 0 8px; }
</style>
</head><body>
<div class="header">
  <h1>Laporan Ringkasan Harga Pangan</h1>
  <h2>Sistem Informasi Harga Pangan</h2>
  <p>Tanggal Cetak: ${dateStr}</p>
  <p>Filter: ${pasarName}</p>
</div>
<p class="section-title">Ringkasan Harga Komoditas</p>
<table>
  <thead><tr><th>No</th><th>Komoditas</th><th>Satuan</th><th>Harga Rata-rata</th><th>Perubahan</th></tr></thead>
  <tbody>${summaryRows || '<tr><td colspan="5" style="text-align:center">Belum ada data</td></tr>'}</tbody>
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
    toast.success('Laporan dibuka');
  };

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {summaryCards.map(({ komoditas: k, latest, trend, diff, pct }) => (
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
                </div>
                <div className="flex items-center gap-1">
                  {trend === 'naik' && <TrendingUp className="h-3.5 w-3.5 text-destructive" />}
                  {trend === 'turun' && <TrendingDown className="h-3.5 w-3.5 text-success" />}
                  {trend === 'stabil' && <Minus className="h-3.5 w-3.5 text-accent" />}
                  <span className={`text-xs font-semibold ${
                    trend === 'naik' ? 'text-destructive' : trend === 'turun' ? 'text-success' : 'text-accent'
                  }`}>
                    {trend === 'stabil'
                      ? '0,00%'
                      : `${pct >= 0 ? '↑' : '↓'} ${Math.abs(pct).toFixed(2)}%`
                    }
                  </span>
                </div>
                <Progress value={Math.min(Math.abs(pct) * 10, 100)} className="h-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tren Harga Pelaporan</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="tanggal" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {komoditas.map((k, i) => (
                    <Line key={k.id} type="monotone" dataKey={k.nama} stroke={colors[i % colors.length]} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Perbandingan Harga</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData.slice(-7)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="tanggal" className="text-xs" tick={{ fontSize: 11 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {komoditas.map((k, i) => (
                    <Bar key={k.id} dataKey={k.nama} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {chartData.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Belum ada data harga pelaporan.</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Finalisasi harga rutin untuk melihat dashboard.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
