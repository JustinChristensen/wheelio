import { CarFilters } from 'car-data';
import { isEqual } from 'lodash';

/**
 * Deep compare two CarFilters objects to check if they are identical
 */
export function areFiltersEqual(filters1: CarFilters, filters2: CarFilters): boolean {
  return isEqual(filters1, filters2);
}

/**
 * Check if a CarFilters object has any active filters
 */
export function hasActiveFilters(filters: CarFilters): boolean {
  return Object.keys(filters).length > 0 && Object.values(filters).some(value => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== undefined && value !== null;
  });
}
