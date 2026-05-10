# FilterSidebar Component

## Overview

The `FilterSidebar` component is a responsive, collapsible filter panel that provides location (Barangay) and date (Month/Year) filtering capabilities for the Mansalay tourism platform.

## Features

- ✅ **Responsive Design**: Slides in from right on desktop, appears as bottom sheet on mobile
- ✅ **Conditional Filters**: Shows/hides Barangay and Date filters based on props
- ✅ **Backdrop Overlay**: Closes sidebar when clicking outside (mobile)
- ✅ **Accessible**: Proper ARIA labels, keyboard navigation, and semantic HTML
- ✅ **Smooth Animations**: CSS transitions for slide-in/out effects
- ✅ **TypeScript**: Fully typed with TypeScript for type safety
- ✅ **Clear All**: Button to reset all filters at once

## Props

```typescript
interface FilterSidebarProps {
  isOpen: boolean;                    // Controls sidebar visibility
  onClose: () => void;                // Called when sidebar should close
  filters: FilterState;               // Current filter values
  onFilterChange: (filters: Partial<FilterState>) => void;  // Called when any filter changes
  onClearFilters: () => void;         // Called when "Clear All" is clicked
  availableBarangays: string[];       // List of barangay options
  showBarangayFilter: boolean;        // Show/hide barangay dropdown
  showDateFilters: boolean;           // Show/hide month/year dropdowns
}

interface FilterState {
  search: string;
  barangay: string;
  month: string;      // "1" to "12" or empty string
  year: string;       // "2020" to "2030" or empty string
}
```

## Usage

### Basic Example

```tsx
import { useState } from 'react';
import { FilterSidebar } from './components/FilterSidebar';

function MyPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    barangay: '',
    month: '',
    year: '',
  });

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    // Trigger API call with updated filters
  };

  const handleClearFilters = () => {
    setFilters({ search: '', barangay: '', month: '', year: '' });
    // Trigger API call to fetch all items
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Filters</button>
      
      <FilterSidebar
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        availableBarangays={['Poblacion', 'Maliwanag', 'Balogo']}
        showBarangayFilter={true}
        showDateFilters={true}
      />
    </>
  );
}
```

### Events Page (Barangay + Date Filters)

```tsx
<FilterSidebar
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  filters={filters}
  onFilterChange={handleFilterChange}
  onClearFilters={handleClearFilters}
  availableBarangays={extractedBarangays}
  showBarangayFilter={true}   // ✅ Show barangay filter
  showDateFilters={true}       // ✅ Show month/year filters
/>
```

### Products Page (No Filters)

```tsx
<FilterSidebar
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  filters={filters}
  onFilterChange={handleFilterChange}
  onClearFilters={handleClearFilters}
  availableBarangays={[]}
  showBarangayFilter={false}   // ❌ Hide barangay filter
  showDateFilters={false}      // ❌ Hide date filters
/>
```

### Attractions Page (Barangay Only)

```tsx
<FilterSidebar
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  filters={filters}
  onFilterChange={handleFilterChange}
  onClearFilters={handleClearFilters}
  availableBarangays={extractedBarangays}
  showBarangayFilter={true}    // ✅ Show barangay filter
  showDateFilters={false}      // ❌ Hide date filters
/>
```

### Accommodations Page (Date Only)

```tsx
<FilterSidebar
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  filters={filters}
  onFilterChange={handleFilterChange}
  onClearFilters={handleClearFilters}
  availableBarangays={[]}
  showBarangayFilter={false}   // ❌ Hide barangay filter
  showDateFilters={true}       // ✅ Show month/year filters
/>
```

## Filter Values

### Month Values
- Empty string `""` = All Months
- `"1"` to `"12"` = January to December

### Year Values
- Empty string `""` = All Years
- `"2020"` to `"2030"` = Specific years

### Barangay Values
- Empty string `""` = All Barangays
- Any string = Specific barangay name

## Responsive Behavior

### Desktop (≥768px)
- Slides in from the right side
- Fixed width of 320px (w-80)
- Full height of viewport
- No backdrop overlay

### Mobile (<768px)
- Slides up from the bottom
- Full width
- Rounded top corners
- Semi-transparent backdrop overlay
- Closes when backdrop is clicked

## Accessibility

- ✅ Proper ARIA labels (`role="dialog"`, `aria-label`)
- ✅ Keyboard accessible (all controls are focusable)
- ✅ Screen reader friendly (semantic HTML, labels for all inputs)
- ✅ Focus management (close button is easily accessible)
- ✅ Touch-friendly (44px minimum touch targets)

## Styling

The component uses Tailwind CSS classes consistent with the project's design system:

- **Primary Color**: `border-primary`, `text-primary`, `bg-primary`
- **Foreground**: `text-foreground` for main text
- **Muted**: `text-muted-foreground` for secondary text
- **Destructive**: `bg-destructive` for the clear button
- **Transitions**: Smooth 300ms transitions for all interactions

## Integration Checklist

When integrating into a page:

- [ ] Import the component
- [ ] Set up filter state with `useState`
- [ ] Implement `handleFilterChange` to update state and trigger API calls
- [ ] Implement `handleClearFilters` to reset all filters
- [ ] Extract available barangays from your data
- [ ] Set `showBarangayFilter` based on page type
- [ ] Set `showDateFilters` based on page type
- [ ] Add a button to toggle `isOpen` state
- [ ] Update API calls to include filter query parameters

## Requirements Satisfied

This component satisfies the following requirements from the spec:

- **2.2**: Filter sidebar becomes visible when filter button is clicked
- **2.3**: Filter sidebar becomes hidden when filter button is clicked again
- **2.4**: Displays all available filter controls based on props
- **2.5**: Displays the Clear Filters button
- **3.1**: Displays all unique Barangay values
- **3.2**: Filters by selected Barangay
- **3.3**: Includes "All Barangays" option
- **3.4**: Defaults to showing all locations
- **4.1**: Displays all 12 calendar months
- **4.2**: Displays years 2020-2030
- **4.3**: Filters by selected month/year
- **6.1**: Clear Filters button is visible
- **6.2**: Resets all filters when clicked

## Files

- `FilterSidebar.tsx` - Main component
- `FilterSidebar.example.tsx` - Usage example
- `FilterSidebar.README.md` - This documentation

## Next Steps

After creating this component, the next tasks are:

1. Create `FilterButton` component (Task 7)
2. Create `FilterChips` component (Task 9)
3. Create `useSearchAndFilter` hook (Task 10)
4. Integrate into Events page (Task 12)
5. Integrate into Products page (Task 13)
6. Integrate into Attractions page (Task 14)
7. Integrate into Accommodations page (Task 15)
