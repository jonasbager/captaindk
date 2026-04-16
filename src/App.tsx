import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Bogfoer from "@/pages/Bogfoer";
import Indbakke from "@/pages/Indbakke";
import Bilag from "@/pages/Bilag";
import Skat from "@/pages/Skat";
import Posteringer from "@/pages/Posteringer";
import Kontoplan from "@/pages/Kontoplan";
import Moms from "@/pages/Moms";
import Import from "@/pages/Import";
import Integrationer from "@/pages/Integrationer";
import Indstillinger from "@/pages/Indstillinger";
import Faktura from "@/pages/Faktura";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Indlæser...</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route
      path="/*"
      element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/bogfoer" element={<Bogfoer />} />
              <Route path="/indbakke" element={<Indbakke />} />
              <Route path="/faktura" element={<Faktura />} />
              <Route path="/bilag" element={<Bilag />} />
              <Route path="/skat" element={<Skat />} />
              <Route path="/posteringer" element={<Posteringer />} />
              <Route path="/kontoplan" element={<Kontoplan />} />
              <Route path="/moms" element={<Moms />} />
              <Route path="/import" element={<Import />} />
              <Route path="/integrationer" element={<Integrationer />} />
              <Route path="/indstillinger" element={<Indstillinger />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      }
    />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
