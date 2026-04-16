import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Bogfoer from "@/pages/Bogfoer";
import Indbakke from "@/pages/Indbakke";
import Bilag from "@/pages/Bilag";
import Skat from "@/pages/Skat";
import Placeholder from "@/pages/Placeholder";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/bogfoer" element={<Bogfoer />} />
            <Route path="/indbakke" element={<Indbakke />} />
            <Route path="/bilag" element={<Bilag />} />
            <Route path="/skat" element={<Skat />} />
            <Route path="/posteringer" element={<Placeholder title="Posteringer" />} />
            <Route path="/kontoplan" element={<Placeholder title="Kontoplan" />} />
            <Route path="/moms" element={<Placeholder title="Moms" />} />
            <Route path="/import" element={<Placeholder title="CSV Import" />} />
            <Route path="/integrationer" element={<Placeholder title="Integrationer" />} />
            <Route path="/indstillinger" element={<Placeholder title="Indstillinger" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
