/**
 * SearchBar Component - Example Usage
 * 
 * This file demonstrates how to use the SearchBar component.
 * It is not part of the application but serves as documentation.
 */

import { useState } from 'react';
import { SearchBar } from './SearchBar';

export function SearchBarExample() {
  const [searchValue, setSearchValue] = useState('');

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">SearchBar Component Example</h2>
      
      {/* Basic usage */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Basic Usage</h3>
        <SearchBar
          value={searchValue}
          onChange={setSearchValue}
          placeholder="Search products..."
        />
        <p className="mt-2 text-sm text-muted-foreground">
          Current value: {searchValue || '(empty)'}
        </p>
      </div>

      {/* With custom className */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">With Custom Styling</h3>
        <SearchBar
          value={searchValue}
          onChange={setSearchValue}
          placeholder="Search events..."
          className="max-w-md"
        />
      </div>

      {/* Full width on mobile, constrained on desktop */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Responsive Width</h3>
        <SearchBar
          value={searchValue}
          onChange={setSearchValue}
          placeholder="Search attractions..."
          className="w-full md:max-w-xl"
        />
      </div>
    </div>
  );
}
