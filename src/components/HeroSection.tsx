import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

export const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-card via-background to-card py-20 md:py-32">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 bg-primary/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 bg-accent/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div className="mb-6 flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 backdrop-blur-sm border border-primary/20">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">أفضل موقع لقراءة المانجا العربية</span>
          </div>

          {/* Main Heading */}
          <h1 className="mb-6 text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
            <span className="bg-manga-gradient bg-clip-text text-transparent">
              اقرأ آلاف المانجا
            </span>
            <br />
            <span className="text-foreground">مجاناً وبدون إعلانات</span>
          </h1>

          {/* Description */}
          <p className="mb-10 max-w-2xl text-lg md:text-xl text-muted-foreground">
            استمتع بقراءة أحدث فصول المانجا والمانهوا مترجمة للعربية بجودة عالية وتجربة قراءة سلسة
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
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
            
            <Link to="/popular">
              <Button
                size="lg"
                variant="outline"
                className="border-border hover:bg-secondary/50 hover:border-primary transition-all"
              >
                المانجا الأكثر شعبية
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 md:gap-16">
            <div className="flex flex-col items-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">5000+</div>
              <div className="text-sm text-muted-foreground">مانجا</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">100K+</div>
              <div className="text-sm text-muted-foreground">فصل</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">50K+</div>
              <div className="text-sm text-muted-foreground">مستخدم</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
