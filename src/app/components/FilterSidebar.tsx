import { X } from 'lucide-react';
import { FilterState } from '../hooks/useSearchAndFilter';

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  onClearFilters: () => void;
  availableBarangays: string[];
  availableCategories?: string[];
  showBarangayFilter: boolean;
  showDateFilters: boolean;
  showCategoryFilter?: boolean;
}

const MONTHS = [
  { value: '', label: 'All Months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const YEARS = [
  { value: '', label: 'All Years' },
  ...Array.from({ length: 11 }, (_, i) => {
    const year = 2020 + i;
    return { value: String(year), label: String(year) };
  }),
];

// All barangays in Mansalay, Oriental Mindoro
const ALL_BARANGAYS = [
  'Barangay I (Pob.)',
  'Barangay II (Pob.)',
  'Barangay III (Pob.)',
  'Barangay IV (Pob.)',
  'Barangay V (Pob.)',
  'Barangay VI (Pob.)',
  'Barangay VII (Pob.)',
  'Barangay VIII (Pob.)',
  'Bonbon',
  'Budburan',
  'Cabalwa',
  'Canubing I',
  'Canubing II',
  'Maliwanag',
  'Manaul',
  'Panaytayan',
  'Santa Brigida',
  'Villa Celestial',
  'Wasig',
  'Waygan',
].sort();

export function FilterSidebar({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onClearFilters,
  availableBarangays,
  availableCategories = [],
  showBarangayFilter,
  showDateFilters,
  showCategoryFilter = false,
}: FilterSidebarProps) {
  if (!isOpen) return null;

  const handleBarangayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ barangay: e.target.value });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ category: e.target.value });
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ month: e.target.value });
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ year: e.target.value });
  };

  return (
    <>
      {/* Backdrop - visible on mobile */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <div
        className={`
          fixed z-50 bg-white shadow-lg
          md:right-0 md:top-0 md:h-full md:w-80
          bottom-0 left-0 right-0 md:bottom-auto
          rounded-t-2xl md:rounded-none
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-full'}
        `}
        role="dialog"
        aria-label="Filter options"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-primary/20">
          <h2 className="text-lg font-semibold text-foreground">Filters</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-primary/10 rounded-full transition-colors"
            aria-label="Close filters"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh] md:max-h-[calc(100vh-140px)]">
          {/* Category Filter */}
          {showCategoryFilter && availableCategories.length > 0 && (
            <div>
              <label
                htmlFor="category-filter"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Category
              </label>
              <select
                id="category-filter"
                value={filters.category || ''}
                onChange={handleCategoryChange}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none transition-colors text-foreground bg-white"
              >
                <option value="">All Categories</option>
                {availableCategories.filter(cat => cat !== 'All').map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Barangay Filter */}
          {showBarangayFilter && (
            <div>
              <label
                htmlFor="barangay-filter"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Location (Barangay)
              </label>
              <select
                id="barangay-filter"
                value={filters.barangay}
                onChange={handleBarangayChange}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none transition-colors text-foreground bg-white"
              >
                <option value="">All Barangays</option>
                {ALL_BARANGAYS.map((barangay) => (
                  <option key={barangay} value={barangay}>
                    {barangay}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Month Filter */}
          {showDateFilters && (
            <div>
              <label
                htmlFor="month-filter"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Month
              </label>
              <select
                id="month-filter"
                value={filters.month}
                onChange={handleMonthChange}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none transition-colors text-foreground bg-white"
              >
                {MONTHS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Year Filter */}
          {showDateFilters && (
            <div>
              <label
                htmlFor="year-filter"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Year
              </label>
              <select
                id="year-filter"
                value={filters.year}
                onChange={handleYearChange}
                className="w-full px-4 py-3 border-2 border-primary/20 rounded-lg focus:border-primary outline-none transition-colors text-foreground bg-white"
              >
                {YEARS.map((year) => (
                  <option key={year.value} value={year.value}>
                    {year.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer with Clear Button */}
        <div className="p-4 border-t-2 border-primary/20">
          <button
            onClick={onClearFilters}
            className="w-full px-4 py-3 bg-destructive/10 text-destructive font-medium rounded-lg hover:bg-destructive/20 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      </div>
    </>
  );
}
