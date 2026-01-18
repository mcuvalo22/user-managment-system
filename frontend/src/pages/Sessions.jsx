import { useState, useEffect } from 'react';
import { getSessions, deleteSession } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Sessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await getSessions();
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to fetch sessions', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Deaktivirati ovu sesiju?')) return;

    try {
      await deleteSession(sessionId);
      fetchSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Greška: ' + (error.response?.data?.error || error.message));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Učitavanje...</div>
      </div>
    );
  }

  const isOwner = user?.roles?.includes('owner');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-100">Aktivne sesije</h1>
        <p className="text-gray-400 mt-1">
          {isOwner ? 'Sve aktivne sesije u sustavu' : 'Vaše aktivne sesije'}
        </p>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              {isOwner && <th style={{ width: '180px' }}>Korisnik</th>}
              <th style={{ width: '160px' }}>IP adresa</th>
              <th style={{ width: '180px' }}>Kreirano</th>
              <th style={{ width: '180px' }}>Istječe</th>
              <th style={{ width: '120px' }}>Preostalo</th>
              {isOwner && <th style={{ width: '200px' }}>Uloge</th>}
              <th style={{ width: '100px' }}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => {
              const minutesLeft = Math.floor(session.minutes_until_expiry);
              const hoursLeft = Math.floor(minutesLeft / 60);

              return (
                <tr key={session.session_id}>
                  {isOwner && (
                    <td>
                      <div className="text-sm font-medium">{session.username}</div>
                      <div className="text-xs text-gray-500">{session.email}</div>
                    </td>
                  )}
                  <td className="font-mono text-sm">{session.ip_address}</td>
                  <td className="text-sm text-gray-400">
                    {new Date(session.created_at).toLocaleString('hr-HR')}
                  </td>
                  <td className="text-sm text-gray-400">
                    {new Date(session.expires_at).toLocaleString('hr-HR')}
                  </td>
                  <td className="text-sm">
                    {minutesLeft > 0 ? (
                      <span className="text-green-400">
                        {hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft % 60}m` : `${minutesLeft}m`}
                      </span>
                    ) : (
                      <span className="text-red-400">Isteklo</span>
                    )}
                  </td>
                  {isOwner && (
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        {session.roles?.filter(r => r !== null).map((role, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs rounded bg-blue-900/30 text-blue-400 border border-blue-800"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                  )}
                  <td>
                    <button
                      onClick={() => handleDeleteSession(session.session_id)}
                      className="text-red-400 hover:text-red-300 text-sm underline"
                    >
                      Deaktiviraj
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sessions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Nema aktivnih sesija
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-sm text-gray-400">Aktivne sesije</div>
          <div className="text-2xl font-bold text-gray-100 mt-1">
            {sessions.length}
          </div>
        </div>

        {isOwner && (
          <>
            <div className="card">
              <div className="text-sm text-gray-400">Jedinstveni korisnici</div>
              <div className="text-2xl font-bold text-blue-400 mt-1">
                {new Set(sessions.map(s => s.username)).size}
              </div>
            </div>

            <div className="card">
              <div className="text-sm text-gray-400">Najaktivniji korisnik</div>
              <div className="text-lg font-bold text-green-400 mt-1">
                {sessions.length > 0
                  ? Object.entries(
                      sessions.reduce((acc, s) => {
                        acc[s.username] = (acc[s.username] || 0) + 1;
                        return acc;
                      }, {})
                    ).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'
                  : '-'
                }
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
