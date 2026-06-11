import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useData } from "@/contexts/DataContext";
import type { ApiHargaRutin } from "@/lib/harga-rutin-api";
import type { HargaRutinReportGroup } from "@/lib/pengumpulan-data-api";
import type { KelasKomoditas, SatuanDasar } from "@/types";
import {
  SATUAN_DASAR_OPTIONS,
  KONVERSI_SATUAN,
  hitungHargaStandar,
} from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  CalendarIcon,
  Plus,
  Pencil,
  Eye,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

const kelasOptions: KelasKomoditas[] = ["besar", "menengah", "kecil"];

type ReportSample = {
  kelas: KelasKomoditas;
  tempatUsahaId: string;
  hargaInput: number;
  jumlahInput: number;
  satuanInput: SatuanDasar;
};

type ReportItem = {
  komoditasId: string;
  samples: ReportSample[];
};

type ReportMeta = {
  enumerator: string;
  pasarId: string;
  tanggal: Date | undefined;
  signatureData: string;
};

type HargaRutinRow = ApiHargaRutin;

type ReportGroup = HargaRutinReportGroup;

const getStatusStyle = (status: "draft" | "final") => {
  switch (status) {
    case "final":
      return "bg-success/15 text-success border-success/20";
    case "draft":
    default:
      return "bg-warning/15 text-warning border-warning/20";
  }
};

const getKelasStyle = (kelas: KelasKomoditas) => {
  switch (kelas) {
    case "besar":
      return "border-kelas-besar text-kelas-besar bg-kelas-besar/10";
    case "menengah":
      return "border-kelas-menengah text-kelas-menengah bg-kelas-menengah/10";
    case "kecil":
    default:
      return "border-kelas-kecil text-kelas-kecil bg-kelas-kecil/10";
  }
};

