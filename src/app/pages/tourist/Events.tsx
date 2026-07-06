import { useState, useEffect, useMemo } from 'react';
import { Calendar, MapPin, Clock, X, Users } from 'lucide-react';
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
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [items, setItems] = useState<EventType[]>([]);
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
      } catch {
        setItems([]);
      }
    })();
  }, [queryParams]);

  const categories = Array.from(new Set(items.map(e => e.category).filter(Boolean))) as string[];

  const availableBarangays = useMemo(() => {
    const barangays = items.map(e => e.location).filter((loc): loc is string => Boolean(loc));
    return Array.from(new Set(barangays)).sort();
  }, [items]);

  const filteredEvents = filters.category && filters.category !== 'All'
    ? items.filter(e => e.category === filters.category)
    : items;

  const sortedEvents = [...filteredEvents].sort((a, b) =>
    new Date((a.date || '')).getTime() - new Date((b.date || '')).getTime()
  );

  const handleRemoveFilter = (filterKey: keyof typeof filters) => updateFilter({ [filterKey]: '' });
  const handleClearAllFilters = () => { clearAllFilters(); setIsSidebarOpen(false); };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2">Events</h1>
        <p className="text-muted-foreground">Discover upcoming festivals, activities, and community gatherings</p>
      </div>

      <div className="mb-6 flex gap-3">
        <SearchBar value={filters.search} onChange={(value) => updateFilter({ search: value })} placeholder="Search events..." className="flex-1" />
        <FilterButton onClick={() => setIsSidebarOpen(!isSidebarOpen)} activeFilterCount={activeFilterCount} isOpen={isSidebarOpen} />
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
        showDateFilters={true}
        showCategoryFilter={true}
      />

      {/* Events Grid — image + name + category only */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedEvents.map(event => {
          const eventDate = new Date(event.date || '');
          const isUpcoming = eventDate >= new Date();
          return (
            <div
              key={event.id}
              onClick={() => setSelectedEvent(event)}
              className={`group cursor-pointer rounded-xl overflow-hidden border-2 transition-all hover:scale-105 hover:shadow-xl ${
                isUpcoming ? 'border-primary/20 hover:border-primary' : 'border-gray-300 opacity-80'
              }`}
            >
              <div className="relative">
                <img
                  src={event.image}
                  alt={event.name}
                  className="w-full h-44 object-cover group-hover:brightness-90 transition-all"
                />
                {!isUpcoming && (
                  <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-0.5 rounded text-xs">Past</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <span className="text-white text-xs font-medium">Click to view details</span>
                </div>
              </div>
              <div className="p-3 bg-white">
                <h3 className="font-semibold text-sm line-clamp-1 mb-1">{event.name}</h3>
                {event.category && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">{event.category}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {sortedEvents.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No events found</p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Large image */}
            <div className="relative">
              <img
                src={selectedEvent.image}
                alt={selectedEvent.name}
                className="w-full h-72 object-cover"
              />
              {(() => {
                const d = new Date(selectedEvent.date || '');
                const isUpcoming = d >= new Date();
                return !isUpcoming ? (
                  <div className="absolute top-3 right-3 bg-gray-800 text-white px-3 py-1 rounded-full text-xs">Past Event</div>
                ) : null;
              })()}
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Info */}
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">{selectedEvent.name}</h2>
                {selectedEvent.category && (
                  <span className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">{selectedEvent.category}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {selectedEvent.date && (
                  <div className="flex items-center gap-2 bg-primary/5 rounded-lg p-3">
                    <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="text-sm font-medium">
                        {new Date(selectedEvent.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
                {selectedEvent.time && (
                  <div className="flex items-center gap-2 bg-primary/5 rounded-lg p-3">
                    <Clock className="h-5 w-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="text-sm font-medium">{selectedEvent.time}</p>
                    </div>
                  </div>
                )}
                {selectedEvent.location && (
                  <div className="flex items-center gap-2 bg-primary/5 rounded-lg p-3">
                    <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm font-medium">{selectedEvent.location}</p>
                    </div>
                  </div>
                )}
              </div>

              {selectedEvent.capacity && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Capacity: <strong>{selectedEvent.capacity}</strong></span>
                </div>
              )}

              {(selectedEvent.fullDescription || selectedEvent.description) && (
                <div>
                  <h4 className="font-semibold mb-2">About this Event</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedEvent.fullDescription || selectedEvent.description}
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
