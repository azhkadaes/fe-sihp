import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DashboardPage() {
  const { komoditas, pasar, hargaPelaporan } = useData();
  const [selectedPasar, setSelectedPasar] = useState<string>('all');

  const filteredPelaporan = useMemo(() => {
    if (selectedPasar === 'all') return hargaPelaporan;
    return hargaPelaporan.filter(h => h.pasar_id === selectedPasar);
  }, [hargaPelaporan, selectedPasar]);

  // Summary cards per komoditas
  const summaryCards = useMemo(() => {
    return komoditas.map(k => {
      const entries = filteredPelaporan
        .filter(h => h.komoditas_id === k.id)
        .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
      const latest = entries[entries.length - 1];
      const prev = entries[entries.length - 2];
      let trend: 'naik' | 'turun' | 'stabil' = 'stabil';
      let diff = 0;
      if (latest && prev) {
        diff = latest.harga_rata_rata - prev.harga_rata_rata;
        trend = diff > 0 ? 'naik' : diff < 0 ? 'turun' : 'stabil';
      }
      return { komoditas: k, latest, trend, diff, entries };
    });
  }, [komoditas, filteredPelaporan]);

  // Chart data
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

  const colors = ['hsl(36, 61%, 64%)', 'hsl(222, 47%, 30%)', 'hsl(142, 76%, 36%)', 'hsl(0, 84%, 60%)', 'hsl(210, 40%, 50%)'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Select value={selectedPasar} onValueChange={setSelectedPasar}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Semua Pasar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Pasar</SelectItem>
            {pasar.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {summaryCards.map(({ komoditas: k, latest, trend, diff }) => (
          <Card key={k.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.nama}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {latest ? `Rp ${latest.harga_rata_rata.toLocaleString('id-ID')}` : '-'}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {trend === 'naik' && <TrendingUp className="h-4 w-4 text-destructive" />}
                {trend === 'turun' && <TrendingDown className="h-4 w-4 text-success" />}
                {trend === 'stabil' && <Minus className="h-4 w-4 text-accent" />}
                <span className={`text-xs font-medium ${
                  trend === 'naik' ? 'text-destructive' : trend === 'turun' ? 'text-success' : 'text-accent'
                }`}>
                  {trend === 'stabil' ? 'Stabil' : `${diff > 0 ? '+' : ''}Rp ${diff.toLocaleString('id-ID')}`}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tren Harga Pelaporan</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="tanggal" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  {komoditas.map((k, i) => (
                    <Line key={k.id} type="monotone" dataKey={k.nama} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Perbandingan Harga</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.slice(-7)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="tanggal" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  {komoditas.map((k, i) => (
                    <Bar key={k.id} dataKey={k.nama} fill={colors[i % colors.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {chartData.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Belum ada data harga pelaporan. Tambahkan harga rutin dan finalisasi untuk melihat dashboard.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
