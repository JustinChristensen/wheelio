import { z } from 'zod';
import { CarSchema, CarFiltersSchema } from './schemas';

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

// Derive types from Zod schemas to ensure consistency
export type Car = z.infer<typeof CarSchema>;
export type CarFilters = z.infer<typeof CarFiltersSchema>;
