# FilterChips Component

A reusable component that displays active filters as removable chips above search results. Each chip shows the filter name and value with an X button to remove individual filters.

## Features

- ✅ Displays chips for each active filter (search, barangay, month, year)
- ✅ User-friendly labels (e.g., "January" instead of "1" for months)
- ✅ X button to remove individual filters
- ✅ Automatically hidden when no filters are active
- ✅ Responsive design with flex-wrap for mobile
- ✅ Consistent styling with design system colors
- ✅ TypeScript type safety
- ✅ Accessibility support (ARIA labels and roles)

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `filters` | `FilterState` | Yes | - | Object containing current filter values |
| `onRemoveFilter` | `(filterKey: keyof FilterState) => void` | Yes | - | Callback function called when a filter chip is removed |

### FilterState Interface

```typescript
interface FilterState {
  search: string;      // Text search term
  barangay: string;    // Location filter (Barangay name)
  month: string;       // Month filter (1-12)
  year: string;        // Year filter (e.g., "2024")
}
```

## Usage

### Basic Usage

```tsx
import { useState } from 'react';
import { FilterChips } from './components/FilterChips';

function MyPage() {
  const [filters, setFilters] = useState({
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

  return (
    <FilterChips
      filters={filters}
      onRemoveFilter={handleRemoveFilter}
    />
  );
}
```

### Integration with Search and Filter System

```tsx
import { useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { FilterButton } from './components/FilterButton';
import { FilterSidebar } from './components/FilterSidebar';
import { FilterChips } from './components/FilterChips';

function EventsPage() {
  const [filters, setFilters] = useState({
    search: '',
    barangay: '',
    month: '',
    year: '',
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleRemoveFilter = (filterKey: keyof FilterState) => {
    setFilters((prev) => ({
      ...prev,
      [filterKey]: '',
    }));
  };

  const handleClearAllFilters = () => {
    setFilters({
      search: '',
      barangay: '',
      month: '',
      year: '',
    });
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div>
      {/* Search and Filter Controls */}
      <div className="flex gap-4 mb-4">
        <SearchBar
          value={filters.search}
          onChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
          placeholder="Search events..."
          className="flex-1"
        />
        <FilterButton
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          activeFilterCount={activeFilterCount}
          isOpen={isSidebarOpen}
        />
      </div>

      {/* Active Filter Chips */}
      <FilterChips
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
      />

      {/* Filter Sidebar */}
      <FilterSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        filters={filters}
        onFilterChange={(updates) => setFilters((prev) => ({ ...prev, ...updates }))}
        onClearFilters={handleClearAllFilters}
        availableBarangays={['Poblacion', 'Bato', 'Maliwanag']}
        showBarangayFilter={true}
        showDateFilters={true}
      />

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Event cards here */}
      </div>
    </div>
  );
}
```

## Behavior

### Display Logic

The component automatically determines which chips to display based on the filter values:

1. **Search chip**: Displayed when `filters.search` is not empty
   - Label: "Search"
   - Value: The search term (e.g., "beach resort")

2. **Location chip**: Displayed when `filters.barangay` is not empty
   - Label: "Location"
   - Value: The barangay name (e.g., "Poblacion")

3. **Month chip**: Displayed when `filters.month` is not empty
   - Label: "Month"
   - Value: User-friendly month name (e.g., "June" instead of "6")

4. **Year chip**: Displayed when `filters.year` is not empty
   - Label: "Year"
   - Value: The year (e.g., "2024")

### Hidden State

The component returns `null` (hidden) when no filters are active. This ensures a clean UI when users haven't applied any filters.

### Month Label Conversion

The component automatically converts numeric month values (1-12) to user-friendly names:

```typescript
const MONTH_LABELS: Record<string, string> = {
  '1': 'January',
  '2': 'February',
  '3': 'March',
  // ... etc
};
```

## Styling

The component uses Tailwind CSS classes and follows the project's design system:

- **Container**: `flex flex-wrap gap-2 mb-4` (responsive flex layout)
- **Chip**: `inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border-2 border-primary/20 rounded-full text-sm font-medium`
- **Remove button**: `p-0.5 hover:bg-primary/20 rounded-full transition-colors`
- **Colors**: Uses `primary` color with opacity variations for background and borders
- **Transitions**: Smooth hover transitions on remove buttons

## Accessibility

- Container has `role="list"` and `aria-label="Active filters"` for screen readers
- Each chip has `role="listitem"` for proper semantic structure
- Remove buttons have descriptive `aria-label` (e.g., "Remove Search filter")
- Keyboard accessible (buttons can be focused and activated with Enter/Space)
- Color contrast meets WCAG AA standards
- Touch targets are appropriately sized for mobile devices

## Requirements Satisfied

This component satisfies the following requirements from the search-and-filter spec:

- **Requirement 10.5**: Display active filter tags or chips above the results list showing which filters are applied ✅

## Integration Notes

When integrating this component into pages:

1. Import the component: `import { FilterChips } from '../components/FilterChips';`
2. Place it above the results grid/list
3. Pass the current filter state
4. Implement `onRemoveFilter` to clear individual filters
5. The component will automatically hide when no filters are active

## Design System Compliance

- Uses lucide-react icons (X) ✅
- Follows existing component patterns (see SearchBar.tsx, FilterButton.tsx) ✅
- Uses TypeScript for type safety ✅
- Consistent border colors and rounded corners ✅
- Responsive design with flex-wrap ✅
- Primary color scheme with opacity variations ✅

## Visual Examples

### All Filters Active
```
[Search: beach resort] [Location: Poblacion] [Month: June] [Year: 2024]
```

### Search Only
```
[Search: accommodation]
```

### Location and Date
```
[Location: Bato] [Month: December] [Year: 2024]
```

### No Filters (Hidden)
```
(Component is not rendered)
```

## Performance Considerations

- Component uses conditional rendering to avoid unnecessary DOM nodes when hidden
- Filter array is built efficiently using simple conditionals
- No expensive computations or side effects
- Minimal re-renders due to simple prop structure

## Future Enhancements

Potential improvements for future iterations:

1. **Animation**: Add fade-in/fade-out animations when chips appear/disappear
2. **Truncation**: Truncate long search terms with ellipsis
3. **Grouping**: Group related filters (e.g., date filters together)
4. **Clear All Button**: Add a "Clear All" chip at the end
5. **Custom Colors**: Support different color schemes per filter type
6. **Icons**: Add icons to chips for visual distinction (search icon, location pin, calendar)
