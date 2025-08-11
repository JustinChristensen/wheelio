import React, { useMemo, useCallback } from 'react';
import { CarFilters, Car } from 'car-data';

interface FilterSidebarProps {
  filters: CarFilters;
  onFiltersChange: (filters: CarFilters) => void;
  cars: Car[];
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ filters, onFiltersChange, cars }) => {
  // Generate dynamic filter options from car data
  const filterOptions = useMemo(() => {
    const makes = [...new Set(cars.map(car => car.make))].sort();
    const bodyTypes = [...new Set(cars.map(car => car.bodyType))].sort();
    const fuelTypes = [...new Set(cars.map(car => car.fuelType))].sort();
    
    // Calculate price range from actual data
    const prices = cars.map(car => car.price);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 100000;
    
    return { makes, bodyTypes, fuelTypes, minPrice, maxPrice };
  }, [cars]);

  // Helper function to check if a car matches the given filters
  const matchesFilters = useCallback((car: Car, filterSet: CarFilters) => {
    // Price range
    if (filterSet.priceMin !== undefined && car.price < filterSet.priceMin) return false;
    if (filterSet.priceMax !== undefined && car.price > filterSet.priceMax) return false;
    
    // Year range
    if (filterSet.yearMin !== undefined && car.year < filterSet.yearMin) return false;
    if (filterSet.yearMax !== undefined && car.year > filterSet.yearMax) return false;
    
    // Make
    if (filterSet.make && filterSet.make.length > 0 && !filterSet.make.includes(car.make)) return false;
    
    // Body type
    if (filterSet.bodyType && filterSet.bodyType.length > 0 && !filterSet.bodyType.includes(car.bodyType)) return false;
    
    // Fuel type
    if (filterSet.fuelType && filterSet.fuelType.length > 0 && !filterSet.fuelType.includes(car.fuelType)) return false;
    
    // Safety rating
    if (filterSet.safetyRating !== undefined && car.safetyRating < filterSet.safetyRating) return false;
    
    return true;
  }, []);

  // Calculate counts for each filter option based on current filters
  const getFilterCounts = useMemo(() => {
    return {
      makes: filterOptions.makes.map(make => ({
        value: make,
        count: cars.filter(car => {
          // Apply all filters except the current make filter
          const otherFilters = { ...filters, make: undefined };
          return matchesFilters(car, otherFilters) && car.make === make;
        }).length
      })),
      bodyTypes: filterOptions.bodyTypes.map(bodyType => ({
        value: bodyType,
        count: cars.filter(car => {
          // Apply all filters except the current bodyType filter
          const otherFilters = { ...filters, bodyType: undefined };
          return matchesFilters(car, otherFilters) && car.bodyType === bodyType;
        }).length
      })),
      fuelTypes: filterOptions.fuelTypes.map(fuelType => ({
        value: fuelType,
        count: cars.filter(car => {
          // Apply all filters except the current fuelType filter
          const otherFilters = { ...filters, fuelType: undefined };
          return matchesFilters(car, otherFilters) && car.fuelType === fuelType;
        }).length
      }))
    };
  }, [filterOptions, filters, matchesFilters, cars]);

  const formatPricePlaceholder = (price: number) => {
    return price.toString();
  };

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
                placeholder={formatPricePlaceholder(filterOptions.minPrice)}
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
                placeholder={formatPricePlaceholder(filterOptions.maxPrice)}
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
            {getFilterCounts.makes.map(({ value: make, count }) => (
              <label key={make} className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(filters.make || []).includes(make)}
                    onChange={(e) => handleMultiSelectChange('make', make, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{make}</span>
                </div>
                <span className="text-xs text-gray-500">({count})</span>
              </label>
            ))}
          </div>
        </div>

        {/* Body Type */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Body Type</h3>
          <div className="space-y-2">
            {getFilterCounts.bodyTypes.map(({ value: type, count }) => (
              <label key={type} className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(filters.bodyType || []).includes(type)}
                    onChange={(e) => handleMultiSelectChange('bodyType', type, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{type}</span>
                </div>
                <span className="text-xs text-gray-500">({count})</span>
              </label>
            ))}
          </div>
        </div>

        {/* Fuel Type */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Fuel Type</h3>
          <div className="space-y-2">
            {getFilterCounts.fuelTypes.map(({ value: fuel, count }) => (
              <label key={fuel} className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={(filters.fuelType || []).includes(fuel)}
                    onChange={(e) => handleMultiSelectChange('fuelType', fuel, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{fuel}</span>
                </div>
                <span className="text-xs text-gray-500">({count})</span>
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