export default function HargaRutinPage() {
  const {
    pasar,
    komoditas,
    tempatUsaha,
    komoditasDijual,
    hargaPelaporan,
    refreshPasar,
    refreshKomoditas,
    refreshTempatUsaha,
    refreshKomoditasDijual,
    getKelasForKomoditasInPasar,
    loadHargaRutinReportGroups,
    saveHargaRutinReport,
    deleteHargaRutinReport,
  } = useData();

  const [reportGroups, setReportGroups] = useState<ReportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [view, setView] = useState<
    "dashboard" | "setup" | "input" | "review" | "detail"
  >("dashboard");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [meta, setMeta] = useState<ReportMeta>({
    enumerator: "",
    pasarId: "",
    tanggal: undefined,
    signatureData: "",
  });
  const [items, setItems] = useState<ReportItem[]>([]);
  const [selectedKomoditas, setSelectedKomoditas] = useState<string>("");
  const [filterPasar, setFilterPasar] = useState<string>("all");
  const [filterTanggal, setFilterTanggal] = useState<Date | undefined>(
    undefined,
  );
  const [finalizeOpen, setFinalizeOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const refreshPageData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        refreshPasar(),
        refreshKomoditas(),
        refreshTempatUsaha(),
        refreshKomoditasDijual(),
      ]);
      const groups = await loadHargaRutinReportGroups();
      setReportGroups(groups);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memuat data",
      );
    } finally {
      setLoading(false);
    }
  }, [
    refreshPasar,
    refreshKomoditas,
    refreshTempatUsaha,
    refreshKomoditasDijual,
    loadHargaRutinReportGroups,
  ]);

  useEffect(() => {
    void refreshPageData();
  }, [refreshPageData]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;
    if (!parent) return;
    canvas.width = parent.clientWidth;
    canvas.height = 120;
  }, [view]);

  useEffect(() => {
    if (view !== "setup" || !meta.signatureData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    if (!meta.signatureData.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = meta.signatureData;
  }, [view, meta.signatureData]);

  const filteredGroups = useMemo(() => {
    return reportGroups.filter((group) => {
      if (filterPasar !== "all" && group.pasarId !== filterPasar) return false;
      if (filterTanggal) {
        const t = format(filterTanggal, "yyyy-MM-dd");
        if (group.tanggal !== t) return false;
      }
      return true;
    });
  }, [reportGroups, filterPasar, filterTanggal]);

  const latestByPasarKomoditas = useMemo(() => {
    return hargaPelaporan.reduce<
      Record<string, (typeof hargaPelaporan)[number]>
    >((acc, item) => {
      const key = `${item.pasar_id}-${item.komoditas_id}`;
      if (!acc[key] || item.tanggal > acc[key].tanggal) acc[key] = item;
      return acc;
    }, {});
  }, [hargaPelaporan]);

  const currentGroupStatus = useMemo(() => {
    if (!activeKey) return "draft" as const;
    const group = reportGroups.find((g) => g.id === activeKey);
    return group?.status ?? "draft";
  }, [activeKey, reportGroups]);

  const resetReportState = () => {
    setMeta({
      enumerator: "",
      pasarId: "",
      tanggal: undefined,
      signatureData: "",
    });
    setItems([]);
    setSelectedKomoditas("");
    setActiveKey(null);
  };

  const createEmptySamples = (komoditasId: string): ReportSample[] => {
    const satuanDefault =
      komoditas.find((k) => k.id === komoditasId)?.satuan_dasar ?? "kg";
    return kelasOptions.map((kelas) => ({
      kelas,
      tempatUsahaId: "",
      hargaInput: 0,
      jumlahInput: 1,
      satuanInput: satuanDefault,
    }));
  };

  const buildItemsFromEntries = (entries: HargaRutinRow[]): ReportItem[] => {
    const grouped = new Map<string, HargaRutinRow[]>();
    entries.forEach((e) => {
      if (!grouped.has(e.id_komoditas)) grouped.set(e.id_komoditas, []);
      grouped.get(e.id_komoditas)!.push(e);
    });

    return Array.from(grouped.entries()).map(([komoditasId, komEntries]) => {
      const samples = kelasOptions.map((kelas) => {
        const match = komEntries.find((e) => e.kelas_komoditas === kelas);
        const satuanDefault =
          komoditas.find((k) => k.id === komoditasId)?.satuan_dasar ?? "kg";
        return {
          kelas,
          tempatUsahaId: match?.id_tempat_usaha ?? "",
          hargaInput: match?.harga ?? 0,
          jumlahInput: 1,
          satuanInput: satuanDefault,
        } as ReportSample;
      });
      return { komoditasId, samples };
    });
  };

  const openSetup = () => {
    resetReportState();
    setView("setup");
  };

  const openEdit = (group: ReportGroup) => {
    setActiveKey(group.id);
    setMeta({
      enumerator: group.enumerator,
      pasarId: group.pasarId,
      tanggal: new Date(group.tanggal),
      signatureData: group.signatureData ?? "",
    });
    setItems(buildItemsFromEntries(group.entries));
    setView("input");
  };

  const openDetail = (group: ReportGroup) => {
    setActiveKey(group.id);
    setMeta({
      enumerator: group.enumerator,
      pasarId: group.pasarId,
      tanggal: new Date(group.tanggal),
      signatureData: group.signatureData ?? "",
    });
    setItems(buildItemsFromEntries(group.entries));
    setView("detail");
  };

  const handleSignatureClear = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setMeta((prev) => ({ ...prev, signatureData: "" }));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#2a4e85";
    ctx.beginPath();
    ctx.moveTo(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
    setIsDrawing(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (!canvasRef.current) return;
    setIsDrawing(false);
    setMeta((prev) => ({
      ...prev,
      signatureData: canvasRef.current?.toDataURL() ?? "",
    }));
  };

  const handleSetupNext = () => {
    if (!meta.enumerator.trim() || !meta.pasarId || !meta.tanggal) {
      toast.error("Lengkapi semua field");
      return;
    }
    setView("input");
  };

  const handleAddKomoditas = () => {
    if (!selectedKomoditas) return;
    if (items.some((item) => item.komoditasId === selectedKomoditas)) {
      toast.error("Komoditas sudah ditambahkan");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        komoditasId: selectedKomoditas,
        samples: createEmptySamples(selectedKomoditas),
      },
    ]);
    setSelectedKomoditas("");
  };

  const handleRemoveKomoditas = (komoditasId: string) => {
    setItems((prev) => prev.filter((item) => item.komoditasId !== komoditasId));
  };

  const updateSample = (
    komoditasId: string,
    kelas: KelasKomoditas,
    updater: Partial<ReportSample>,
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.komoditasId !== komoditasId) return item;
        return {
          ...item,
          samples: item.samples.map((sample) =>
            sample.kelas === kelas ? { ...sample, ...updater } : sample,
          ),
        };
      }),
    );
  };

  const getTempatUsahaOptions = (
    pasarId: string,
    komoditasId: string,
    kelas: KelasKomoditas,
  ) => {
    if (!pasarId) return [];
    const kelasMap = getKelasForKomoditasInPasar(pasarId, komoditasId);
    return tempatUsaha.filter((t) => {
      if (t.pasar_id !== pasarId || !t.is_active) return false;
      const hasKom = komoditasDijual.some(
        (kd) => kd.tempat_usaha_id === t.id && kd.komoditas_id === komoditasId,
      );
      if (!hasKom) return false;
      return kelasMap[t.id] === kelas;
    });
  };

  const validateReport = (strict: boolean) => {
    if (!meta.enumerator.trim() || !meta.pasarId || !meta.tanggal) {
      toast.error("Lengkapi info pendataan terlebih dahulu");
      return false;
    }
    if (items.length === 0) {
      toast.error("Tambahkan minimal satu komoditas");
      return false;
    }
    for (const item of items) {
      for (const sample of item.samples) {
        if (strict) {
          if (
            !sample.tempatUsahaId ||
            sample.hargaInput <= 0 ||
            sample.jumlahInput <= 0
          ) {
            toast.error("Semua sampel wajib terisi untuk finalisasi");
            return false;
          }
        }
      }
    }
    return true;
  };

  const saveReport = async (finalize: boolean) => {
    if (!meta.tanggal) return;

    setSaving(true);
    try {
      await saveHargaRutinReport({
        activeBatchId: activeKey,
        pasarId: meta.pasarId,
        tanggal: meta.tanggal,
        enumerator: meta.enumerator,
        signatureData: meta.signatureData,
        finalize,
        strict: finalize,
        items,
      });
      await refreshPageData();
      toast.success(finalize ? "Data difinalisasi" : "Draft disimpan");
      resetReportState();
      setView("dashboard");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan data",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = () => {
    if (!validateReport(false)) return;
    void saveReport(false);
  };

  const handleFinalize = () => {
    if (!validateReport(true)) return;
    void saveReport(true);
    setFinalizeOpen(false);
  };

  const handleDeleteGroup = async (group: ReportGroup) => {
    if (group.status !== "draft") {
      toast.error("Hanya data draft yang dapat dihapus");
      return;
    }
    try {
      await deleteHargaRutinReport(group.id);
      await refreshPageData();
      toast.success("Data dihapus");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menghapus data",
      );
    }
  };

  const renderInfoRow = (label: string, value: string) => (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );

  if (view === "dashboard") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Pemantauan Harga Pangan</h1>
            <p className="text-sm text-muted-foreground">
              Kelola draft dan finalisasi pendataan harga.
            </p>
          </div>
          <Button
            className="bg-primary text-primary-foreground"
            onClick={openSetup}
          >
            <Plus className="h-4 w-4 mr-1" /> Tambah Data
          </Button>
        </div>

        <Card>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pasar</Label>
              <Select value={filterPasar} onValueChange={setFilterPasar}>
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left",
                      !filterTanggal && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterTanggal
                      ? format(filterTanggal, "PPP", { locale: localeId })
                      : "Semua tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filterTanggal}
                    onSelect={setFilterTanggal}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {loading && (
          <p className="text-sm text-muted-foreground">Memuat data...</p>
        )}

        <div className="grid gap-4">
          {filteredGroups.map((group) => (
            <Card key={group.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">
                    {pasar.find((p) => p.id === group.pasarId)?.nama ?? "-"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(group.tanggal), "PPP", {
                      locale: localeId,
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Enumerator: {group.enumerator}
                  </p>
                </div>
                <div className="lg:ml-auto flex items-center gap-3 flex-wrap lg:flex-nowrap">
                  <Badge
                    variant="outline"
                    className={cn("text-xs", getStatusStyle(group.status))}
                  >
                    {group.status === "final" ? "Final" : "Draft"}
                  </Badge>
                  <div className="flex items-center gap-2 flex-nowrap">
                    {group.status === "draft" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(group)}
                      >
                        <Pencil className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetail(group)}
                      >
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger"
                      onClick={() => void handleDeleteGroup(group)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredGroups.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Belum ada data pendataan untuk filter tersebut.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  if (view === "setup") {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Setup Pendataan</h1>
          <Button
            variant="ghost"
            onClick={() => {
              resetReportState();
              setView("dashboard");
            }}
          >
            Batal
          </Button>
        </div>

        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label>Pasar</Label>
              <Select
                value={meta.pasarId}
                onValueChange={(value) =>
                  setMeta((prev) => ({ ...prev, pasarId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pasar" />
                </SelectTrigger>
                <SelectContent>
                  {pasar
                    .filter((p) => p.is_active)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nama}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left",
                      !meta.tanggal && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {meta.tanggal
                      ? format(meta.tanggal, "PPP", { locale: localeId })
                      : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={meta.tanggal}
                    onSelect={(value) =>
                      setMeta((prev) => ({ ...prev, tanggal: value }))
                    }
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Enumerator</Label>
              <Input
                value={meta.enumerator}
                onChange={(e) =>
                  setMeta((prev) => ({ ...prev, enumerator: e.target.value }))
                }
                placeholder="Nama enumerator"
              />
            </div>
            <div className="space-y-2">
              <Label>Tanda Tangan</Label>
              <div className="rounded-lg border border-border p-3 space-y-2">
                <canvas
                  ref={canvasRef}
                  className="w-full h-[120px] bg-background"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignatureClear}
                >
                  Bersihkan
                </Button>
              </div>
            </div>
            <Button
              className="w-full bg-primary text-primary-foreground"
              onClick={handleSetupNext}
            >
              Mulai Pendataan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view === "detail") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Detail Pendataan</h1>
            <p className="text-sm text-muted-foreground">
              Data yang sudah difinalisasi.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              resetReportState();
              setView("dashboard");
            }}
          >
            Kembali
          </Button>
        </div>

        <Card>
          <CardContent className="p-5 space-y-2">
            {renderInfoRow(
              "Pasar",
              pasar.find((p) => p.id === meta.pasarId)?.nama ?? "-",
            )}
            {renderInfoRow(
              "Tanggal",
              meta.tanggal
                ? format(meta.tanggal, "PPP", { locale: localeId })
                : "-",
            )}
            {renderInfoRow("Enumerator", meta.enumerator || "-")}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {items.map((item) => {
            const kom = komoditas.find((k) => k.id === item.komoditasId);
            return (
              <Card key={item.komoditasId}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Komoditas
                      </p>
                      <h3 className="text-lg font-semibold">
                        {kom?.nama ?? "-"}
                      </h3>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    {item.samples.map((sample) => (
                      <div
                        key={sample.kelas}
                        className="rounded-lg border border-border p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs capitalize",
                              getKelasStyle(sample.kelas),
                            )}
                          >
                            {sample.kelas}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {sample.satuanInput}
                          </span>
                        </div>
                        <p className="text-sm">
                          Tempat usaha:{" "}
                          {tempatUsaha.find(
                            (t) => t.id === sample.tempatUsahaId,
                          )?.nama ?? "-"}
                        </p>
                        <p className="text-sm">
                          Harga standar: Rp{" "}
                          {sample.hargaInput.toLocaleString("id-ID")}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const averageForItem = (item: ReportItem) => {
    const kom = komoditas.find((k) => k.id === item.komoditasId);
    if (!kom) return 0;
    const prices = item.samples
      .map((sample) =>
        hitungHargaStandar(
          sample.hargaInput,
          sample.jumlahInput,
          sample.satuanInput,
          kom.satuan_dasar,
        ),
      )
      .filter((p) => p > 0);
    if (prices.length === 0) return 0;
    return Math.round(prices.reduce((acc, p) => acc + p, 0) / prices.length);
  };

  const getWarning = (item: ReportItem) => {
    if (!meta.pasarId) return false;
    const latest =
      latestByPasarKomoditas[`${meta.pasarId}-${item.komoditasId}`];
    if (!latest) return false;
    const avg = averageForItem(item);
    if (!avg) return false;
    const diff = Math.abs(avg - latest.harga_rata_rata);
    return diff > latest.harga_rata_rata * 0.5;
  };

  if (view === "review") {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Review Data</h1>
          <Button variant="outline" onClick={() => setView("input")}>
            Kembali Edit
          </Button>
        </div>

        <Card>
          <CardContent className="p-5 space-y-2">
            {renderInfoRow(
              "Pasar",
              pasar.find((p) => p.id === meta.pasarId)?.nama ?? "-",
            )}
            {renderInfoRow(
              "Tanggal",
              meta.tanggal
                ? format(meta.tanggal, "PPP", { locale: localeId })
                : "-",
            )}
            {renderInfoRow("Enumerator", meta.enumerator || "-")}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-4">
            {items.map((item) => {
              const kom = komoditas.find((k) => k.id === item.komoditasId);
              const avg = averageForItem(item);
              const hasError = item.samples.some(
                (sample) => sample.hargaInput <= 0 || !sample.tempatUsahaId,
              );
              const isWarning = !hasError && getWarning(item);
              return (
                <div
                  key={item.komoditasId}
                  className="flex items-center justify-between border-b border-border pb-3"
                >
                  <div>
                    <p className="font-medium">{kom?.nama ?? "-"}</p>
                    <p className="text-xs text-muted-foreground">
                      Rata-rata: Rp {avg.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      hasError
                        ? "border-danger/30 text-danger"
                        : isWarning
                          ? "border-warning/30 text-warning"
                          : "border-success/30 text-success",
                    )}
                  >
                    {hasError ? "Error" : isWarning ? "Warning" : "Valid"}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setView("input")}
          >
            Kembali Edit
          </Button>
          <Button
            className="flex-1 bg-primary text-primary-foreground"
            onClick={() => setFinalizeOpen(true)}
          >
            Finalisasi
          </Button>
        </div>

        <AlertDialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Finalisasi Data</AlertDialogTitle>
              <AlertDialogDescription>
                Data yang telah difinalisasi tidak dapat diubah kembali.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleFinalize} disabled={saving}>
                {saving ? "Menyimpan..." : "Ya, Finalisasi"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Input Harga</h1>
          <p className="text-sm text-muted-foreground">
            Isi data harga 3 sampel untuk setiap komoditas.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            resetReportState();
            setView("dashboard");
          }}
        >
          Batal
        </Button>
      </div>

      <Card>
        <CardContent className="p-5 space-y-2">
          {renderInfoRow(
            "Pasar",
            pasar.find((p) => p.id === meta.pasarId)?.nama ?? "-",
          )}
          {renderInfoRow(
            "Tanggal",
            meta.tanggal
              ? format(meta.tanggal, "PPP", { locale: localeId })
              : "-",
          )}
          {renderInfoRow("Enumerator", meta.enumerator || "-")}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select
              value={selectedKomoditas}
              onValueChange={setSelectedKomoditas}
            >
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue placeholder="Pilih komoditas" />
              </SelectTrigger>
              <SelectContent>
                {komoditas.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddKomoditas}
              className="bg-primary text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-1" /> Tambah Komoditas
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {items.map((item) => {
          const kom = komoditas.find((k) => k.id === item.komoditasId);
          const satuanDasar = kom?.satuan_dasar ?? "kg";
          const filledSamples = item.samples.filter(
            (sample) =>
              sample.tempatUsahaId &&
              sample.hargaInput > 0 &&
              sample.jumlahInput > 0,
          ).length;
          const progressPct = Math.round(
            (filledSamples / item.samples.length) * 100,
          );
          return (
            <Card key={item.komoditasId}>
              <CardContent className="p-0">
                <details className="group">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Komoditas
                      </p>
                      <h3 className="text-lg font-semibold">
                        {kom?.nama ?? "-"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Satuan dasar: {satuanDasar}
                      </p>
                      {currentGroupStatus === "draft" && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            Progress {filledSamples}/{item.samples.length}
                          </span>
                          <span className="h-1 w-24 rounded-full bg-muted overflow-hidden">
                            <span
                              className="block h-full bg-primary"
                              style={{ width: `${progressPct}%` }}
                            />
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-5 pb-5 space-y-4">
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        className="text-danger"
                        onClick={() => handleRemoveKomoditas(item.komoditasId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-4">
                      {item.samples.map((sample) => {
                        const tuOptions = getTempatUsahaOptions(
                          meta.pasarId,
                          item.komoditasId,
                          sample.kelas,
                        );
                        const baseType =
                          KONVERSI_SATUAN[satuanDasar]?.base || "kg";
                        const compatibleSatuan = SATUAN_DASAR_OPTIONS.filter(
                          (s) => KONVERSI_SATUAN[s.value].base === baseType,
                        );
                        const tuName = sample.tempatUsahaId
                          ? (tempatUsaha.find(
                              (t) => t.id === sample.tempatUsahaId,
                            )?.nama ?? "-")
                          : "Belum dipilih";
                        const isSampleFilled =
                          !!sample.tempatUsahaId &&
                          sample.hargaInput > 0 &&
                          sample.jumlahInput > 0;
                        return (
                          <details
                            key={sample.kelas}
                            className="group rounded-lg border border-border p-4"
                          >
                            <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                              <div className="space-y-1">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs capitalize",
                                    getKelasStyle(sample.kelas),
                                  )}
                                >
                                  {sample.kelas}
                                </Badge>
                                <p className="text-xs text-muted-foreground">
                                  TU: {tuName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Harga:{" "}
                                  {sample.hargaInput > 0
                                    ? `Rp ${sample.hargaInput.toLocaleString("id-ID")}`
                                    : "-"}
                                </p>
                              </div>
                              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                            </summary>
                            {currentGroupStatus === "draft" && (
                              <p className="mt-2 text-xs text-muted-foreground">
                                Status:{" "}
                                {isSampleFilled ? "Terisi" : "Belum lengkap"}
                              </p>
                            )}
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label>Tempat Usaha</Label>
                                <Select
                                  value={sample.tempatUsahaId}
                                  onValueChange={(value) =>
                                    updateSample(
                                      item.komoditasId,
                                      sample.kelas,
                                      { tempatUsahaId: value },
                                    )
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Pilih tempat usaha" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {tuOptions.map((t) => (
                                      <SelectItem key={t.id} value={t.id}>
                                        {t.nama}
                                      </SelectItem>
                                    ))}
                                    {tuOptions.length === 0 && (
                                      <SelectItem value="_none" disabled>
                                        Tidak ada tempat usaha
                                      </SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Harga (Rp)</Label>
                                <Input
                                  type="number"
                                  value={sample.hargaInput || ""}
                                  onChange={(e) =>
                                    updateSample(
                                      item.komoditasId,
                                      sample.kelas,
                                      {
                                        hargaInput:
                                          parseFloat(e.target.value) || 0,
                                      },
                                    )
                                  }
                                  placeholder="0"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Jumlah</Label>
                                <Input
                                  type="number"
                                  value={sample.jumlahInput || ""}
                                  onChange={(e) =>
                                    updateSample(
                                      item.komoditasId,
                                      sample.kelas,
                                      {
                                        jumlahInput:
                                          parseFloat(e.target.value) || 0,
                                      },
                                    )
                                  }
                                  placeholder="1"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Satuan</Label>
                                <Select
                                  value={sample.satuanInput}
                                  onValueChange={(value) =>
                                    updateSample(
                                      item.komoditasId,
                                      sample.kelas,
                                      { satuanInput: value as SatuanDasar },
                                    )
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {compatibleSatuan.map((s) => (
                                      <SelectItem key={s.value} value={s.value}>
                                        {s.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {sample.hargaInput > 0 &&
                                sample.jumlahInput > 0 && (
                                  <div className="md:col-span-2 rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs text-muted-foreground">
                                    Harga terstandarisasi: Rp{" "}
                                    {hitungHargaStandar(
                                      sample.hargaInput,
                                      sample.jumlahInput,
                                      sample.satuanInput,
                                      satuanDasar,
                                    ).toLocaleString("id-ID")}{" "}
                                    / {satuanDasar}
                                  </div>
                                )}
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </div>
                </details>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {items.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Tambahkan komoditas untuk mulai input harga.
          </CardContent>
        </Card>
      )}

      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border py-4">
        <div className="max-w-6xl mx-auto px-2 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleSaveDraft}
            disabled={saving}
          >
            {saving ? "Menyimpan..." : "Simpan Draft"}
          </Button>
          <Button
            className="flex-1 bg-primary text-primary-foreground"
            onClick={() => {
              if (validateReport(false)) setView("review");
            }}
          >
            Review Data
          </Button>
        </div>
      </div>
    </div>
  );
}
