import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import Landing from "@/pages/Landing";
import Waitlist from "@/pages/Waitlist";
import WaitlistAdmin from "@/pages/WaitlistAdmin";
import Login from "@/pages/Login";
import Chat from "@/pages/Chat";
import Dashboard from "@/pages/Dashboard";
import Indbakke from "@/pages/Indbakke";
import Faktura from "@/pages/Faktura";
import Posteringer from "@/pages/Posteringer";
import Kontoplan from "@/pages/Kontoplan";
import Moms from "@/pages/Moms";
import Skat from "@/pages/Skat";
import Bilag from "@/pages/Bilag";
import Import from "@/pages/Import";
import Migrer from "@/pages/Migrer";
import Integrationer from "@/pages/Integrationer";
import Indstillinger from "@/pages/Indstillinger";
import Onboarding from "@/pages/Onboarding";
import ResetPassword from "@/pages/ResetPassword";
import Snap from "@/pages/Snap";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  // Undgå baggrunds-refetch (og loaders) når man skifter faneblad og kommer tilbage
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
      Indlæser...
    </div>
  );
}

function RootRoute() {
  const { session, loading } = useAuth();
  const { company, loading: companyLoading } = useCompany();

  if (loading || (session && companyLoading)) {
    return <FullScreenLoader />;
  }

  if (session) {
    return <Navigate to={company ? "/dashboard" : "/onboarding"} replace />;
  }

  return <Landing />;
}

function LoginRoute() {
  const { session, loading } = useAuth();
  const { company, loading: companyLoading } = useCompany();

  if (loading || (session && companyLoading)) {
    return <FullScreenLoader />;
  }

  if (session) {
    return <Navigate to={company ? "/dashboard" : "/onboarding"} replace />;
  }

  return <Login />;
}

function ProtectedAppPage({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { session, loading } = useAuth();
  const { company, loading: companyLoading } = useCompany();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  if (loading || (session && companyLoading) || (session && adminOnly && adminLoading)) {
    return <FullScreenLoader />;
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!company) {
    return <Navigate to="/onboarding" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
}

function OnboardingRoute() {
  const { session, loading } = useAuth();
  const { company, loading: companyLoading } = useCompany();

  if (loading || (session && companyLoading)) {
    return <FullScreenLoader />;
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  if (company) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Onboarding />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/waitlist" element={<Waitlist />} />
            <Route path="/admin/login" element={<LoginRoute />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/onboarding" element={<OnboardingRoute />} />
            <Route path="/chat" element={<ProtectedAppPage><Chat /></ProtectedAppPage>} />
            <Route path="/dashboard" element={<ProtectedAppPage><Dashboard /></ProtectedAppPage>} />
            <Route path="/indbakke" element={<ProtectedAppPage><Indbakke /></ProtectedAppPage>} />
            <Route path="/faktura" element={<ProtectedAppPage><Faktura /></ProtectedAppPage>} />
            <Route path="/posteringer" element={<ProtectedAppPage><Posteringer /></ProtectedAppPage>} />
            <Route path="/kontoplan" element={<ProtectedAppPage><Kontoplan /></ProtectedAppPage>} />
            <Route path="/moms" element={<ProtectedAppPage><Moms /></ProtectedAppPage>} />
            <Route path="/skat" element={<ProtectedAppPage><Skat /></ProtectedAppPage>} />
            <Route path="/bilag" element={<ProtectedAppPage><Bilag /></ProtectedAppPage>} />
            <Route path="/import" element={<ProtectedAppPage><Import /></ProtectedAppPage>} />
            <Route path="/migrer" element={<ProtectedAppPage><Migrer /></ProtectedAppPage>} />
            <Route path="/integrationer" element={<ProtectedAppPage><Integrationer /></ProtectedAppPage>} />
            <Route path="/indstillinger" element={<ProtectedAppPage><Indstillinger /></ProtectedAppPage>} />
            <Route path="/snap" element={<ProtectedAppPage><Snap /></ProtectedAppPage>} />
            <Route path="/waitlist-admin" element={<ProtectedAppPage adminOnly><WaitlistAdmin /></ProtectedAppPage>} />
            <Route path="/admin/waitlist" element={<Navigate to="/waitlist-admin" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
