import { useState, useEffect } from 'react';
import { getDashboardStats, getCustomerDashboard, getMechanicDashboard } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      if (user?.roles?.includes('customer') && !user?.roles?.includes('owner')) {
        const response = await getCustomerDashboard();
        setStats({ type: 'customer', data: response.data });
      } else if (user?.roles?.includes('mechanic') && !user?.roles?.some(r => ['owner', 'head_mechanic'].includes(r))) {
        const response = await getMechanicDashboard();
        setStats({ type: 'mechanic', data: response.data });
      } else {
        const response = await getDashboardStats();
        setStats({ type: 'admin', data: response.data });
      }
    } catch (error) {
      console.error('Failed to fetch stats', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Učitavanje...</div>
      </div>
    );
  }


  if (stats?.type === 'admin') {
    const data = stats.data;
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Dashboard</h1>
          <p className="text-gray-400 mt-1">Dobrodošli, {user?.username}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="text-sm text-gray-400">Ukupno korisnika</div>
            <div className="text-3xl font-bold text-gray-100 mt-2">{data?.total_users || 0}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-400">Ukupno vozila</div>
            <div className="text-3xl font-bold text-gray-100 mt-2">{data?.total_vehicles || 0}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-400">Aktivni nalozi</div>
            <div className="text-3xl font-bold text-blue-400 mt-2">{data?.active_orders || 0}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-400">Na čekanju</div>
            <div className="text-3xl font-bold text-yellow-400 mt-2">{data?.pending_orders || 0}</div>
          </div>
        </div>

        {data?.top_mechanics && data.top_mechanics.length > 0 && (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Najbolji mehaničari</h2>
            <div className="space-y-2">
              {data.top_mechanics.map((mechanic, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-800 rounded-md border border-gray-700">
                  <span className="text-gray-200">{mechanic.username}</span>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">{mechanic.completed_jobs} završenih</div>
                    <div className="text-xs text-gray-500">{parseFloat(mechanic.total_hours_worked).toFixed(1)}h</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data?.recent_activities && data.recent_activities.length > 0 && ['owner', 'head_mechanic'].some(r => user?.roles?.includes(r)) && (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Nedavne aktivnosti</h2>
            <div className="space-y-2">
              {data.recent_activities.slice(0, 5).map((activity, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-800 rounded-md border border-gray-700">
                  <div>
                    <span className="text-gray-200">{activity.username || 'System'}</span>
                    <span className="text-gray-500 mx-2">•</span>
                    <span className="text-gray-400">{activity.action_type}</span>
                    <span className="text-gray-500 mx-2">na</span>
                    <span className="text-gray-400">{activity.table_name}</span>
                  </div>
                  <div className="text-xs text-gray-500">{new Date(activity.timestamp).toLocaleString('hr-HR')}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }


  if (stats?.type === 'customer') {
    const data = stats.data;
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Moj Dashboard</h1>
          <p className="text-gray-400 mt-1">Dobrodošli, {user?.username}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="text-sm text-gray-400">Moja vozila</div>
            <div className="text-3xl font-bold text-gray-100 mt-2">{data?.total_vehicles || 0}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-400">Ukupno servisa</div>
            <div className="text-3xl font-bold text-blue-400 mt-2">{data?.total_services || 0}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-400">Ukupno potrošeno</div>
            <div className="text-3xl font-bold text-green-400 mt-2">€{parseFloat(data?.total_spent || 0).toFixed(2)}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-400">Neplaćeni računi</div>
            <div className="text-3xl font-bold text-orange-400 mt-2">€{parseFloat(data?.outstanding_balance || 0).toFixed(2)}</div>
          </div>
        </div>

        {data?.vehicles && data.vehicles.length > 0 && (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Moja vozila</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.vehicles.map((vehicle) => (
                <div key={vehicle.vehicle_id} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-100">{vehicle.brand} {vehicle.model}</h3>
                      <p className="text-sm text-gray-400">{vehicle.year}</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-900/30 text-blue-400 text-sm rounded border border-blue-800 font-mono">
                      {vehicle.license_plate}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Servisa:</span>
                      <span className="text-gray-300">{vehicle.total_services || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Potrošeno:</span>
                      <span className="text-gray-300">€{parseFloat(vehicle.total_spent || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Zadnji servis:</span>
                      <span className="text-gray-300">
                        {vehicle.last_service_date ? new Date(vehicle.last_service_date).toLocaleDateString('hr-HR') : 'Nikad'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }


  if (stats?.type === 'mechanic') {
    const data = stats.data;
    const workload = data?.workload || {};
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Moj Dashboard</h1>
          <p className="text-gray-400 mt-1">Dobrodošli, {user?.username}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="text-sm text-gray-400">Ukupno naloga</div>
            <div className="text-3xl font-bold text-gray-100 mt-2">{workload?.total_orders || 0}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-400">Na čekanju</div>
            <div className="text-3xl font-bold text-yellow-400 mt-2">{workload?.pending_orders || 0}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-400">U tijeku</div>
            <div className="text-3xl font-bold text-blue-400 mt-2">{workload?.in_progress_orders || 0}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-400">Prosječno dana</div>
            <div className="text-3xl font-bold text-green-400 mt-2">{parseFloat(workload?.avg_completion_days || 0).toFixed(1)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <h3 className="text-md font-semibold text-gray-200 mb-2">Završeni poslovi</h3>
            <div className="text-3xl font-bold text-green-400">{data?.completed_jobs || 0}</div>
            <p className="text-xs text-gray-500 mt-1">od ukupno {data?.total_jobs || 0} dodijeljenih</p>
          </div>
          <div className="card">
            <h3 className="text-md font-semibold text-gray-200 mb-2">Ukupno sati</h3>
            <div className="text-3xl font-bold text-blue-400">{parseFloat(data?.total_hours_worked || 0).toFixed(1)}h</div>
            <p className="text-xs text-gray-500 mt-1">ukupno odrađenih sati</p>
          </div>
          <div className="card">
            <h3 className="text-md font-semibold text-gray-200 mb-2">Prihod</h3>
            <div className="text-3xl font-bold text-green-400">€{parseFloat(data?.total_revenue || 0).toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">prosječno €{parseFloat(data?.avg_job_cost || 0).toFixed(2)} po poslu</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}