import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { X, Search, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { STATUS_OPTIONS, SORT_OPTIONS, YEARS } from "@/data/genres";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";

interface AdvancedFiltersProps {
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  search: string;
  genres: string[];
  status: string;
  year: string;
  sortBy: string;
  minRating: string;
}

export const AdvancedFilters = ({ onFilterChange }: AdvancedFiltersProps) => {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    genres: [],
    status: "",
    year: "",
    sortBy: "latest",
    minRating: "",
  });
  
  const [isOpen, setIsOpen] = useState(false);
  const [genreSearch, setGenreSearch] = useState("");
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);

  useEffect(() => {
    fetchGenres();
  }, []);

  const fetchGenres = async () => {
    const { data, error } = await supabase
      .from('genres')
      .select('name')
      .order('name');
    
    if (!error && data) {
      setAvailableGenres(data.map(g => g.name));
    }
  };

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFilterChange(updated);
  };

  const addGenre = (genre: string) => {
    if (!filters.genres.includes(genre)) {
      updateFilters({ genres: [...filters.genres, genre] });
    }
  };

  const removeGenre = (genre: string) => {
    updateFilters({ genres: filters.genres.filter(g => g !== genre) });
  };

  const resetFilters = () => {
    const defaultFilters: FilterState = {
      search: "",
      genres: [],
      status: "",
      year: "",
      sortBy: "latest",
      minRating: "",
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const filteredGenres = availableGenres.filter(genre => 
    genre.toLowerCase().includes(genreSearch.toLowerCase())
  );

  return (
    <Card className="p-4 md:p-6 mb-6 bg-card border-border">
      <div className="space-y-4">
        {/* البحث والترتيب */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>البحث</Label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن مانجا..."
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
                className="pr-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>ترتيب حسب</Label>
            <Select value={filters.sortBy} onValueChange={(value) => updateFilters({ sortBy: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* فلاتر إضافية */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                فلاتر متقدمة
              </span>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>الحالة</Label>
                <Select value={filters.status || "all"} onValueChange={(value) => updateFilters({ status: value === "all" ? "" : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {STATUS_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>السنة</Label>
                <Select value={filters.year || "all"} onValueChange={(value) => updateFilters({ year: value === "all" ? "" : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {YEARS.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>الحد الأدنى للتقييم</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  placeholder="0 - 10"
                  value={filters.minRating}
                  onChange={(e) => updateFilters({ minRating: e.target.value })}
                />
              </div>
            </div>

            {/* التصنيفات */}
            <div className="space-y-2">
              <Label>التصنيفات</Label>
              <Input
                placeholder="ابحث عن تصنيف..."
                value={genreSearch}
                onChange={(e) => setGenreSearch(e.target.value)}
                className="mb-2"
              />
              
              {/* التصنيفات المختارة */}
              {filters.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 p-2 bg-secondary/20 rounded">
                  {filters.genres.map(genre => (
                    <Badge key={genre} variant="default" className="gap-1">
                      {genre}
                      <X 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={() => removeGenre(genre)} 
                      />
                    </Badge>
                  ))}
                </div>
              )}

              {/* قائمة التصنيفات */}
              <div className="max-h-48 overflow-y-auto border border-border rounded p-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {filteredGenres.map(genre => (
                    <Button
                      key={genre}
                      variant={filters.genres.includes(genre) ? "default" : "outline"}
                      size="sm"
                      className="justify-start text-xs"
                      onClick={() => 
                        filters.genres.includes(genre) 
                          ? removeGenre(genre)
                          : addGenre(genre)
                      }
                    >
                      {genre}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* أزرار الإجراءات */}
        <div className="flex justify-between items-center pt-2">
          <div className="text-sm text-muted-foreground">
            {filters.genres.length > 0 && `${filters.genres.length} تصنيف محدد`}
          </div>
          <Button variant="ghost" onClick={resetFilters} size="sm">
            إعادة تعيين الفلاتر
          </Button>
        </div>
      </div>
    </Card>
  );
};
