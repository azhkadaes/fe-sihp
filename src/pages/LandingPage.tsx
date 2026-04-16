import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import { useData } from "@/contexts/DataContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  ArrowRight,
  Building2,
  ChevronDown,
  LogIn,
  MapPin,
  Minus,
  Package,
  Search,
  Store,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

type SearchRow = {
  key: string;
  title: string;
  subtitle: string;
  price?: number;
  unit?: string;
  link?: string;
};

type StatsKey = "komoditas" | "pasar" | "tempatUsaha";

type StatListItem = {
  id: string;
  title: string;
  subtitle?: string;
};

export default function LandingPage() {
  const { pasar, komoditas, tempatUsaha, komoditasDijual, hargaPelaporan } =
    useData();
  const [query, setQuery] = useState("");
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [heroApi, setHeroApi] = useState<CarouselApi | null>(null);
  const [activeStat, setActiveStat] = useState<StatsKey | null>(null);
  const [selectedStatItemId, setSelectedStatItemId] = useState<string | null>(
    null,
  );

  const formatTanggal = (tanggal: string) => {
    const date = new Date(tanggal);
    if (Number.isNaN(date.getTime())) return tanggal;
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  useEffect(() => {
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x,
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
    });
  }, []);

  useEffect(() => {
    if (!carouselApi) return;
    const interval = window.setInterval(() => carouselApi.scrollNext(), 4200);
    return () => window.clearInterval(interval);
  }, [carouselApi]);

  useEffect(() => {
    if (!heroApi) return;
    const interval = window.setInterval(() => heroApi.scrollNext(), 5200);
    return () => window.clearInterval(interval);
  }, [heroApi]);

  const stats = [
    {
      key: "komoditas" as const,
      label: "Komoditas",
      value: komoditas.length,
      icon: Package,
      helper: "Lihat daftar komoditas terdaftar",
    },
    {
      key: "pasar" as const,
      label: "Pasar",
      value: pasar.filter((p) => p.is_active).length,
      icon: Store,
      helper: "Lihat pasar aktif terdaftar",
    },
    {
      key: "tempatUsaha" as const,
      label: "Tempat Usaha",
      value: tempatUsaha.filter((t) => t.is_active).length,
      icon: Building2,
      helper: "Lihat tempat usaha aktif",
    },
  ];

  const toggleStatPanel = (statKey: StatsKey) => {
    setSelectedStatItemId(null);
    setActiveStat((prev) => (prev === statKey ? null : statKey));
  };

  const activeStatList = useMemo<StatListItem[]>(() => {
    if (activeStat === "komoditas") {
      return komoditas
        .slice()
        .sort((a, b) => a.nama.localeCompare(b.nama))
        .map((item) => ({
          id: item.id,
          title: item.nama,
          subtitle: item.satuan_dasar,
        }));
    }

    if (activeStat === "pasar") {
      return pasar
        .filter((item) => item.is_active)
        .slice()
        .sort((a, b) => a.nama.localeCompare(b.nama))
        .map((item) => ({
          id: item.id,
          title: item.nama,
          subtitle: item.alamat,
        }));
    }

    if (activeStat === "tempatUsaha") {
      return tempatUsaha
        .filter((item) => item.is_active)
        .slice()
        .sort((a, b) => a.nama.localeCompare(b.nama))
        .map((item) => {
          const pasarItem = pasar.find((p) => p.id === item.pasar_id);
          return {
            id: item.id,
            title: item.nama,
            subtitle: pasarItem?.nama ?? "",
          };
        });
    }

    return [];
  }, [activeStat, komoditas, pasar, tempatUsaha]);

  const latestByKey = useMemo(() => {
    return hargaPelaporan.reduce<
      Record<string, (typeof hargaPelaporan)[number]>
    >((acc, item) => {
      const key = `${item.pasar_id}-${item.komoditas_id}`;
      if (!acc[key] || item.tanggal > acc[key].tanggal) acc[key] = item;
      return acc;
    }, {});
  }, [hargaPelaporan]);

  const latestByKomoditas = useMemo(() => {
    return hargaPelaporan.reduce<
      Record<string, (typeof hargaPelaporan)[number]>
    >((acc, item) => {
      if (
        !acc[item.komoditas_id] ||
        item.tanggal > acc[item.komoditas_id].tanggal
      ) {
        acc[item.komoditas_id] = item;
      }
      return acc;
    }, {});
  }, [hargaPelaporan]);

  const summaryCards = useMemo(() => {
    return komoditas.map((k) => {
      const entries = hargaPelaporan
        .filter((h) => h.komoditas_id === k.id)
        .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

      const latest = entries[entries.length - 1];
      const prev = entries[entries.length - 2];

      let trend: "naik" | "turun" | "stabil" = "stabil";
      let diff = 0;
      let pct = 0;
      if (latest && prev) {
        diff = latest.harga_rata_rata - prev.harga_rata_rata;
        pct =
          prev.harga_rata_rata > 0 ? (diff / prev.harga_rata_rata) * 100 : 0;
        trend = diff > 0 ? "naik" : diff < 0 ? "turun" : "stabil";
      }
      return { komoditas: k, latest, trend, diff, pct };
    });
  }, [komoditas, hargaPelaporan]);

  const latestSnapshotDate = useMemo(() => {
    if (hargaPelaporan.length === 0) return null;
    return hargaPelaporan.reduce(
      (latest, item) => (item.tanggal > latest ? item.tanggal : latest),
      hargaPelaporan[0].tanggal,
    );
  }, [hargaPelaporan]);

  const latestSnapshotCards = useMemo(() => {
    return summaryCards
      .filter(
        ({ latest }) =>
          latest && latestSnapshotDate && latest.tanggal === latestSnapshotDate,
      )
      .sort((a, b) => {
        const ap = Math.abs(a.pct);
        const bp = Math.abs(b.pct);
        return bp - ap;
      });
  }, [summaryCards, latestSnapshotDate]);

  const snapshotTrendStats = useMemo(() => {
    const initial = { naik: 0, turun: 0, stabil: 0 };
    return latestSnapshotCards.reduce((acc, card) => {
      acc[card.trend] += 1;
      return acc;
    }, initial);
  }, [latestSnapshotCards]);

  const overallCards = useMemo(() => {
    return komoditas.map((k) => {
      const entries = hargaPelaporan
        .filter((h) => h.komoditas_id === k.id)
        .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

      const latest = entries[entries.length - 1];
      const prices = entries
        .map((e) => e.harga_rata_rata)
        .filter((price) => price > 0);
      const avgPrice =
        prices.length > 0
          ? Math.round(
              prices.reduce((total, value) => total + value, 0) / prices.length,
            )
          : 0;
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

      return {
        komoditas: k,
        latest,
        avgPrice,
        minPrice,
        maxPrice,
      };
    });
  }, [komoditas, hargaPelaporan]);

  const selectedKomoditasCard = useMemo(() => {
    if (activeStat !== "komoditas" || !selectedStatItemId) return null;
    return overallCards.find((card) => card.komoditas.id === selectedStatItemId);
  }, [activeStat, selectedStatItemId, overallCards]);

  const selectedPasarCards = useMemo(() => {
    if (activeStat !== "pasar" || !selectedStatItemId) return [];

    return komoditas
      .map((kom) => {
        const latest = latestByKey[`${selectedStatItemId}-${kom.id}`];
        if (!latest) return null;

        return {
          key: `${selectedStatItemId}-${kom.id}`,
          title: kom.nama,
          unit: kom.satuan_dasar,
          price: latest.harga_rata_rata,
          date: latest.tanggal,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, 8);
  }, [activeStat, selectedStatItemId, komoditas, latestByKey]);

  const selectedTempatUsahaCards = useMemo(() => {
    if (activeStat !== "tempatUsaha" || !selectedStatItemId) return [];

    const selectedPlace = tempatUsaha.find(
      (item) => item.id === selectedStatItemId,
    );
    if (!selectedPlace) return [];

    return komoditasDijual
      .filter(
        (item) => item.tempat_usaha_id === selectedPlace.id && item.is_active,
      )
      .map((item) => {
        const kom = komoditas.find((k) => k.id === item.komoditas_id);
        if (!kom) return null;

        const latest =
          latestByKey[`${selectedPlace.pasar_id}-${item.komoditas_id}`];

        return {
          key: `${selectedPlace.id}-${item.komoditas_id}`,
          title: kom.nama,
          unit: kom.satuan_dasar,
          price: latest?.harga_rata_rata,
          date: latest?.tanggal,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, 8);
  }, [
    activeStat,
    selectedStatItemId,
    tempatUsaha,
    komoditasDijual,
    komoditas,
    latestByKey,
  ]);

  const searchResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [] as SearchRow[];

    const resultMap = new Map<string, SearchRow>();
    const addRow = (row: SearchRow) => {
      if (!resultMap.has(row.key)) resultMap.set(row.key, row);
    };

    komoditas
      .filter((k) => k.nama.toLowerCase().includes(normalized))
      .forEach((k) => {
        const latest = latestByKomoditas[k.id];
        addRow({
          key: `kom-${k.id}`,
          title: k.nama,
          subtitle: latest ? `Update ${latest.tanggal}` : "Belum ada data",
          price: latest?.harga_rata_rata,
          unit: k.satuan_dasar,
        });
      });

    pasar
      .filter((p) => p.nama.toLowerCase().includes(normalized))
      .forEach((p) => {
        komoditas.forEach((k) => {
          const latest = latestByKey[`${p.id}-${k.id}`];
          if (!latest) return;
          addRow({
            key: `psr-${p.id}-${k.id}`,
            title: k.nama,
            subtitle: p.nama,
            price: latest.harga_rata_rata,
            unit: k.satuan_dasar,
          });
        });
      });

    tempatUsaha
      .filter((t) => t.nama.toLowerCase().includes(normalized))
      .forEach((t) => {
        const pasarInfo = pasar.find((p) => p.id === t.pasar_id);
        komoditasDijual
          .filter((kd) => kd.tempat_usaha_id === t.id && kd.is_active)
          .forEach((kd) => {
            const kom = komoditas.find((k) => k.id === kd.komoditas_id);
            const latest = latestByKey[`${t.pasar_id}-${kd.komoditas_id}`];
            addRow({
              key: `tu-${t.id}-${kd.komoditas_id}`,
              title: kom?.nama ?? "Komoditas",
              subtitle: `${t.nama} - ${pasarInfo?.nama ?? ""}`.trim(),
              price: latest?.harga_rata_rata,
              unit: kom?.satuan_dasar,
              link: `/public/tempat-usaha/${t.id}`,
            });
          });
      });

    return Array.from(resultMap.values()).slice(0, 8);
  }, [
    query,
    komoditas,
    pasar,
    tempatUsaha,
    komoditasDijual,
    latestByKey,
    latestByKomoditas,
  ]);

  const heroSlides = [
    {
      title: "Harga Komoditas",
      subtitle: "Pantau pergerakan harga harian dengan cepat",
    },
    {
      title: "Pasar Aktif",
      subtitle: "Data pasar terhubung langsung dengan petugas",
    },
    {
      title: "Tempat Usaha",
      subtitle: "Harga pedagang terkelola dan terverifikasi",
    },
  ];

  const mapCenter = useMemo(() => {
    const first = pasar.find((p) => p.is_active && p.latitude && p.longitude);
    if (first) return [first.latitude, first.longitude] as [number, number];
    return [-6.9147, 107.5731] as [number, number];
  }, [pasar]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/65">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
          <span className="text-lg font-display font-semibold text-primary tracking-tight">
            SIHP
          </span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login">
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <LogIn className="h-4 w-4 mr-1.5" /> Masuk
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="hero-sheen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-start">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 text-primary text-xs uppercase tracking-[0.3em]">
              Sistem Informasi Harga Pangan
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-semibold leading-tight">
              Harga pangan yang jelas, cepat, dan selalu terkini.
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl leading-relaxed">
              Cari komoditas, pasar, atau tempat usaha untuk melihat harga
              rata-rata terbaru. Semua data dirangkum agar mudah dipahami.
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/70" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari komoditas, pasar, atau tempat usaha"
                className="pl-10 h-11 bg-background"
              />
            </div>
            {query.trim() && (
              <div className="grid gap-3 sm:grid-cols-2">
                {searchResults.length > 0 ? (
                  searchResults.map((row) => (
                    <Card
                      key={row.key}
                      className="group hover:shadow-lg transition-all hover:-translate-y-0.5"
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                              {row.subtitle}
                            </p>
                            <h3 className="font-semibold">{row.title}</h3>
                          </div>
                          <div className="h-8 w-8 rounded-lg bg-accent/20 text-accent flex items-center justify-center">
                            <Package className="h-4 w-4" />
                          </div>
                        </div>
                        <p className="text-primary font-semibold">
                          {row.price
                            ? `Rp ${row.price.toLocaleString("id-ID")}`
                            : "Belum ada harga"}
                          {row.unit ? ` / ${row.unit}` : ""}
                        </p>
                        {row.link && (
                          <Link
                            to={row.link}
                            className="text-xs text-primary inline-flex items-center gap-1"
                          >
                            Lihat tempat usaha{" "}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="p-4 text-sm text-muted-foreground">
                      Tidak ada data untuk kata kunci tersebut.
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            {/* masuk dashboard and jelajahi data */}
            {/* <div className="flex flex-wrap items-center gap-3">
              <Link to="/login">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Masuk Dashboard
                </Button>
              </Link>
              <Link to="/public/komoditas">
                <Button
                  variant="outline"
                  className="border-primary/30 text-primary"
                >
                  Jelajahi Data
                </Button>
              </Link>
            </div> */}
          </div>

          <Card className="glass-frame overflow-hidden animate-float lg:sticky lg:top-24 self-start">
            <CardContent className="p-0">
              <Carousel opts={{ loop: true }} setApi={setHeroApi}>
                <CarouselContent>
                  {heroSlides.map((slide) => (
                    <CarouselItem key={slide.title}>
                      <div className="h-64 sm:h-80 p-6 flex flex-col justify-between">
                        <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-primary/70">
                            Highlight
                          </p>
                          <h3 className="text-2xl font-display font-semibold">
                            {slide.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-2">
                            {slide.subtitle}
                          </p>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((s) => (
            <Card
              key={s.key}
              onClick={() => toggleStatPanel(s.key)}
              className={
                activeStat === s.key
                  ? "cursor-pointer border-primary/40 shadow-lg -translate-y-0.5 transition-all"
                  : "cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5"
              }
            >
              <CardContent className="p-5 flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-accent/20 text-accent flex items-center justify-center">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-semibold">{s.value}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{s.helper}</p>
                </div>
                <ChevronDown
                  className={
                    activeStat === s.key
                      ? "h-4 w-4 text-primary transition-transform rotate-180"
                      : "h-4 w-4 text-muted-foreground transition-transform"
                  }
                />
              </CardContent>
            </Card>
          ))}
        </div>

        {activeStat && (
          <Card className="mt-4 border-primary/20">
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {activeStat === "komoditas"
                      ? "Daftar Komoditas"
                      : activeStat === "pasar"
                        ? "Daftar Pasar"
                        : "Daftar Tempat Usaha"}
                  </p>
                  <h3 className="text-lg font-semibold">
                    {activeStatList.length} item terdaftar
                  </h3>
                </div>
                {selectedStatItemId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStatItemId(null)}
                  >
                    Kembali ke daftar
                  </Button>
                )}
              </div>

              {!selectedStatItemId && (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {activeStatList.length > 0 ? (
                    activeStatList.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setSelectedStatItemId(item.id)}
                        className="text-left rounded-lg border border-border p-3 hover:border-primary/40 hover:bg-accent/30 transition-all"
                      >
                        <p className="font-medium leading-tight">{item.title}</p>
                        {item.subtitle && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {item.subtitle}
                          </p>
                        )}
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Belum ada data aktif untuk kategori ini.
                    </p>
                  )}
                </div>
              )}

              {selectedStatItemId && activeStat === "komoditas" && selectedKomoditasCard && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="h-full hover:shadow-lg transition-all">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            {selectedKomoditasCard.komoditas.satuan_dasar}
                          </p>
                          <h3 className="font-semibold">
                            {selectedKomoditasCard.komoditas.nama}
                          </h3>
                        </div>
                        <div className="h-9 w-9 rounded-xl bg-accent/20 text-accent flex items-center justify-center">
                          <Package className="h-4 w-4" />
                        </div>
                      </div>
                      <p className="text-xl font-semibold text-primary">
                        {selectedKomoditasCard.avgPrice > 0
                          ? `Rp ${selectedKomoditasCard.avgPrice.toLocaleString("id-ID")}`
                          : "Belum ada data"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedKomoditasCard.latest
                          ? `Data terakhir ${formatTanggal(selectedKomoditasCard.latest.tanggal)}`
                          : "Belum ada pembaruan"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Rentang: {" "}
                        {selectedKomoditasCard.minPrice > 0
                          ? `Rp ${selectedKomoditasCard.minPrice.toLocaleString("id-ID")}`
                          : "-"}{" "}
                        - {" "}
                        {selectedKomoditasCard.maxPrice > 0
                          ? `Rp ${selectedKomoditasCard.maxPrice.toLocaleString("id-ID")}`
                          : "-"}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {selectedStatItemId && activeStat === "pasar" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedPasarCards.length > 0 ? (
                    selectedPasarCards.map((card) => (
                      <Card key={card.key} className="h-full hover:shadow-lg transition-all">
                        <CardContent className="p-5 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                {card.unit}
                              </p>
                              <h3 className="font-semibold">{card.title}</h3>
                            </div>
                            <Package className="h-4 w-4 text-primary" />
                          </div>
                          <p className="text-primary font-semibold">
                            Rp {card.price.toLocaleString("id-ID")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Update {formatTanggal(card.date)}
                          </p>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Belum ada data harga komoditas pada pasar ini.
                    </p>
                  )}
                </div>
              )}

              {selectedStatItemId && activeStat === "tempatUsaha" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedTempatUsahaCards.length > 0 ? (
                    selectedTempatUsahaCards.map((card) => (
                      <Card key={card.key} className="h-full hover:shadow-lg transition-all">
                        <CardContent className="p-5 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                {card.unit}
                              </p>
                              <h3 className="font-semibold">{card.title}</h3>
                            </div>
                            <Package className="h-4 w-4 text-primary" />
                          </div>
                          <p className="text-primary font-semibold">
                            {card.price
                              ? `Rp ${card.price.toLocaleString("id-ID")}`
                              : "Belum ada harga"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {card.date ? `Update ${formatTanggal(card.date)}` : "Belum ada pembaruan"}
                          </p>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Belum ada data komoditas aktif pada tempat usaha ini.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Ringkasan
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-semibold">
              Visualisasi Harga Terkini
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Snapshot perubahan pada tanggal data terbaru{" "}
              {latestSnapshotDate ? formatTanggal(latestSnapshotDate) : "-"}.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {latestSnapshotCards
            .slice(0, 6)
            .map(({ komoditas: k, latest, trend, pct, diff }) => (
              <Card
                key={k.id}
                className="hover:shadow-lg transition-all hover:-translate-y-0.5"
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        {k.satuan_dasar}
                      </p>
                      <h3 className="font-semibold">{k.nama}</h3>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                      <Package className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {latest
                      ? `Update ${formatTanggal(latest.tanggal)}`
                      : "Belum ada data"}
                  </p>
                  <p className="text-xl font-semibold text-primary">
                    {latest
                      ? `Rp ${latest.harga_rata_rata.toLocaleString("id-ID")}`
                      : "Belum ada data"}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    {trend === "naik" && (
                      <TrendingUp className="h-4 w-4 text-danger" />
                    )}
                    {trend === "turun" && (
                      <TrendingDown className="h-4 w-4 text-success" />
                    )}
                    {trend === "stabil" && (
                      <Minus className="h-4 w-4 text-warning" />
                    )}
                    <span
                      className={
                        trend === "naik"
                          ? "text-danger"
                          : trend === "turun"
                            ? "text-success"
                            : "text-warning"
                      }
                    >
                      {trend === "stabil"
                        ? "0,00%"
                        : `${pct >= 0 ? "up" : "down"} ${Math.abs(pct).toFixed(2)}%`}
                    </span>
                    {diff !== 0 && (
                      <span className="text-xs text-muted-foreground">
                        (Rp {diff > 0 ? "+" : ""}
                        {Math.round(diff).toLocaleString("id-ID")})
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-14">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Komoditas
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-semibold">
              Harga Komoditas Keseluruhan
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Gambaran periode data: rata-rata, dan rentang minimum-maksimum.
            </p>
          </div>
          <Link
            to="/public/komoditas"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
          >
            Lihat Dashboard Komoditas <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <Carousel
          opts={{ align: "start", loop: true }}
          setApi={setCarouselApi}
          className="w-full"
        >
          <CarouselContent className="-ml-3">
            {overallCards.map(
              ({ komoditas: k, latest, avgPrice, minPrice, maxPrice }) => {
                return (
                  <CarouselItem
                    key={k.id}
                    className="pl-3 basis-11/12 sm:basis-1/2 lg:basis-1/3"
                  >
                    <Card className="h-full hover:shadow-lg transition-all hover:-translate-y-0.5">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                              {k.satuan_dasar}
                            </p>
                            <h3 className="font-semibold">{k.nama}</h3>
                          </div>
                          <div className="h-9 w-9 rounded-xl bg-accent/20 text-accent flex items-center justify-center">
                            <Package className="h-4 w-4" />
                          </div>
                        </div>
                        <p className="text-xl font-semibold text-primary">
                          {avgPrice > 0
                            ? `Rp ${avgPrice.toLocaleString("id-ID")}`
                            : "Belum ada data"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {latest
                            ? `Data terakhir ${formatTanggal(latest.tanggal)}`
                            : ""}
                        </p>
                        <div className="space-y-1.5 text-xs">
                          <p className="text-muted-foreground">
                            Rentang:{" "}
                            {minPrice > 0
                              ? `Rp ${minPrice.toLocaleString("id-ID")}`
                              : "-"}{" "}
                            -{" "}
                            {maxPrice > 0
                              ? `Rp ${maxPrice.toLocaleString("id-ID")}`
                              : "-"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                );
              },
            )}
          </CarouselContent>
        </Carousel>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Peta Pasar
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-semibold">
              Lokasi Pasar & Tempat Usaha
            </h2>
          </div>
          <div className="text-xs text-muted-foreground">
            Klik marker pasar untuk melihat tempat usaha
          </div>
        </div>

        <div className="rounded-2xl border border-border overflow-hidden">
          <MapContainer
            center={mapCenter}
            zoom={12}
            scrollWheelZoom={false}
            className="h-[420px] w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {pasar
              .filter((p) => p.is_active && p.latitude && p.longitude)
              .map((p) => {
                const pasarTempatUsaha = tempatUsaha.filter(
                  (t) => t.pasar_id === p.id && t.is_active,
                );
                return (
                  <Marker key={p.id} position={[p.latitude, p.longitude]}>
                    <Popup>
                      <div className="space-y-2">
                        <div>
                          <p className="font-semibold">{p.nama}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.alamat}
                          </p>
                        </div>
                        <div className="space-y-1">
                          {pasarTempatUsaha.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                              Belum ada tempat usaha
                            </p>
                          )}
                          {pasarTempatUsaha.map((t) => (
                            <Link
                              key={t.id}
                              to={`/public/tempat-usaha/${t.id}`}
                              className="text-xs text-primary inline-flex items-center gap-1"
                            >
                              {t.nama} <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
          </MapContainer>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        (c) {new Date().getFullYear()} Sistem Informasi Harga Pangan
      </footer>
    </div>
  );
}
