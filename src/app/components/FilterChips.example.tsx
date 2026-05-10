/**
 * FilterChips Component - Example Usage
 * 
 * This file demonstrates how to use the FilterChips component.
 * It is not part of the application but serves as documentation.
 */

import { useState } from 'react';
import { FilterChips } from './FilterChips';

interface FilterState {
  search: string;
  barangay: string;
  month: string;
  year: string;
}

export function FilterChipsExample() {
  const [filters, setFilters] = useState<FilterState>({
    search: 'beach',
    barangay: 'Poblacion',
    month: '6',
    year: '2024',
  });

  const handleRemoveFilter = (filterKey: keyof FilterState) => {
    setFilters((prev) => ({
      ...prev,
      [filterKey]: '',
    }));
  };

  const handleReset = () => {
    setFilters({
      search: 'beach',
      barangay: 'Poblacion',
      month: '6',
      year: '2024',
    });
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">FilterChips Component Example</h2>
      
      {/* Basic usage with all filters */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">All Filters Active</h3>
        <FilterChips filters={filters} onRemoveFilter={handleRemoveFilter} />
        <button
          onClick={handleReset}
          className="mt-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          Reset Filters
        </button>
      </div>

      {/* Only search filter */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Search Filter Only</h3>
        <FilterChips
          filters={{ search: 'resort', barangay: '', month: '', year: '' }}
          onRemoveFilter={handleRemoveFilter}
        />
      </div>

      {/* Location and date filters */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Location and Date Filters</h3>
        <FilterChips
          filters={{ search: '', barangay: 'Bato', month: '12', year: '2024' }}
          onRemoveFilter={handleRemoveFilter}
        />
      </div>

      {/* No filters (component hidden) */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">No Filters (Component Hidden)</h3>
        <FilterChips
          filters={{ search: '', barangay: '', month: '', year: '' }}
          onRemoveFilter={handleRemoveFilter}
        />
        <p className="text-sm text-muted-foreground">
          The component is hidden when no filters are active.
        </p>
      </div>

      {/* Current filter state */}
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Current Filter State</h3>
        <pre className="text-sm">
          {JSON.stringify(filters, null, 2)}
        </pre>
      </div>
    </div>
  );
}
