# SearchBar Component

A reusable search input component with clear functionality and keyboard navigation support.

## Features

- ✅ Text input with search icon (lucide-react)
- ✅ Clear button (X icon) that appears when text is present
- ✅ Keyboard navigation support (Enter key)
- ✅ Responsive design (full-width on mobile, constrained on desktop via className)
- ✅ Consistent styling with design system (border colors, rounded corners)
- ✅ TypeScript type safety
- ✅ Accessibility support (aria-label on clear button)

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `value` | `string` | Yes | - | The current search value |
| `onChange` | `(value: string) => void` | Yes | - | Callback function called when the search value changes |
| `placeholder` | `string` | No | `'Search...'` | Placeholder text for the input |
| `className` | `string` | No | `''` | Additional CSS classes for custom styling |

## Usage

### Basic Usage

```tsx
import { useState } from 'react';
import { SearchBar } from './components/SearchBar';

function MyPage() {
  const [search, setSearch] = useState('');

  return (
    <SearchBar
      value={search}
      onChange={setSearch}
      placeholder="Search products..."
    />
  );
}
```

### Responsive Width (Full-width on mobile, constrained on desktop)

```tsx
<SearchBar
  value={search}
  onChange={setSearch}
  placeholder="Search events..."
  className="w-full md:max-w-xl"
/>
```

### With Debouncing (Recommended for API calls)

```tsx
import { useState, useEffect } from 'react';
import { SearchBar } from './components/SearchBar';

function MyPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Use debouncedSearch for API calls
  useEffect(() => {
    if (debouncedSearch) {
      // Make API call with debouncedSearch
      fetchResults(debouncedSearch);
    }
  }, [debouncedSearch]);

  return (
    <SearchBar
      value={search}
      onChange={setSearch}
      placeholder="Search..."
    />
  );
}
```

## Styling

The component uses Tailwind CSS classes and follows the project's design system:

- **Border**: `border-2 border-primary/20` (default), `border-primary` (focus)
- **Rounded corners**: `rounded-lg`
- **Padding**: `py-3 pl-12 pr-12`
- **Colors**: Uses `text-foreground`, `text-muted-foreground`, and `primary` colors
- **Transitions**: Smooth color transitions on focus and hover

## Keyboard Navigation

- **Enter key**: Prevents default form submission (search is handled by onChange)
- **Escape key**: Not implemented (can be added if needed)
- **Tab key**: Standard browser behavior for focus navigation

## Accessibility

- Clear button has `aria-label="Clear search"` for screen readers
- Input is keyboard accessible
- Focus states are clearly visible
- Color contrast meets WCAG standards

## Requirements Satisfied

This component satisfies the following requirements from the search-and-filter spec:

- **Requirement 1.1**: Accepts text input from the user ✅
- **Requirement 1.2**: Filters displayed items when user types (via onChange callback) ✅
- **Requirement 1.5**: Search term can be cleared (clear button when text is present) ✅
- **Requirement 1.6**: Visible on all four Tourist_Pages (reusable component) ✅

## Integration Notes

When integrating this component into pages:

1. Import the component: `import { SearchBar } from '../components/SearchBar';`
2. Add state management: `const [search, setSearch] = useState('');`
3. Implement debouncing for API calls (300ms recommended)
4. Pass search value to API as query parameter
5. Use responsive className for proper mobile/desktop layout

## Design System Compliance

- Uses lucide-react icons (Search, X) ✅
- Follows existing component patterns (see Navbar.tsx, SubscriptionPaymentModal.tsx) ✅
- Uses TypeScript for type safety ✅
- Consistent border colors and rounded corners ✅
- Responsive design support via className prop ✅
