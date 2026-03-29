import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/i18n/I18nProvider";
import { SupabaseAuthProvider } from "@/contexts/SupabaseAuthContext";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Trades from "./pages/Trades";
import NewTrade from "./pages/NewTrade";
import Analytics from "./pages/Analytics";
import CalendarView from "./pages/CalendarView";
import Playbook from "./pages/Playbook";
import SettingsPage from "./pages/SettingsPage";
import AIAssistant from "./pages/AIAssistant";
import Gallery from "./pages/Gallery";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="trade-mastermind-theme">
    <I18nProvider>
    <SupabaseAuthProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trades" element={<Trades />} />
            <Route path="/trades/new" element={<NewTrade />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/playbook" element={<Playbook />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/ai" element={<AIAssistant />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </SupabaseAuthProvider>
    </I18nProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
