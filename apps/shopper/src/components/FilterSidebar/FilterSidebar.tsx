import React from 'react';
import { CarFilters } from 'car-data';

interface FilterSidebarProps {
  filters: CarFilters;
  onFiltersChange: (filters: CarFilters) => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ filters, onFiltersChange }) => {
  const handlePriceRangeChange = (min: number | undefined, max: number | undefined) => {
    onFiltersChange({
      ...filters,
      priceMin: min,
      priceMax: max,
    });
  };

  const handleYearRangeChange = (min: number | undefined, max: number | undefined) => {
    onFiltersChange({
      ...filters,
      yearMin: min,
      yearMax: max,
    });
  };

  const handleMultiSelectChange = (key: keyof CarFilters, value: string, checked: boolean) => {
    const currentValues = (filters[key] as string[]) || [];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);
    
    onFiltersChange({
      ...filters,
      [key]: newValues.length > 0 ? newValues : undefined,
    });
  };

  const handleSafetyRatingChange = (rating: number) => {
    onFiltersChange({
      ...filters,
      safetyRating: filters.safetyRating === rating ? undefined : rating,
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="p-6 border-b border-gray-200 bg-white flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900">
          Filter Cars
        </h2>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">

        {/* Price Range */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Price Range</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Min</label>
              <input
                type="number"
                placeholder="$0"
                value={filters.priceMin || ''}
                onChange={(e) => handlePriceRangeChange(
                  e.target.value ? parseInt(e.target.value) : undefined,
                  filters.priceMax
                )}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Max</label>
              <input
                type="number"
                placeholder="$100,000"
                value={filters.priceMax || ''}
                onChange={(e) => handlePriceRangeChange(
                  filters.priceMin,
                  e.target.value ? parseInt(e.target.value) : undefined
                )}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        </div>

        {/* Year Range */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Year Range</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Min</label>
              <input
                type="number"
                placeholder="2015"
                value={filters.yearMin || ''}
                onChange={(e) => handleYearRangeChange(
                  e.target.value ? parseInt(e.target.value) : undefined,
                  filters.yearMax
                )}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Max</label>
              <input
                type="number"
                placeholder="2025"
                value={filters.yearMax || ''}
                onChange={(e) => handleYearRangeChange(
                  filters.yearMin,
                  e.target.value ? parseInt(e.target.value) : undefined
                )}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        </div>

        {/* Make */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Make</h3>
          <div className="space-y-2">
            {['Toyota', 'Honda', 'Ford', 'BMW', 'Mercedes-Benz', 'Audi'].map((make) => (
              <label key={make} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(filters.make || []).includes(make)}
                  onChange={(e) => handleMultiSelectChange('make', make, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{make}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Body Type */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Body Type</h3>
          <div className="space-y-2">
            {['Sedan', 'SUV', 'Hatchback', 'Coupe', 'Truck', 'Wagon'].map((type) => (
              <label key={type} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(filters.bodyType || []).includes(type)}
                  onChange={(e) => handleMultiSelectChange('bodyType', type, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{type}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Fuel Type */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Fuel Type</h3>
          <div className="space-y-2">
            {['Gas', 'Hybrid', 'Electric'].map((fuel) => (
              <label key={fuel} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(filters.fuelType || []).includes(fuel)}
                  onChange={(e) => handleMultiSelectChange('fuelType', fuel, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{fuel}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Safety Rating */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Minimum Safety Rating</h3>
          <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                onClick={() => handleSafetyRatingChange(rating)}
                className={`w-8 h-8 rounded-full border-2 text-sm font-medium transition-colors ${
                  filters.safetyRating === rating
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-gray-300 text-gray-700 hover:border-blue-300'
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
        </div>

        {/* Clear Filters */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={() => onFiltersChange({})}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default FilterSidebar;
