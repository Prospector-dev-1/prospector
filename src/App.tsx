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
import CallCoaching from "./pages/CallCoaching";
import CallUpload from "./pages/CallUpload";
import CallReview from "./pages/CallReview";
import AIReplay from "./pages/AIReplay";
import Progress from "./pages/Progress";
import Challenges from "./pages/Challenges";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import BuyCredits from "./pages/BuyCredits";
import Plans from "./pages/Plans";
import ScriptAnalysis from "./pages/ScriptAnalysis";
import CustomScriptGenerator from "./pages/CustomScriptGenerator";
import AdminUsers from "./pages/AdminUsers";
import NotFound from "./pages/NotFound";
import Help from "./pages/Help";
import Privacy from "./pages/Privacy";
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
            <Route path="/call-coaching/:callId" element={<ProtectedRoute><CallCoaching /></ProtectedRoute>} />
            <Route path="/call-upload" element={<ProtectedRoute><CallUpload /></ProtectedRoute>} />
            <Route path="/call-review/:uploadId" element={<ProtectedRoute><CallReview /></ProtectedRoute>} />
            <Route path="/ai-replay/:uploadId" element={<ProtectedRoute><AIReplay /></ProtectedRoute>} />
            <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
            <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
            <Route path="/buy-credits" element={<ProtectedRoute><BuyCredits /></ProtectedRoute>} />
              <Route path="/script-analysis" element={<ProtectedRoute><ScriptAnalysis /></ProtectedRoute>} />
              <Route path="/custom-script" element={<ProtectedRoute><CustomScriptGenerator /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
            <Route path="/help" element={<Help />} />
            <Route path="/privacy" element={<Privacy />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
