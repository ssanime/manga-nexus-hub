import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-card via-background to-card py-12 md:py-20">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 bg-primary/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 bg-accent/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <div className="flex flex-col items-center text-center">
          {/* Main Heading */}
          <h1 className="mb-6 text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
            <span className="bg-manga-gradient bg-clip-text text-transparent">
              اقرأ آلاف المانجا
            </span>
            <br />
            <span className="text-foreground">مجاناً وبدون إعلانات</span>
          </h1>

          {/* CTA Button */}
          <Link to="/browse">
            <Button
              size="lg"
              className="group relative overflow-hidden bg-primary hover:bg-primary/90 text-primary-foreground shadow-manga-glow"
            >
              <span className="relative z-10 flex items-center gap-2">
                ابدأ القراءة الآن
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
