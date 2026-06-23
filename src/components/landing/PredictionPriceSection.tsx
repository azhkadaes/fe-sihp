import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowLeft, Loader2, Search, Sparkles, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchPricePrediction } from "@/lib/predict-api";
import {
  formatCommodityLabel,
  isPredictCommodity,
  PREDICT_COMMODITIES,
  type PredictCommodity,
} from "@/lib/predict-commodities";

gsap.registerPlugin(ScrollTrigger);

export default function PredictionPriceSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const col1Ref = useRef<HTMLDivElement>(null);
  const col2Ref = useRef<HTMLDivElement>(null);
  const col3Ref = useRef<HTMLButtonElement>(null);
  const col3BgRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const col3LabelRef = useRef<HTMLDivElement>(null);
  const col3ImageRef = useRef<HTMLImageElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const descCol1Ref = useRef<HTMLDivElement>(null);
  const descCol2Ref = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const [isExpanded, setIsExpanded] = useState(false);
  const [commodity, setCommodity] = useState<PredictCommodity>("Telur_Ayam");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [predictedCommodity, setPredictedCommodity] =
    useState<PredictCommodity | null>(null);

  const filteredCommodities = PREDICT_COMMODITIES.filter((item) =>
    formatCommodityLabel(item)
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase()),
  );

  const runPrediction = useCallback(async (selected: PredictCommodity) => {
    setIsLoading(true);
    setError(null);
    setPrediction(null);
    setPredictedCommodity(null);

    try {
      const data = await fetchPricePrediction(selected);
      setPrediction(data.prediction);
      setPredictedCommodity(selected);

      if (resultRef.current) {
        const counter = { value: 0 };
        gsap.fromTo(
          resultRef.current,
          { opacity: 0, y: 24, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.55,
            ease: "power3.out",
          },
        );
        gsap.to(counter, {
          value: data.prediction,
          duration: 1.2,
          ease: "power2.out",
          onUpdate: () => {
            if (resultRef.current) {
              const priceEl = resultRef.current.querySelector(
                "[data-prediction-price]",
              );
              if (priceEl) {
                priceEl.textContent = `Rp ${Math.round(counter.value).toLocaleString("id-ID")}`;
              }
            }
          },
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat prediksi.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const expandSearch = useCallback(() => {
    if (isExpanded) return;
    setIsExpanded(true);

    const tl = gsap.timeline({ defaults: { ease: "power3.inOut" } });

    const descBlocks = [descCol1Ref.current, descCol2Ref.current].filter(Boolean);
    if (descBlocks.length > 0) {
      tl.to(descBlocks, {
        opacity: 0,
        y: -20,
        stagger: 0.1,
        duration: 0.35,
      });
      tl.set(descBlocks, { display: "none" });
    }

    if (searchPanelRef.current) {
      tl.set(searchPanelRef.current, { display: "flex" });
      tl.fromTo(
        searchPanelRef.current,
        { opacity: 0, y: 32 },
        { opacity: 1, y: 0, duration: 0.55 },
      );
      tl.fromTo(
        searchPanelRef.current.querySelectorAll("[data-search-item]"),
        { opacity: 0, x: -24 },
        { opacity: 1, x: 0, stagger: 0.09, duration: 0.42 },
        "-=0.3",
      );
    }

    if (col3Ref.current) {
      tl.to(
        col3Ref.current,
        { scale: 0.98, duration: 0.22, yoyo: true, repeat: 1 },
        0,
      );
    }

    tl.call(() => {
      gsap.set(arrowRef.current, { opacity: 0, x: 28 });
      gsap.set(col3BgRef.current, { backgroundColor: "transparent" });
      gsap.set(col3ImageRef.current, { scale: 1, filter: "brightness(1)" });
      gsap.set(col3LabelRef.current, { clearProps: "color" });
    });
  }, [isExpanded]);

  const collapseSearch = useCallback(() => {
    if (!isExpanded) return;

    const tl = gsap.timeline({
      defaults: { ease: "power3.inOut" },
      onComplete: () => {
        setIsExpanded(false);
        setPrediction(null);
        setPredictedCommodity(null);
        setError(null);
        setSearchQuery("");
      },
    });

    if (searchPanelRef.current) {
      const items = searchPanelRef.current.querySelectorAll("[data-search-item]");
      if (items.length > 0) {
        tl.to(items, {
          opacity: 0,
          x: -20,
          stagger: 0.05,
          duration: 0.25,
        });
      }
      tl.to(searchPanelRef.current, {
        opacity: 0,
        y: 28,
        duration: 0.35,
      });
      tl.set(searchPanelRef.current, { display: "none" });
    }

    const descBlocks = [descCol1Ref.current, descCol2Ref.current].filter(Boolean);
    if (descBlocks.length > 0) {
      tl.set(descBlocks, { display: "block", opacity: 0, y: 20 });
      tl.to(descBlocks, {
        opacity: 1,
        y: 0,
        stagger: 0.1,
        duration: 0.45,
      });
    }
  }, [isExpanded]);

  const handleCol3Enter = useCallback(() => {
    if (!col3BgRef.current || !arrowRef.current || !col3LabelRef.current) return;

    gsap.to(col3BgRef.current, {
      backgroundColor: "#000000",
      duration: 0.45,
      ease: "power2.out",
    });
    gsap.to(col3ImageRef.current, {
      scale: 1.06,
      filter: "brightness(0.55)",
      duration: 0.45,
      ease: "power2.out",
    });
    gsap.to(col3LabelRef.current, {
      color: "#ffffff",
      duration: 0.35,
    });
    gsap.fromTo(
      arrowRef.current,
      { opacity: 0, x: 28 },
      { opacity: 1, x: 0, duration: 0.5, ease: "back.out(1.6)" },
    );
  }, []);

  const handleCol3Leave = useCallback(() => {
    if (!col3BgRef.current || !arrowRef.current || !col3LabelRef.current) return;

    gsap.to(col3BgRef.current, {
      backgroundColor: "transparent",
      duration: 0.4,
      ease: "power2.inOut",
    });
    gsap.to(col3ImageRef.current, {
      scale: 1,
      filter: "brightness(1)",
      duration: 0.4,
      ease: "power2.inOut",
    });
    gsap.to(col3LabelRef.current, {
      duration: 0.35,
      clearProps: "color",
    });
    gsap.to(arrowRef.current, {
      opacity: 0,
      x: 28,
      duration: 0.3,
      ease: "power2.in",
    });
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const columns = [col1Ref.current, col2Ref.current, col3Ref.current].filter(
        Boolean,
      );

      gsap.set(columns, { opacity: 0, y: 48 });
      gsap.set(arrowRef.current, { opacity: 0, x: 28 });

      ScrollTrigger.create({
        trigger: section,
        start: "top 78%",
        once: true,
        onEnter: () => {
          gsap.to(columns, {
            opacity: 1,
            y: 0,
            duration: 0.85,
            stagger: 0.14,
            ease: "power3.out",
          });
        },
      });

      gsap.to(section.querySelector("[data-prediction-glow]"), {
        opacity: 0.65,
        scale: 1.08,
        duration: 3.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, section);

    return () => ctx.revert();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPredictCommodity(commodity)) {
      setError("Komoditas tidak valid.");
      return;
    }
    void runPrediction(commodity);
  };

  return (
    <section
      ref={sectionRef}
      className="focus-section focus-prediction relative overflow-hidden border-y border-border/30"
    >
      <div
        data-prediction-glow
        className="pointer-events-none absolute -right-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl opacity-40"
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="mb-10 space-y-3">
          <p className="section-kicker">Prediksi AI</p>
          <h2 className="section-title text-3xl sm:text-4xl font-display font-semibold">
            Perkiraan Harga Komoditas
          </h2>
          <p className="section-lead text-sm max-w-2xl">
            {isExpanded
              ? "Pilih komoditas lalu tekan prediksi harga. Gunakan tombol kembali untuk menutup form."
              : "Model prediksi membantu memperkirakan harga pangan ke depan. Klik panel kanan untuk mulai mencari komoditas."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 min-h-[320px]">
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5 relative">
          <div
            ref={col1Ref}
            className="rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm p-6 sm:p-8 relative overflow-hidden"
          >
            <div ref={descCol1Ref} className="space-y-4 h-full">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs uppercase tracking-[0.25em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Machine Learning
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold leading-tight">
                Prediksi berbasis data historis harga pangan
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sistem memanfaatkan pola pergerakan harga komoditas untuk memberikan
                estimasi harga yang dapat menjadi acuan perencanaan belanja dan
                operasional pasar.
              </p>
            </div>
          </div>

          <div
            ref={col2Ref}
            className="rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm p-6 sm:p-8 relative overflow-hidden"
          >
            <div ref={descCol2Ref} className="space-y-4 h-full">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-accent">
                <TrendingUp className="h-3.5 w-3.5" />
                Real-time
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold leading-tight">
                Pilih komoditas, dapatkan estimasi instan
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Gunakan pencarian dan dropdown komoditas yang tersedia. Nama
                komoditas mengikuti format model prediksi agar hasil akurat —
                contoh: <code className="text-primary text-xs">Telur_Ayam</code>.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hover panel kanan untuk melihat petunjuk, lalu klik untuk membuka
                form prediksi.
              </p>
            </div>
          </div>

            <div
              ref={searchPanelRef}
              className="hidden flex-col absolute inset-0 z-10 rounded-2xl border border-primary/20 bg-card shadow-xl overflow-hidden"
            >
              <div
                className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6 shrink-0"
                data-search-item
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={collapseSearch}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Kembali
                </Button>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Form Prediksi
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6 space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div data-search-item className="space-y-2.5">
                    <label
                      htmlFor="prediction-search"
                      className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
                    >
                      Cari komoditas
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/70" />
                      <Input
                        id="prediction-search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Ketik nama komoditas..."
                        className="pl-10 h-11 bg-background"
                        autoFocus={isExpanded}
                      />
                    </div>
                  </div>

                  <div data-search-item className="space-y-2.5">
                    <label
                      htmlFor="prediction-commodity"
                      className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
                    >
                      Pilih komoditas
                    </label>
                    <Select
                      value={commodity}
                      onValueChange={(value) => {
                        if (isPredictCommodity(value)) {
                          setCommodity(value);
                          setError(null);
                        }
                      }}
                    >
                      <SelectTrigger id="prediction-commodity" className="h-11">
                        <SelectValue placeholder="Pilih komoditas" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {(searchQuery.trim()
                          ? filteredCommodities
                          : PREDICT_COMMODITIES
                        ).map((item) => (
                          <SelectItem key={item} value={item}>
                            {formatCommodityLabel(item)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div data-search-item>
                    <Button
                      type="submit"
                      className="w-full gap-2 h-11"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Memproses prediksi...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Prediksi Harga
                        </>
                      )}
                    </Button>
                  </div>
                </form>

                {error && (
                  <p className="text-sm text-destructive rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2" data-search-item>
                    {error}
                  </p>
                )}

                {prediction !== null && predictedCommodity && (
                  <div
                    ref={resultRef}
                    className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-2"
                    data-search-item
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Hasil prediksi
                    </p>
                    <p className="font-semibold text-base">
                      {formatCommodityLabel(predictedCommodity)}
                    </p>
                    <p
                      data-prediction-price
                      className="text-2xl sm:text-3xl font-display font-semibold text-primary"
                    >
                      Rp {Math.round(prediction).toLocaleString("id-ID")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Estimasi harga berdasarkan model prediksi.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            ref={col3Ref}
            type="button"
            onClick={isExpanded ? collapseSearch : expandSearch}
            onMouseEnter={isExpanded ? undefined : handleCol3Enter}
            onMouseLeave={isExpanded ? undefined : handleCol3Leave}
            onFocus={isExpanded ? undefined : handleCol3Enter}
            onBlur={isExpanded ? undefined : handleCol3Leave}
            className={`group relative rounded-2xl border overflow-hidden text-left min-h-[280px] lg:min-h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              isExpanded
                ? "border-primary/40 ring-2 ring-primary/20"
                : "border-border/70"
            }`}
            aria-label={
              isExpanded
                ? "Tutup form prediksi harga"
                : "Buka prediksi harga komoditas"
            }
          >
            <div
              ref={col3BgRef}
              className="absolute inset-0 z-0 transition-colors"
            />
            <img
              ref={col3ImageRef}
              src="/images/komoditas.png"
              alt="Prediksi harga komoditas"
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10 z-[1]" />

            <div
              ref={arrowRef}
              className="absolute left-5 top-1/2 z-[3] -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-sm opacity-0"
              aria-hidden
            >
              <ArrowLeft className="h-6 w-6" />
            </div>

            <div
              ref={col3LabelRef}
              className="relative z-[2] flex h-full min-h-[280px] flex-col justify-end p-6 sm:p-8"
            >
              <p className="text-xs uppercase tracking-[0.35em] text-white/80 mb-2">
                Prediksi AI
              </p>
              <h3 className="text-2xl sm:text-3xl font-display font-semibold text-white leading-tight">
                Prediksi
                <br />
                Harga
              </h3>
              <p className="mt-3 text-sm text-white/75">
                {isExpanded ? "Klik untuk kembali" : "Klik untuk mulai prediksi"}
              </p>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
}
