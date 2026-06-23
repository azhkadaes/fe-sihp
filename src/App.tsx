import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DataProvider } from "@/contexts/DataContext";
import AppLayout from "@/components/layout/AppLayout";
import LoginPage from "@/pages/Login";
import DashboardPage from "@/pages/Dashboard";
import PasarPage from "@/pages/PasarPage";
import KomoditasPage from "@/pages/KomoditasPage";
import TempatUsahaPage from "@/pages/TempatUsahaPage";
import HargaRutinPage from "@/pages/HargaRutinPage";
import HargaPelaporanPage from "@/pages/HargaPelaporanPage";
import NotFound from "@/pages/NotFound";
import LandingPage from "@/pages/LandingPage";
import TempatUsahaPublic from "@/pages/TempatUsahaPublic";
import KomoditasPublicDashboard from "@/pages/KomoditasPublicDashboard";
import KomoditasPublicDetail from "@/pages/KomoditasPublicDetail";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

/** Landing page: redirect ke dashboard jika sudah login */
function LandingRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route
      path="/"
      element={
        <LandingRoute>
          \
          <LandingPage />
        </LandingRoute>
      }
    />
    <Route path="/public/tempat-usaha/:id" element={<TempatUsahaPublic />} />
    <Route path="/public/komoditas/:id" element={<KomoditasPublicDetail />} />
    <Route path="/public/komoditas" element={<KomoditasPublicDashboard />} />
    <Route
      path="/login"
      element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      }
    />
    <Route
      path="/app"
      element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="pasar" element={<PasarPage />} />
      <Route path="komoditas" element={<KomoditasPage />} />
      <Route path="tempat-usaha" element={<TempatUsahaPage />} />
      <Route path="harga-rutin" element={<HargaRutinPage />} />
      <Route path="harga-pelaporan" element={<HargaPelaporanPage />} />
    </Route>
    {/* Keep old routes working */}
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<DashboardPage />} />
    </Route>
    <Route
      path="/pasar"
      element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<PasarPage />} />
    </Route>
    <Route
      path="/komoditas"
      element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<KomoditasPage />} />
    </Route>
    <Route
      path="/tempat-usaha"
      element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<TempatUsahaPage />} />
    </Route>
    <Route
      path="/harga-rutin"
      element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<HargaRutinPage />} />
    </Route>
    <Route
      path="/harga-pelaporan"
      element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<HargaPelaporanPage />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
