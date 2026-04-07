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

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
    <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="pasar" element={<PasarPage />} />
      <Route path="komoditas" element={<KomoditasPage />} />
      <Route path="tempat-usaha" element={<TempatUsahaPage />} />
      <Route path="harga-rutin" element={<HargaRutinPage />} />
      <Route path="harga-pelaporan" element={<HargaPelaporanPage />} />
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
