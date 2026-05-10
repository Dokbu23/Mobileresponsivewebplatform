import { useState } from 'react';
import { FilterSidebar } from './FilterSidebar';

/**
 * Example usage of the FilterSidebar component
 * 
 * This demonstrates how to integrate the FilterSidebar into a page
 * with proper state management and filter handling.
 */
export function FilterSidebarExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    barangay: '',
    month: '',
    year: '',
  });

  // Example barangays - in real usage, fetch from API or extract from data
  const availableBarangays = [
    'Poblacion',
    'Maliwanag',
    'Balogo',
    'Bonbon',
    'Mabuhay',
  ];

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    // In real usage, trigger API call here with updated filters
    console.log('Filters updated:', { ...filters, ...newFilters });
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      barangay: '',
      month: '',
      year: '',
    });
    // In real usage, trigger API call here to fetch all items
    console.log('Filters cleared');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2">FilterSidebar Example</h1>
        <p className="text-muted-foreground">
          Click the button below to open the filter sidebar
        </p>
      </div>

      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
      >
        Open Filters
      </button>

      {/* Current Filters Display */}
      <div className="mt-8 p-4 bg-primary/5 rounded-lg">
        <h3 className="text-sm font-medium mb-2">Current Filters:</h3>
        <pre className="text-xs">{JSON.stringify(filters, null, 2)}</pre>
      </div>

      {/* FilterSidebar Component */}
      <FilterSidebar
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        availableBarangays={availableBarangays}
        showBarangayFilter={true}
        showDateFilters={true}
      />
    </div>
  );
}
