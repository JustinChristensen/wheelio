import { Route, Routes } from 'react-router-dom';
import Header from '../components/Header/Header';
import ShopperPage from '../components/ShopperPage/ShopperPage';
import SalesRepPage from '../components/SalesRepPage/SalesRepPage';

export function App() {
  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <Routes>
        <Route path="/" element={<ShopperPage />} />
        <Route path="/sales" element={<SalesRepPage />} />
      </Routes>
    </div>
  );
}

export default App;
