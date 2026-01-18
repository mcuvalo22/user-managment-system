import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import WorkOrders from './pages/WorkOrders';
import Vehicles from './pages/Vehicles';
import Invoices from './pages/Invoices';
import AuditLog from './pages/AuditLog';
import Sessions from './pages/Sessions';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <Layout>
                <Dashboard />
              </Layout>
            }
          />
          <Route
            path="/users"
            element={
              <Layout>
                <Users />
              </Layout>
            }
          />
          <Route
            path="/work-orders"
            element={
              <Layout>
                <WorkOrders />
              </Layout>
            }
          />
          <Route
            path="/vehicles"
            element={
              <Layout>
                <Vehicles />
              </Layout>
            }
          />
          <Route
            path="/invoices"
            element={
              <Layout>
                <Invoices />
              </Layout>
            }
          />
          <Route
            path="/audit-log"
            element={
              <Layout>
                <AuditLog />
              </Layout>
            }
          />
          <Route
            path="/sessions"
            element={
              <Layout>
                <Sessions />
              </Layout>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;