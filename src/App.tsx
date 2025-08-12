import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CallSimulation from "./pages/CallSimulation";
import CallResults from "./pages/CallResults";
import Profile from "./pages/Profile";
import BuyCredits from "./pages/BuyCredits";
import ScriptAnalysis from "./pages/ScriptAnalysis";
import CustomScriptGenerator from "./pages/CustomScriptGenerator";
import NotFound from "./pages/NotFound";
import Help from "./pages/Help";
import ProtectedRoute from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
              <Route path="/call-simulation" element={<ProtectedRoute><CallSimulation /></ProtectedRoute>} />
              <Route path="/call-results/:callId" element={<ProtectedRoute><CallResults /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/buy-credits" element={<ProtectedRoute><BuyCredits /></ProtectedRoute>} />
              <Route path="/script-analysis" element={<ProtectedRoute><ScriptAnalysis /></ProtectedRoute>} />
              <Route path="/custom-script" element={<ProtectedRoute><CustomScriptGenerator /></ProtectedRoute>} />
            <Route path="/help" element={<Help />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
