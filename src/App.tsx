import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import MangaDetail from "./pages/MangaDetail";
import Reader from "./pages/Reader";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import Manga from "./pages/Manga";
import Manhwa from "./pages/Manhwa";
import Manhua from "./pages/Manhua";
import Teams from "./pages/Teams";
import CreateTeam from "./pages/CreateTeam";
import TeamDetail from "./pages/TeamDetail";
import TeamDashboard from "./pages/TeamDashboard";
import NotFound from "./pages/NotFound";
import Recent from "./pages/Recent";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import Privacy from "./pages/Privacy";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/manga" element={<Manga />} />
          <Route path="/manhwa" element={<Manhwa />} />
          <Route path="/manhua" element={<Manhua />} />
          <Route path="/manga/:id" element={<MangaDetail />} />
          <Route path="/read/:mangaId/:chapterId" element={<Reader />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/create" element={<CreateTeam />} />
          <Route path="/teams/:slug" element={<TeamDetail />} />
          <Route path="/teams/:slug/dashboard" element={<TeamDashboard />} />
          <Route path="/recent" element={<Recent />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;