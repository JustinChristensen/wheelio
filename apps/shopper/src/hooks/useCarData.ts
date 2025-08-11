import { useState, useEffect } from 'react';
import { Car } from 'car-data';
import { ApiService } from '../services/api';

interface UseCarDataResult {
  cars: Car[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useCarData = (): UseCarDataResult => {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCars = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await ApiService.getCars();
      
      if (response.success) {
        setCars(response.data);
      } else {
        setError(response.error || 'Failed to fetch cars');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCars();
  }, []);

  return {
    cars,
    loading,
    error,
    refetch: fetchCars
  };
};
