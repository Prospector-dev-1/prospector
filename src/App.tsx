import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getWebEnv } from "@/env";
import ScrollManager from "@/components/ScrollManager";

// Initialize console capture for development
if (import.meta.env.DEV) {
  import("@/utils/consoleCapture");
}

// Validate environment on app start
try {
  getWebEnv();
} catch (error) {
  console.error("Environment validation failed:", error);
}
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CallSimulation from "./pages/CallSimulation";
import CallResults from "./pages/CallResults";
import CallCoaching from "./pages/CallCoaching";
import CallUpload from "./pages/CallUpload";
import CallReview from "./pages/CallReview";
import AIReplay from "./pages/AIReplay";
import AIReplaySetup from "./pages/AIReplaySetup";
import EnhancedAIReplay from "./pages/EnhancedAIReplay";
import LiveCall from "./pages/LiveCall";
import CallAnalysis from "./pages/CallAnalysis";
import Progress from "./pages/Progress";
import Challenges from "./pages/Challenges";
import Leaderboard from "./pages/Leaderboard";
import Profile from "./pages/Profile";
import BuyCredits from "./pages/BuyCredits";
import Plans from "./pages/Plans";
import ScriptAnalysis from "./pages/ScriptAnalysis";
import CustomScriptGenerator from "./pages/CustomScriptGenerator";
import NotFound from "./pages/NotFound";
import Help from "./pages/Help";
import Privacy from "./pages/Privacy";
import ProtectedRoute from "@/components/ProtectedRoute";
const AuditPage = React.lazy(() => import("./pages/__audit"));
const CleanupReport = React.lazy(() => import("./pages/CleanupReport"));

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <ScrollManager />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/call-simulation" element={<ProtectedRoute><CallSimulation /></ProtectedRoute>} />
            <Route path="/call-simulation-live" element={<ProtectedRoute><LiveCall /></ProtectedRoute>} />
            <Route path="/call-simulation-live/:callRecordId" element={<ProtectedRoute><LiveCall /></ProtectedRoute>} />
            <Route path="/call-results/:callId" element={<ProtectedRoute><CallResults /></ProtectedRoute>} />
            <Route path="/call-coaching/:callId" element={<ProtectedRoute><CallCoaching /></ProtectedRoute>} />
            <Route path="/call-upload" element={<ProtectedRoute><CallUpload /></ProtectedRoute>} />
            <Route path="/call-review/:uploadId" element={<ProtectedRoute><CallReview /></ProtectedRoute>} />
            <Route path="/ai-replay/:uploadId" element={<ProtectedRoute><AIReplay /></ProtectedRoute>} />
            <Route path="/ai-replay-setup/:callId" element={<ProtectedRoute><AIReplaySetup /></ProtectedRoute>} />
            <Route path="/enhanced-ai-replay/:callId" element={<ProtectedRoute><EnhancedAIReplay /></ProtectedRoute>} />
            <Route path="/live-call/:sessionId" element={<ProtectedRoute><LiveCall /></ProtectedRoute>} />
            <Route path="/call-analysis/:sessionId" element={<ProtectedRoute><CallAnalysis /></ProtectedRoute>} />
            <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
            <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
            <Route path="/buy-credits" element={<ProtectedRoute><BuyCredits /></ProtectedRoute>} />
              <Route path="/script-analysis" element={<ProtectedRoute><ScriptAnalysis /></ProtectedRoute>} />
              <Route path="/custom-script" element={<ProtectedRoute><CustomScriptGenerator /></ProtectedRoute>} />
            <Route path="/help" element={<Help />} />
            <Route path="/privacy" element={<Privacy />} />
            {import.meta.env.DEV && (
              <>
                <Route path="/__audit" element={<ProtectedRoute><React.Suspense fallback={<div>Loading...</div>}><AuditPage /></React.Suspense></ProtectedRoute>} />
                <Route path="/__cleanup-report" element={<ProtectedRoute><React.Suspense fallback={<div>Loading...</div>}><CleanupReport /></React.Suspense></ProtectedRoute>} />
              </>
            )}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
