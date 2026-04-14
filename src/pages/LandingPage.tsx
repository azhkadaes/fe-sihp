/**
 * LandingPage — Halaman publik yang ditampilkan sebelum login.
 * Menampilkan informasi umum tentang SIHP beserta ringkasan data.
 */
import { useData } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Store, Package, Building2, LogIn, BarChart3, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const { pasar, komoditas, tempatUsaha } = useData();

  /** Statistik ringkasan untuk kartu informasi */
  const stats = [
    { label: 'Pasar Terdaftar', value: pasar.filter(p => p.is_active).length, icon: Store, color: 'text-accent' },
    { label: 'Komoditas Dipantau', value: komoditas.length, icon: Package, color: 'text-success' },
    { label: 'Tempat Usaha', value: tempatUsaha.filter(t => t.is_active).length, icon: Building2, color: 'text-info' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ===== Navbar ===== */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
          <span className="text-lg font-bold text-accent tracking-tight">SIHP</span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login">
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <LogIn className="h-4 w-4 mr-1.5" /> Masuk
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ===== Hero Section ===== */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24">
        <div className="max-w-2xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium">
            <BarChart3 className="h-4 w-4" />
            Sistem Informasi Harga Pangan
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
            Pantau Harga Pangan <br className="hidden sm:block" />
            <span className="text-accent">Secara Real-Time</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Sistem informasi untuk memantau dan melaporkan harga komoditas pangan
            di berbagai pasar secara akurat dan terstruktur.
          </p>
          <Link to="/login">
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 mt-2">
              <LogIn className="h-5 w-5 mr-2" /> Masuk ke Dashboard
            </Button>
          </Link>
        </div>

        {/* ===== Statistik Ringkasan ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 w-full max-w-2xl">
          {stats.map(s => (
            <Card key={s.label} className="text-center hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-2">
                <s.icon className={`h-8 w-8 mx-auto ${s.color}`} />
                <p className="text-3xl font-bold">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ===== Fitur Highlight ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 w-full max-w-2xl">
          {[
            { icon: BarChart3, title: 'Monitoring Harga', desc: 'Pantau perubahan harga harian komoditas pangan di seluruh pasar' },
            { icon: Shield, title: 'Data Terstandarisasi', desc: 'Konversi otomatis satuan harga ke standar yang seragam' },
            { icon: Store, title: 'Multi Pasar', desc: 'Kelola dan bandingkan data dari berbagai pasar sekaligus' },
          ].map(f => (
            <Card key={f.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-2">
                <f.icon className="h-6 w-6 text-accent" />
                <h3 className="font-semibold text-sm">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Sistem Informasi Harga Pangan
      </footer>
    </div>
  );
}
