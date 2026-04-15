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
  ChevronDown,
  Building2,
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

export default function LandingPage() {
  const { pasar, komoditas, tempatUsaha, komoditasDijual, hargaPelaporan } =
    useData();
  const [query, setQuery] = useState("");
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [heroApi, setHeroApi] = useState<CarouselApi | null>(null);
  const [showAllKomoditas, setShowAllKomoditas] = useState(false);
  const [komoditasQuery, setKomoditasQuery] = useState("");
  const [selectedPasar, setSelectedPasar] = useState<string>("all");

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
    { label: "Komoditas", value: komoditas.length, icon: Package },
    {
      label: "Pasar",
      value: pasar.filter((p) => p.is_active).length,
      icon: Store,
    },
    {
      label: "Tempat Usaha",
      value: tempatUsaha.filter((t) => t.is_active).length,
      icon: Building2,
    },
  ];

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

  const filteredSummaryCards = useMemo(() => {
    const q = komoditasQuery.trim().toLowerCase();
    return summaryCards.filter(({ komoditas: k, latest }) => {
      if (q && !k.nama.toLowerCase().includes(q)) return false;
      if (selectedPasar === "all") return true;
      return latest?.pasar_id === selectedPasar;
    });
  }, [komoditasQuery, selectedPasar, summaryCards]);

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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
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

            <div className="flex flex-wrap items-center gap-3">
              <Link to="/login">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Masuk Dashboard
                </Button>
              </Link>
              <Button
                variant="outline"
                className="border-primary/30 text-primary"
              >
                Jelajahi Data
              </Button>
            </div>
          </div>

          <Card className="glass-frame overflow-hidden animate-float">
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
              key={s.label}
              className="hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              <CardContent className="p-5 flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-accent/20 text-accent flex items-center justify-center">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{s.value}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {s.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {summaryCards
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
                  <p className="text-xl font-semibold text-primary">
                    {latest
                      ? `Rp ${latest.harga_rata_rata.toLocaleString("id-ID")}`
                      : "Belum ada data"}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    {trend === "naik" && (
                      <TrendingUp className="h-4 w-4 text-primary" />
                    )}
                    {trend === "turun" && (
                      <TrendingDown className="h-4 w-4 text-accent" />
                    )}
                    {trend === "stabil" && (
                      <Minus className="h-4 w-4 text-primary/60" />
                    )}
                    <span className="text-primary">
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
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-display font-semibold">
                Harga Komoditas Keseluruhan
              </h2>
              <button
                type="button"
                className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
                onClick={() => setShowAllKomoditas((prev) => !prev)}
                aria-label="Tampilkan semua komoditas"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showAllKomoditas ? "rotate-180" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>

        <Carousel
          opts={{ align: "start", loop: true }}
          setApi={setCarouselApi}
          className="w-full"
        >
          <CarouselContent className="-ml-3">
            {komoditas.map((k) => {
              const latest = latestByKomoditas[k.id];
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
                        {latest
                          ? `Rp ${latest.harga_rata_rata.toLocaleString("id-ID")}`
                          : "Belum ada data"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {latest ? `Update ${latest.tanggal}` : ""}
                      </p>
                    </CardContent>
                  </Card>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>

        {showAllKomoditas && (
          <div className="mt-8 space-y-5">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex-1 min-w-[220px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/70" />
                  <Input
                    value={komoditasQuery}
                    onChange={(e) => setKomoditasQuery(e.target.value)}
                    placeholder="Cari komoditas"
                    className="pl-10 h-10 bg-background"
                  />
                </div>
              </div>
              <Select value={selectedPasar} onValueChange={setSelectedPasar}>
                <SelectTrigger className="w-full sm:w-52 h-10 text-sm">
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
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredSummaryCards.map(
                ({ komoditas: k, latest, trend, pct, diff }) => (
                  <Card
                    key={k.id}
                    className="overflow-hidden hover:shadow-md transition-shadow"
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
                            {latest
                              ? `Rp ${latest.harga_rata_rata.toLocaleString("id-ID")}`
                              : "-"}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            / {k.satuan_dasar}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {trend === "naik" && (
                            <TrendingUp className="h-3.5 w-3.5 text-danger" />
                          )}
                          {trend === "turun" && (
                            <TrendingDown className="h-3.5 w-3.5 text-success" />
                          )}
                          {trend === "stabil" && (
                            <Minus className="h-3.5 w-3.5 text-warning" />
                          )}
                          <span className="text-xs font-semibold">
                            {trend === "stabil"
                              ? "0,00%"
                              : `${pct >= 0 ? "up" : "down"} ${Math.abs(pct).toFixed(2)}%`}
                          </span>
                          {diff !== 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              (Rp {diff > 0 ? "+" : ""}
                              {Math.round(diff).toLocaleString("id-ID")})
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ),
              )}
            </div>

            {filteredSummaryCards.length === 0 && (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  Tidak ada komoditas yang cocok dengan filter.
                </CardContent>
              </Card>
            )}
          </div>
        )}
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
