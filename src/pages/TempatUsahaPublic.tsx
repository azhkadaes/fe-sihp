import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package } from "lucide-react";

export default function TempatUsahaPublic() {
  const { id } = useParams();
  const { tempatUsaha, pasar, komoditas, komoditasDijual, hargaPelaporan } = useData();

  const tu = tempatUsaha.find(t => t.id === id);
  const pasarInfo = tu ? pasar.find(p => p.id === tu.pasar_id) : undefined;

  const latestByKey = useMemo(() => {
    return hargaPelaporan.reduce<Record<string, typeof hargaPelaporan[number]>>((acc, item) => {
      const key = `${item.pasar_id}-${item.komoditas_id}`;
      if (!acc[key] || item.tanggal > acc[key].tanggal) acc[key] = item;
      return acc;
    }, {});
  }, [hargaPelaporan]);

  const rows = useMemo(() => {
    if (!tu) return [] as Array<{ id: string; nama: string; satuan: string; harga?: number }>;
    return komoditasDijual
      .filter(kd => kd.tempat_usaha_id === tu.id && kd.is_active)
      .map(kd => {
        const kom = komoditas.find(k => k.id === kd.komoditas_id);
        const latest = latestByKey[`${tu.pasar_id}-${kd.komoditas_id}`];
        return {
          id: kd.id,
          nama: kom?.nama ?? "Komoditas",
          satuan: kom?.satuan_dasar ?? "-",
          harga: latest?.harga_rata_rata,
        };
      });
  }, [tu, komoditasDijual, komoditas, latestByKey]);

  if (!tu) {
    return (
      <div className="min-h-screen bg-background text-foreground px-4 py-16">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h1 className="text-2xl font-semibold">Tempat usaha tidak ditemukan</h1>
          <p className="text-muted-foreground">Data yang Anda cari tidak tersedia.</p>
          <Link to="/">
            <Button variant="outline">Kembali ke Beranda</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tempat Usaha</p>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold">{tu.nama}</h1>
            <p className="text-sm text-muted-foreground">{pasarInfo?.nama ?? "-"}</p>
          </div>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map(row => (
            <Card key={row.id} className="group hover:shadow-lg transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{row.satuan}</p>
                  <h3 className="font-semibold text-lg">{row.nama}</h3>
                </div>
                <p className="text-xl font-semibold text-primary">
                  {row.harga ? `Rp ${row.harga.toLocaleString("id-ID")}` : "Belum ada harga"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {rows.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Komoditas belum terdaftar untuk tempat usaha ini.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
