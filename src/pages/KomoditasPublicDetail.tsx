import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import PublicNavbar from "@/components/PublicNavbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  fetchPublicKomoditasDetail,
  fetchPublicKomoditasList,
  fetchPublicKomoditasTrend,
  fetchPublicPasarList,
  type PublicKomoditasDetail,
  type PublicPasarListItem,
  type PublicTrendPoint,
} from "@/lib/public-api";

const formatTanggal = (tanggal: string) => {
  const date = new Date(tanggal);
  if (Number.isNaN(date.getTime())) return tanggal;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

type PasarPriceRow = {
  pasarId: string;
  pasarNama: string;
  pasarAlamat: string;
  harga: number;
  tanggal: string;
};

function computeTrend(points: PublicTrendPoint[]) {
  if (points.length < 2) {
    return { trend: "stabil" as const, diff: 0, pct: 0 };
  }
  const sorted = [...points].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
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
}

export default function KomoditasPublicDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<PublicKomoditasDetail | null>(null);
  const [trendPoints, setTrendPoints] = useState<PublicTrendPoint[]>([]);
  const [perPasarPrices, setPerPasarPrices] = useState<PasarPriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/public/komoditas");
  };

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const [detailRes, trendRes, pasarRes] = await Promise.all([
          fetchPublicKomoditasDetail(id, { days: 30 }),
          fetchPublicKomoditasTrend(id, { days: 30 }),
          fetchPublicPasarList(),
        ]);
        if (cancelled) return;

        setDetail(detailRes);
        setTrendPoints(trendRes);

        const activePasar = pasarRes.items.filter((p) => p.is_active === 1);
        const pasarRows = await Promise.all(
          activePasar.map(async (pasar: PublicPasarListItem) => {
            try {
              const { items } = await fetchPublicKomoditasList({
                id_pasar: pasar.id,
                limit: 50,
              });
              const match = items.find((item) => item.id === id);
              if (
                match?.harga_pelaporan_terbaru == null ||
                !match.tanggal_pelaporan_terbaru
              ) {
                return null;
              }
              return {
                pasarId: pasar.id,
                pasarNama: pasar.nama,
                pasarAlamat: pasar.alamat,
                harga: match.harga_pelaporan_terbaru,
                tanggal: match.tanggal_pelaporan_terbaru,
              } satisfies PasarPriceRow;
            } catch {
              return null;
            }
          }),
        );

        if (!cancelled) {
          setPerPasarPrices(
            pasarRows
              .filter((row): row is PasarPriceRow => row != null)
              .sort((a, b) => b.harga - a.harga),
          );
        }
      } catch {
        if (!cancelled) {
          setDetail(null);
          setTrendPoints([]);
          setPerPasarPrices([]);
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const trendData = useMemo(() => computeTrend(trendPoints), [trendPoints]);

  const historyRows = useMemo(
    () =>
      [...trendPoints]
        .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
        .slice(0, 20),
    [trendPoints],
  );

  const latestPrice = detail?.latest.harga_rata_rata ?? null;
  const latestDate = detail?.latest.tanggal ?? null;
  const avgPrice = detail?.avg_nd ?? null;
  const minPrice = detail?.min_nd ?? null;
  const maxPrice = detail?.max_nd ?? null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <PublicNavbar />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <Card>
            <CardContent className="py-14 flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Memuat detail komoditas...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (notFound || !detail) {
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

  const { komoditas } = detail;

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
                  {komoditas.nama}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Satuan dasar: {komoditas.satuan_dasar}
                </p>
                <p className="text-2xl font-semibold text-primary">
                  {latestPrice != null
                    ? `Rp ${latestPrice.toLocaleString("id-ID")}`
                    : "Belum ada data"}
                  <span className="text-sm font-medium text-muted-foreground">
                    {" "}
                    / {komoditas.satuan_dasar}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {latestDate
                    ? `Update terakhir ${formatTanggal(latestDate)}`
                    : "Belum ada pelaporan harga"}
                </p>
              </div>

              <div className="w-28 h-28 rounded-xl overflow-hidden border bg-muted/30 shrink-0">
                <img
                  src={komoditas.gambar || "/images/komoditas.png"}
                  alt={komoditas.nama}
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
              <p className="text-xs text-muted-foreground">Rata-rata (30 hari)</p>
              <p className="text-xl font-semibold text-primary">
                {avgPrice != null && avgPrice > 0
                  ? `Rp ${Math.round(avgPrice).toLocaleString("id-ID")}`
                  : "-"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Terendah</p>
              <p className="text-xl font-semibold">
                {minPrice != null && minPrice > 0
                  ? `Rp ${Math.round(minPrice).toLocaleString("id-ID")}`
                  : "-"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Tertinggi</p>
              <p className="text-xl font-semibold">
                {maxPrice != null && maxPrice > 0
                  ? `Rp ${Math.round(maxPrice).toLocaleString("id-ID")}`
                  : "-"}
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
                {perPasarPrices.length} pasar terdeteksi
              </span>
            </div>

            {perPasarPrices.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {perPasarPrices.map((item) => (
                  <Card
                    key={item.pasarId}
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
                        Rp {item.harga.toLocaleString("id-ID")}
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
            {historyRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 pr-4 font-medium">Tanggal</th>
                      <th className="py-2 pr-4 font-medium">Cakupan</th>
                      <th className="py-2 font-medium">Harga Rata-rata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((item) => (
                      <tr
                        key={item.tanggal}
                        className="border-b last:border-0"
                      >
                        <td className="py-2 pr-4">
                          {formatTanggal(item.tanggal)}
                        </td>
                        <td className="py-2 pr-4">Semua pasar</td>
                        <td className="py-2 font-semibold">
                          Rp{" "}
                          {item.harga_rata_rata.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))}
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
