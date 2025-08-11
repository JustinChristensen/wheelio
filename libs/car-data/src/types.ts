export interface Dealership {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  phone: string;
  website: string;
}

export interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  seats: number;
  safetyRating: number; // 1-5 stars
  imageUrl: string;
  dealershipId: string;
  features: string[];
  color: string;
  mileage: number;
  fuelType: 'Gas' | 'Hybrid' | 'Electric';
  transmission: 'Manual' | 'Automatic' | 'CVT';
  bodyType: 'Sedan' | 'SUV' | 'Hatchback' | 'Coupe' | 'Convertible' | 'Truck' | 'Wagon';
  drivetrain: 'FWD' | 'RWD' | 'AWD' | '4WD';
}

export interface CarFilters {
  make?: string[];
  model?: string[];
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  seats?: number[];
  safetyRating?: number;
  fuelType?: string[];
  transmission?: string[];
  bodyType?: string[];
  drivetrain?: string[];
  features?: string[];
  dealershipId?: string[];
}
