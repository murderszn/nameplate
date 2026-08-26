import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './routes/Dashboard';
import { Properties } from './routes/Properties';
import { Assets } from './routes/Assets';
import { WorkOrders } from './routes/WorkOrders';

/**
 * Nameplate HQ — route tree (V0 scaffold subset of v0-scope.md §1.2).
 * Additional routes (units, turns, parts, reports, shrinkage, settings,
 * users, audit log) share the same Layout shell.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/work-orders" element={<WorkOrders />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
