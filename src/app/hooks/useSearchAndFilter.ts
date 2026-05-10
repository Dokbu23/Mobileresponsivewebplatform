import { useState, useEffect, useMemo, useCallback } from 'react';

/**
 * Filter state interface
 * Validates: Requirements 8.1
 */
export interface FilterState {
  search: string;
  barangay: string;
  category?: string;
  month: string;
  year: string;
}

/**
 * Initial filter state with all filters cleared
 */
const initialFilterState: FilterState = {
  search: '',
  barangay: '',
  category: '',
  month: '',
  year: '',
};

/**
 * Custom hook for managing search and filter state
 * 
 * Features:
 * - Manages filter state (search, barangay, month, year)
 * - Implements debounced search (300ms delay)
 * - Constructs query parameters for API calls
 * - Provides update and clear functions
 * - Calculates active filter count
 * 
 * Validates: Requirements 8.1, 8.2, 8.3, 10.2, 10.3
 * 
 * @returns Object containing filter state, update functions, and utilities
 */
export function useSearchAndFilter() {
  // Main filter state
  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  
  // Debounced search value (updated after 300ms delay)
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  /**
   * Debounce search input to reduce API calls
   * Validates: Requirements 8.3
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.search]);

  /**
   * Update one or more filter values
   * Validates: Requirements 8.1, 8.2
   */
  const updateFilter = useCallback((updates: Partial<FilterState>) => {
    setFilters((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  /**
   * Clear all filters and reset to initial state
   * Validates: Requirements 8.1
   */
  const clearAllFilters = useCallback(() => {
    setFilters(initialFilterState);
    setDebouncedSearch('');
  }, []);

  /**
   * Get count of active filters (non-empty values)
   * Includes debounced search in the count
   * Validates: Requirements 10.2, 10.3
   */
  const getActiveFilterCount = useCallback((): number => {
    let count = 0;
    if (debouncedSearch) count++;
    if (filters.barangay) count++;
    if (filters.category) count++;
    if (filters.month) count++;
    if (filters.year) count++;
    return count;
  }, [debouncedSearch, filters.barangay, filters.category, filters.month, filters.year]);

  /**
   * Construct query parameter string from filter state
   * Uses debounced search value to avoid excessive API calls
   * Validates: Requirements 8.2, 8.3
   */
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    
    // Use debounced search value
    if (debouncedSearch) {
      params.append('search', debouncedSearch);
    }
    
    if (filters.barangay) {
      params.append('barangay', filters.barangay);
    }
    
    if (filters.month) {
      params.append('month', filters.month);
    }
    
    if (filters.year) {
      params.append('year', filters.year);
    }
    
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }, [debouncedSearch, filters.barangay, filters.month, filters.year]);

  return {
    // Current filter state (includes immediate search value for UI)
    filters,
    
    // Debounced search value (for API calls)
    debouncedSearch,
    
    // Query parameter string ready for API calls
    queryParams,
    
    // Update functions
    updateFilter,
    clearAllFilters,
    
    // Utility functions
    getActiveFilterCount,
    activeFilterCount: getActiveFilterCount(),
  };
}
