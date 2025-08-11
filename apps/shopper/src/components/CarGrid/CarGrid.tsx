import React, { useMemo, useEffect } from 'react';
import { CarFilters, Car } from 'car-data';
import { calculateCarRanks, sortCarsByRank } from '../../utils/carRanking';
import { useFLIP } from '../../hooks/useFLIP';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';

interface CarGridProps {
  filters: CarFilters;
  cars: Car[];
  loading?: boolean;
  error?: string | null;
}

const CarGrid: React.FC<CarGridProps> = ({ filters, cars, loading = false, error = null }) => {
  // Calculate car ranks with weighted scoring
  const rankedCars = useMemo(() => {
    const ranks = calculateCarRanks(cars, filters);
    return sortCarsByRank(ranks);
  }, [cars, filters]);

  // Set up FLIP animations
  const { registerElement, captureFirst } = useFLIP(rankedCars, (car) => car.id);

  // Capture first state before filters change
  useEffect(() => {
    captureFirst();
  }, [filters, captureFirst]);

  const getMatchBadgeColor = (matchType: string) => {
    switch (matchType) {
      case 'perfect':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'non-match':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'no-filters':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCardOpacity = (matchType: string) => {
    switch (matchType) {
      case 'perfect':
        return 'opacity-100';
      case 'partial':
        return 'opacity-75';
      case 'non-match':
        return 'opacity-60';
      case 'no-filters':
        return 'opacity-100';
      default:
        return 'opacity-100';
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

  const getMatchCounts = () => {
    const counts = rankedCars.reduce(
      (acc, car) => {
        acc[car.matchType]++;
        return acc;
      },
      { perfect: 0, partial: 0, 'non-match': 0, 'no-filters': 0 }
    );
    return counts;
  };

  const matchCounts = getMatchCounts();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" text="Loading cars..." />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">
            Error loading cars
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Available Cars ({rankedCars.length})
        </h2>
        <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
          <span>Cars ranked by match quality and weighted filters</span>
          <div className="flex gap-3">
            {matchCounts['no-filters'] > 0 ? (
              <span className="inline-flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                {matchCounts['no-filters']} All Cars
              </span>
            ) : (
              <>
                <span className="inline-flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  {matchCounts.perfect} Match
                </span>
                <span className="inline-flex items-center gap-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  {matchCounts.partial} Partial
                </span>
                <span className="inline-flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  {matchCounts['non-match']} No Match
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {rankedCars.map((car, index) => (
          <div
            key={car.id}
            ref={(el) => registerElement(car.id, el)}
            className={`bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all relative ${getCardOpacity(car.matchType)}`}
          >
            {/* Car Image */}
            <div className="aspect-video bg-gray-200 relative">
              <img
                src={car.imageUrl}
                alt={`${car.year} ${car.make} ${car.model}`}
                className="w-full h-full object-cover"
              />
              
              {/* Match Badge */}
              {car.matchType !== 'no-filters' && (
                <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium border ${getMatchBadgeColor(car.matchType)}`}>
                  {car.matchType === 'perfect' ? 'Match' : 
                   car.matchType === 'partial' ? 'Partial Match' : 
                   'No Match'}
                </div>
              )}
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
              {car.matchType !== 'no-filters' && (car.matchedReasons.length > 0 || car.notMatchedReasons.length > 0) && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-700 mb-2">Match Details:</p>
                  
                  {/* Matched Reasons */}
                  {car.matchedReasons.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-green-700 mb-1">✓ Matched:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {car.matchedReasons.slice(0, 3).map((reason, reasonIndex) => (
                          <li key={reasonIndex} className="flex items-start">
                            <span className="inline-block w-1 h-1 bg-green-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                            {reason}
                          </li>
                        ))}
                        {car.matchedReasons.length > 3 && (
                          <li className="text-gray-500">+ {car.matchedReasons.length - 3} more matched</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Not Matched Reasons */}
                  {car.notMatchedReasons.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-700 mb-1">✗ Not Matched:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {car.notMatchedReasons.slice(0, 3).map((reason, reasonIndex) => (
                          <li key={reasonIndex} className="flex items-start">
                            <span className="inline-block w-1 h-1 bg-red-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                            {reason}
                          </li>
                        ))}
                        {car.notMatchedReasons.length > 3 && (
                          <li className="text-gray-500">+ {car.notMatchedReasons.length - 3} more not matched</li>
                        )}
                      </ul>
                    </div>
                  )}
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

      {rankedCars.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No cars found</p>
          <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
};

export default CarGrid;