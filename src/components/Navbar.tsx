import { Link } from "react-router-dom";
import { Search, BookOpen, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export const Navbar = () => {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img 
                src="/logo.png" 
                alt="Mangafas Logo" 
                className="h-12 w-12 object-contain transition-transform group-hover:scale-110 drop-shadow-lg"
              />
              <div className="absolute inset-0 blur-xl bg-primary/20 group-hover:bg-primary/40 transition-all" />
            </div>
            <span className="text-2xl font-bold bg-manga-gradient bg-clip-text text-transparent">
              Mangafas
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6 flex-1 justify-center">
            <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">
              الرئيسية
            </Link>
            <Link to="/manga" className="text-sm font-medium hover:text-primary transition-colors">
              مانجا
            </Link>
            <Link to="/manhwa" className="text-sm font-medium hover:text-primary transition-colors">
              مانهوا
            </Link>
            <Link to="/manhua" className="text-sm font-medium hover:text-primary transition-colors">
              مانها
            </Link>
            <Link to="/teams" className="text-sm font-medium hover:text-primary transition-colors">
              الفرق
            </Link>
          </div>

          <div className="hidden md:flex max-w-xs">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="ابحث..."
                className="pl-10 bg-secondary/50 border-border focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
                <User className="h-5 w-5" />
              </Button>
            ) : (
              <Link to="/auth">
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {searchOpen && (
          <div className="pb-4 md:hidden animate-fade-in">
            <Input
              type="search"
              placeholder="ابحث عن مانجا..."
              className="bg-secondary/50"
            />
          </div>
        )}
      </div>
    </nav>
  );
};