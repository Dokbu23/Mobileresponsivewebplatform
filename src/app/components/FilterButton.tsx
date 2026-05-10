import { Filter } from 'lucide-react';

interface FilterButtonProps {
  onClick: () => void;
  activeFilterCount: number;
  isOpen: boolean;
}

export function FilterButton({ onClick, activeFilterCount, isOpen }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2 border-2 rounded-lg transition-colors ${
        isOpen
          ? 'bg-primary text-white border-primary'
          : 'bg-white text-foreground border-primary/20 hover:border-primary'
      }`}
      aria-label={`${isOpen ? 'Close' : 'Open'} filters`}
      aria-expanded={isOpen}
    >
      <Filter className="h-5 w-5" />
      <span className="hidden sm:inline">Filters</span>
      
      {activeFilterCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-primary text-white text-xs font-semibold rounded-full h-6 w-6 flex items-center justify-center shadow-md">
          {activeFilterCount}
        </span>
      )}
    </button>
  );
}
