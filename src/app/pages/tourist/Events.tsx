import { useState } from 'react';
import { Calendar, MapPin, Clock, ChevronDown, ChevronUp, Users } from 'lucide-react';

const mockEvents = [
  {
    id: 'ev1',
    name: 'Mansalay Festival',
    description: 'Annual cultural festival celebrating the heritage and traditions of Mansalay.',
    fullDescription: 'The Mansalay Festival is the town\'s biggest annual celebration, featuring a week of cultural performances, traditional music and dance, street parades, food fairs, and sporting events. The festival highlights local arts, crafts, and cuisine while bringing the community together in joyous celebration.',
    date: '2026-06-15',
    time: '9:00 AM - 9:00 PM',
    location: 'Town Plaza, Mansalay',
    image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400',
    category: 'Cultural',
    capacity: '5000 attendees',
  },
  {
    id: 'ev2',
    name: 'Beach Cleanup Day',
    description: 'Community-driven environmental initiative to keep our beaches pristine.',
    fullDescription: 'Join fellow volunteers in this monthly beach cleanup event. We provide all necessary equipment including gloves, bags, and refreshments. It\'s a great opportunity to meet like-minded people while making a positive impact on our coastal environment. All collected waste is properly sorted and recycled.',
    date: '2026-05-10',
    time: '6:00 AM - 10:00 AM',
    location: 'Puting Buhangin Beach',
    image: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=400',
    category: 'Environment',
    capacity: '200 volunteers',
  },
  {
    id: 'ev3',
    name: 'Local Artisan Market',
    description: 'Weekly market showcasing handmade crafts and local produce.',
    fullDescription: 'Every Saturday, local artisans and farmers gather to sell their handmade products and fresh produce. Discover unique handicrafts, organic vegetables, homemade delicacies, and traditional items. Live music and food stalls create a vibrant atmosphere perfect for family outings.',
    date: '2026-05-03',
    time: '7:00 AM - 2:00 PM',
    location: 'Municipal Market Square',
    image: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=400',
    category: 'Market',
    capacity: '100+ vendors',
  },
  {
    id: 'ev4',
    name: 'Mountain Hiking Expedition',
    description: 'Guided group hike to the summit of Mount Mansalay.',
    fullDescription: 'Experience the thrill of summiting Mount Mansalay with experienced local guides. The expedition includes safety briefing, packed meals, and guided tour of the mountain\'s flora and fauna. Participants should be in good physical condition. Registration required in advance.',
    date: '2026-05-20',
    time: '5:00 AM - 4:00 PM',
    location: 'Mount Mansalay Trail Head',
    image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400',
    category: 'Adventure',
    capacity: '30 hikers',
  },
  {
    id: 'ev5',
    name: 'Sunset Music Concert',
    description: 'Live acoustic music performance by the beach at sunset.',
    fullDescription: 'Enjoy an evening of soulful music as local and visiting artists perform acoustic sets against the backdrop of a stunning sunset. Bring your picnic blanket and friends for a relaxing evening. Food and beverage vendors will be on-site.',
    date: '2026-05-15',
    time: '5:00 PM - 8:00 PM',
    location: 'Beachfront Amphitheater',
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400',
    category: 'Entertainment',
    capacity: '500 attendees',
  },
  {
    id: 'ev6',
    name: 'Traditional Cooking Workshop',
    description: 'Learn to cook authentic Mansalay dishes from expert local chefs.',
    fullDescription: 'Immerse yourself in Mansalay\'s culinary traditions in this hands-on cooking class. Learn to prepare traditional dishes using local ingredients and time-honored techniques. The class includes market tour, cooking demonstration, and a communal meal. Take home recipes and new skills.',
    date: '2026-05-25',
    time: '10:00 AM - 2:00 PM',
    location: 'Community Center Kitchen',
    image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400',
    category: 'Workshop',
    capacity: '20 participants',
  },
];

export function Events() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(mockEvents.map(e => e.category)))];

  const filteredEvents = selectedCategory === 'All'
    ? mockEvents
    : mockEvents.filter(e => e.category === selectedCategory);

  const sortedEvents = [...filteredEvents].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2">Events</h1>
        <p className="text-muted-foreground">
          Discover upcoming festivals, activities, and community gatherings
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
