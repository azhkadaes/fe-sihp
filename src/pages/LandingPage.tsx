import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import { useData } from "@/contexts/DataContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PublicNavbar from "@/components/PublicNavbar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ArrowRight,
  Building2,
  ChevronDown,
  ChevronsUpDown,
  Check,
  X,
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
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [heroApi, setHeroApi] = useState<CarouselApi | null>(null);
  const [activeStat, setActiveStat] = useState<StatsKey | null>(null);
  const [selectedStatItemId, setSelectedStatItemId] = useState<string | null>(
    null,
  );
  const [selectedKomoditasDetailId, setSelectedKomoditasDetailId] = useState<
    string | null
  >(null);
  const [selectedMapPasarId, setSelectedMapPasarId] = useState<string | null>(
    null,
  );
  const [isTrendSelectorOpen, setIsTrendSelectorOpen] = useState(false);
  const [selectedTrendKomoditasIds, setSelectedTrendKomoditasIds] = useState<
    string[]
  >([]);

  const getStaggerStyle = (index: number, baseDelay = 0) => ({
    animationDelay: `${baseDelay + index * 80}ms`,
  });

  const formatTanggal = (tanggal: string) => {
    const date = new Date(tanggal);
    if (Number.isNaN(date.getTime())) return tanggal;
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const marketMarkerIcon = useMemo(
    () =>
      L.icon({
        iconRetinaUrl: markerIcon2x,
        iconUrl: markerIcon,
        shadowUrl: markerShadow,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    [],
  );

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

  useEffect(() => {
    const fadeUpElements = Array.from(
      document.querySelectorAll<HTMLElement>(".animate-fade-up"),
    );
    if (fadeUpElements.length === 0) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      fadeUpElements.forEach((element) => element.classList.add("in-view"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          target.classList.add("in-view");
          observer.unobserve(target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    fadeUpElements.forEach((element) => {
      if (element.classList.contains("in-view")) return;
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [query, activeStat, selectedStatItemId, selectedMapPasarId]);

  useEffect(() => {
    setSelectedKomoditasDetailId(null);
  }, [activeStat, selectedStatItemId]);

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

  const trendCards = useMemo(() => {
    return summaryCards
      .filter(({ latest }) => latest)
      .sort((a, b) => b.latest!.tanggal.localeCompare(a.latest!.tanggal));
  }, [summaryCards]);

  useEffect(() => {
    if (trendCards.length === 0) {
      if (selectedTrendKomoditasIds.length !== 0) {
        setSelectedTrendKomoditasIds([]);
      }
      return;
    }

    setSelectedTrendKomoditasIds((prev) => {
      const validPrev = prev.filter((id) =>
        trendCards.some((card) => card.komoditas.id === id),
      );
      if (validPrev.length > 0) return validPrev.slice(0, 4);
      return trendCards.slice(0, 3).map((card) => card.komoditas.id);
    });
  }, [trendCards]);

  const selectedTrendCards = useMemo(() => {
    const ids =
      selectedTrendKomoditasIds.length > 0
        ? selectedTrendKomoditasIds
        : trendCards.slice(0, 3).map((card) => card.komoditas.id);

    return ids
      .map((id) => trendCards.find((card) => card.komoditas.id === id))
      .filter((card): card is NonNullable<typeof card> => card !== undefined)
      .slice(0, 4);
  }, [selectedTrendKomoditasIds, trendCards]);

  const selectedTrendSeries = useMemo(() => {
    return selectedTrendCards.map((card) => {
      const series = hargaPelaporan
        .filter((item) => item.komoditas_id === card.komoditas.id)
        .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
        .map((item) => ({ tanggal: item.tanggal, harga: item.harga_rata_rata }))
        .slice(-8);

      return {
        id: card.komoditas.id,
        nama: card.komoditas.nama,
        satuan: card.komoditas.satuan_dasar,
        series,
      };
    });
  }, [hargaPelaporan, selectedTrendCards]);

  const trendChartDates = useMemo(() => {
    const dates = new Set<string>();
    selectedTrendSeries.forEach((item) => {
      item.series.forEach((point) => dates.add(point.tanggal));
    });
    return Array.from(dates).sort();
  }, [selectedTrendSeries]);

  const trendPalette = [
    "hsl(var(--primary))",
    "hsl(var(--accent))",
    "hsl(var(--success))",
    "hsl(var(--info))",
  ];

  const trendChartStats = useMemo(() => {
    const allPrices = selectedTrendSeries.flatMap((item) =>
      item.series.map((point) => point.harga),
    );
    if (allPrices.length === 0) return null;

    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const spread = max - min;

    return {
      min,
      max,
      spread,
    };
  }, [selectedTrendSeries]);

  const trendChartConfig = useMemo(() => {
    return selectedTrendSeries.reduce<Record<string, { label: string }>>(
      (acc, item) => {
        acc[item.id] = { label: item.nama };
        return acc;
      },
      {},
    );
  }, [selectedTrendSeries]);

  const trendChartData = useMemo(() => {
    return trendChartDates.map((tanggal) => {
      const row: Record<string, number | string> = { tanggal };
      selectedTrendSeries.forEach((item) => {
        const point = item.series.find(
          (seriesPoint) => seriesPoint.tanggal === tanggal,
        );
        if (point) row[item.id] = point.harga;
      });
      return row;
    });
  }, [trendChartDates, selectedTrendSeries]);

  const toggleTrendKomoditas = (id: string) => {
    setSelectedTrendKomoditasIds((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 4) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

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
    return overallCards.find(
      (card) => card.komoditas.id === selectedStatItemId,
    );
  }, [activeStat, selectedStatItemId, overallCards]);

  const komoditasDetailMap = useMemo(() => {
    return overallCards.reduce<Record<string, (typeof overallCards)[number]>>(
      (acc, card) => {
        acc[card.komoditas.id] = card;
        return acc;
      },
      {},
    );
  }, [overallCards]);

  const selectedPasarCards = useMemo(() => {
    if (activeStat !== "pasar" || !selectedStatItemId) return [];

    return komoditas
      .map((kom) => {
        const latest = latestByKey[`${selectedStatItemId}-${kom.id}`];
        if (!latest) return null;

        return {
          key: `${selectedStatItemId}-${kom.id}`,
          komoditasId: kom.id,
          title: kom.nama,
          unit: kom.satuan_dasar,
          image: kom.gambar,
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
          komoditasId: item.komoditas_id,
          title: kom.nama,
          unit: kom.satuan_dasar,
          image: kom.gambar,
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

    return komoditas
      .filter((k) => k.nama.toLowerCase().includes(normalized))
      .map((k) => {
        const latest = latestByKomoditas[k.id];
        return {
          key: `kom-${k.id}`,
          title: k.nama,
          subtitle: latest ? `Update ${latest.tanggal}` : "Belum ada data",
          price: latest?.harga_rata_rata,
          unit: k.satuan_dasar,
        };
      })
      .slice(0, 8);
  }, [query, komoditas, latestByKomoditas]);

  const heroSlides = [
    {
      title: "Harga Komoditas",
      subtitle: "Pantau pergerakan harga harian dengan cepat",
      image: "/images/komoditas.png",
    },
    {
      title: "Pasar Aktif",
      subtitle: "Data pasar terhubung langsung dengan petugas",
      image: "/images/pasar.png",
    },
    {
      title: "Tempat Usaha",
      subtitle: "Harga pedagang terkelola dan terverifikasi",
      image: "/images/tempat-usaha.png",
    },
  ];

  const mapCenter = useMemo(() => {
    const first = pasar.find((p) => p.is_active && p.latitude && p.longitude);
    if (first) return [first.latitude, first.longitude] as [number, number];
    return [-6.9147, 107.5731] as [number, number];
  }, [pasar]);

  const activePasarWithCoords = useMemo(() => {
    return pasar
      .filter((p) => p.is_active && p.latitude && p.longitude)
      .slice()
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [pasar]);

  const pasarStackCards = useMemo(() => {
    return activePasarWithCoords.map((p) => {
      const tus = tempatUsaha.filter((t) => t.pasar_id === p.id && t.is_active);
      const tuIds = new Set(tus.map((t) => t.id));
      const activeKomoditasIds = new Set(
        komoditasDijual
          .filter((kd) => kd.is_active && tuIds.has(kd.tempat_usaha_id))
          .map((kd) => kd.komoditas_id),
      );

      return {
        ...p,
        totalTempatUsaha: tus.length,
        totalKomoditas: activeKomoditasIds.size,
      };
    });
  }, [activePasarWithCoords, tempatUsaha, komoditasDijual]);

  const selectedMapPasar = useMemo(() => {
    if (!selectedMapPasarId) return null;
    return (
      activePasarWithCoords.find((p) => p.id === selectedMapPasarId) ?? null
    );
  }, [selectedMapPasarId, activePasarWithCoords]);

  const selectedMapPasarDetails = useMemo(() => {
    if (!selectedMapPasar) return [];

    const tus = tempatUsaha
      .filter((t) => t.pasar_id === selectedMapPasar.id && t.is_active)
      .slice()
      .sort((a, b) => a.nama.localeCompare(b.nama));

    return tus.map((tu) => {
      const items = komoditasDijual
        .filter((kd) => kd.tempat_usaha_id === tu.id && kd.is_active)
        .map((kd) => {
          const kom = komoditas.find((k) => k.id === kd.komoditas_id);
          const latest =
            latestByKey[`${selectedMapPasar.id}-${kd.komoditas_id}`];

          return {
            id: kd.id,
            komoditasId: kd.komoditas_id,
            nama: kom?.nama ?? "Komoditas",
            satuan: kom?.satuan_dasar ?? "-",
            harga: latest?.harga_rata_rata,
          };
        })
        .sort((a, b) => a.nama.localeCompare(b.nama));

      return {
        ...tu,
        komoditas: items,
      };
    });
  }, [selectedMapPasar, tempatUsaha, komoditasDijual, komoditas, latestByKey]);

  return (
    <div className="min-h-screen bg-background text-foreground animate-fade-in">
      <PublicNavbar />

      <section
        className="hero-sheen focus-section focus-hero animate-fade-up"
        style={{ animationDelay: "40ms" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-start">
          <div className="space-y-6">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 text-primary text-xs uppercase tracking-[0.3em] animate-fade-up"
              style={{ animationDelay: "120ms" }}
            >
              Sistem Informasi Harga Pangan
            </div>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-display font-semibold leading-[1.03] tracking-[-0.02em] animate-fade-up"
              style={{ animationDelay: "190ms" }}
            >
              Harga pangan yang jelas, cepat, dan selalu terkini.
            </h1>
            <p
              className="section-lead text-base sm:text-sm animate-fade-up"
              style={{ animationDelay: "250ms" }}
            >
              Cari nama komoditas untuk melihat harga rata-rata terbaru.
              Semua data dirangkum agar mudah dipahami.
            </p>
            <div
              className="relative animate-fade-up"
              style={{ animationDelay: "320ms" }}
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/70" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama komoditas"
                className="pl-10 h-11 bg-background"
              />
            </div>
            {query.trim() && (
              <div
                className="grid gap-3 sm:grid-cols-2 animate-fade-up"
                style={{ animationDelay: "380ms" }}
              >
                {searchResults.length > 0 ? (
                  searchResults.map((row, index) => (
                    <Card
                      key={row.key}
                      className="group hover:shadow-lg interactive-smooth hover:-translate-y-0.5 hover-tilt animate-fade-up cursor-pointer"
                      style={getStaggerStyle(index, 420)}
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
          </div>

          <Card
            className="glass-frame overflow-hidden animate-float lg:sticky lg:top-24 self-start animate-fade-up"
            style={{ animationDelay: "220ms" }}
          >
            <CardContent className="p-0">
              <Carousel opts={{ loop: true }} setApi={setHeroApi}>
                <CarouselContent>
                  {heroSlides.map((slide) => (
                    <CarouselItem key={slide.title}>
                      <div className="relative h-full sm:h-80 overflow-hidden">
                        <img
                          src={slide.image}
                          alt={slide.title}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 sm:h-44 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
                        <div className="absolute inset-0 p-6 flex flex-col justify-between text-white">
                          <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center">
                            <MapPin className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-white/80">
                              Highlight
                            </p>
                            <h3 className="text-2xl font-display font-semibold">
                              {slide.title}
                            </h3>
                            <p className="text-sm text-white/90 mt-2">
                              {slide.subtitle}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </CardContent>
          </Card>
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.map((s, index) => (
              <Card
                key={s.key}
                onClick={() => toggleStatPanel(s.key)}
                className={
                  activeStat === s.key
                    ? "cursor-pointer border-primary/40 shadow-lg -translate-y-1 interactive-smooth hover-tilt animate-fade-up bg-accent/5"
                    : "cursor-pointer hover:shadow-lg interactive-smooth hover:-translate-y-0.5 hover-tilt animate-fade-up"
                }
                style={getStaggerStyle(index, 160)}
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
                    <p className="text-xs text-muted-foreground mt-1">
                      {s.helper}
                    </p>
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
            <Card
              className="mt-4 border-primary/20 panel-smooth animate-fade-up"
              style={{ animationDelay: "120ms" }}
            >
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
                      activeStatList.map((item, index) => (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setSelectedStatItemId(item.id)}
                          className={`text-left rounded-lg border p-3 interactive-smooth hover-tilt animate-fade-up ${
                            selectedStatItemId === item.id
                              ? "border-primary/60 bg-accent/20 shadow-md scale-[1.02]"
                              : "border-border hover:border-primary/40 hover:bg-accent/30"
                          }`}
                          style={getStaggerStyle(index, 120)}
                        >
                          <p className="font-medium leading-tight">
                            {item.title}
                          </p>
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

                {selectedStatItemId &&
                  activeStat === "komoditas" &&
                  selectedKomoditasCard && (
                    <div className="grid grid-cols-1 gap-4">
                      <Card
                        className="h-full hover:shadow-lg interactive-smooth hover:-translate-y-0.5 hover-tilt animate-fade-up card-enter"
                        style={{ animationDelay: "120ms" }}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-stretch gap-4">
                            <div className="flex-1 space-y-2">
                              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                {selectedKomoditasCard.komoditas.satuan_dasar}
                              </p>
                              <h3 className="text-lg font-semibold">
                                {selectedKomoditasCard.komoditas.nama}
                              </h3>
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
                                Rentang:{" "}
                                {selectedKomoditasCard.minPrice > 0
                                  ? `Rp ${selectedKomoditasCard.minPrice.toLocaleString("id-ID")}`
                                  : "-"}{" "}
                                -{" "}
                                {selectedKomoditasCard.maxPrice > 0
                                  ? `Rp ${selectedKomoditasCard.maxPrice.toLocaleString("id-ID")}`
                                  : "-"}
                              </p>
                            </div>
                            <div className="w-24 sm:w-28 shrink-0 rounded-xl overflow-hidden border bg-muted/30">
                              {selectedKomoditasCard.komoditas.gambar ? (
                                <img
                                  src={selectedKomoditasCard.komoditas.gambar}
                                  alt={selectedKomoditasCard.komoditas.nama}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="h-full min-h-24 flex items-center justify-center text-muted-foreground">
                                  <Package className="h-8 w-8" />
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                {selectedStatItemId && activeStat === "pasar" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedPasarCards.length > 0 ? (
                      selectedPasarCards.map((card, index) => {
                        const isSelected =
                          selectedKomoditasDetailId === card.komoditasId;
                        const detail = komoditasDetailMap[card.komoditasId];

                        return (
                          <Card
                            key={card.key}
                            onClick={() =>
                              setSelectedKomoditasDetailId((prev) =>
                                prev === card.komoditasId
                                  ? null
                                  : card.komoditasId,
                              )
                            }
                            className={`h-full cursor-pointer hover:shadow-lg interactive-smooth hover:-translate-y-0.5 hover-tilt animate-fade-up card-enter ${
                              isSelected ? "border-primary/50 bg-accent/10" : ""
                            }`}
                            style={getStaggerStyle(index, 120)}
                          >
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                    {card.unit}
                                  </p>
                                  <h3 className="font-semibold truncate">
                                    {card.title}
                                  </h3>
                                  <p className="text-primary font-semibold">
                                    Rp {card.price.toLocaleString("id-ID")}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Update {formatTanggal(card.date)}
                                  </p>
                                </div>
                                <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border bg-muted/30">
                                  {card.image ? (
                                    <img
                                      src={card.image}
                                      alt={card.title}
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                      <Package className="h-5 w-5" />
                                    </div>
                                  )}
                                </div>
                              </div>
                              {isSelected && detail && (
                                <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                                  <p>
                                    Rata-rata keseluruhan: Rp{" "}
                                    {detail.avgPrice.toLocaleString("id-ID")}
                                  </p>
                                  <p>
                                    Rentang harga: Rp{" "}
                                    {detail.minPrice.toLocaleString("id-ID")} -
                                    Rp {detail.maxPrice.toLocaleString("id-ID")}
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })
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
                      selectedTempatUsahaCards.map((card, index) => {
                        const isSelected =
                          selectedKomoditasDetailId === card.komoditasId;
                        const detail = komoditasDetailMap[card.komoditasId];

                        return (
                          <Card
                            key={card.key}
                            onClick={() =>
                              setSelectedKomoditasDetailId((prev) =>
                                prev === card.komoditasId
                                  ? null
                                  : card.komoditasId,
                              )
                            }
                            className={`h-full cursor-pointer hover:shadow-lg interactive-smooth hover:-translate-y-0.5 hover-tilt animate-fade-up card-enter ${
                              isSelected ? "border-primary/50 bg-accent/10" : ""
                            }`}
                            style={getStaggerStyle(index, 120)}
                          >
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                    {card.unit}
                                  </p>
                                  <h3 className="font-semibold truncate">
                                    {card.title}
                                  </h3>
                                  <p className="text-primary font-semibold">
                                    {card.price
                                      ? `Rp ${card.price.toLocaleString("id-ID")}`
                                      : "Belum ada harga"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {card.date
                                      ? `Update ${formatTanggal(card.date)}`
                                      : "Belum ada pembaruan"}
                                  </p>
                                </div>
                                <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border bg-muted/30">
                                  {card.image ? (
                                    <img
                                      src={card.image}
                                      alt={card.title}
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                      <Package className="h-5 w-5" />
                                    </div>
                                  )}
                                </div>
                              </div>
                              {isSelected && detail && (
                                <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                                  <p>
                                    Rata-rata keseluruhan: Rp{" "}
                                    {detail.avgPrice.toLocaleString("id-ID")}
                                  </p>
                                  <p>
                                    Rentang harga: Rp{" "}
                                    {detail.minPrice.toLocaleString("id-ID")} -
                                    Rp {detail.maxPrice.toLocaleString("id-ID")}
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })
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
        </div>
      </section>

      {/* visualisasi harga terkini */}
      {/* <section
        className="focus-section focus-summary focus-light animate-fade-up"
        style={{ animationDelay: "160ms" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="section-kicker">Ringkasan</p>
              <h2 className="section-title text-3xl sm:text-4xl">
                Visualisasi Harga Terkini
              </h2>
              <p className="section-lead text-sm mt-2">
                Snapshot perubahan pada tanggal data terbaru{" "}
                {latestSnapshotDate ? formatTanggal(latestSnapshotDate) : "-"}.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {latestSnapshotCards
              .slice(0, 6)
              .map(({ komoditas: k, latest, trend, pct, diff }, index) => (
                <Card
                  key={k.id}
                  onClick={() => navigate(`/public/komoditas/${k.id}`)}
                  className="focus-soft-card hover:shadow-lg interactive-smooth hover:-translate-y-0.5 hover-tilt animate-fade-up"
                  style={getStaggerStyle(index, 180)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          {k.satuan_dasar}
                        </p>
                        <h3 className="font-semibold leading-tight truncate">
                          {k.nama}
                        </h3>
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
                      </div>
                      <div className="w-20 h-20 rounded-lg overflow-hidden border bg-muted/30 shrink-0">
                        <img
                          src={k.gambar || "/images/komoditas.png"}
                          alt={k.nama}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      </section> */}

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Komoditas
            </p>
            <h2 className="text-2xl sm:text-3xl font-display font-semibold">
              Tren Harga Komoditas
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              Klik chip komoditas untuk menampilkan atau menyembunyikan garis.
              Hover pada titik untuk melihat nilai harga per tanggal.
            </p>
          </div>
          <Link
            to="/public/komoditas"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
          >
            Buka dashboard komoditas <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <Card className="relative overflow-hidden border border-white/60 bg-white/70 shadow-[0_24px_70px_-48px_hsl(var(--foreground)/0.35)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/35">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,hsl(var(--primary)/0.08),transparent_34%),radial-gradient(circle_at_90%_15%,hsl(var(--accent)/0.1),transparent_32%)]" />
          <CardContent className="space-y-5 p-4 sm:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-[260px] flex flex-col gap-2">
                <Popover
                  open={isTrendSelectorOpen}
                  onOpenChange={setIsTrendSelectorOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isTrendSelectorOpen}
                      className="w-full justify-between border-border/70 bg-background/80 text-left font-normal hover:bg-background"
                    >
                      <span className="truncate">
                        {selectedTrendCards.length === 0
                          ? "Pilih komoditas"
                          : selectedTrendCards.length === 1
                            ? selectedTrendCards[0].komoditas.nama
                            : `${selectedTrendCards.length} komoditas dipilih`}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-[300px] p-0 sm:w-[360px]"
                  >
                    <Command>
                      <CommandInput placeholder="Cari komoditas untuk grafik..." />
                      <CommandList>
                        <CommandEmpty>Komoditas tidak ditemukan.</CommandEmpty>
                        <CommandGroup>
                          {trendCards.map((card, index) => {
                            const isSelected =
                              selectedTrendKomoditasIds.includes(
                                card.komoditas.id,
                              );
                            const latestPrice = card.latest?.harga_rata_rata;
                            return (
                              <CommandItem
                                key={card.komoditas.id}
                                value={`${card.komoditas.nama}-${card.komoditas.id}`}
                                onSelect={() =>
                                  toggleTrendKomoditas(card.komoditas.id)
                                }
                                className="flex items-center justify-between gap-3"
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{
                                      backgroundColor:
                                        trendPalette[
                                          index % trendPalette.length
                                        ],
                                    }}
                                  />
                                  <span className="truncate text-sm">
                                    {card.komoditas.nama}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {latestPrice ? (
                                    <span className="text-[11px] text-muted-foreground">
                                      {latestPrice.toLocaleString("id-ID")}
                                    </span>
                                  ) : null}
                                  <Check
                                    className={`h-4 w-4 ${
                                      isSelected ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {selectedTrendCards.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTrendCards.map((card, index) => (
                      <button
                        key={`selected-${card.komoditas.id}`}
                        type="button"
                        onClick={() => toggleTrendKomoditas(card.komoditas.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-background"
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor:
                              trendPalette[index % trendPalette.length],
                          }}
                        />
                        <span className="max-w-[120px] truncate">
                          {card.komoditas.nama}
                        </span>
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border bg-background px-3 py-1">
                  {selectedTrendCards.length} dipilih
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() =>
                    setSelectedTrendKomoditasIds(
                      trendCards.slice(0, 3).map((card) => card.komoditas.id),
                    )
                  }
                >
                  Reset
                </Button>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-border/60 bg-background/50 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Ringkasan Tren
                  </p>
                  <h3 className="mt-1 text-lg sm:text-xl font-semibold">
                    {selectedTrendCards.length > 0
                      ? "Harga komoditas terpilih"
                      : "Pilih komoditas untuk mulai"}
                  </h3>
                </div>

                {trendChartStats && (
                  <div className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs text-muted-foreground">
                    Rentang Rp {trendChartStats.spread.toLocaleString("id-ID")}
                  </div>
                )}
              </div>

              <div className="h-[250px] overflow-hidden rounded-2xl border border-border/70 bg-background sm:h-[300px] lg:h-[340px]">
                {trendChartData.length > 0 && selectedTrendSeries.length > 0 ? (
                  <ChartContainer
                    config={trendChartConfig}
                    className="h-full w-full p-2 sm:p-3"
                  >
                    <LineChart
                      data={trendChartData}
                      margin={{ top: 8, right: 12, left: 12, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="4 4" vertical={false} />
                      <XAxis
                        dataKey="tanggal"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={24}
                        tickFormatter={(value) => String(value).slice(5)}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={62}
                        tickFormatter={(value) =>
                          Number(value).toLocaleString("id-ID")
                        }
                      />
                      <ChartTooltip
                        cursor={{
                          stroke: "hsl(var(--border))",
                          strokeDasharray: "3 3",
                        }}
                        content={({ active, payload, label }) => {
                          if (!active || !payload || payload.length === 0)
                            return null;
                          return (
                            <div className="rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur-sm">
                              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                                {label ? formatTanggal(String(label)) : "-"}
                              </p>
                              <div className="space-y-1.5">
                                {payload.map((entry, index) => (
                                  <div
                                    key={`item-${index}`}
                                    className="flex items-center justify-between gap-3"
                                  >
                                    <div className="flex min-w-0 items-center gap-2">
                                      <span
                                        className="h-2 w-2 rounded-full shrink-0"
                                        style={{
                                          backgroundColor: entry.color,
                                        }}
                                      />
                                      <span className="truncate text-xs font-medium text-foreground">
                                        {entry.name ??
                                          trendChartConfig[
                                            String(entry.dataKey)
                                          ]?.label ??
                                          String(entry.dataKey)}
                                      </span>
                                    </div>
                                    <span className="whitespace-nowrap text-xs font-bold text-foreground">
                                      Rp{" "}
                                      {Number(entry.value).toLocaleString(
                                        "id-ID",
                                      )}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }}
                      />
                      {selectedTrendSeries.map((item, index) => (
                        <Line
                          key={item.id}
                          type="monotone"
                          dataKey={item.id}
                          name={item.nama}
                          stroke={trendPalette[index % trendPalette.length]}
                          strokeWidth={2.2}
                          dot={{ r: 4, strokeWidth: 2, fill: "#ffffff" }}
                          activeDot={{ r: 6, strokeWidth: 2 }}
                          connectNulls
                          isAnimationActive={false}
                        />
                      ))}
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
                    Pilih komoditas untuk melihat grafik.
                  </div>
                )}
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                {selectedTrendSeries.map((seriesItem, seriesIndex) => {
                  const latestPoint =
                    seriesItem.series[seriesItem.series.length - 1];
                  const firstPoint = seriesItem.series[0];
                  const delta =
                    latestPoint && firstPoint
                      ? latestPoint.harga - firstPoint.harga
                      : 0;
                  const deltaPct = firstPoint?.harga
                    ? (delta / firstPoint.harga) * 100
                    : 0;
                  const color = trendPalette[seriesIndex % trendPalette.length];
                  const isTrendingUp = delta > 0;
                  const isTrendingDown = delta < 0;

                  return (
                    <div
                      key={`legend-${seriesItem.id}`}
                      className="rounded-xl border border-border/70 bg-background px-3 py-2.5"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="truncate text-sm font-medium text-foreground">
                            {seriesItem.nama}
                          </span>
                        </div>

                        {isTrendingUp ? (
                          <TrendingUp className="h-3.5 w-3.5 text-danger" />
                        ) : isTrendingDown ? (
                          <TrendingDown className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Minus className="h-3.5 w-3.5 text-warning" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Harga terakhir
                      </div>
                      <p className="text-sm font-bold text-primary">
                        {latestPoint
                          ? `Rp ${latestPoint.harga.toLocaleString("id-ID")}`
                          : "-"}
                      </p>
                      {latestPoint && firstPoint && (
                        <div
                          className={`mt-1 text-xs font-semibold ${
                            isTrendingUp
                              ? "text-danger"
                              : isTrendingDown
                                ? "text-success"
                                : "text-warning"
                          }`}
                        >
                          {isTrendingUp || isTrendingDown
                            ? `${isTrendingUp ? "+" : ""}${deltaPct.toFixed(1)}%`
                            : "0%"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section
        className="focus-section focus-commodities focus-light animate-fade-up"
        style={{ animationDelay: "200ms" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
            <div>
              <p className="section-kicker">Komoditas</p>
              <h2 className="section-title text-3xl sm:text-4xl">
                Harga Komoditas Keseluruhan
              </h2>
              <p className="section-lead text-sm mt-2">
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
                      <Card
                        onClick={() => navigate(`/public/komoditas/${k.id}`)}
                        className="h-full focus-soft-card hover:shadow-lg interactive-smooth hover:-translate-y-0.5 hover-tilt animate-fade-up"
                        style={getStaggerStyle(0, 200)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0 space-y-2">
                              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                {k.satuan_dasar}
                              </p>
                              <h3 className="font-semibold leading-tight truncate">
                                {k.nama}
                              </h3>
                              <p className="text-xl font-semibold text-primary">
                                {avgPrice > 0
                                  ? `Rp ${avgPrice.toLocaleString("id-ID")}`
                                  : "Belum ada data"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {latest
                                  ? `Data terakhir ${formatTanggal(latest.tanggal)}`
                                  : "Belum ada data"}
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
                            </div>
                            <div className="w-20 h-20 rounded-lg overflow-hidden border bg-muted/30 shrink-0">
                              <img
                                src={k.gambar || "/images/komoditas.png"}
                                alt={k.nama}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  );
                },
              )}
            </CarouselContent>
          </Carousel>
        </div>
      </section>

      <section
        className="focus-section focus-map animate-fade-up"
        style={{ animationDelay: "240ms" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
            <div>
              <p className="section-kicker">Peta Pasar</p>
              <h2 className="section-title text-3xl sm:text-4xl">
                Lokasi Pasar & Tempat Usaha
              </h2>
            </div>
            <div className="text-xs text-muted-foreground">
              Klik marker untuk detail pasar
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_0.9fr] gap-5 items-start">
            <div
              className="rounded-2xl border border-border overflow-hidden animate-fade-up"
              style={{ animationDelay: "260ms" }}
            >
              <MapContainer
                center={mapCenter}
                zoom={12}
                scrollWheelZoom={false}
                className="h-[440px] w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {activePasarWithCoords.map((p) => (
                  <Marker
                    key={p.id}
                    position={[p.latitude, p.longitude]}
                    icon={marketMarkerIcon}
                    eventHandlers={{
                      click: () => setSelectedMapPasarId(p.id),
                    }}
                  >
                    <Popup>
                      <div className="space-y-1">
                        <p className="font-semibold">{p.nama}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.alamat}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            <div className="space-y-3 max-h-full pr-1">
              {!selectedMapPasar &&
                pasarStackCards.map((p, index) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedMapPasarId(p.id)}
                    className="w-full text-left rounded-2xl border bg-card p-4 shadow-sm interactive-smooth hover:shadow-md hover-tilt animate-fade-up hover:border-primary/40"
                    style={getStaggerStyle(index, 280)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{p.nama}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {p.alamat}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {p.totalTempatUsaha} tempat usaha • {p.totalKomoditas}{" "}
                          komoditas
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                        <MapPin className="h-5 w-5" />
                      </div>
                    </div>
                  </button>
                ))}

              {selectedMapPasar && (
                <Card
                  className="border-primary/30 panel-smooth animate-fade-up"
                  style={{ animationDelay: "280ms" }}
                >
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Pasar Terpilih
                        </p>
                        <h3 className="font-semibold text-lg">
                          {selectedMapPasar.nama}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {selectedMapPasar.alamat}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedMapPasarId(null)}
                      >
                        Kembali
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {selectedMapPasarDetails.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Belum ada tempat usaha aktif.
                        </p>
                      )}

                      {selectedMapPasarDetails.map((tu, index) => (
                        <div
                          key={tu.id}
                          className="rounded-xl border p-3 space-y-2 interactive-smooth hover:border-primary/40 hover:shadow-sm animate-fade-up card-enter"
                          style={getStaggerStyle(index, 320)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium">{tu.nama}</p>
                            <Link
                              to={`/public/tempat-usaha/${tu.id}`}
                              className="text-xs text-primary inline-flex items-center gap-1"
                            >
                              Detail <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>

                          {tu.komoditas.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {tu.komoditas.map((item) => (
                                <span
                                  key={item.id}
                                  className="inline-flex items-center rounded-full border px-2 py-1 text-[11px]"
                                >
                                  {item.nama} ({item.satuan})
                                  {item.harga
                                    ? ` • Rp ${item.harga.toLocaleString("id-ID")}`
                                    : ""}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Belum ada komoditas aktif.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer
        className="border-t py-8 text-center text-xs text-muted-foreground animate-fade-up"
        style={{ animationDelay: "280ms" }}
      >
        (c) {new Date().getFullYear()} Sistem Informasi Harga Pangan
      </footer>
    </div>
  );
}
