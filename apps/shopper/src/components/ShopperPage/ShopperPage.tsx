import { useState } from 'react';
import FilterSidebar from '../FilterSidebar/FilterSidebar';
import CarGrid from '../CarGrid/CarGrid';
import AISalesAgent from '../AISalesAgent/AISalesAgent';
import { CarFilters } from 'car-data';
import { useCarData } from '../../hooks/useCarData';

export function ShopperPage() {
  const [filters, setFilters] = useState<CarFilters>({});
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(true);
  
  // Fetch car data from API
  const { cars, loading, error } = useCarData();

  return (
    <main className="flex-1 flex overflow-hidden h-full">
      {/* Filter Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0 h-full">
        <FilterSidebar 
          filters={filters} 
          onFiltersChange={setFilters}
          cars={cars}
        />
      </div>

      {/* Car Grid - Scrollable Center */}
      <div className="flex-1 overflow-auto h-full">
        <CarGrid 
          filters={filters} 
          cars={cars}
          loading={loading}
          error={error}
        />
      </div>

      {/* AI Sales Agent Drawer */}
      <div className={`bg-white border-l border-gray-200 transition-all duration-300 ease-in-out ${
        isAIDrawerOpen ? 'w-96' : 'w-0'
      } flex-shrink-0 h-full relative`}>
        <AISalesAgent 
          isOpen={isAIDrawerOpen}
          onToggle={() => setIsAIDrawerOpen(!isAIDrawerOpen)}
          onFiltersUpdate={setFilters}
          currentFilters={filters}
          cars={cars}
        />
      </div>
    </main>
  );
}

export default ShopperPage;
