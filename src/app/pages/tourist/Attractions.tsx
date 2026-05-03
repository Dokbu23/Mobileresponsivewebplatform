import { useState } from 'react';
import { MapPin, ChevronDown, ChevronUp, Navigation } from 'lucide-react';

const mockAttractions = [
  {
    id: 'att1',
    name: 'Puting Buhangin Beach',
    description: 'A pristine white sand beach with crystal-clear waters, perfect for swimming and snorkeling.',
    fullDescription: 'Located along the coastline, Puting Buhangin Beach is one of Mansalay\'s most beautiful natural attractions. The beach features powdery white sand and turquoise waters teeming with marine life. Visitors can enjoy swimming, snorkeling, beach volleyball, and stunning sunset views. Local vendors offer fresh seafood and refreshments.',
    image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400',
    location: 'Coastal Area, Mansalay',
    category: 'Beach',
  },
  {
    id: 'att2',
    name: 'Mount Mansalay',
    description: 'A majestic mountain offering challenging trails and breathtaking panoramic views.',
    fullDescription: 'Mount Mansalay stands as the highest peak in the region, offering adventurous hikers a rewarding challenge. The trail passes through diverse ecosystems, from lowland forests to mossy woodlands. The summit provides a 360-degree view of the surrounding islands and coastline. Best visited during dry season.',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
    location: 'Mountain Range, Mansalay',
    category: 'Mountain',
  },
  {
    id: 'att3',
    name: 'Mansalay Falls',
    description: 'A cascading waterfall surrounded by lush tropical forest, ideal for nature lovers.',
    fullDescription: 'Hidden within a verdant forest, Mansalay Falls features a multi-tiered cascade flowing into a natural pool. The area is perfect for swimming and picnicking. The trail to the falls offers opportunities to spot local wildlife and endemic plant species. Guides are available for hire at the entrance.',
    image: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=400',
    location: 'Forest Reserve, Mansalay',
    category: 'Waterfall',
  },
  {
    id: 'att4',
    name: 'Old Town Heritage Center',
    description: 'Historic district showcasing Spanish colonial architecture and local culture.',
    fullDescription: 'The Old Town Heritage Center preserves centuries of Mansalay history through well-maintained colonial buildings, museums, and cultural exhibits. Visitors can explore the old church, traditional houses, and handicraft workshops. Regular cultural performances showcase local music and dance traditions.',
    image: 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=400',
    location: 'Town Center, Mansalay',
    category: 'Cultural',
  },
  {
    id: 'att5',
    name: 'Coral Garden Marine Sanctuary',
    description: 'Protected marine area with vibrant coral reefs and diverse aquatic life.',
    fullDescription: 'This marine sanctuary is a haven for snorkelers and divers, featuring colorful coral formations and abundant marine biodiversity. The protected waters are home to tropical fish, sea turtles, and various coral species. Eco-tours and diving lessons are available through certified operators.',
    image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400',
    location: 'Marine Protected Area, Mansalay',
    category: 'Marine',
  },
  {
    id: 'att6',
    name: 'Riverside Bamboo Forest',
    description: 'Serene bamboo grove along the river, perfect for peaceful walks and meditation.',
    fullDescription: 'A tranquil escape featuring towering bamboo groves along the riverbank. Wooden walkways wind through the forest, creating a peaceful atmosphere ideal for reflection and photography. The area includes rest pavilions and is particularly beautiful during golden hour.',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400',
    location: 'Riverside, Mansalay',
    category: 'Nature',
  },
];

export function Attractions() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(mockAttractions.map(a => a.category)))];

  const filteredAttractions = selectedCategory === 'All'
    ? mockAttractions
    : mockAttractions.filter(a => a.category === selectedCategory);

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
