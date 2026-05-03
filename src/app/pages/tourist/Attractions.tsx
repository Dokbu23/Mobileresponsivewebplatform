import { useState, useEffect } from 'react';
import { MapPin, ChevronDown, ChevronUp, Navigation } from 'lucide-react';
import { getJSON } from '../../lib/api';

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
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [items, setItems] = useState<AttractionType[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getJSON('/api/attractions');
        // normalize backend keys to match UI expectations
        const mapped = data.map((d: any) => ({
          ...d,
          id: String(d.id),
          fullDescription: d.full_description ?? d.fullDescription,
          description: d.description,
        }));
        setItems(mapped);
      } catch (e) {
        setItems([]);
      }
    })();
  }, []);

  const categories = ['All', ...Array.from(new Set(items.map(a => a.category).filter(Boolean))) as string[]];

  const filteredAttractions = selectedCategory === 'All'
    ? items
    : items.filter(a => a.category === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2">Attractions</h1>
        <p className="text-muted-foreground">
          Explore the natural wonders and cultural treasures of Mansalay
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedCategory === category
                ? 'bg-primary text-white'
                : 'bg-white border-2 border-primary/20 text-foreground hover:border-primary'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

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
