import { Dealership } from './types';

export const mockDealerships: Dealership[] = [
  {
    id: 'dealership-1',
    name: 'Premium Auto Gallery',
    address: {
      street: '1245 Automotive Boulevard',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210'
    },
    phone: '(555) 123-4567',
    website: 'https://premiumautogallery.com'
  },
  {
    id: 'dealership-2',
    name: 'Metro Motors',
    address: {
      street: '789 Commerce Drive',
      city: 'Austin',
      state: 'TX',
      zipCode: '73301'
    },
    phone: '(555) 987-6543',
    website: 'https://metromotors.com'
  },
  {
    id: 'dealership-3',
    name: 'Northeast Car Connection',
    address: {
      street: '456 Main Street',
      city: 'Boston',
      state: 'MA',
      zipCode: '02101'
    },
    phone: '(555) 456-7890',
    website: 'https://northeastcarconnection.com'
  }
];
