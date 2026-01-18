import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="card w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-100">
          Autoservis
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              placeholder="Enter username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="Enter password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-gray-800">
          <p className="text-sm font-medium text-gray-300 mb-4">Testni Računi:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-gray-400">
              <thead className="text-gray-500 border-b border-gray-800">
                <tr>
                  <th className="text-left py-2 px-2">Uloga</th>
                  <th className="text-left py-2 px-2">Username</th>
                  <th className="text-left py-2 px-2">Password</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                <tr className="hover:bg-gray-900/50">
                  <td className="py-2 px-2">Vlasnik</td>
                  <td className="py-2 px-2 font-mono">marko_vlasnik</td>
                  <td className="py-2 px-2 font-mono">password123</td>
                </tr>
                <tr className="hover:bg-gray-900/50">
                  <td className="py-2 px-2">Glavni mehaničar</td>
                  <td className="py-2 px-2 font-mono">ivan_glavni</td>
                  <td className="py-2 px-2 font-mono">password123</td>
                </tr>
                <tr className="hover:bg-gray-900/50">
                  <td className="py-2 px-2">Mehaničar</td>
                  <td className="py-2 px-2 font-mono">petar_mehanicar</td>
                  <td className="py-2 px-2 font-mono">password123</td>
                </tr>
                <tr className="hover:bg-gray-900/50">
                  <td className="py-2 px-2">Recepcija</td>
                  <td className="py-2 px-2 font-mono">maja_recepcija</td>
                  <td className="py-2 px-2 font-mono">password123</td>
                </tr>
                <tr className="hover:bg-gray-900/50">
                  <td className="py-2 px-2">Računovođa</td>
                  <td className="py-2 px-2 font-mono">luka_racunovodja</td>
                  <td className="py-2 px-2 font-mono">password123</td>
                </tr>
                <tr className="hover:bg-gray-900/50">
                  <td className="py-2 px-2">Klijent</td>
                  <td className="py-2 px-2 font-mono">tomislav_klijent</td>
                  <td className="py-2 px-2 font-mono">password123</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}