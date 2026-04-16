import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Minus,
  Package,
  Search,
  Store,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

const formatTanggal = (tanggal: string) => {
  const date = new Date(tanggal);
  if (Number.isNaN(date.getTime())) return tanggal;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export default function KomoditasPublicDashboard() {
  const { komoditas, pasar, hargaPelaporan } = useData();
  const [selectedPasar, setSelectedPasar] = useState<string>("all");
  const [query, setQuery] = useState("");

  const filteredPelaporan = useMemo(() => {
    if (selectedPasar === "all") return hargaPelaporan;
    return hargaPelaporan.filter((item) => item.pasar_id === selectedPasar);
  }, [hargaPelaporan, selectedPasar]);

  const summaryCards = useMemo(() => {
    return komoditas.map((k) => {
      const entries = filteredPelaporan
        .filter((h) => h.komoditas_id === k.id)
        .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

      const latest = entries[entries.length - 1];
      const prev = entries[entries.length - 2];

      let trend: "naik" | "turun" | "stabil" = "stabil";
      let diff = 0;
      let pct = 0;
      if (latest && prev) {
        diff = latest.harga_rata_rata - prev.harga_rata_rata;
        pct = prev.harga_rata_rata > 0 ? (diff / prev.harga_rata_rata) * 100 : 0;
        trend = diff > 0 ? "naik" : diff < 0 ? "turun" : "stabil";
      }

      return { komoditas: k, latest, trend, diff, pct };
    });
  }, [komoditas, filteredPelaporan]);

  const filteredCards = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return summaryCards.filter(({ komoditas: k }) => {
      if (!normalized) return true;
      return k.nama.toLowerCase().includes(normalized);
    });
  }, [summaryCards, query]);

  const cardsWithData = filteredCards.filter((card) => card.latest);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
          <h1 className="text-lg font-display font-semibold text-primary tracking-tight">
            Dashboard Komoditas
          </h1>
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Kembali
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Ringkasan Publik
          </p>
          <h2 className="text-2xl sm:text-3xl font-display font-semibold">
            Harga Komoditas per Pasar
          </h2>
          <p className="text-sm text-muted-foreground">
            Jelajahi harga komoditas terbaru seperti tampilan dashboard admin, lengkap dengan filter pasar dan pencarian komoditas.
          </p>
        </div>

        <Card>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/70" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari komoditas"
                className="pl-10 h-10"
              />
            </div>
            <Select value={selectedPasar} onValueChange={setSelectedPasar}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Semua Pasar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Pasar</SelectItem>
                {pasar.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/20 text-accent flex items-center justify-center">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-semibold">
                  {selectedPasar === "all" ? pasar.length : 1}
                </p>
                <p className="text-xs text-muted-foreground">Cakupan Pasar</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-semibold">{cardsWithData.length}</p>
                <p className="text-xs text-muted-foreground">Komoditas Terdeteksi</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/15 text-success flex items-center justify-center">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-semibold">{filteredCards.length}</p>
                <p className="text-xs text-muted-foreground">Hasil Filter</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredCards.map(({ komoditas: k, latest, trend, pct, diff }) => (
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
                      {latest ? `Rp ${latest.harga_rata_rata.toLocaleString("id-ID")}` : "-"}
                    </p>
                    <span className="text-xs text-muted-foreground">/ {k.satuan_dasar}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {trend === "naik" && <TrendingUp className="h-3.5 w-3.5 text-danger" />}
                    {trend === "turun" && <TrendingDown className="h-3.5 w-3.5 text-success" />}
                    {trend === "stabil" && <Minus className="h-3.5 w-3.5 text-warning" />}
                    <span
                      className={
                        trend === "naik"
                          ? "text-xs font-semibold text-danger"
                          : trend === "turun"
                            ? "text-xs font-semibold text-success"
                            : "text-xs font-semibold text-warning"
                      }
                    >
                      {trend === "stabil"
                        ? "0,00%"
                        : `${pct >= 0 ? "up" : "down"} ${Math.abs(pct).toFixed(2)}%`}
                    </span>
                    {diff !== 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        (Rp {diff > 0 ? "+" : ""}{Math.round(diff).toLocaleString("id-ID")})
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {latest ? `Update ${formatTanggal(latest.tanggal)}` : "Belum ada data"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCards.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Tidak ada komoditas yang cocok dengan filter atau pencarian.
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}