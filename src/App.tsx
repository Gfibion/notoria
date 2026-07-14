import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Install from "./pages/Install";
import Tasks from "./pages/Tasks";
import CoffeePage from "./pages/Coffee";
import CloudBackupPage from "./pages/CloudBackup";
import AdminPage from "./pages/Admin";
import ContactPage from "./pages/Contact";
import NotFound from "./pages/NotFound";
import { TasksErrorBoundary } from "./components/tasks/TasksErrorBoundary";
import SplashLoader from "./components/notoria/SplashLoader";
import { isStandalone, hasEverInstalled } from "./lib/pwa";

/**
 * Root route decides between marketing Landing and the app.
 * - Installed users (standalone launch OR previously-installed browser visit)
 *   go straight to /app.
 * - New visitors and un-installed browser users see the Landing page.
 * - `?landing=1` forces the landing view (used by Admin preview link).
 */
const RootRoute = () => {
  const params = new URLSearchParams(window.location.search);
  const forceLanding = params.get("landing") === "1";
  if (!forceLanding && (isStandalone() || hasEverInstalled())) {
    return <Navigate to="/app" replace />;
  }
  return <Landing />;
};

const queryClient = new QueryClient();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <SplashLoader isLoading={isLoading} />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<RootRoute />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/app" element={<Index />} />
              <Route path="/install" element={<Install />} />
              <Route path="/tasks" element={<TasksErrorBoundary><Tasks /></TasksErrorBoundary>} />
              <Route path="/coffee" element={<CoffeePage />} />
              <Route path="/cloud-backup" element={<CloudBackupPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/contact" element={<ContactPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
