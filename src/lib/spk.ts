export type SpkCriterionKey =
  | "selisih_harga"
  | "harga_rata_rata"
  | "stok"
  | "pola_distribusi"
  | "nilai_periode";

export type SpkCriterionType = "benefit" | "cost";

export interface SpkCriterion {
  key: SpkCriterionKey;
  label: string;
  type: SpkCriterionType;
  description: string;
}

export interface SpkAlternative {
  id: string;
  nama: string;
  selisihHarga: number;
  hargaRataRata: number;
  stok: number;
  polaDistribusi: number;
  nilaiPeriode: number;
}

export interface AhpResult {
  weights: number[];
  normalizedMatrix: number[][];
  lambdaMax: number;
  ci: number;
  cr: number;
}

export interface SawResult {
  alternative: SpkAlternative;
  normalized: Record<SpkCriterionKey, number>;
  score: number;
  rank: number;
  status: "Kritis" | "Waspada" | "Stabil";
}

const alternativeSeed: Array<[
  string,
  number,
  number,
  number,
  number,
  number,
]> = [
  ["Beras SPHP", 0.5, 14, 85, 5, 5],
  ["Beras Premium", 1, 18, 70, 5, 4],
  ["Beras Medium", 0.8, 15, 75, 4, 4],
  ["Bawang Merah", 2.5, 42, 40, 3, 3],
  ["Bawang Putih", 1.8, 38, 45, 3, 3],
  ["Cabai Merah Keriting", 4.5, 65, 25, 2, 2],
  ["Cabai Rawit Merah", 5, 78, 20, 2, 2],
  ["Cabai Merah Besar", 4, 60, 28, 2, 2],
  ["Tomat", 2, 18, 50, 3, 3],
  ["Kangkung", 1, 8, 65, 4, 5],
  ["Bayam", 1.2, 7, 60, 4, 5],
  ["Kentang", 1.5, 22, 55, 3, 4],
  ["Sawi Hijau", 1, 10, 58, 4, 4],
  ["Terong", 1.3, 14, 52, 3, 4],
  ["Kacang Panjang", 1.7, 16, 48, 3, 3],
  ["Daging Sapi", 2, 145, 30, 4, 3],
  ["Daging Kerbau", 1.5, 120, 35, 3, 3],
  ["Daging Ayam", 2.3, 38, 55, 4, 4],
  ["Telur Ayam", 1.8, 32, 60, 4, 4],
  ["Ikan Lele", 1.2, 28, 65, 4, 4],
  ["Ikan Nila", 1.5, 34, 58, 4, 4],
  ["Ikan Kembung", 2, 42, 45, 3, 3],
  ["Ikan Bandeng", 1.7, 36, 50, 3, 3],
  ["Ikan Tongkol", 2.5, 40, 42, 3, 3],
  ["Ikan Layang", 2.2, 35, 45, 3, 3],
  ["Pisang Ambon", 1, 18, 70, 4, 4],
  ["Pisang Kepok", 0.8, 15, 75, 4, 4],
  ["Pisang Raja", 1.2, 22, 60, 3, 3],
  ["Jeruk", 1.5, 25, 55, 3, 4],
  ["Semangka", 1, 16, 65, 4, 4],
  ["Pepaya", 0.8, 12, 70, 4, 5],
  ["Tepung Terigu Curah", 1.3, 13, 68, 4, 4],
  ["Tepung Terigu Kemasan", 1, 16, 65, 4, 4],
  ["Minyak Goreng Curah", 2, 19, 58, 3, 3],
  ["Minyak Goreng Kemasan", 1.5, 22, 60, 4, 4],
  ["Minyakita", 2.5, 17, 50, 3, 3],
];

export const SPK_CRITERIA: SpkCriterion[] = [
  {
    key: "selisih_harga",
    label: "Selisih Harga",
    type: "benefit",
    description: "Semakin tinggi selisih, semakin besar urgensi pemantauan.",
  },
  {
    key: "harga_rata_rata",
    label: "Harga Rata-rata",
    type: "benefit",
    description: "Harga yang lebih tinggi cenderung lebih sensitif terhadap inflasi.",
  },
  {
    key: "stok",
    label: "Stok",
    type: "cost",
    description: "Stok rendah lebih prioritas untuk intervensi.",
  },
  {
    key: "pola_distribusi",
    label: "Pola Distribusi",
    type: "cost",
    description: "Pola distribusi yang kurang stabil perlu diprioritaskan.",
  },
  {
    key: "nilai_periode",
    label: "Nilai Periode",
    type: "cost",
    description: "Periode restock yang rendah mengindikasikan risiko yang lebih besar.",
  },
];

export const SPK_ALTERNATIVES: SpkAlternative[] = alternativeSeed.map(
  ([nama, selisihHarga, hargaRataRata, stok, polaDistribusi, nilaiPeriode], index) => ({
    id: `alt-${index + 1}`,
    nama,
    selisihHarga,
    hargaRataRata,
    stok,
    polaDistribusi,
    nilaiPeriode,
  }),
);

