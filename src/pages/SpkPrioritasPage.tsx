import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  ChevronDown,
  LineChart,
  Package,
  ShieldAlert,
  Target,
  TrendingUp,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { useData } from "@/contexts/DataContext";
import {
  SPK_ALTERNATIVES,
  SPK_CRITERIA,
  calculateAhp,
  calculateSaw,
  createInitialPairwiseMatrix,
  updatePairwiseMatrix,
} from "@/lib/spk";

const chartConfig = {
  score: {
    label: "Nilai Prioritas",
    color: "hsl(var(--primary))",
  },
} as const;

const statusStyles: Record<string, string> = {
  Kritis: "bg-destructive/15 text-destructive border-destructive/20",
  Waspada: "bg-warning/15 text-warning border-warning/20",
  Stabil: "bg-success/15 text-success border-success/20",
};

const formatScore = (value: number) => value.toFixed(4);

export default function SpkPrioritasPage() {
  const { komoditas } = useData();
  const [pairwiseMatrix, setPairwiseMatrix] = useState<number[][]>(() =>
    createInitialPairwiseMatrix(),
  );

  const ahpResult = useMemo(() => calculateAhp(pairwiseMatrix), [pairwiseMatrix]);
  const sawResult = useMemo(
    () => calculateSaw(SPK_ALTERNATIVES, ahpResult.weights),
    [ahpResult.weights],
  );

  const komoditasMap = useMemo(() => {
    return komoditas.reduce((acc, k) => {
      acc[k.nama.toLowerCase()] = k;
      return acc;
    }, {} as Record<string, typeof komoditas[0]>);
  }, [komoditas]);

  const rankingChartData = sawResult.slice(0, 10).map((item) => ({
    name: item.alternative.nama,
    score: item.score,
  }));

  const criticalCount = sawResult.filter((item) => item.status === "Kritis").length;
  const warningCount = sawResult.filter((item) => item.status === "Waspada").length;
  const topAlternative = sawResult[0];
  const averageScore =
    sawResult.reduce((sum, item) => sum + item.score, 0) / sawResult.length;

  const handleMatrixChange = (row: number, col: number, rawValue: string) => {
    const value = Number.parseFloat(rawValue);
    setPairwiseMatrix((prev) => updatePairwiseMatrix(prev, row, col, value));
  };

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2 max-w-3xl">
            <Badge variant="outline" className="w-fit gap-1.5">
              <Calculator className="h-3.5 w-3.5" />
              SPK Prioritas Komoditas
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight">
              Dashboard AHP + SAW untuk Prioritas Pangan
            </h1>
            <p className="text-sm text-muted-foreground leading-6">
              Modul ini memvisualisasikan proses pembobotan AHP, konsistensi,
              normalisasi SAW, dan ranking komoditas berbasis data dummy lokal.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            <ShieldAlert className="h-4 w-4 text-warning" />
            <span>CR harus berada di bawah 0,1 agar pembobotan valid.</span>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-primary/15 p-3 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{SPK_ALTERNATIVES.length}</p>
              <p className="text-xs text-muted-foreground">Alternatif Komoditas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-warning/15 p-3 text-warning">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{criticalCount}</p>
              <p className="text-xs text-muted-foreground">Komoditas Kritis</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-success/15 p-3 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{ahpResult.cr.toFixed(3)}</p>
              <p className="text-xs text-muted-foreground">Consistency Ratio</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-xl bg-info/15 p-3 text-info">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{averageScore.toFixed(3)}</p>
              <p className="text-xs text-muted-foreground">Rata-rata Prioritas</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Ranking Prioritas Teratas</CardTitle>
            <CardDescription>
              Komoditas dengan skor terbesar diposisikan sebagai prioritas tertinggi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[360px] w-full">
              <BarChart data={rankingChartData} layout="vertical" margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  cursor={{ fill: "transparent" }}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar dataKey="score" radius={[0, 10, 10, 0]} fill="var(--color-score)" />
              </BarChart>
            </ChartContainer>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {sawResult.slice(0, 4).map((item) => (
                <div key={item.alternative.id} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium leading-tight">{item.alternative.nama}</p>
                      <p className="text-xs text-muted-foreground">Peringkat #{item.rank}</p>
                    </div>
                    <Badge className={cn("border", statusStyles[item.status])} variant="outline">
                      {item.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{formatScore(item.score)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status AHP</CardTitle>
            <CardDescription>
              Bobot hasil AHP dan indikator validitas perhitungan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Lambda Max</p>
                  <p className="text-2xl font-bold">{ahpResult.lambdaMax.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">CI</p>
                  <p className="text-2xl font-bold">{ahpResult.ci.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">CR</p>
                  <p className={cn("text-2xl font-bold", ahpResult.cr <= 0.1 ? "text-success" : "text-destructive")}>
                    {ahpResult.cr.toFixed(3)}
                  </p>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    ahpResult.cr <= 0.1
                      ? "bg-success/15 text-success border-success/20"
                      : "bg-destructive/15 text-destructive border-destructive/20"
                  }
                  variant="outline"
                >
                  {ahpResult.cr <= 0.1 ? "Konsisten" : "Perlu Revisi"}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Jika CR lebih besar dari 0,1, ubah nilai matriks pairwise.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {SPK_CRITERIA.map((criterion, index) => (
                <div key={criterion.key} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{criterion.label}</p>
                      <p className="text-xs text-muted-foreground">{criterion.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Bobot</p>
                      <p className="text-lg font-semibold">{ahpResult.weights[index]?.toFixed(3)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Matriks Pairwise AHP</CardTitle>
            <CardDescription>
              Ubah nilai pada segitiga atas. Nilai bawah akan terisi otomatis sebagai kebalikannya.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[520px] rounded-xl border">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr>
                    <th className="border-b px-3 py-2 text-left font-medium">Kriteria</th>
                    {SPK_CRITERIA.map((criterion) => (
                      <th key={criterion.key} className="border-b px-3 py-2 text-center font-medium min-w-[120px]">
                        {criterion.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SPK_CRITERIA.map((rowCriterion, rowIndex) => (
                    <tr key={rowCriterion.key} className="align-middle">
                      <td className="border-b px-3 py-2 font-medium">{rowCriterion.label}</td>
                      {SPK_CRITERIA.map((columnCriterion, colIndex) => {
                        const value = pairwiseMatrix[rowIndex][colIndex];
                        const isEditable = rowIndex < colIndex;

                        return (
                          <td key={columnCriterion.key} className="border-b px-2 py-2 text-center">
                            {rowIndex === colIndex ? (
                              <div className="rounded-lg border bg-muted/30 px-3 py-2 font-semibold">1</div>
                            ) : isEditable ? (
                              <Input
                                type="number"
                                min="0.111"
                                step="0.111"
                                value={Number.isFinite(value) ? value.toFixed(3) : "1.000"}
                                onChange={(event) =>
                                  handleMatrixChange(rowIndex, colIndex, event.target.value)
                                }
                                className="h-10 text-center"
                              />
                            ) : (
                              <div className="rounded-lg border bg-muted/20 px-3 py-2 text-muted-foreground">
                                {value.toFixed(3)}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hasil SAW Lengkap</CardTitle>
            <CardDescription>
              Tabel ini menunjukkan normalisasi, skor akhir, dan status prioritas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[520px] rounded-xl border">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr>
                    <th className="border-b px-3 py-2 text-center font-medium">Rank</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Komoditas</th>
                    <th className="border-b px-3 py-2 text-right font-medium">Skor</th>
                    <th className="border-b px-3 py-2 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sawResult.map((item) => (
                    <tr key={item.alternative.id}>
                      <td className="border-b px-3 py-2 text-center font-semibold">{item.rank}</td>
                      <td className="border-b px-3 py-2">
                        <div className="space-y-1">
                          <p className="font-medium">{item.alternative.nama}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.alternative.selisihHarga} | {item.alternative.hargaRataRata} | {item.alternative.stok} | {item.alternative.polaDistribusi} | {item.alternative.nilaiPeriode}
                          </p>
                        </div>
                      </td>
                      <td className="border-b px-3 py-2 text-right font-semibold">
                        {formatScore(item.score)}
                      </td>
                      <td className="border-b px-3 py-2 text-center">
                        <Badge className={cn("border", statusStyles[item.status])} variant="outline">
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Catatan Interpretasi</CardTitle>
          <CardDescription>
            Ringkasan aturan baca hasil SPK agar mudah dipakai admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border p-4">
            <Target className="h-5 w-5 text-primary" />
            <p className="mt-3 font-medium">Bobot AHP</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Menentukan pengaruh relatif tiap kriteria terhadap prioritas komoditas.
            </p>
          </div>
          <div className="rounded-xl border p-4">
            <LineChart className="h-5 w-5 text-success" />
            <p className="mt-3 font-medium">Normalisasi SAW</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Mengubah data dengan satuan berbeda ke skala yang seragam.
            </p>
          </div>
          <div className="rounded-xl border p-4">
            <ChevronDown className="h-5 w-5 text-warning" />
            <p className="mt-3 font-medium">Hasil Akhir</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Skor tertinggi berarti komoditas paling prioritas untuk ditangani.
            </p>
          </div>
        </CardContent>
      </Card>

      {topAlternative ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Prioritas Tertinggi
              </p>
              <p className="mt-1 text-xl font-bold">{topAlternative.alternative.nama}</p>
              <p className="text-sm text-muted-foreground">
                Skor {formatScore(topAlternative.score)} | Status {topAlternative.status}
              </p>
            </div>
            <div className="rounded-2xl border bg-background px-4 py-3 text-right shadow-sm">
              <p className="text-xs text-muted-foreground">Komoditas Waspada</p>
              <p className="text-2xl font-bold">{warningCount}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}