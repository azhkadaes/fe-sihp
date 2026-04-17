import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Minus,
  Package,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import PublicNavbar from "@/components/PublicNavbar";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const formatTanggal = (tanggal: string) => {
  const date = new Date(tanggal);
  if (Number.isNaN(date.getTime())) return tanggal;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export default function KomoditasPublicDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { komoditas, pasar, hargaPelaporan } = useData();

  const komoditasItem = komoditas.find((item) => item.id === id);

  const entries = useMemo(() => {
    if (!id) return [];
    return hargaPelaporan
      .filter((item) => item.komoditas_id === id)
      .slice()
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [id, hargaPelaporan]);

  const latest = entries[0];
  const prev = entries[1];

  const trendData = useMemo(() => {
    if (!latest || !prev) {
      return { trend: "stabil" as const, diff: 0, pct: 0 };
    }

    const diff = latest.harga_rata_rata - prev.harga_rata_rata;
    const pct =
      prev.harga_rata_rata > 0 ? (diff / prev.harga_rata_rata) * 100 : 0;

    return {
      trend:
        diff > 0
          ? ("naik" as const)
          : diff < 0
            ? ("turun" as const)
            : ("stabil" as const),
      diff,
      pct,
    };
  }, [latest, prev]);

  const latestByPasar = useMemo(() => {
    if (!id) return [];

    const map = new Map<string, (typeof hargaPelaporan)[number]>();
    entries.forEach((item) => {
      if (!map.has(item.pasar_id)) {
        map.set(item.pasar_id, item);
      }
    });

    return Array.from(map.values())
      .map((item) => {
        const pasarItem = pasar.find((p) => p.id === item.pasar_id);
        return {
          ...item,
          pasarNama: pasarItem?.nama ?? "Pasar",
          pasarAlamat: pasarItem?.alamat ?? "",
        };
      })
      .sort((a, b) => b.harga_rata_rata - a.harga_rata_rata);
  }, [id, entries, pasar]);

  const minPrice = entries.length
    ? Math.min(...entries.map((item) => item.harga_rata_rata))
    : 0;
  const maxPrice = entries.length
    ? Math.max(...entries.map((item) => item.harga_rata_rata))
    : 0;
  const avgPrice = entries.length
    ? Math.round(
        entries.reduce((total, item) => total + item.harga_rata_rata, 0) /
          entries.length,
      )
    : 0;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/public/komoditas");
  };

  if (!komoditasItem) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <PublicNavbar />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
          <Card>
            <CardContent className="py-10 text-center space-y-2">
              <p className="text-lg font-semibold">Komoditas tidak ditemukan</p>
              <p className="text-sm text-muted-foreground">
                Data komoditas yang Anda pilih tidak tersedia.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          className="gap-1.5 interactive-smooth hover:-translate-y-0.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>

        <Card className="overflow-hidden">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Detail Komoditas
                </p>
                <h1 className="text-2xl sm:text-3xl font-display font-semibold">
                  {komoditasItem.nama}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Satuan dasar: {komoditasItem.satuan_dasar}
                </p>
                <p className="text-2xl font-semibold text-primary">
                  {latest
                    ? `Rp ${latest.harga_rata_rata.toLocaleString("id-ID")}`
                    : "Belum ada data"}
                  <span className="text-sm font-medium text-muted-foreground">
                    {" "}
                    / {komoditasItem.satuan_dasar}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {latest
                    ? `Update terakhir ${formatTanggal(latest.tanggal)}`
                    : "Belum ada pelaporan harga"}
                </p>
              </div>

              <div className="w-28 h-28 rounded-xl overflow-hidden border bg-muted/30 shrink-0">
                <img
                  src={komoditasItem.gambar || "/images/komoditas.png"}
                  alt={komoditasItem.nama}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Rata-rata</p>
              <p className="text-xl font-semibold text-primary">
                {avgPrice > 0 ? `Rp ${avgPrice.toLocaleString("id-ID")}` : "-"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Terendah</p>
              <p className="text-xl font-semibold">
                {minPrice > 0 ? `Rp ${minPrice.toLocaleString("id-ID")}` : "-"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Tertinggi</p>
              <p className="text-xl font-semibold">
                {maxPrice > 0 ? `Rp ${maxPrice.toLocaleString("id-ID")}` : "-"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Pergerakan</p>
              <div className="flex items-center gap-2 mt-1">
                {trendData.trend === "naik" && (
                  <TrendingUp className="h-4 w-4 text-danger" />
                )}
                {trendData.trend === "turun" && (
                  <TrendingDown className="h-4 w-4 text-success" />
                )}
                {trendData.trend === "stabil" && (
                  <Minus className="h-4 w-4 text-warning" />
                )}
                <p className="text-sm font-semibold">
                  {trendData.trend === "stabil"
                    ? "0,00%"
                    : `${trendData.pct >= 0 ? "up" : "down"} ${Math.abs(trendData.pct).toFixed(2)}%`}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Harga Terbaru per Pasar</h2>
              <span className="text-xs text-muted-foreground">
                {latestByPasar.length} pasar terdeteksi
              </span>
            </div>

            {latestByPasar.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {latestByPasar.map((item) => (
                  <Card
                    key={`${item.pasar_id}-${item.tanggal}`}
                    className="border-border/80"
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {item.pasarNama}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.pasarAlamat}
                          </p>
                        </div>
                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                      </div>
                      <p className="text-primary font-semibold">
                        Rp {item.harga_rata_rata.toLocaleString("id-ID")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Update {formatTanggal(item.tanggal)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Belum ada data harga untuk komoditas ini.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <h2 className="text-lg font-semibold">Riwayat Pelaporan</h2>
            {entries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 pr-4 font-medium">Tanggal</th>
                      <th className="py-2 pr-4 font-medium">Pasar</th>
                      <th className="py-2 font-medium">Harga Rata-rata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.slice(0, 20).map((item) => {
                      const pasarItem = pasar.find(
                        (p) => p.id === item.pasar_id,
                      );
                      return (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="py-2 pr-4">
                            {formatTanggal(item.tanggal)}
                          </td>
                          <td className="py-2 pr-4">
                            {pasarItem?.nama ?? "Pasar"}
                          </td>
                          <td className="py-2 font-semibold">
                            Rp {item.harga_rata_rata.toLocaleString("id-ID")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Belum ada riwayat pelaporan.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
