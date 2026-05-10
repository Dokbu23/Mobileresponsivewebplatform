import { useState, useEffect, useMemo } from 'react';
import { MapPin, ChevronDown, ChevronUp, Navigation } from 'lucide-react';
import { API_BASE, getPublicJSON } from '../../lib/api';
import { SearchBar } from '../../components/SearchBar';
import { FilterButton } from '../../components/FilterButton';
import { FilterSidebar } from '../../components/FilterSidebar';
import { FilterChips } from '../../components/FilterChips';
import { useSearchAndFilter } from '../../hooks/useSearchAndFilter';

interface AttractionType {
  id: string;
  name: string;
  description?: string;
  fullDescription?: string;
  image?: string;
  location?: string;
  category?: string;
}

export function Attractions() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [items, setItems] = useState<AttractionType[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Initialize search and filter hook
  const {
    filters,
    queryParams,
    updateFilter,
    clearAllFilters,
    activeFilterCount,
  } = useSearchAndFilter();

  // Fetch attractions with query parameters
  useEffect(() => {
    (async () => {
      try {
        const data = await getPublicJSON(`/attractions${queryParams}`);
        
        // API returns an array directly
        const raw = Array.isArray(data) ? data : [];
        
        const mapped = raw.map((d: any) => ({
          id: String(d.id),
          name: d.name,
          description: d.description,
          fullDescription: d.full_description ?? d.fullDescription,
          image: d.image
            ? (String(d.image).startsWith('http') ? d.image : `${API_BASE}${d.image}`)
            : undefined,
          location: d.location,
          category: d.category,
        }));
        setItems(mapped);
      } catch (e: any) {
        console.error('Error fetching attractions:', e);
        setItems([]);
      }
    })();
  }, [queryParams]);

  const categories = Array.from(new Set(items.map(a => a.category).filter(Boolean))) as string[];

  // Extract unique barangays for filter sidebar
  const availableBarangays = useMemo(() => {
    const barangays = items
      .map(a => a.location)
      .filter((loc): loc is string => Boolean(loc));
    return Array.from(new Set(barangays)).sort();
  }, [items]);

  // Filter attractions by selected category from filters
  const filteredAttractions = filters.category && filters.category !== 'All'
    ? items.filter(a => a.category === filters.category)
    : items;

  // Handle filter removal from chips
  const handleRemoveFilter = (filterKey: keyof typeof filters) => {
    updateFilter({ [filterKey]: '' });
  };

  // Handle clear all filters
  const handleClearAllFilters = () => {
    clearAllFilters();
    setIsSidebarOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2">Attractions</h1>
        <p className="text-muted-foreground">
          Explore the natural wonders and cultural treasures of Mansalay
        </p>
      </div>

      {/* Search Bar with Filter Button */}
      <div className="mb-6 flex gap-3">
        <SearchBar
          value={filters.search}
          onChange={(value) => updateFilter({ search: value })}
          placeholder="Search attractions by name or description..."
          className="flex-1"
        />
        <FilterButton
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          activeFilterCount={activeFilterCount}
          isOpen={isSidebarOpen}
        />
      </div>

      {/* Filter Chips */}
      <FilterChips
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
      />

      {/* Filter Sidebar */}
      <FilterSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        filters={filters}
        onFilterChange={updateFilter}
        onClearFilters={handleClearAllFilters}
        availableBarangays={availableBarangays}
        availableCategories={categories}
        showBarangayFilter={true}
        showDateFilters={false}
        showCategoryFilter={true}
      />

      {/* Attractions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAttractions.map(attraction => {
          const isExpanded = expandedId === attraction.id;
          return (
            <div
              key={attraction.id}
              className="bg-white border-2 border-primary/20 rounded-lg overflow-hidden hover:border-primary transition-all hover:shadow-lg"
            >
              <img
                src={attraction.image}
                alt={attraction.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <div className="mb-2">
                  <h3 className="mb-1">{attraction.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {attraction.location}
                  </div>
                </div>

                <div className="mb-3">
                  <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                    {attraction.category}
                  </span>
                </div>

                {!isExpanded && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {attraction.description}
                  </p>
                )}

                {isExpanded && (
                  <div className="mb-4 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {attraction.fullDescription}
                    </p>
                    <div className="bg-primary/5 p-3 rounded-lg">
                      <p className="text-sm flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-primary" />
                        <strong>Location:</strong> {attraction.location}
                      </p>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setExpandedId(isExpanded ? null : attraction.id)}
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-2"
                >
                  {isExpanded ? (
                    <>
                      Less Details <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      More Details <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
