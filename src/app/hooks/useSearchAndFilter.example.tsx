/**
 * Example usage of useSearchAndFilter hook
 * 
 * This file demonstrates how to use the useSearchAndFilter hook
 * in a tourist page component (Events, Products, Attractions, Accommodations)
 */

import { useEffect, useState } from 'react';
import { useSearchAndFilter } from './useSearchAndFilter';
import { getPublicJSON } from '../lib/api';

interface ExampleItem {
  id: number;
  name: string;
  description: string;
  location?: string;
  date?: string;
}

export function ExampleUsage() {
  const [items, setItems] = useState<ExampleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use the search and filter hook
  const {
    filters,
    queryParams,
    updateFilter,
    clearAllFilters,
    activeFilterCount,
  } = useSearchAndFilter();

  // Fetch items when query parameters change
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Example: fetching events with query parameters
        const data = await getPublicJSON(`/events${queryParams}`);
        setItems(data);
      } catch (err) {
        setError('Failed to load items');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [queryParams]); // Re-fetch when query parameters change

  return (
    <div>
      <h1>Example Page</h1>
      
      {/* Search input */}
      <input
        type="text"
        value={filters.search}
        onChange={(e) => updateFilter({ search: e.target.value })}
        placeholder="Search..."
      />

      {/* Barangay filter */}
      <select
        value={filters.barangay}
        onChange={(e) => updateFilter({ barangay: e.target.value })}
      >
        <option value="">All Barangays</option>
        <option value="Barangay 1">Barangay 1</option>
        <option value="Barangay 2">Barangay 2</option>
      </select>

      {/* Month filter */}
      <select
        value={filters.month}
        onChange={(e) => updateFilter({ month: e.target.value })}
      >
        <option value="">All Months</option>
        <option value="1">January</option>
        <option value="2">February</option>
        {/* ... more months */}
      </select>

      {/* Year filter */}
      <select
        value={filters.year}
        onChange={(e) => updateFilter({ year: e.target.value })}
      >
        <option value="">All Years</option>
        <option value="2024">2024</option>
        <option value="2025">2025</option>
      </select>

      {/* Clear filters button */}
      <button onClick={clearAllFilters}>
        Clear All Filters
      </button>

      {/* Active filter count */}
      <p>Active filters: {activeFilterCount}</p>

      {/* Current query params (for debugging) */}
      <p>Query params: {queryParams || '(none)'}</p>

      {/* Loading state */}
      {loading && <p>Loading...</p>}

      {/* Error state */}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* Results */}
      <div>
        {items.length === 0 && !loading && (
          <p>No results found</p>
        )}
        {items.map((item) => (
          <div key={item.id}>
            <h3>{item.name}</h3>
            <p>{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Example: Using with actual components (SearchBar, FilterSidebar, etc.)
 */
export function ExampleWithComponents() {
  const [items, setItems] = useState<ExampleItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const {
    filters,
    queryParams,
    updateFilter,
    clearAllFilters,
    activeFilterCount,
  } = useSearchAndFilter();

  // Fetch items when query parameters change
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const data = await getPublicJSON(`/events${queryParams}`);
        setItems(data);
      } catch (err) {
        console.error('Failed to fetch items:', err);
      }
    };

    fetchItems();
  }, [queryParams]);

  return (
    <div>
      {/* This would use the actual SearchBar component */}
      {/* <SearchBar 
        value={filters.search}
        onChange={(value) => updateFilter({ search: value })}
        placeholder="Search events..."
      /> */}

      {/* This would use the actual FilterButton component */}
      {/* <FilterButton
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        activeFilterCount={activeFilterCount}
        isOpen={isSidebarOpen}
      /> */}

      {/* This would use the actual FilterSidebar component */}
      {/* <FilterSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        filters={filters}
        onFilterChange={updateFilter}
        onClearFilters={clearAllFilters}
        availableBarangays={['Barangay 1', 'Barangay 2']}
        showBarangayFilter={true}
        showDateFilters={true}
      /> */}

      {/* Results */}
      <div>
        {items.map((item) => (
          <div key={item.id}>
            <h3>{item.name}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
