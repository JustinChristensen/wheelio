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
  make: z.array(z.string()).optional(),
  model: z.array(z.string()).optional(),
  yearMin: z.number().optional(),
  yearMax: z.number().optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  seats: z.array(z.number()).optional(),
  safetyRating: z.number().min(1).max(5).optional(),
  fuelType: z.array(FuelTypeSchema).optional(),
  transmission: z.array(TransmissionSchema).optional(),
  bodyType: z.array(BodyTypeSchema).optional(),
  drivetrain: z.array(DrivetrainSchema).optional(),
  features: z.array(z.string()).optional(),
  dealershipId: z.array(z.string()).optional(),
});

// Export individual schemas for reuse
export { FuelTypeSchema, TransmissionSchema, BodyTypeSchema, DrivetrainSchema };
