/**
 * PasarPage — Halaman CRUD Pasar.
 * Menampilkan daftar pasar dalam bentuk kartu (mobile) atau tabel (desktop).
 * Mendukung pencarian, filter status, sorting, ekspor CSV, dan impor CSV.
 */
import { useState, useRef, useEffect } from "react";
import { useData } from "@/contexts/DataContext";
import type { Pasar } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Search,
  Download,
  Upload,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { exportToCSV, parseCSV } from "@/lib/csv-utils";

type SortField = "nama" | "alamat" | "koordinat" | "status";
type SortDir = "asc" | "desc";

/** Form default untuk pasar baru */
const emptyPasar = {
  nama: "",
  longitude: 0,
  latitude: 0,
  alamat: "",
  is_active: 1,
};

export default function PasarPage() {
  const { pasar, createPasar, updatePasar, deletePasar, refreshPasar } =
    useData();
  const isMobile = useIsMobile();

  /* ===== State pencarian, filter, sorting ===== */
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Pasar | null>(null);
  const [form, setForm] = useState<Omit<Pasar, "id">>(emptyPasar);
  const [sortField, setSortField] = useState<SortField>("nama");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      await refreshPasar();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshPasar]);

  /* ===== Filter & Sort data ===== */
  const filtered = pasar
    .filter(
      (p) =>
        p.nama.toLowerCase().includes(search.toLowerCase()) ||
        p.alamat.toLowerCase().includes(search.toLowerCase()),
    )
    .filter(
      (p) =>
        filterStatus === "all" ||
        (filterStatus === "active" ? p.is_active === 1 : p.is_active === 0),
    )
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;

      if (sortField === "koordinat") {
        const byLongitude = (a.longitude - b.longitude) * mul;
        if (byLongitude !== 0) return byLongitude;
        return (a.latitude - b.latitude) * mul;
      }

      if (sortField === "status") {
        return (a.is_active - b.is_active) * mul;
      }

      if (sortField === "alamat") {
        return a.alamat.localeCompare(b.alamat) * mul;
      }

      return a.nama.localeCompare(b.nama) * mul;
    });

  /** Toggle sorting — klik kolom yang sama untuk ubah arah */
  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  /* ===== Handler form ===== */
  const openAdd = () => {
    setEditing(null);
    setForm(emptyPasar);
    setDialogOpen(true);
  };
  const openEdit = (p: Pasar) => {
    setEditing(p);
    setForm({
      nama: p.nama,
      longitude: p.longitude,
      latitude: p.latitude,
      alamat: p.alamat,
      is_active: p.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) {
      toast.error("Nama pasar wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await updatePasar(editing.id, form);
        toast.success("Pasar diperbarui");
      } else {
        await createPasar(form);
        toast.success("Pasar ditambahkan");
      }
      await refreshPasar();
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan pasar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePasar(id);
      toast.success("Pasar dinonaktifkan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus pasar");
    }
  };

  /* ===== Ekspor & Impor CSV ===== */
  const handleExport = () => {
    exportToCSV(pasar, "pasar", [
      { key: "nama", label: "Nama" },
      { key: "alamat", label: "Alamat" },
      { key: "longitude", label: "Longitude" },
      { key: "latitude", label: "Latitude" },
      { key: "is_active", label: "Aktif" },
    ]);
    toast.success("Data diekspor");
  };

  const readFileAsText = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const rows = parseCSV(text);
      let count = 0;
      for (const r of rows) {
        if (r["Nama"]?.trim()) {
          try {
            await createPasar({
              nama: r["Nama"].trim(),
              alamat: r["Alamat"] || "",
              longitude: parseFloat(r["Longitude"]) || 0,
              latitude: parseFloat(r["Latitude"]) || 0,
              is_active: r["Aktif"] === "0" ? 0 : 1,
            });
            count++;
          } catch {
            // lewati baris yang gagal
          }
        }
      }
      toast.success(`${count} pasar diimpor`);
      await refreshPasar();
    } catch {
      toast.error("Gagal mengimpor CSV");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  /* ===== Render ===== */
  return (
    <div className="space-y-4">
      {/* ===== Header dengan aksi ===== */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Pasar</h1>
        <div className="flex items-center gap-2">
          {/* Tombol ekspor/impor — hidden di mobile, muncul di bawah */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="hidden sm:flex"
          >
            <Download className="h-4 w-4 mr-1" /> Ekspor
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="hidden sm:flex"
          >
            <Upload className="h-4 w-4 mr-1" /> Impor
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImport}
            className="hidden"
          />
          {/* Dialog tambah/edit pasar */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={openAdd}
                size="sm"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Plus className="h-4 w-4 mr-1" /> Tambah
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editing ? "Edit Pasar" : "Tambah Pasar"}
                </DialogTitle>
                <DialogDescription>
                  {editing
                    ? "Perbarui informasi pasar yang sudah terdaftar."
                    : "Isi formulir untuk menambahkan pasar baru."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nama</Label>
                  <Input
                    value={form.nama}
                    onChange={(e) => setForm({ ...form, nama: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Longitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={form.longitude}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          longitude: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Latitude</Label>
                    <Input
                      type="number"
                      step="any"
                      value={form.latitude}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          latitude: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Alamat</Label>
                  <Input
                    value={form.alamat}
                    onChange={(e) =>
                      setForm({ ...form, alamat: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_active === 1}
                    onCheckedChange={(c) =>
                      setForm({ ...form, is_active: c ? 1 : 0 })
                    }
                  />
                  <Label>Aktif</Label>
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {submitting
                    ? "Menyimpan..."
                    : editing
                      ? "Perbarui"
                      : "Simpan"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ===== Pencarian & Filter ===== */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari pasar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-28 sm:w-36 h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
        {/* Tombol ekspor mobile */}
        <Button
          variant="outline"
          size="sm"
          className="h-9 sm:hidden"
          onClick={handleExport}
        >
          <Download className="h-4 w-4 mr-1" /> Ekspor
        </Button>
      </div>

      {/* ===== Tampilan Data ===== */}
      {loading ? (
        <p className="text-center text-muted-foreground py-8 text-sm">
          Memuat data pasar...
        </p>
      ) : isMobile ? (
        /* --- Tampilan kartu untuk mobile --- */
        <div className="space-y-2">
          {filtered.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{p.nama}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3 shrink-0" />{" "}
                      <span className="truncate">{p.alamat || "-"}</span>
                    </p>
                    {/* Badge status — hijau untuk aktif, abu untuk nonaktif */}
                    <span
                      className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${p.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}
                    >
                      {p.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  {/* Aksi edit & hapus */}
                  <div className="flex gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Pasar?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Pasar "{p.nama}" akan dinonaktifkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => void handleDelete(p.id)}
                          >
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">
              Tidak ada data pasar.
            </p>
          )}
        </div>
      ) : (
        /* --- Tampilan tabel untuk desktop --- */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("nama")}
                >
                  Nama <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("alamat")}
                >
                  Alamat <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("koordinat")}
                >
                  Koordinat <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("status")}
                >
                  Status
                  <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </TableHead>
                <TableHead className="text-right w-24">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nama}</TableCell>
                  <TableCell className="text-sm">{p.alamat || "-"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.longitude}, {p.latitude}
                  </TableCell>
                  <TableCell>
                    {/* Status badge — konsisten dengan design system */}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}
                    >
                      {p.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Pasar?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Pasar "{p.nama}" akan dinonaktifkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => void handleDelete(p.id)}
                          >
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
