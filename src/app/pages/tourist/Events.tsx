import { useState, useEffect, useMemo } from 'react';
import { Calendar, MapPin, Clock, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { API_BASE, getPublicJSON } from '../../lib/api';
import { SearchBar } from '../../components/SearchBar';
import { FilterButton } from '../../components/FilterButton';
import { FilterSidebar } from '../../components/FilterSidebar';
import { FilterChips } from '../../components/FilterChips';
import { useSearchAndFilter } from '../../hooks/useSearchAndFilter';

interface EventType {
  id: string;
  name: string;
  description?: string;
  fullDescription?: string;
  date?: string;
  time?: string;
  location?: string;
  image?: string;
  category?: string;
  capacity?: string;
}

export function Events() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [items, setItems] = useState<EventType[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Initialize search and filter hook
  const {
    filters,
    queryParams,
    updateFilter,
    clearAllFilters,
    activeFilterCount,
  } = useSearchAndFilter();

  // Fetch events with query parameters
  useEffect(() => {
    (async () => {
      try {
        const data = await getPublicJSON(`/events${queryParams}`);
        const mapped = data.map((d: any) => ({
          ...d,
          id: String(d.id),
          fullDescription: d.full_description ?? d.fullDescription,
          image: d.image
            ? (String(d.image).startsWith('http') ? d.image : `${API_BASE}${d.image}`)
            : undefined,
        }));
        setItems(mapped);
      } catch (e) {
        setItems([]);
      }
    })();
  }, [queryParams]);

  const categories = Array.from(new Set(items.map(e => e.category).filter(Boolean))) as string[];

  // Extract unique barangays for filter sidebar
  const availableBarangays = useMemo(() => {
    const barangays = items
      .map(e => e.location)
      .filter((loc): loc is string => Boolean(loc));
    return Array.from(new Set(barangays)).sort();
  }, [items]);

  // Filter events by selected category from filters
  const filteredEvents = filters.category && filters.category !== 'All'
    ? items.filter(e => e.category === filters.category)
    : items;

  const sortedEvents = [...filteredEvents].sort((a, b) =>
    new Date((a.date || '')).getTime() - new Date((b.date || '')).getTime()
  );

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
        <h1 className="mb-2">Events</h1>
        <p className="text-muted-foreground">
          Discover upcoming festivals, activities, and community gatherings
        </p>
      </div>

      {/* Search Bar with Filter Button */}
      <div className="mb-6 flex gap-3">
        <SearchBar
          value={filters.search}
          onChange={(value) => updateFilter({ search: value })}
          placeholder="Search events by name or description..."
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
        showDateFilters={true}
        showCategoryFilter={true}
      />

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedEvents.map(event => {
          const isExpanded = expandedId === event.id;
          const eventDate = new Date(event.date);
          const isUpcoming = eventDate >= new Date();

          return (
            <div
              key={event.id}
              className={`bg-white border-2 rounded-lg overflow-hidden hover:shadow-lg transition-all ${
                isUpcoming ? 'border-primary/20 hover:border-primary' : 'border-gray-300 opacity-75'
              }`}
            >
              <div className="relative">
                <img
                  src={event.image}
                  alt={event.name}
                  className="w-full h-48 object-cover"
                />
                {!isUpcoming && (
                  <div className="absolute top-2 right-2 bg-gray-800 text-white px-2 py-1 rounded text-xs">
                    Past Event
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="mb-2">
                  <h3 className="mb-1">{event.name}</h3>
                  <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                    {event.category}
                  </span>
                </div>

                <div className="space-y-1 mb-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {eventDate.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {event.time}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {event.location}
                  </div>
                </div>

                {!isExpanded && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {event.description}
                  </p>
                )}

                {isExpanded && (
                  <div className="mb-4 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {event.fullDescription}
                    </p>
                    <div className="bg-primary/5 p-3 rounded-lg">
                      <p className="text-sm flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <strong>Capacity:</strong> {event.capacity}
                      </p>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
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
