import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-gray-100">
              Autoservis
            </Link>

            <div className="ml-10 flex items-baseline space-x-4">
              <Link
                to="/"
                className="text-gray-300 hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium"
              >
                Pregled
              </Link>
              {user?.roles?.includes('owner') && (
                <Link
                  to="/users"
                  className="text-gray-300 hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Korisnici
                </Link>
              )}
              <Link
                to="/work-orders"
                className="text-gray-300 hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium"
              >
                Radni Nalozi
              </Link>
              <Link
                to="/vehicles"
                className="text-gray-300 hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium"
              >
                Vozila
              </Link>
              <Link
                to="/invoices"
                className="text-gray-300 hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium"
              >
                Računi
              </Link>
              {['owner', 'head_mechanic'].some(r => user?.roles?.includes(r)) && (
                <Link
                  to="/audit-log"
                  className="text-gray-300 hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Audit Log
                </Link>
              )}
              <Link
                to="/sessions"
                className="text-gray-300 hover:text-gray-100 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sesije
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-100">
                {user?.username}
              </div>
              <div className="text-xs text-gray-500">
                {user?.roles?.join(', ')}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary text-sm"
            >
              Odjava
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}