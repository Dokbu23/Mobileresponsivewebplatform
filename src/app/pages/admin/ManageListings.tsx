import { useState } from 'react';
import { Hotel, Store, Check, X, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Listing {
  id: string;
  type: 'resort' | 'enterprise';
  name: string;
  owner: string;
  email: string;
  phone: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
}

const mockListings: Listing[] = [
  {
    id: 'r1',
    type: 'resort',
    name: 'Paradise Beach Resort',
    owner: 'Juan Dela Cruz',
    email: 'juan@paradisebeach.com',
    phone: '+63 912 345 6789',
    description: 'Luxury beachfront resort with 50 rooms and full amenities',
    status: 'pending',
    submittedDate: '2026-04-25',
  },
  {
    id: 'r2',
    type: 'resort',
    name: 'Mountain View Inn',
    owner: 'Maria Santos',
    email: 'maria@mountainview.com',
    phone: '+63 923 456 7890',
    description: 'Cozy mountain retreat with 20 rooms',
    status: 'approved',
    submittedDate: '2026-04-20',
  },
  {
    id: 'e1',
    type: 'enterprise',
    name: 'Local Crafts Shop',
    owner: 'Pedro Reyes',
    email: 'pedro@localcrafts.com',
    phone: '+63 934 567 8901',
    description: 'Handmade local crafts and souvenirs',
    status: 'pending',
    submittedDate: '2026-04-26',
  },
  {
    id: 'e2',
    type: 'enterprise',
    name: 'Organic Farm Products',
    owner: 'Ana Garcia',
    email: 'ana@organicfarm.com',
    phone: '+63 945 678 9012',
    description: 'Fresh organic produce and farm products',
    status: 'approved',
    submittedDate: '2026-04-22',
  },
  {
    id: 'e3',
    type: 'enterprise',
    name: 'Seaside Souvenirs',
    owner: 'Carlos Mendoza',
    email: 'carlos@seasidesouvenirs.com',
    phone: '+63 956 789 0123',
    description: 'Beach-themed souvenirs and gifts',
    status: 'rejected',
    submittedDate: '2026-04-18',
  },
];

export function ManageListings() {
  const [listings, setListings] = useState<Listing[]>(mockListings);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [filterType, setFilterType] = useState<'all' | 'resort' | 'enterprise'>('all');

  const handleApprove = (id: string) => {
    setListings(prev =>
      prev.map(listing =>
        listing.id === id ? { ...listing, status: 'approved' as const } : listing
      )
    );
    toast.success('Listing approved successfully');
  };

  const handleReject = (id: string) => {
    setListings(prev =>
      prev.map(listing =>
        listing.id === id ? { ...listing, status: 'rejected' as const } : listing
      )
    );
    toast.error('Listing rejected');
  };

  const filteredListings = listings.filter(listing => {
    const statusMatch = filterStatus === 'all' || listing.status === filterStatus;
    const typeMatch = filterType === 'all' || listing.type === filterType;
    return statusMatch && typeMatch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-3 py-1 bg-orange-100 text-orange-700 border border-orange-300 rounded-full text-sm flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="px-3 py-1 bg-green-100 text-green-700 border border-green-300 rounded-full text-sm flex items-center gap-1">
            <Check className="h-4 w-4" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 bg-red-100 text-red-700 border border-red-300 rounded-full text-sm flex items-center gap-1">
            <X className="h-4 w-4" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2">Manage Listings</h1>
        <p className="text-muted-foreground">
          Review and manage resort and enterprise registrations
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border-2 border-primary/20 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-2">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-2">Filter by Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-4 py-2 border-2 border-primary/20 rounded-lg focus:border-primary outline-none"
            >
              <option value="all">All Types</option>
              <option value="resort">Resorts</option>
              <option value="enterprise">Enterprises</option>
            </select>
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      <div className="space-y-4">
        {filteredListings.length === 0 ? (
          <div className="bg-white border-2 border-primary/20 rounded-lg p-12 text-center">
            <p className="text-muted-foreground">No listings found</p>
          </div>
        ) : (
          filteredListings.map(listing => (
            <div
              key={listing.id}
              className="bg-white border-2 border-primary/20 rounded-lg p-6 hover:border-primary transition-all"
            >
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                    {listing.type === 'resort' ? (
                      <Hotel className="h-8 w-8 text-primary" />
                    ) : (
                      <Store className="h-8 w-8 text-primary" />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3>{listing.name}</h3>
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                          {listing.type === 'resort' ? 'Resort' : 'Enterprise'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Owner: {listing.owner}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Submitted: {new Date(listing.submittedDate).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(listing.status)}
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    {listing.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 text-sm">
                    <p>
                      <span className="text-muted-foreground">Email:</span>{' '}
                      <a href={`mailto:${listing.email}`} className="text-primary hover:underline">
                        {listing.email}
                      </a>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Phone:</span> {listing.phone}
                    </p>
                  </div>

                  {listing.status === 'pending' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(listing.id)}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-2"
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(listing.id)}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