export const SPK_DEFAULT_PAIRWISE: number[][] = [
  [1.0, 2.0, 2.0, 3.0, 3.0],
  [0.5, 1.0, 2.0, 2.0, 3.0],
  [0.5, 0.5, 1.0, 2.0, 2.0],
  [1/3, 0.5, 0.5, 1.0, 2.0],
  [1/3, 1/3, 0.5, 0.5, 1.0],
];

const RI: Record<number, number> = {
  1: 0,
  2: 0,
  3: 0.58,
  4: 0.9,
  5: 1.12,
  6: 1.24,
  7: 1.32,
  8: 1.41,
  9: 1.45,
  10: 1.49,
};

const cloneMatrix = (matrix: number[][]) => matrix.map((row) => [...row]);

const round = (value: number) => Math.round(value * 1000) / 1000;

export function createInitialPairwiseMatrix(): number[][] {
  return cloneMatrix(SPK_DEFAULT_PAIRWISE);
}

export function updatePairwiseMatrix(
  matrix: number[][],
  row: number,
  col: number,
  value: number,
): number[][] {
  const next = cloneMatrix(matrix);
  const safeValue = Number.isFinite(value) && value > 0 ? value : 1;
  next[row][col] = safeValue;
  next[col][row] = 1 / safeValue;
  next[row][row] = 1;
  next[col][col] = 1;
  return next;
}

export function calculateAhp(matrix: number[][]): AhpResult {
  const size = matrix.length;
  const columnTotals = matrix.map((_, columnIndex) =>
    matrix.reduce((sum, row) => sum + row[columnIndex], 0),
  );

  const normalizedMatrix = matrix.map((row) =>
    row.map((value, columnIndex) => value / columnTotals[columnIndex]),
  );

  const weights = normalizedMatrix.map(
    (row) => row.reduce((sum, value) => sum + value, 0) / size,
  );

  const aw = matrix.map((row) =>
    row.reduce((sum, value, columnIndex) => sum + value * weights[columnIndex], 0),
  );

  const lambdaParts = aw.map((value, index) => value / weights[index]);
  const lambdaMax = lambdaParts.reduce((sum, value) => sum + value, 0) / size;
  const ci = size > 1 ? (lambdaMax - size) / (size - 1) : 0;
  const cr = size > 2 ? ci / (RI[size] ?? 1.49) : 0;

  return {
    weights: weights.map(round),
    normalizedMatrix: normalizedMatrix.map((row) => row.map(round)),
    lambdaMax: round(lambdaMax),
    ci: round(ci),
    cr: round(cr),
  };
}

export function calculateSaw(
  alternatives: SpkAlternative[],
  weights: number[],
): SawResult[] {
  const normalizedByCriterion = SPK_CRITERIA.reduce<Record<SpkCriterionKey, number[]>>(
    (acc, criterion) => {
      const values = alternatives.map((item) => item[criterion.key]);
      const max = Math.max(...values);
      const min = Math.min(...values);

      acc[criterion.key] = values.map((value) => {
        if (criterion.type === "benefit") {
          return max === 0 ? 0 : value / max;
        }
        return value === 0 ? 0 : min / value;
      });

      return acc;
    },
    {
      selisih_harga: [],
      harga_rata_rata: [],
      stok: [],
      pola_distribusi: [],
      nilai_periode: [],
    },
  );

  const scored = alternatives.map((alternative, index) => {
    const normalized: Record<SpkCriterionKey, number> = {
      selisih_harga: normalizedByCriterion.selisih_harga[index] ?? 0,
      harga_rata_rata: normalizedByCriterion.harga_rata_rata[index] ?? 0,
      stok: normalizedByCriterion.stok[index] ?? 0,
      pola_distribusi: normalizedByCriterion.pola_distribusi[index] ?? 0,
      nilai_periode: normalizedByCriterion.nilai_periode[index] ?? 0,
    };

    const score = SPK_CRITERIA.reduce((sum, criterion, criterionIndex) => {
      return sum + (weights[criterionIndex] ?? 0) * normalized[criterion.key];
    }, 0);

    return {
      alternative,
      normalized,
      score,
      rank: 0,
      status: "Stabil" as const,
    };
  });

  const ranked = scored
    .sort((left, right) => right.score - left.score)
    .map((item, index, array) => {
      const criticalCutoff = Math.max(1, Math.ceil(array.length * 0.2));
      const warningCutoff = Math.max(criticalCutoff + 1, Math.ceil(array.length * 0.5));
      const rank = index + 1;
      const status =
        rank <= criticalCutoff
          ? "Kritis"
          : rank <= warningCutoff
            ? "Waspada"
            : "Stabil";

      return {
        ...item,
        rank,
        status,
        score: round(item.score),
      };
    });

  return ranked;
}