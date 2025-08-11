import { Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import Header from '../components/Header/Header';
import FilterSidebar from '../components/FilterSidebar/FilterSidebar';
import CarGrid from '../components/CarGrid/CarGrid';
import AISalesAgent from '../components/AISalesAgent/AISalesAgent';
import { CarFilters } from 'car-data';
import { useCarData } from '../hooks/useCarData';

export function App() {
  const [filters, setFilters] = useState<CarFilters>({});
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(true);
  
  // Fetch car data from API
  const { cars, loading, error } = useCarData();

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <Routes>
        <Route
          path="/"
          element={
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
                />
              </div>
            </main>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
