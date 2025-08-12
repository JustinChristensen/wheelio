import { z } from 'zod';

// Define the exact string literals for car properties
const FuelTypeSchema = z.union([
  z.literal('Gas'),
  z.literal('Hybrid'),
  z.literal('Electric')
]);

const TransmissionSchema = z.union([
  z.literal('Manual'),
  z.literal('Automatic'),
  z.literal('CVT')
]);

const BodyTypeSchema = z.union([
  z.literal('Sedan'),
  z.literal('SUV'),
  z.literal('Hatchback'),
  z.literal('Coupe'),
  z.literal('Convertible'),
  z.literal('Truck'),
  z.literal('Wagon'),
  z.literal('Minivan')
]);

const DrivetrainSchema = z.union([
  z.literal('FWD'),
  z.literal('RWD'),
  z.literal('AWD'),
  z.literal('4WD')
]);

// Car schema for validation
export const CarSchema = z.object({
  id: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number(),
  price: z.number(),
  seats: z.number(),
  safetyRating: z.number().min(1).max(5),
  imageUrl: z.string(),
  dealershipId: z.string(),
  features: z.array(z.string()),
  color: z.string(),
  mileage: z.number(),
  fuelType: FuelTypeSchema,
  transmission: TransmissionSchema,
  bodyType: BodyTypeSchema,
  drivetrain: DrivetrainSchema,
});

// Car filters schema for validation and type inference
export const CarFiltersSchema = z.object({
  make: z.array(z.string()).optional().describe("Array of car manufacturers/brands to filter by (e.g., ['Toyota', 'Honda'])"),
  model: z.array(z.string()).optional().describe("Array of specific car models to filter by (e.g., ['Camry', 'Accord'])"),
  yearMin: z.number().optional().describe("Minimum year for vehicles (e.g., 2020)"),
  yearMax: z.number().optional().describe("Maximum year for vehicles (e.g., 2024)"),
  priceMin: z.number().optional().describe("Minimum price in dollars (e.g., 20000)"),
  priceMax: z.number().optional().describe("Maximum price in dollars (e.g., 50000)"),
  seats: z.array(z.number()).optional().describe("Array of seat counts to filter by (e.g., [5, 7] for 5 or 7 seaters)"),
  safetyRating: z.number().min(1).max(5).optional().describe("Minimum safety rating from 1-5 stars (e.g., 4 for 4+ star safety rating)"),
  fuelType: z.array(FuelTypeSchema).optional().describe("Array of fuel types: 'Gas', 'Hybrid', or 'Electric'"),
  transmission: z.array(TransmissionSchema).optional().describe("Array of transmission types: 'Manual', 'Automatic', or 'CVT'"),
  bodyType: z.array(BodyTypeSchema).optional().describe("Array of vehicle body types: 'Sedan', 'SUV', 'Hatchback', 'Coupe', 'Convertible', 'Truck', 'Wagon', or 'Minivan'"),
  drivetrain: z.array(DrivetrainSchema).optional().describe("Array of drivetrain types: 'FWD', 'RWD', 'AWD', or '4WD'"),
  features: z.array(z.string()).optional().describe("Array of specific features to look for (e.g., ['Leather Seats', 'Sunroof'])"),
  dealershipId: z.array(z.string()).optional().describe("Array of dealership IDs to filter by"),
});

// Export individual schemas for reuse
export { FuelTypeSchema, TransmissionSchema, BodyTypeSchema, DrivetrainSchema };
