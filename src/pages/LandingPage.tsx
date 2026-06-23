import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import { useData } from "@/contexts/DataContext";
import type { Komoditas } from "@/types";
import {
  fetchAllPublicKomoditas,
  fetchAllPublicTempatUsaha,
  fetchPublicKomoditasList,
  fetchPublicKomoditasTrend,
  fetchPublicPasarList,
  fetchPublicTempatUsahaDetail,
  type PublicKomoditasListItem,
  type PublicPasarListItem,
} from "@/lib/public-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PredictionPriceSection from "@/components/landing/PredictionPriceSection";
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

type KomoditasStatCard = {
  komoditas: Komoditas;
  latest: { tanggal: string; harga_rata_rata: number } | null;
};

type PasarStatCard = {
  id: string;
  nama: string;
  alamat: string;
  totalKomoditas: number;
};

type PasarKomoditasCard = {
  komoditasId: string;
  nama: string;
  satuan: string;
  gambar: string;
  harga: number;
  tanggal: string;
};

type TempatUsahaStatCard = {
  id: string;
  nama: string;
  pasar: string;
};

type TuKomoditasCard = {
  komoditasId: string;
  nama: string;
  satuan: string;
  gambar: string;
  harga?: number;
  tanggal?: string;
};

type TrendCardView = {
  komoditas: {
    id: string;
    nama: string;
    satuan_dasar: string;
  };
  latest?: {
    harga_rata_rata: number;
    tanggal: string;
  };
};

function toKomoditasStatCard(
  item: PublicKomoditasListItem,
): KomoditasStatCard | null {
  if (item.harga_pelaporan_terbaru == null) return null;
  return {
    komoditas: {
      id: item.id,
      nama: item.nama,
      satuan_dasar: item.satuan_dasar as Komoditas["satuan_dasar"],
      gambar: item.gambar ?? "",
    },
    latest: {
      tanggal: item.tanggal_pelaporan_terbaru ?? "",
      harga_rata_rata: item.harga_pelaporan_terbaru,
    },
  };
}

function hasValidMapCoords(pasar: PublicPasarListItem): boolean {
  return Math.abs(pasar.latitude) > 0.0001 && Math.abs(pasar.longitude) > 0.0001;
}

function MapFlyTo({
  target,
  zoom = 15,
}: {
  target: [number, number] | null;
  zoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    map.flyTo(target, zoom, { duration: 0.75 });
  }, [target, zoom, map]);

  return null;
}

function toPasarKomoditasCard(
  item: PublicKomoditasListItem,
): PasarKomoditasCard | null {
  if (item.harga_pelaporan_terbaru == null) return null;
  return {
    komoditasId: item.id,
    nama: item.nama,
    satuan: item.satuan_dasar,
    gambar: item.gambar ?? "",
    harga: item.harga_pelaporan_terbaru,
    tanggal: item.tanggal_pelaporan_terbaru ?? "",
  };
}

