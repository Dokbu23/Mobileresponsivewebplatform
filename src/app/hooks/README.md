# React Hooks

This directory contains custom React hooks used throughout the application.

## useSearchAndFilter

A custom hook for managing search and filter state across tourist pages (Events, Products, Attractions, Accommodations).

### Features

- **Filter State Management**: Manages search, barangay, month, and year filters
- **Debounced Search**: Implements 300ms debounce on search input to reduce API calls
- **Query Parameter Construction**: Automatically builds query strings for API requests
- **Active Filter Count**: Calculates the number of active filters for UI badges
- **Type-Safe**: Full TypeScript support with exported interfaces

### Usage

```typescript
import { useSearchAndFilter } from './hooks/useSearchAndFilter';

function MyPage() {
  const {
    filters,           // Current filter state (immediate)
    debouncedSearch,   // Debounced search value
    queryParams,       // Query string for API calls (e.g., "?search=test&month=1")
    updateFilter,      // Function to update one or more filters
    clearAllFilters,   // Function to reset all filters
    activeFilterCount, // Number of active filters
  } = useSearchAndFilter();

  // Fetch data when query parameters change
  useEffect(() => {
    fetchData(`/api/events${queryParams}`);
  }, [queryParams]);

  return (
    <div>
      {/* Search input */}
      <input
        value={filters.search}
        onChange={(e) => updateFilter({ search: e.target.value })}
      />

      {/* Filter dropdown */}
      <select
        value={filters.barangay}
        onChange={(e) => updateFilter({ barangay: e.target.value })}
      >
        <option value="">All Barangays</option>
        <option value="Barangay 1">Barangay 1</option>
      </select>

      {/* Clear button */}
      <button onClick={clearAllFilters}>Clear Filters</button>

      {/* Active filter badge */}
      {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
    </div>
  );
}
```

### Integration with Components

The hook is designed to work seamlessly with the search and filter components:

```typescript
import { SearchBar } from '../components/SearchBar';
import { FilterButton } from '../components/FilterButton';
import { FilterSidebar } from '../components/FilterSidebar';
import { useSearchAndFilter } from '../hooks/useSearchAndFilter';

function EventsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const {
    filters,
    queryParams,
    updateFilter,
    clearAllFilters,
    activeFilterCount,
  } = useSearchAndFilter();

  return (
    <div>
      {/* Search bar */}
      <SearchBar
        value={filters.search}
        onChange={(value) => updateFilter({ search: value })}
        placeholder="Search events..."
      />

      {/* Filter button with badge */}
      <FilterButton
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        activeFilterCount={activeFilterCount}
        isOpen={isSidebarOpen}
      />

      {/* Filter sidebar */}
      <FilterSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        filters={filters}
        onFilterChange={updateFilter}
        onClearFilters={clearAllFilters}
        availableBarangays={['Barangay 1', 'Barangay 2']}
        showBarangayFilter={true}
        showDateFilters={true}
      />

      {/* Results */}
      {/* ... */}
    </div>
  );
}
```

### API

#### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `filters` | `FilterState` | Current filter state with immediate values |
| `debouncedSearch` | `string` | Search value after 300ms debounce |
| `queryParams` | `string` | Query string for API calls (e.g., `?search=test&month=1`) |
| `updateFilter` | `(updates: Partial<FilterState>) => void` | Update one or more filter values |
| `clearAllFilters` | `() => void` | Reset all filters to initial state |
| `getActiveFilterCount` | `() => number` | Function to get active filter count |
| `activeFilterCount` | `number` | Current number of active filters |

#### FilterState Interface

```typescript
interface FilterState {
  search: string;      // Text search term
  barangay: string;    // Location filter (Barangay)
  month: string;       // Month filter (1-12)
  year: string;        // Year filter (e.g., "2024")
}
```

### Debouncing Behavior

The hook implements a 300ms debounce on the search input:

- `filters.search` updates immediately (for UI responsiveness)
- `debouncedSearch` updates after 300ms of no typing
- `queryParams` uses `debouncedSearch` to avoid excessive API calls

This means:
1. User types "hello" → `filters.search` shows "hello" immediately
2. After 300ms → `debouncedSearch` becomes "hello"
3. `queryParams` updates → triggers API call

### Requirements Validation

This hook validates the following requirements from the spec:

- **Requirement 8.1**: Filter state management in React component state
- **Requirement 8.2**: Triggers API request when filter state changes
- **Requirement 8.3**: Debounces search input to avoid excessive API requests
- **Requirement 10.2**: Displays count of active filters
- **Requirement 10.3**: Includes search in active filter count

### Page-Specific Configuration

Different pages use different filters:

| Page | Search | Barangay | Month/Year |
|------|--------|----------|------------|
| Events | ✓ | ✓ | ✓ |
| Products | ✓ | ✗ | ✗ |
| Attractions | ✓ | ✓ | ✗ |
| Accommodations | ✓ | ✗ | ✓ |

Configure the `FilterSidebar` component's `showBarangayFilter` and `showDateFilters` props accordingly.

### Performance Considerations

- **Memoization**: `queryParams` is memoized to prevent unnecessary re-renders
- **Debouncing**: Search input is debounced to reduce API calls
- **Callbacks**: Update functions use `useCallback` for stable references

### Testing

See `useSearchAndFilter.example.tsx` for usage examples and integration patterns.

### Future Enhancements

Potential improvements for future versions:

- URL state synchronization (persist filters in URL)
- Local storage persistence (remember user's last filters)
- Custom debounce delay configuration
- Filter validation and error handling
- Advanced filter combinations (OR logic, ranges)
