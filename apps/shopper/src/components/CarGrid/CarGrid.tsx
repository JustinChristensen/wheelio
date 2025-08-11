import React, { useMemo } from 'react';
import { CarFilters, Car, mockCars } from 'car-data';

interface CarGridProps {
  filters: CarFilters;
}

interface CarWithMatch extends Car {
  matchType: 'perfect' | 'partial' | 'non-match';
  matchReasons: string[];
}

const CarGrid: React.FC<CarGridProps> = ({ filters }) => {
  const carsWithMatches = useMemo(() => {
    return mockCars.map((car): CarWithMatch => {
      const reasons: string[] = [];
      let matchType: 'perfect' | 'partial' | 'non-match' = 'perfect';
      let hasAnyFilter = false;
      let perfectMatches = 0;
      let totalFilters = 0;

      // Check price range
      if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
        hasAnyFilter = true;
        totalFilters++;
        if (
          (filters.priceMin === undefined || car.price >= filters.priceMin) &&
          (filters.priceMax === undefined || car.price <= filters.priceMax)
        ) {
          perfectMatches++;
          reasons.push(`Price $${car.price.toLocaleString()} matches range`);
        } else {
          reasons.push(`Price $${car.price.toLocaleString()} outside range`);
        }
      }

      // Check year range
      if (filters.yearMin !== undefined || filters.yearMax !== undefined) {
        hasAnyFilter = true;
        totalFilters++;
        if (
          (filters.yearMin === undefined || car.year >= filters.yearMin) &&
          (filters.yearMax === undefined || car.year <= filters.yearMax)
        ) {
          perfectMatches++;
          reasons.push(`${car.year} matches year range`);
        } else {
          reasons.push(`${car.year} outside year range`);
        }
      }

      // Check make
      if (filters.make && filters.make.length > 0) {
        hasAnyFilter = true;
        totalFilters++;
        if (filters.make.includes(car.make)) {
          perfectMatches++;
          reasons.push(`${car.make} matches selected makes`);
        } else {
          reasons.push(`${car.make} not in selected makes`);
        }
      }

      // Check body type
      if (filters.bodyType && filters.bodyType.length > 0) {
        hasAnyFilter = true;
        totalFilters++;
        if (filters.bodyType.includes(car.bodyType)) {
          perfectMatches++;
          reasons.push(`${car.bodyType} matches selected body types`);
        } else {
          reasons.push(`${car.bodyType} not in selected body types`);
        }
      }

      // Check fuel type
      if (filters.fuelType && filters.fuelType.length > 0) {
        hasAnyFilter = true;
        totalFilters++;
        if (filters.fuelType.includes(car.fuelType)) {
          perfectMatches++;
          reasons.push(`${car.fuelType} matches selected fuel types`);
        } else {
          reasons.push(`${car.fuelType} not in selected fuel types`);
        }
      }

      // Check safety rating
      if (filters.safetyRating !== undefined) {
        hasAnyFilter = true;
        totalFilters++;
        if (car.safetyRating >= filters.safetyRating) {
          perfectMatches++;
          reasons.push(`${car.safetyRating}-star safety rating meets minimum`);
        } else {
          reasons.push(`${car.safetyRating}-star safety rating below minimum`);
        }
      }

      // Determine match type
      if (!hasAnyFilter) {
        matchType = 'perfect';
        reasons.push('No filters applied');
      } else if (perfectMatches === totalFilters) {
        matchType = 'perfect';
      } else if (perfectMatches > 0) {
        matchType = 'partial';
      } else {
        matchType = 'non-match';
      }

      return {
        ...car,
        matchType,
        matchReasons: reasons,
      };
    });
  }, [filters]);

  // Sort cars by match type and then by price
  const sortedCars = useMemo(() => {
    return [...carsWithMatches].sort((a, b) => {
      const matchOrder = { 'perfect': 0, 'partial': 1, 'non-match': 2 };
      if (matchOrder[a.matchType] !== matchOrder[b.matchType]) {
        return matchOrder[a.matchType] - matchOrder[b.matchType];
      }
      return a.price - b.price;
    });
  }, [carsWithMatches]);

  const getMatchBadgeColor = (matchType: string) => {
    switch (matchType) {
      case 'perfect':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'non-match':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Available Cars ({sortedCars.length})
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Cars are ranked by match quality: perfect matches first, then partial matches
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedCars.map((car) => (
          <div
            key={car.id}
            className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
          >
            {/* Car Image */}
            <div className="aspect-video bg-gray-200 relative">
              <img
                src={car.imageUrl}
                alt={`${car.year} ${car.make} ${car.model}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x225/e5e7eb/6b7280?text=Car+Image';
                }}
              />
              
              {/* Match Badge */}
              <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium border ${getMatchBadgeColor(car.matchType)}`}>
                {car.matchType === 'perfect' ? 'Perfect Match' : 
                 car.matchType === 'partial' ? 'Partial Match' : 
                 'No Match'}
              </div>
            </div>

            {/* Car Details */}
            <div className="p-4">
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {car.year} {car.make} {car.model}
                </h3>
                <p className="text-xl font-bold text-blue-600">
                  {formatPrice(car.price)}
                </p>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Mileage:</span>
                  <span>{car.mileage.toLocaleString()} mi</span>
                </div>
                <div className="flex justify-between">
                  <span>Fuel Type:</span>
                  <span>{car.fuelType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Body Type:</span>
                  <span>{car.bodyType}</span>
                </div>
                <div className="flex justify-between">
                  <span>Safety Rating:</span>
                  <span>{'★'.repeat(car.safetyRating)}{'☆'.repeat(5 - car.safetyRating)}</span>
                </div>
              </div>

              {/* Match Reasons */}
              {car.matchReasons.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-700 mb-1">Match Details:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {car.matchReasons.slice(0, 3).map((reason, index) => (
                      <li key={index} className="flex items-start">
                        <span className="inline-block w-1 h-1 bg-gray-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                        {reason}
                      </li>
                    ))}
                    {car.matchReasons.length > 3 && (
                      <li className="text-gray-500">+ {car.matchReasons.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Action Button */}
              <button className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {sortedCars.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No cars found matching your criteria</p>
          <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
};

export default CarGrid;
