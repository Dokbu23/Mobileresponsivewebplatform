import { useState, useEffect, useMemo } from 'react';
import { MapPin, Navigation, X } from 'lucide-react';
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
  view_count?: number;
}

export function Attractions() {
  const [selectedAttraction, setSelectedAttraction] = useState<AttractionType | null>(null);
  const [items, setItems] = useState<AttractionType[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const {
    filters,
    queryParams,
    updateFilter,
    clearAllFilters,
    activeFilterCount,
  } = useSearchAndFilter();

  useEffect(() => {
    (async () => {
      try {
        const data = await getPublicJSON(`/attractions${queryParams}`);
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
          view_count: Number(d.view_count) || 0,
        }));
        setItems(mapped);
      } catch (e: any) {
        console.error('Error fetching attractions:', e);
        setItems([]);
      }
    })();
  }, [queryParams]);

  const [viewedIds] = useState<Set<string>>(new Set());

  const handleOpenModal = (attraction: AttractionType) => {
    if (!viewedIds.has(attraction.id)) {
      viewedIds.add(attraction.id);
      fetch(`${API_BASE}/api/public/attractions/${attraction.id}/view`, { method: 'POST' })
        .catch(() => {});
    }
    setSelectedAttraction(attraction);
  };

  const availableBarangays = useMemo(() => {
    const barangays = items.map(a => a.location).filter((loc): loc is string => Boolean(loc));
    return Array.from(new Set(barangays)).sort();
  }, [items]);

  const categories = useMemo(
    () => Array.from(new Set(items.map(a => a.category).filter(Boolean))) as string[],
    [items]
  );

  const filteredAttractions = filters.category && filters.category !== 'All'
    ? items.filter(a => a.category === filters.category)
    : items;

  const handleRemoveFilter = (filterKey: keyof typeof filters) => updateFilter({ [filterKey]: '' });
  const handleClearAllFilters = () => { clearAllFilters(); setIsSidebarOpen(false); };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2">Attractions</h1>
        <p className="text-muted-foreground">
          Explore the natural wonders and cultural treasures of Mansalay
        </p>
      </div>

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

      <FilterChips filters={filters} onRemoveFilter={handleRemoveFilter} />

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

      {/* Attractions Grid — image + name + category only */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredAttractions.map(attraction => (
          <div
            key={attraction.id}
            onClick={() => handleOpenModal(attraction)}
            className="group cursor-pointer rounded-xl overflow-hidden border-2 border-primary/20 hover:border-primary transition-all hover:scale-105 hover:shadow-xl"
          >
            <div className="relative">
              <img
                src={attraction.image}
                alt={attraction.name}
                className="w-full h-44 object-cover group-hover:brightness-90 transition-all"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <span className="text-white text-xs font-medium">Click to view details</span>
              </div>
            </div>
            <div className="p-3 bg-white">
              <h3 className="font-semibold text-sm line-clamp-1 mb-1">{attraction.name}</h3>
              {attraction.category && (
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                  {attraction.category}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredAttractions.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No attractions found</p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedAttraction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedAttraction(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Large image */}
            <div className="relative">
              <img
                src={selectedAttraction.image}
                alt={selectedAttraction.name}
                className="w-full h-72 object-cover"
              />
              <button
                onClick={() => setSelectedAttraction(null)}
                className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Info */}
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">{selectedAttraction.name}</h2>
                {selectedAttraction.category && (
                  <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                    {selectedAttraction.category}
                  </span>
                )}
              </div>

              {selectedAttraction.location && (
                <div className="flex items-center gap-2 bg-primary/5 rounded-lg p-3">
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium">{selectedAttraction.location}</p>
                  </div>
                </div>
              )}

              {(selectedAttraction.fullDescription || selectedAttraction.description) && (
                <div>
                  <h4 className="font-semibold mb-2">About this Attraction</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedAttraction.fullDescription || selectedAttraction.description}
                  </p>
                </div>
              )}

              {selectedAttraction.location && (
                <div className="bg-primary/5 p-3 rounded-lg">
                  <p className="text-sm flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-primary" />
                    <strong>How to get there:</strong> {selectedAttraction.location}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
