import { useState } from 'react';
import { FilterButton } from './FilterButton';

/**
 * Example usage of the FilterButton component
 * 
 * This component is used to toggle the visibility of the filter sidebar
 * and displays a badge with the count of active filters.
 */
export function FilterButtonExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">FilterButton Examples</h2>
        
        {/* Example 1: No active filters */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">No Active Filters</h3>
          <FilterButton
            onClick={() => setIsOpen(!isOpen)}
            activeFilterCount={0}
            isOpen={false}
          />
        </div>

        {/* Example 2: With active filters */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">With Active Filters (3)</h3>
          <FilterButton
            onClick={() => setActiveFilterCount(activeFilterCount + 1)}
            activeFilterCount={3}
            isOpen={false}
          />
        </div>

        {/* Example 3: Open state */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Open State</h3>
          <FilterButton
            onClick={() => {}}
            activeFilterCount={0}
            isOpen={true}
          />
        </div>

        {/* Example 4: Open with active filters */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Open with Active Filters (5)</h3>
          <FilterButton
            onClick={() => {}}
            activeFilterCount={5}
            isOpen={true}
          />
        </div>

        {/* Interactive Example */}
        <div className="mb-6 p-6 border-2 border-primary/20 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Interactive Example</h3>
          <div className="flex items-center gap-4 mb-4">
            <FilterButton
              onClick={() => setIsOpen(!isOpen)}
              activeFilterCount={activeFilterCount}
              isOpen={isOpen}
            />
            <div className="text-sm text-muted-foreground">
              {isOpen ? 'Sidebar is open' : 'Sidebar is closed'}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveFilterCount(Math.max(0, activeFilterCount - 1))}
              className="px-3 py-1 bg-primary/10 border border-primary/20 rounded hover:bg-primary/20 transition-colors"
            >
              Remove Filter
            </button>
            <button
              onClick={() => setActiveFilterCount(activeFilterCount + 1)}
              className="px-3 py-1 bg-primary/10 border border-primary/20 rounded hover:bg-primary/20 transition-colors"
            >
              Add Filter
            </button>
            <button
              onClick={() => setActiveFilterCount(0)}
              className="px-3 py-1 bg-destructive/10 border border-destructive/20 text-destructive rounded hover:bg-destructive/20 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Usage Notes */}
      <div className="mt-8 p-6 bg-primary/5 border-2 border-primary/20 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Usage Notes</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li>The badge only appears when <code>activeFilterCount &gt; 0</code></li>
          <li>The button changes appearance when <code>isOpen</code> is true (primary background)</li>
          <li>The "Filters" text is hidden on small screens (sm breakpoint)</li>
          <li>The button is fully accessible with proper ARIA labels</li>
          <li>Fixed positioning on mobile should be handled by the parent component</li>
        </ul>
      </div>
    </div>
  );
}