export default function LandingPage() {
  const { pasar, komoditas, tempatUsaha, komoditasDijual, hargaPelaporan } =
    useData();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [heroApi, setHeroApi] = useState<CarouselApi | null>(null);
  const [activeStat, setActiveStat] = useState<StatsKey | null>(null);
  const [selectedMapPasarId, setSelectedMapPasarId] = useState<string | null>(
    null,
  );

  // New state untuk drill-down pasar/tempat usaha di stat panel
  const [selectedPasarForDetail, setSelectedPasarForDetail] = useState<
    string | null
  >(null);
  const [selectedTempatUsahaForDetail, setSelectedTempatUsahaForDetail] =
    useState<string | null>(null);
  const [isMapSectionVisible, setIsMapSectionVisible] = useState(false);
  const [isTrendSelectorOpen, setIsTrendSelectorOpen] = useState(false);
  const [selectedTrendKomoditasIds, setSelectedTrendKomoditasIds] = useState<
    string[]
  >([]);
  const mapSectionRef = useRef<HTMLElement | null>(null);
  const [searchResults, setSearchResults] = useState<SearchRow[]>([]);

  const [statsLoading, setStatsLoading] = useState(true);
  const [panelLoading, setPanelLoading] = useState(false);
  const [statCounts, setStatCounts] = useState({
    komoditas: 0,
    pasar: 0,
    tempatUsaha: 0,
  });
  const [komoditasStatCards, setKomoditasStatCards] = useState<
    KomoditasStatCard[]
  >([]);
  const [pasarStatCards, setPasarStatCards] = useState<PasarStatCard[]>([]);
  const [pasarKomoditasCards, setPasarKomoditasCards] = useState<
    PasarKomoditasCard[]
  >([]);
  const [tempatUsahaStatCards, setTempatUsahaStatCards] = useState<
    TempatUsahaStatCard[]
  >([]);
  const [tuKomoditasCards, setTuKomoditasCards] = useState<TuKomoditasCard[]>(
    [],
  );
  const [trendOptions, setTrendOptions] = useState<PublicKomoditasListItem[]>(
    [],
  );
  const [trendOptionsLoading, setTrendOptionsLoading] = useState(true);
  const [trendSeriesMap, setTrendSeriesMap] = useState<
    Record<string, { tanggal: string; harga: number }[]>
  >({});
  const [trendDataLoading, setTrendDataLoading] = useState(false);
  const [mapPasarList, setMapPasarList] = useState<PublicPasarListItem[]>([]);
  const [mapPasarLoading, setMapPasarLoading] = useState(false);
  const [mapFlyTarget, setMapFlyTarget] = useState<[number, number] | null>(
    null,
  );

  useEffect(() => {
    if (!isMapSectionVisible) return;

    let cancelled = false;
    void (async () => {
      setMapPasarLoading(true);
      try {
        const { items } = await fetchPublicPasarList();
        if (cancelled) return;
        setMapPasarList(items.filter((item) => item.is_active === 1));
      } catch {
        if (!cancelled) setMapPasarList([]);
      } finally {
        if (!cancelled) setMapPasarLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isMapSectionVisible]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setTrendOptionsLoading(true);
      try {
        const { items } = await fetchAllPublicKomoditas();
        if (cancelled) return;
        const withPrice = items
          .filter((item) => item.harga_pelaporan_terbaru != null)
          .sort((a, b) =>
            (b.tanggal_pelaporan_terbaru ?? "").localeCompare(
              a.tanggal_pelaporan_terbaru ?? "",
            ),
          );
        setTrendOptions(withPrice);
      } catch {
        if (!cancelled) setTrendOptions([]);
      } finally {
        if (!cancelled) setTrendOptionsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (trendOptions.length === 0) {
      if (selectedTrendKomoditasIds.length !== 0) {
        setSelectedTrendKomoditasIds([]);
      }
      return;
    }

    setSelectedTrendKomoditasIds((prev) => {
      const validPrev = prev.filter((id) =>
        trendOptions.some((item) => item.id === id),
      );
      if (validPrev.length > 0) return validPrev.slice(0, 4);
      return trendOptions.slice(0, 3).map((item) => item.id);
    });
  }, [trendOptions]);

  useEffect(() => {
    if (selectedTrendKomoditasIds.length === 0) {
      setTrendSeriesMap({});
      return;
    }

    let cancelled = false;
    void (async () => {
      setTrendDataLoading(true);
      try {
        const results = await Promise.all(
          selectedTrendKomoditasIds.map(async (id) => {
            const points = await fetchPublicKomoditasTrend(id, { days: 30 });
            return {
              id,
              series: points.map((point) => ({
                tanggal: point.tanggal,
                harga: point.harga_rata_rata,
              })),
            };
          }),
        );
        if (cancelled) return;
        setTrendSeriesMap(
          results.reduce<Record<string, { tanggal: string; harga: number }[]>>(
            (acc, item) => {
              acc[item.id] = item.series;
              return acc;
            },
            {},
          ),
        );
      } catch {
        if (!cancelled) setTrendSeriesMap({});
      } finally {
        if (!cancelled) setTrendDataLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedTrendKomoditasIds]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setStatsLoading(true);
      try {
        const [komoditasResult, pasarResult, tempatUsahaResult] =
          await Promise.all([
            fetchPublicKomoditasList(),
            fetchPublicPasarList(),
            fetchAllPublicTempatUsaha(),
          ]);
        if (cancelled) return;
        setStatCounts({
          komoditas: komoditasResult.count,
          pasar: pasarResult.count,
          tempatUsaha: tempatUsahaResult.count,
        });
      } catch {
        if (!cancelled) {
          setStatCounts({ komoditas: 0, pasar: 0, tempatUsaha: 0 });
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeStat !== "komoditas") return;

    let cancelled = false;
    void (async () => {
      setPanelLoading(true);
      try {
        const { items } = await fetchAllPublicKomoditas();
        if (cancelled) return;
        setKomoditasStatCards(
          items
            .map(toKomoditasStatCard)
            .filter((item): item is KomoditasStatCard => item !== null),
        );
      } catch {
        if (!cancelled) setKomoditasStatCards([]);
      } finally {
        if (!cancelled) setPanelLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeStat]);

  useEffect(() => {
    if (activeStat !== "pasar" || selectedPasarForDetail) return;

    let cancelled = false;
    void (async () => {
      setPanelLoading(true);
      try {
        const { items } = await fetchPublicPasarList();
        if (!cancelled) {
          setPasarStatCards(
            items
              .filter((item) => item.is_active === 1)
              .map((item) => ({
                id: item.id,
                nama: item.nama,
                alamat: item.alamat,
                totalKomoditas: item.total_komoditas,
              })),
          );
        }
      } catch {
        if (!cancelled) setPasarStatCards([]);
      } finally {
        if (!cancelled) setPanelLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeStat, selectedPasarForDetail]);

  useEffect(() => {
    if (!selectedPasarForDetail) {
      setPasarKomoditasCards([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      setPanelLoading(true);
      try {
        const { items } = await fetchAllPublicKomoditas({
          id_pasar: selectedPasarForDetail,
        });
        if (cancelled) return;
        setPasarKomoditasCards(
          items
            .map(toPasarKomoditasCard)
            .filter((item): item is PasarKomoditasCard => item !== null),
        );
      } catch {
        if (!cancelled) setPasarKomoditasCards([]);
      } finally {
        if (!cancelled) setPanelLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedPasarForDetail]);

  useEffect(() => {
    if (activeStat !== "tempatUsaha" || selectedTempatUsahaForDetail) return;

    let cancelled = false;
    void (async () => {
      setPanelLoading(true);
      try {
        const { items } = await fetchAllPublicTempatUsaha();
        if (cancelled) return;
        setTempatUsahaStatCards(
          items.map((item) => ({
            id: item.id,
            nama: item.nama,
            pasar: item.pasar_nama,
          })),
        );
      } catch {
        if (!cancelled) setTempatUsahaStatCards([]);
      } finally {
        if (!cancelled) setPanelLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeStat, selectedTempatUsahaForDetail]);

  useEffect(() => {
    if (!selectedTempatUsahaForDetail) {
      setTuKomoditasCards([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      setPanelLoading(true);
      try {
        const detail = await fetchPublicTempatUsahaDetail(
          selectedTempatUsahaForDetail,
        );
        if (cancelled) return;
        setTuKomoditasCards(
          detail.komoditas.map((item) => ({
            komoditasId: item.id,
            nama: item.nama,
            satuan: item.satuan ?? "kg",
            gambar: item.gambar_url ?? "",
            harga: item.latest.harga_rata_rata ?? undefined,
            tanggal: item.latest.tanggal ?? undefined,
          })),
        );
      } catch {
        if (!cancelled) setTuKomoditasCards([]);
      } finally {
        if (!cancelled) setPanelLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedTempatUsahaForDetail]);

  useEffect(() => {
    const name = query.trim();
    if (!name) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const base =
        import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8080";
      try {
        const res = await fetch(
          `${base}/v1/public/komoditas?nama=${encodeURIComponent(name)}&limit=8`,
        );
        const body = await res.json();
        if (cancelled) return;
        const list = body.data ?? [];
        setSearchResults(
          list.map(
            (k: {
              id: string;
              nama: string;
              satuan_dasar?: string;
              harga_pelaporan_terbaru?: number;
            }) => ({
              key: k.id,
              title: k.nama,
              subtitle: "Komoditas",
              unit: k.satuan_dasar,
              price: k.harga_pelaporan_terbaru,
              link: `/public/komoditas/${k.id}`,
            }),
          ),
        );
      } catch {
        if (!cancelled) setSearchResults([]);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

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
  }, [query, activeStat, selectedMapPasarId]);

  useEffect(() => {
    const element = mapSectionRef.current;
    if (!element) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsMapSectionVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setIsMapSectionVisible(true);
        observer.disconnect();
      },
      {
        threshold: 0.15,
        rootMargin: "180px 0px",
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const stats = [
    {
      key: "komoditas" as const,
      label: "Komoditas",
      value: statCounts.komoditas,
      icon: Package,
      helper: "Lihat daftar komoditas terdaftar",
    },
    {
      key: "pasar" as const,
      label: "Pasar",
      value: statCounts.pasar,
      icon: Store,
      helper: "Lihat pasar aktif terdaftar",
    },
    {
      key: "tempatUsaha" as const,
      label: "Tempat Usaha",
      value: statCounts.tempatUsaha,
      icon: Building2,
      helper: "Lihat tempat usaha aktif",
    },
  ];

  const toggleStatPanel = (statKey: StatsKey) => {
    setSelectedPasarForDetail(null);
    setSelectedTempatUsahaForDetail(null);
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

  const trendCards = useMemo<TrendCardView[]>(() => {
    return trendOptions.map((item) => ({
      komoditas: {
        id: item.id,
        nama: item.nama,
        satuan_dasar: item.satuan_dasar,
      },
      latest:
        item.harga_pelaporan_terbaru != null
          ? {
              harga_rata_rata: item.harga_pelaporan_terbaru,
              tanggal: item.tanggal_pelaporan_terbaru ?? "",
            }
          : undefined,
    }));
  }, [trendOptions]);

  const selectedTrendCards = useMemo(() => {
    return selectedTrendKomoditasIds
      .map((id) => trendCards.find((card) => card.komoditas.id === id))
      .filter((card): card is TrendCardView => card !== undefined)
      .slice(0, 4);
  }, [selectedTrendKomoditasIds, trendCards]);

  const selectedTrendSeries = useMemo(() => {
    return selectedTrendCards.map((card) => ({
      id: card.komoditas.id,
      nama: card.komoditas.nama,
      satuan: card.komoditas.satuan_dasar,
      series: trendSeriesMap[card.komoditas.id] ?? [],
    }));
  }, [selectedTrendCards, trendSeriesMap]);

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

  // All pasar cards untuk stat panel (langsung tampil tanpa perlu memilih item dulu)
  const allPasarDetailCards = useMemo(() => {
    return pasar
      .filter((p) => p.is_active)
      .map((p) => {
        const komoditasInPasar = komoditas.filter((k) => {
          const hasPrice = hargaPelaporan.some(
            (h) => h.pasar_id === p.id && h.komoditas_id === k.id,
          );
          return hasPrice;
        });
        const totalKomoditas = komoditasInPasar.length;
        const avgPrice =
          totalKomoditas > 0
            ? Math.round(
                komoditasInPasar.reduce((sum, k) => {
                  const latest = latestByKey[`${p.id}-${k.id}`];
                  return sum + (latest?.harga_rata_rata ?? 0);
                }, 0) / totalKomoditas,
              )
            : 0;

        return {
          id: p.id,
          nama: p.nama,
          alamat: p.alamat,
          totalKomoditas,
          avgPrice,
        };
      });
  }, [pasar, komoditas, latestByKey, hargaPelaporan]);

  // All tempat usaha cards untuk stat panel
  const allTempatUsahaDetailCards = useMemo(() => {
    return tempatUsaha
      .filter((t) => t.is_active)
      .map((t) => {
        const activeKomoditas = komoditasDijual
          .filter((kd) => kd.tempat_usaha_id === t.id && kd.is_active)
          .map((kd) => kd.komoditas_id);
        const pasarItem = pasar.find((p) => p.id === t.pasar_id);

        const avgPrice =
          activeKomoditas.length > 0
            ? Math.round(
                activeKomoditas.reduce((sum, komId) => {
                  const latest = latestByKey[`${t.pasar_id}-${komId}`];
                  return sum + (latest?.harga_rata_rata ?? 0);
                }, 0) / activeKomoditas.length,
              )
            : 0;

        return {
          id: t.id,
          nama: t.nama,
          pasar: pasarItem?.nama ?? "-",
          totalKomoditas: activeKomoditas.length,
          avgPrice,
        };
      });
  }, [tempatUsaha, komoditasDijual, latestByKey, pasar]);

  // Komoditas cards per pasar (ditampilkan ketika pasar dipilih)
  const komoditasPerPasarCards = useMemo(() => {
    if (!selectedPasarForDetail) return [];

    return komoditas
      .map((kom) => {
        const latest = latestByKey[`${selectedPasarForDetail}-${kom.id}`];
        if (!latest) return null;

        return {
          komoditasId: kom.id,
          nama: kom.nama,
          satuan: kom.satuan_dasar,
          gambar: kom.gambar,
          harga: latest.harga_rata_rata,
          tanggal: latest.tanggal,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [selectedPasarForDetail, komoditas, latestByKey]);

  // Komoditas cards per tempat usaha (ditampilkan ketika tempat usaha dipilih)
  const komoditasPerTempatUsahaCards = useMemo(() => {
    if (!selectedTempatUsahaForDetail) return [];

    const selectedPlace = tempatUsaha.find(
      (item) => item.id === selectedTempatUsahaForDetail,
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
          komoditasId: item.komoditas_id,
          nama: kom.nama,
          satuan: kom.satuan_dasar,
          gambar: kom.gambar,
          harga: latest?.harga_rata_rata,
          tanggal: latest?.tanggal,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [selectedTempatUsahaForDetail, tempatUsaha, komoditasDijual, komoditas, latestByKey]);

  const selectedKomoditasCard = useMemo(() => {
    if (activeStat !== "komoditas") return null;
    // This is kept for future use if needed, but not actively used in rendering
    return null;
  }, [activeStat]);

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
    // Legacy useMemo - not actively used in new rendering
    return [];
  }, []);

  const selectedTempatUsahaCards = useMemo(() => {
    // Legacy useMemo - not actively used in new rendering
    return [];
  }, []);

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
    const first = mapPasarList.find((p) => hasValidMapCoords(p));
    if (first) return [first.latitude, first.longitude] as [number, number];
    return [-6.9147, 107.5731] as [number, number];
  }, [mapPasarList]);

  const activePasarWithCoords = useMemo(() => {
    return mapPasarList
      .filter((p) => hasValidMapCoords(p))
      .slice()
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [mapPasarList]);

  const pasarStackCards = useMemo(() => {
    return mapPasarList
      .slice()
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [mapPasarList]);

  const focusMapPasar = (pasar: PublicPasarListItem) => {
    setSelectedMapPasarId(pasar.id);
    if (hasValidMapCoords(pasar)) {
      setMapFlyTarget([pasar.latitude, pasar.longitude]);
    }
  };

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
              Cari nama komoditas untuk melihat harga rata-rata terbaru. Semua
              data dirangkum agar mudah dipahami.
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
                      {query.trim() ? "Memuat..." : "Tidak ada data untuk kata kunci tersebut."}
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
                  {heroSlides.map((slide, index) => (
                    <CarouselItem key={slide.title}>
                      <div className="relative h-full sm:h-80 overflow-hidden">
                        <img
                          src={slide.image}
                          alt={slide.title}
                          loading={index === 0 ? "eager" : "lazy"}
                          decoding="async"
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
                    <p className="text-2xl font-semibold">
                      {statsLoading ? "—" : s.value}
                    </p>
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
                      {panelLoading
                        ? "Memuat..."
                        : activeStat === "komoditas"
                          ? komoditasStatCards.length
                          : activeStat === "pasar"
                            ? selectedPasarForDetail
                              ? pasarKomoditasCards.length
                              : pasarStatCards.length
                            : selectedTempatUsahaForDetail
                              ? tuKomoditasCards.length
                              : tempatUsahaStatCards.length}{" "}
                      {!panelLoading && "item"}
                    </h3>
                  </div>
                  {(selectedPasarForDetail || selectedTempatUsahaForDetail) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPasarForDetail(null);
                        setSelectedTempatUsahaForDetail(null);
                      }}
                    >
                      Kembali ke daftar
                    </Button>
                  )}
                </div>

                {/* ===== KOMODITAS CARD ===== */}
                {activeStat === "komoditas" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {panelLoading ? (
                      <p className="text-sm text-muted-foreground">
                        Memuat data komoditas...
                      </p>
                    ) : komoditasStatCards.length > 0 ? (
                      komoditasStatCards.map((card, index) => (
                        <Card
                          key={card.komoditas.id}
                          onClick={() =>
                            navigate(`/public/komoditas/${card.komoditas.id}`)
                          }
                          className="h-full cursor-pointer hover:shadow-lg interactive-smooth hover:-translate-y-0.5 hover-tilt animate-fade-up card-enter"
                          style={getStaggerStyle(index, 120)}
                        >
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                  {card.komoditas.satuan_dasar}
                                </p>
                                <h3 className="font-semibold truncate">
                                  {card.komoditas.nama}
                                </h3>
                                <p className="text-primary font-semibold">
                                  Rp{" "}
                                  {card.latest!.harga_rata_rata.toLocaleString(
                                    "id-ID",
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Update {formatTanggal(card.latest!.tanggal)}
                                </p>
                              </div>
                              <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border bg-muted/30">
                                {card.komoditas.gambar ? (
                                  <img
                                    src={card.komoditas.gambar}
                                    alt={card.komoditas.nama}
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
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Belum ada data harga komoditas.
                      </p>
                    )}
                  </div>
                )}

                {/* ===== PASAR CARDS ===== */}
                {activeStat === "pasar" && !selectedPasarForDetail && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {panelLoading ? (
                      <p className="text-sm text-muted-foreground">
                        Memuat data pasar...
                      </p>
                    ) : pasarStatCards.length > 0 ? (
                      pasarStatCards.map((pasar, index) => (
                        <Card
                          key={pasar.id}
                          onClick={() => setSelectedPasarForDetail(pasar.id)}
                          className="h-full cursor-pointer hover:shadow-lg interactive-smooth hover:-translate-y-0.5 hover-tilt animate-fade-up card-enter"
                          style={getStaggerStyle(index, 120)}
                        >
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                  {pasar.totalKomoditas} Komoditas
                                </p>
                                <h3 className="font-semibold truncate">
                                  {pasar.nama}
                                </h3>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {pasar.alamat}
                                </p>
                              </div>
                              <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border bg-muted/30 flex items-center justify-center text-muted-foreground">
                                <Store className="h-5 w-5" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Belum ada pasar aktif.
                      </p>
                    )}
                  </div>
                )}

                {/* ===== KOMODITAS PER PASAR ===== */}
                {activeStat === "pasar" && selectedPasarForDetail && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {panelLoading ? (
                      <p className="text-sm text-muted-foreground">
                        Memuat komoditas pasar...
                      </p>
                    ) : pasarKomoditasCards.length > 0 ? (
                      pasarKomoditasCards.map((card, index) => (
                        <Card
                          key={card.komoditasId}
                          onClick={() =>
                            navigate(
                              `/public/komoditas/${card.komoditasId}`,
                            )
                          }
                          className="h-full cursor-pointer hover:shadow-lg interactive-smooth hover:-translate-y-0.5 hover-tilt animate-fade-up card-enter"
                          style={getStaggerStyle(index, 120)}
                        >
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                  {card.satuan}
                                </p>
                                <h3 className="font-semibold truncate">
                                  {card.nama}
                                </h3>
                                <p className="text-primary font-semibold">
                                  Rp {card.harga.toLocaleString("id-ID")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Update {formatTanggal(card.tanggal)}
                                </p>
                              </div>
                              <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border bg-muted/30">
                                {card.gambar ? (
                                  <img
                                    src={card.gambar}
                                    alt={card.nama}
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
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Belum ada data komoditas di pasar ini.
                      </p>
                    )}
                  </div>
                )}

                {/* ===== TEMPAT USAHA CARDS ===== */}
                {activeStat === "tempatUsaha" && !selectedTempatUsahaForDetail && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {panelLoading ? (
                      <p className="text-sm text-muted-foreground">
                        Memuat data tempat usaha...
                      </p>
                    ) : tempatUsahaStatCards.length > 0 ? (
                      tempatUsahaStatCards.map((tu, index) => (
                        <Card
                          key={tu.id}
                          onClick={() =>
                            setSelectedTempatUsahaForDetail(tu.id)
                          }
                          className="h-full cursor-pointer hover:shadow-lg interactive-smooth hover:-translate-y-0.5 hover-tilt animate-fade-up card-enter"
                          style={getStaggerStyle(index, 120)}
                        >
                          <CardContent className="p-4 space-y-3">
                            <div className="space-y-1.5">
                              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                {tu.pasar}
                              </p>
                              <h3 className="font-semibold truncate">
                                {tu.nama}
                              </h3>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Belum ada tempat usaha aktif.
                      </p>
                    )}
                  </div>
                )}

                {/* ===== KOMODITAS PER TEMPAT USAHA ===== */}
                {activeStat === "tempatUsaha" && selectedTempatUsahaForDetail && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {panelLoading ? (
                      <p className="text-sm text-muted-foreground">
                        Memuat komoditas tempat usaha...
                      </p>
                    ) : tuKomoditasCards.length > 0 ? (
                      tuKomoditasCards.map((card, index) => (
                        <Card
                          key={card.komoditasId}
                          onClick={() =>
                            navigate(
                              `/public/komoditas/${card.komoditasId}`,
                            )
                          }
                          className="h-full cursor-pointer hover:shadow-lg interactive-smooth hover:-translate-y-0.5 hover-tilt animate-fade-up card-enter"
                          style={getStaggerStyle(index, 120)}
                        >
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                  {card.satuan}
                                </p>
                                <h3 className="font-semibold truncate">
                                  {card.nama}
                                </h3>
                                <p className="text-primary font-semibold">
                                  {card.harga ? (
                                    <>Rp {card.harga.toLocaleString("id-ID")}</>
                                  ) : (
                                    <>Belum ada harga</>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {card.tanggal
                                    ? `Update ${formatTanggal(card.tanggal)}`
                                    : "Belum ada update"}
                                </p>
                              </div>
                              <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border bg-muted/30">
                                {card.gambar ? (
                                  <img
                                    src={card.gambar}
                                    alt={card.nama}
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
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Belum ada data komoditas pada tempat usaha ini.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <PredictionPriceSection />

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
                        <CommandEmpty>
                          {trendOptionsLoading
                            ? "Memuat komoditas..."
                            : "Komoditas tidak ditemukan."}
                        </CommandEmpty>
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
                      trendOptions.slice(0, 3).map((item) => item.id),
                    )
                  }
                  disabled={trendOptions.length === 0}
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
              </div>

              <div className="h-[250px] overflow-hidden rounded-2xl border border-border/70 bg-background sm:h-[300px] lg:h-[340px]">
                {trendDataLoading ? (
                  <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
                    Memuat grafik tren harga...
                  </div>
                ) : trendChartData.length > 0 && selectedTrendSeries.length > 0 ? (
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
                    {trendOptionsLoading
                      ? "Memuat daftar komoditas..."
                      : trendOptions.length === 0
                        ? "Belum ada data harga komoditas."
                        : "Pilih komoditas untuk melihat grafik."}
                  </div>
                )}
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                {!trendDataLoading &&
                  selectedTrendSeries.map((seriesItem, seriesIndex) => {
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
        className="focus-section focus-commodities animate-fade-up"
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
        ref={mapSectionRef}
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
              Klik kartu pasar untuk fokus peta
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_0.9fr] gap-5 items-start">
            <div
              className="rounded-2xl border border-border overflow-hidden animate-fade-up"
              style={{ animationDelay: "260ms" }}
            >
              {isMapSectionVisible ? (
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
                  <MapFlyTo target={mapFlyTarget} />
                  {activePasarWithCoords.map((p) => (
                    <Marker
                      key={p.id}
                      position={[p.latitude, p.longitude]}
                      icon={marketMarkerIcon}
                      eventHandlers={{
                        click: () => focusMapPasar(p),
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
              ) : (
                <div className="h-[440px] w-full bg-muted/20 flex items-center justify-center">
                  <div className="text-center space-y-2 px-6">
                    <p className="font-medium text-foreground">
                      Peta akan dimuat saat section terlihat
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ini mengurangi beban awal halaman.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 max-h-full pr-1">
              {mapPasarLoading && (
                <p className="text-sm text-muted-foreground px-1">
                  Memuat data pasar...
                </p>
              )}
              {!mapPasarLoading && pasarStackCards.length === 0 && (
                <p className="text-sm text-muted-foreground px-1">
                  Belum ada pasar aktif.
                </p>
              )}
              {pasarStackCards.map((p, index) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => focusMapPasar(p)}
                  className={`w-full text-left rounded-2xl border bg-card p-4 shadow-sm interactive-smooth hover:shadow-md hover-tilt animate-fade-up hover:border-primary/40 ${
                    selectedMapPasarId === p.id
                      ? "border-primary/60 ring-1 ring-primary/30"
                      : ""
                  }`}
                  style={getStaggerStyle(index, 280)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{p.nama}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {p.alamat}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {p.total_tempat_usaha} tempat usaha •{" "}
                        {p.total_komoditas} komoditas
                      </p>
                      {!hasValidMapCoords(p) && (
                        <p className="text-xs text-amber-600 mt-1">
                          Koordinat belum diatur
                        </p>
                      )}
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                      <MapPin className="h-5 w-5" />
                    </div>
                  </div>
                </button>
              ))}
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
