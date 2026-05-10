import { X } from 'lucide-react';

interface FilterState {
  search: string;
  barangay: string;
  category?: string;
  month: string;
  year: string;
}

interface FilterChipsProps {
  filters: FilterState;
  onRemoveFilter: (filterKey: keyof FilterState) => void;
}

const MONTH_LABELS: Record<string, string> = {
  '1': 'January',
  '2': 'February',
  '3': 'March',
  '4': 'April',
  '5': 'May',
  '6': 'June',
  '7': 'July',
  '8': 'August',
  '9': 'September',
  '10': 'October',
  '11': 'November',
  '12': 'December',
};

export function FilterChips({ filters, onRemoveFilter }: FilterChipsProps) {
  const activeFilters: Array<{ key: keyof FilterState; label: string; value: string }> = [];

  // Build array of active filters with user-friendly labels
  if (filters.search) {
    activeFilters.push({
      key: 'search',
      label: 'Search',
      value: filters.search,
    });
  }

  if (filters.barangay) {
    activeFilters.push({
      key: 'barangay',
      label: 'Location',
      value: filters.barangay,
    });
  }

  if (filters.category) {
    activeFilters.push({
      key: 'category',
      label: 'Category',
      value: filters.category,
    });
  }

  if (filters.month) {
    activeFilters.push({
      key: 'month',
      label: 'Month',
      value: MONTH_LABELS[filters.month] || filters.month,
    });
  }

  if (filters.year) {
    activeFilters.push({
      key: 'year',
      label: 'Year',
      value: filters.year,
    });
  }

  // Hide component when no filters are active
  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mb-4" role="list" aria-label="Active filters">
      {activeFilters.map((filter) => (
        <div
          key={filter.key}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary border-2 border-primary/20 rounded-full text-sm font-medium"
          role="listitem"
        >
          <span>
            <span className="font-semibold">{filter.label}:</span> {filter.value}
          </span>
          <button
            onClick={() => onRemoveFilter(filter.key)}
            className="p-0.5 hover:bg-primary/20 rounded-full transition-colors"
            aria-label={`Remove ${filter.label} filter`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
