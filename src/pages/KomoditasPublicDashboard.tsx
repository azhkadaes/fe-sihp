import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  Loader2,
  Minus,
  Package,
  Search,
  Store,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import PublicNavbar from "@/components/PublicNavbar";
import {
  fetchAllPublicKomoditas,
  fetchPublicKomoditasTrend,
  fetchPublicPasarList,
  fetchPublicTempatUsahaDetail,
  type PublicKomoditasListItem,
  type PublicPasarListItem,
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

type TrendInfo = {
  trend: "naik" | "turun" | "stabil";
  pct: number;
  diff: number;
};

function computeTrendFromPoints(
  points: { tanggal: string; harga: number }[],
): TrendInfo {
  if (points.length < 2) {
    return { trend: "stabil", pct: 0, diff: 0 };
  }
  const sorted = [...points].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const diff = latest.harga - prev.harga;
  const pct = prev.harga > 0 ? (diff / prev.harga) * 100 : 0;
  const trend = diff > 0 ? "naik" : diff < 0 ? "turun" : "stabil";
  return { trend, pct, diff };
}

export default function KomoditasPublicDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const filterTempatUsahaId =
    (location.state as { filterTempatUsahaId?: string } | null)
      ?.filterTempatUsahaId ?? null;

  const [selectedPasar, setSelectedPasar] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [pasarList, setPasarList] = useState<PublicPasarListItem[]>([]);
  const [komoditasList, setKomoditasList] = useState<PublicKomoditasListItem[]>(
    [],
  );
  const [trendMap, setTrendMap] = useState<Record<string, TrendInfo>>({});
  const [tuFilterName, setTuFilterName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { items } = await fetchPublicPasarList();
        if (!cancelled) {
          setPasarList(items.filter((p) => p.is_active === 1));
        }
      } catch {
        if (!cancelled) setPasarList([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!filterTempatUsahaId) {
      setTuFilterName(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const detail = await fetchPublicTempatUsahaDetail(filterTempatUsahaId, {
          limit: 1,
        });
        if (!cancelled) setTuFilterName(detail.tempat_usaha.nama);
      } catch {
        if (!cancelled) setTuFilterName(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filterTempatUsahaId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const { items } = await fetchAllPublicKomoditas({
          nama: debouncedQuery.trim() || undefined,
          id_pasar: selectedPasar !== "all" ? selectedPasar : undefined,
          id_tempat_usaha: filterTempatUsahaId ?? undefined,
        });
        if (!cancelled) setKomoditasList(items);
      } catch {
        if (!cancelled) setKomoditasList([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, selectedPasar, filterTempatUsahaId]);

  useEffect(() => {
    const withPrice = komoditasList.filter(
      (item) => item.harga_pelaporan_terbaru != null,
    );
    if (withPrice.length === 0) {
      setTrendMap({});
      return;
    }

    let cancelled = false;
    void (async () => {
      setTrendLoading(true);
      const entries = await Promise.all(
        withPrice.map(async (item) => {
          try {
            const points = await fetchPublicKomoditasTrend(item.id, {
              days: 30,
              id_pasar: selectedPasar !== "all" ? selectedPasar : undefined,
            });
            return [
              item.id,
              computeTrendFromPoints(
                points.map((p) => ({
                  tanggal: p.tanggal,
                  harga: p.harga_rata_rata,
                })),
              ),
            ] as const;
          } catch {
            return [item.id, { trend: "stabil", pct: 0, diff: 0 }] as const;
          }
        }),
      );
      if (!cancelled) {
        setTrendMap(Object.fromEntries(entries));
        setTrendLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [komoditasList, selectedPasar]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  const pasarCoverage = useMemo(() => {
    if (filterTempatUsahaId) return 1;
    if (selectedPasar !== "all") return 1;
    return pasarList.length;
  }, [filterTempatUsahaId, selectedPasar, pasarList.length]);

  const komoditasWithData = useMemo(
    () =>
      komoditasList.filter((item) => item.harga_pelaporan_terbaru != null)
        .length,
    [komoditasList],
  );

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

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {filterTempatUsahaId ? "Detail Tempat Usaha" : "Ringkasan Publik"}
          </p>
          <h2 className="text-2xl sm:text-3xl font-display font-semibold">
            {filterTempatUsahaId && tuFilterName
              ? `Komoditas di ${tuFilterName}`
              : "Harga Komoditas per Pasar"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {filterTempatUsahaId && tuFilterName
              ? `Daftar komoditas yang dijual di ${tuFilterName}.`
              : "Jelajahi harga komoditas terbaru seperti tampilan dashboard admin, lengkap dengan filter pasar dan pencarian komoditas."}
          </p>
        </div>

        <Card>
          <CardContent
            className={`p-4 ${
              filterTempatUsahaId
                ? "grid grid-cols-1"
                : "grid grid-cols-1 sm:grid-cols-2"
            } gap-3`}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/70" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari komoditas"
                className="pl-10 h-10"
              />
            </div>
            {!filterTempatUsahaId && (
              <Select value={selectedPasar} onValueChange={setSelectedPasar}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Semua Pasar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Pasar</SelectItem>
                  {pasarList.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/20 text-accent flex items-center justify-center">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-semibold">{pasarCoverage}</p>
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
                <p className="text-xl font-semibold">{komoditasWithData}</p>
                <p className="text-xs text-muted-foreground">
                  Komoditas Terdeteksi
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/15 text-success flex items-center justify-center">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-semibold">{komoditasList.length}</p>
                <p className="text-xs text-muted-foreground">Hasil Filter</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-14 flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Memuat komoditas...</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {komoditasList.map((k) => {
              const latestPrice = k.harga_pelaporan_terbaru;
              const trendInfo = trendMap[k.id] ?? {
                trend: "stabil" as const,
                pct: 0,
                diff: 0,
              };
              const { trend, pct, diff } = trendInfo;
              const showTrend = latestPrice != null && !trendLoading;

              return (
                <Card
                  key={k.id}
                  onClick={() => navigate(`/public/komoditas/${k.id}`)}
                  className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer interactive-smooth"
                >
                  <CardContent className="p-0">
                    <div className="aspect-[4/3] bg-muted/50 flex items-center justify-center overflow-hidden">
                      {k.gambar ? (
                        <img
                          src={k.gambar}
                          alt={k.nama}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="h-10 w-10 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="p-3 space-y-1.5">
                      <h3 className="text-sm font-semibold leading-tight truncate">
                        {k.nama}
                      </h3>
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-bold">
                          {latestPrice != null
                            ? `Rp ${latestPrice.toLocaleString("id-ID")}`
                            : "-"}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          / {k.satuan_dasar}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap min-h-[18px]">
                        {showTrend && trend === "naik" && (
                          <TrendingUp className="h-3.5 w-3.5 text-danger" />
                        )}
                        {showTrend && trend === "turun" && (
                          <TrendingDown className="h-3.5 w-3.5 text-success" />
                        )}
                        {showTrend && trend === "stabil" && (
                          <Minus className="h-3.5 w-3.5 text-warning" />
                        )}
                        {showTrend && (
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
                        )}
                        {showTrend && diff !== 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            (Rp {diff > 0 ? "+" : ""}
                            {Math.round(diff).toLocaleString("id-ID")})
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {k.tanggal_pelaporan_terbaru
                          ? `Update ${formatTanggal(k.tanggal_pelaporan_terbaru)}`
                          : "Belum ada data"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!loading && komoditasList.length === 0 && (
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
