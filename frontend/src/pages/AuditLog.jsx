import { useState, useEffect } from 'react';
import { getAuditLog } from '../services/api';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    table_name: '',
    action_type: '',
    limit: 100
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const params = {};
      if (filters.table_name) params.table_name = filters.table_name;
      if (filters.action_type) params.action_type = filters.action_type;
      params.limit = filters.limit;

      const response = await getAuditLog(params);
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch audit log', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    setLoading(true);
    fetchLogs();
  };

  const getActionColor = (action) => {
    const colors = {
      INSERT: 'bg-green-900/30 text-green-400 border-green-800',
      UPDATE: 'bg-blue-900/30 text-blue-400 border-blue-800',
      DELETE: 'bg-red-900/30 text-red-400 border-red-800',
    };
    return colors[action] || 'bg-gray-800 text-gray-400 border-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Učitavanje...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-100">Audit Log</h1>
        <p className="text-gray-400 mt-1">Povijest svih promjena u sustavu</p>
      </div>

      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tablica</label>
            <select
              value={filters.table_name}
              onChange={(e) => handleFilterChange('table_name', e.target.value)}
              className="input text-sm"
            >
              <option value="">Sve tablice</option>
              <option value="users">users</option>
              <option value="work_orders">work_orders</option>
              <option value="vehicles">vehicles</option>
              <option value="invoices">invoices</option>
              <option value="sessions">sessions</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Akcija</label>
            <select
              value={filters.action_type}
              onChange={(e) => handleFilterChange('action_type', e.target.value)}
              className="input text-sm"
            >
              <option value="">Sve akcije</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Limit</label>
            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
              className="input text-sm"
            >
              <option value="50">50 zapisa</option>
              <option value="100">100 zapisa</option>
              <option value="200">200 zapisa</option>
              <option value="500">500 zapisa</option>
            </select>
          </div>

          <div className="flex items-end">
            <button onClick={applyFilters} className="btn-primary w-full">
              Primijeni filtere
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '180px' }}>Vrijeme</th>
                <th style={{ width: '100px' }}>Akcija</th>
                <th style={{ width: '150px' }}>Tablica</th>
                <th style={{ width: '140px' }}>Korisnik</th>
                <th style={{ width: '140px' }}>IP adresa</th>
                <th>Promjena</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.log_id}>
                  <td className="text-sm text-gray-400">
                    {new Date(log.timestamp).toLocaleString('hr-HR')}
                  </td>
                  <td>
                    <span className={`px-2 py-1 text-xs rounded border ${getActionColor(log.action_type)}`}>
                      {log.action_type}
                    </span>
                  </td>
                  <td className="font-mono text-sm">{log.table_name}</td>
                  <td className="text-sm">
                    <div>{log.username || '-'}</div>
                    <div className="text-xs text-gray-500">{log.email || ''}</div>
                  </td>
                  <td className="font-mono text-xs text-gray-500">{log.ip_address || '-'}</td>
                  <td>
                    <details className="text-sm">
                      <summary className="cursor-pointer text-blue-400 hover:text-blue-300">
                        Vidi detalje
                      </summary>
                      <div className="mt-2 p-3 bg-gray-900 rounded border border-gray-700 text-xs">
                        {log.action_type === 'DELETE' || log.action_type === 'UPDATE' ? (
                          <div className="mb-3">
                            <div className="text-gray-400 mb-1">Stara vrijednost:</div>
                            <pre className="text-gray-300 overflow-auto">
                              {JSON.stringify(log.old_value, null, 2)}
                            </pre>
                          </div>
                        ) : null}
                        {log.action_type === 'INSERT' || log.action_type === 'UPDATE' ? (
                          <div>
                            <div className="text-gray-400 mb-1">Nova vrijednost:</div>
                            <pre className="text-gray-300 overflow-auto">
                              {JSON.stringify(log.new_value, null, 2)}
                            </pre>
                          </div>
                        ) : null}
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Nema zapisa za prikaz
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-sm text-gray-400">Ukupno zapisa</div>
          <div className="text-2xl font-bold text-gray-100 mt-1">{logs.length}</div>
        </div>

        <div className="card">
          <div className="text-sm text-gray-400">INSERT akcija</div>
          <div className="text-2xl font-bold text-green-400 mt-1">
            {logs.filter(l => l.action_type === 'INSERT').length}
          </div>
        </div>

        <div className="card">
          <div className="text-sm text-gray-400">DELETE akcija</div>
          <div className="text-2xl font-bold text-red-400 mt-1">
            {logs.filter(l => l.action_type === 'DELETE').length}
          </div>
        </div>
      </div>
    </div>
  );
}
