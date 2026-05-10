# FilterButton Component

## Overview

The `FilterButton` component is a toggle button used to show/hide the filter sidebar on tourist-facing pages. It displays a filter icon with an optional badge showing the count of active filters.

## Features

- **Visual Indicator**: Shows a badge with the count of active filters when filters are applied
- **Active State**: Changes appearance when the filter sidebar is open
- **Responsive Design**: Hides the "Filters" text label on small screens to save space
- **Accessibility**: Includes proper ARIA labels for screen readers
- **Consistent Styling**: Follows the project's design system with primary colors and transitions

## Props

```typescript
interface FilterButtonProps {
  onClick: () => void;           // Callback when button is clicked
  activeFilterCount: number;     // Number of active filters (0 or more)
  isOpen: boolean;               // Whether the filter sidebar is currently open
}
```

### Prop Details

- **`onClick`**: Function to call when the button is clicked. Typically toggles the filter sidebar visibility.
- **`activeFilterCount`**: The number of currently active filters. When greater than 0, a badge is displayed with this count.
- **`isOpen`**: Boolean indicating if the filter sidebar is currently visible. When true, the button displays in an active state (primary background).

## Usage

### Basic Usage

```tsx
import { FilterButton } from './components/FilterButton';
import { useState } from 'react';

function MyPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ search: '', barangay: '', month: '', year: '' });
  
  // Calculate active filter count
  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;
  
  return (
    <div>
      <FilterButton
        onClick={() => setIsFilterOpen(!isFilterOpen)}
        activeFilterCount={activeFilterCount}
        isOpen={isFilterOpen}
      />
      {/* Filter sidebar component */}
    </div>
  );
}
```

### Integration with Filter State

```tsx
import { FilterButton } from './components/FilterButton';
import { FilterSidebar } from './components/FilterSidebar';
import { useState } from 'react';

function EventsPage() {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    barangay: '',
    month: '',
    year: ''
  });
  
  // Count non-empty filters
  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => value !== '').length;
  };
  
  const handleClearFilters = () => {
    setFilters({ search: '', barangay: '', month: '', year: '' });
  };
  
  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Events</h1>
        <FilterButton
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          activeFilterCount={getActiveFilterCount()}
          isOpen={isFilterOpen}
        />
      </div>
      
      <FilterSidebar
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onFilterChange={(newFilters) => setFilters({ ...filters, ...newFilters })}
        onClearFilters={handleClearFilters}
        showBarangayFilter={true}
        showDateFilters={true}
        availableBarangays={['Barangay 1', 'Barangay 2']}
      />
      
      {/* Page content */}
    </div>
  );
}
```

## Styling

The component uses Tailwind CSS classes and follows the project's design system:

- **Default State**: White background with light border
- **Hover State**: Border color changes to primary
- **Active State** (when `isOpen` is true): Primary background with white text
- **Badge**: Primary background with white text, positioned at top-right corner
- **Responsive**: "Filters" text hidden on screens smaller than `sm` breakpoint

## Accessibility

The component includes proper accessibility features:

- **ARIA Label**: Descriptive label indicating current state ("Open filters" or "Close filters")
- **ARIA Expanded**: Indicates whether the associated filter sidebar is expanded
- **Keyboard Navigation**: Fully accessible via keyboard (Tab to focus, Enter/Space to activate)
- **Visual Feedback**: Clear visual indication of active state and filter count

## Requirements Satisfied

This component satisfies the following requirements from the search-and-filter spec:

- **Requirement 2.1**: Filter button is visible on all tourist pages
- **Requirement 10.1**: Filter button displays a visual indicator (badge) when filters are active
- **Requirement 10.2**: System displays the count of active filters on the filter button
- **Requirement 10.4**: Filter button does not display an active indicator when all filters are cleared

## Mobile Considerations

On mobile devices:
- The "Filters" text is hidden to save space (only icon is shown)
- The badge remains visible and prominent
- The button should be positioned for easy thumb access (handled by parent component)
- Touch target size is adequate (44x44px minimum)

## Related Components

- **FilterSidebar**: The collapsible panel that this button toggles
- **SearchBar**: Text search input component
- **FilterChips**: Displays active filters as removable chips

## Example File

See `FilterButton.example.tsx` for interactive examples demonstrating all states and usage patterns.
