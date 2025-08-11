import { Car, CarFilters } from 'car-data';

export interface CarRank extends Car {
  rankScore: number;
  matchType: 'perfect' | 'partial' | 'non-match' | 'no-filters';
  matchReasons: string[];
  filterMatches: { [key: string]: boolean };
}

interface FilterWeight {
  weight: number;
  perfect: number;  // Score for perfect match
  partial: number;  // Score for partial match (not used for all filters)
  none: number;     // Score for no match
}

// Define weights for each filter type
// Higher weight = more important in ranking
const FILTER_WEIGHTS: { [key: string]: FilterWeight } = {
  priceRange: { weight: 1.0, perfect: 100, partial: 0, none: -50 },
  yearRange: { weight: 0.8, perfect: 80, partial: 0, none: -30 },
  make: { weight: 0.9, perfect: 90, partial: 0, none: -40 },
  bodyType: { weight: 0.7, perfect: 70, partial: 0, none: -25 },
  fuelType: { weight: 0.6, perfect: 60, partial: 0, none: -20 },
  safetyRating: { weight: 0.5, perfect: 50, partial: 25, none: -15 }, // Has partial matching
};

export const calculateCarRanks = (cars: Car[], filters: CarFilters): CarRank[] => {
  return cars.map((car): CarRank => {
    const reasons: string[] = [];
    const filterMatches: { [key: string]: boolean } = {};
    let totalScore = 0;
    let hasAnyFilter = false;
    let perfectMatches = 0;
    let totalActiveFilters = 0;

    // Price range filter
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      hasAnyFilter = true;
      totalActiveFilters++;
      const config = FILTER_WEIGHTS.priceRange;
      
      if (
        (filters.priceMin === undefined || car.price >= filters.priceMin) &&
        (filters.priceMax === undefined || car.price <= filters.priceMax)
      ) {
        totalScore += config.perfect * config.weight;
        filterMatches.priceRange = true;
        perfectMatches++;
        reasons.push(`Price $${car.price.toLocaleString()} matches range`);
      } else {
        totalScore += config.none * config.weight;
        filterMatches.priceRange = false;
        reasons.push(`Price $${car.price.toLocaleString()} outside range`);
      }
    }

    // Year range filter
    if (filters.yearMin !== undefined || filters.yearMax !== undefined) {
      hasAnyFilter = true;
      totalActiveFilters++;
      const config = FILTER_WEIGHTS.yearRange;
      
      if (
        (filters.yearMin === undefined || car.year >= filters.yearMin) &&
        (filters.yearMax === undefined || car.year <= filters.yearMax)
      ) {
        totalScore += config.perfect * config.weight;
        filterMatches.yearRange = true;
        perfectMatches++;
        reasons.push(`${car.year} matches year range`);
      } else {
        totalScore += config.none * config.weight;
        filterMatches.yearRange = false;
        reasons.push(`${car.year} outside year range`);
      }
    }

    // Make filter
    if (filters.make && filters.make.length > 0) {
      hasAnyFilter = true;
      totalActiveFilters++;
      const config = FILTER_WEIGHTS.make;
      
      if (filters.make.includes(car.make)) {
        totalScore += config.perfect * config.weight;
        filterMatches.make = true;
        perfectMatches++;
        reasons.push(`${car.make} matches selected makes`);
      } else {
        totalScore += config.none * config.weight;
        filterMatches.make = false;
        reasons.push(`${car.make} not in selected makes`);
      }
    }

    // Body type filter
    if (filters.bodyType && filters.bodyType.length > 0) {
      hasAnyFilter = true;
      totalActiveFilters++;
      const config = FILTER_WEIGHTS.bodyType;
      
      if (filters.bodyType.includes(car.bodyType)) {
        totalScore += config.perfect * config.weight;
        filterMatches.bodyType = true;
        perfectMatches++;
        reasons.push(`${car.bodyType} matches selected body types`);
      } else {
        totalScore += config.none * config.weight;
        filterMatches.bodyType = false;
        reasons.push(`${car.bodyType} not in selected body types`);
      }
    }

    // Fuel type filter
    if (filters.fuelType && filters.fuelType.length > 0) {
      hasAnyFilter = true;
      totalActiveFilters++;
      const config = FILTER_WEIGHTS.fuelType;
      
      if (filters.fuelType.includes(car.fuelType)) {
        totalScore += config.perfect * config.weight;
        filterMatches.fuelType = true;
        perfectMatches++;
        reasons.push(`${car.fuelType} matches selected fuel types`);
      } else {
        totalScore += config.none * config.weight;
        filterMatches.fuelType = false;
        reasons.push(`${car.fuelType} not in selected fuel types`);
      }
    }

    // Safety rating filter (with partial matching)
    if (filters.safetyRating !== undefined) {
      hasAnyFilter = true;
      totalActiveFilters++;
      const config = FILTER_WEIGHTS.safetyRating;
      
      if (car.safetyRating >= filters.safetyRating) {
        // Perfect match for exact rating or higher
        if (car.safetyRating === filters.safetyRating) {
          totalScore += config.perfect * config.weight;
          filterMatches.safetyRating = true;
          perfectMatches++;
          reasons.push(`${car.safetyRating}-star safety rating matches exactly`);
        } else {
          totalScore += config.partial * config.weight;
          filterMatches.safetyRating = true;
          reasons.push(`${car.safetyRating}-star safety rating exceeds minimum`);
        }
      } else {
        totalScore += config.none * config.weight;
        filterMatches.safetyRating = false;
        reasons.push(`${car.safetyRating}-star safety rating below minimum`);
      }
    }

    // Determine match type
    let matchType: 'perfect' | 'partial' | 'non-match' | 'no-filters';
    if (!hasAnyFilter) {
      matchType = 'no-filters';
      totalScore = 1000; // High base score for no filters
      reasons.push('No filters applied - showing all cars');
    } else if (perfectMatches === totalActiveFilters) {
      matchType = 'perfect';
      totalScore += 500; // Bonus for perfect match
    } else if (perfectMatches > 0) {
      matchType = 'partial';
      totalScore += 200; // Smaller bonus for partial match
    } else {
      matchType = 'non-match';
      totalScore += 0; // No bonus for non-match
    }

    // Add price-based secondary ranking (lower price is better within same match type)
    const priceScore = Math.max(0, 100000 - car.price) / 1000; // Normalize price to small positive number
    totalScore += priceScore;

    return {
      ...car,
      rankScore: totalScore,
      matchType,
      matchReasons: reasons,
      filterMatches,
    };
  });
};

export const sortCarsByRank = (rankedCars: CarRank[]): CarRank[] => {
  return [...rankedCars].sort((a, b) => {
    // Primary sort by rank score (higher is better)
    if (a.rankScore !== b.rankScore) {
      return b.rankScore - a.rankScore;
    }
    
    // Secondary sort by price (lower is better)
    return a.price - b.price;
  });
};
