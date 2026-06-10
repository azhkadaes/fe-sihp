import type { PredictCommodity } from "@/lib/predict-commodities";

const PREDICT_API_URL =
  "https://madanyah-food-predict-oikn-api.hf.space/predict";

export interface PredictResponse {
  commodity: string;
  prediction: number;
}

export async function fetchPricePrediction(
  commodity: PredictCommodity,
): Promise<PredictResponse> {
  const res = await fetch(PREDICT_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commodity }),
  });

  if (!res.ok) {
    throw new Error("Gagal memuat prediksi harga. Coba lagi.");
  }

  const data = (await res.json()) as PredictResponse;
  if (typeof data.prediction !== "number") {
    throw new Error("Respons prediksi tidak valid.");
  }

  return data;
}
