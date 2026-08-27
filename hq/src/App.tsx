import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './routes/Dashboard';
import { Properties } from './routes/Properties';
import { PropertyDetail } from './routes/PropertyDetail';
import { UnitDetail } from './routes/UnitDetail';
import { Assets } from './routes/Assets';
import { AssetDetail } from './routes/AssetDetail';
import { WorkOrders } from './routes/WorkOrders';

/**
 * Nameplate HQ — route tree with HashRouter for universal static hosting.
 */
function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/properties/:id" element={<PropertyDetail />} />
          <Route path="/properties/:id/units/:unitId" element={<UnitDetail />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/assets/:id" element={<AssetDetail />} />
          <Route path="/work-orders" element={<WorkOrders />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
