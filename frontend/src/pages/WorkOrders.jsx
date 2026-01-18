import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getWorkOrders, 
  getWorkOrder, 
  createWorkOrder, 
  updateWorkOrderStatus,
  assignMechanic,
  addWorkLog,
  getVehicles,
  getMechanics 
} from '../services/api';
import Modal from '../components/Modal';

export default function WorkOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  

  const [formData, setFormData] = useState({
    vehicle_id: '',
    description: '',
    estimated_cost: '',
    assigned_mechanic_id: ''
  });
  
  const [logData, setLogData] = useState({
    log_entry: '',
    hours_worked: ''
  });

  useEffect(() => {
    fetchOrders();
    fetchVehicles();
    fetchMechanics();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await getWorkOrders();
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch work orders', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchVehicles = async () => {
    try {
      const response = await getVehicles();
      setVehicles(response.data);
    } catch (error) {
      console.error('Failed to fetch vehicles', error);
    }
  };
  
  const fetchMechanics = async () => {
    try {
      const response = await getMechanics();
      setMechanics(response.data);
    } catch (error) {
      console.error('Failed to fetch mechanics', error);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      await createWorkOrder(formData);
      setIsCreateModalOpen(false);
      setFormData({ vehicle_id: '', description: '', estimated_cost: '', assigned_mechanic_id: '' });
      fetchOrders();
    } catch (error) {
      console.error('Greška: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateWorkOrderStatus(orderId, newStatus);
      fetchOrders();
      if (selectedOrder) {
        fetchOrderDetails(orderId);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleAssignMechanic = async (orderId, mechanicId) => {
    if (!mechanicId || mechanicId === '') {
      return;
    }
    try {
      await assignMechanic(orderId, mechanicId);
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.work_order_id === orderId 
            ? { ...order, mechanic_id: mechanicId }
            : order
        )
      );
      if (selectedOrder && selectedOrder.work_order_id === orderId) {
        fetchOrderDetails(orderId);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchOrderDetails = async (orderId) => {
    try {
      const response = await getWorkOrder(orderId);
      setSelectedOrder(response.data);
      setIsDetailModalOpen(true);
    } catch (error) {
      console.error('Greška pri učitavanju detalja:', error);
    }
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    try {
      await addWorkLog(selectedOrder.work_order_id, logData);
      setLogData({ log_entry: '', hours_worked: '' });
      fetchOrderDetails(selectedOrder.work_order_id);
    } catch (error) {
      console.error('Greška pri dodavanju zapisa:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
      approved: 'bg-blue-900/30 text-blue-400 border-blue-800',
      in_progress: 'bg-purple-900/30 text-purple-400 border-purple-800',
      completed: 'bg-green-900/30 text-green-400 border-green-800',
      cancelled: 'bg-red-900/30 text-red-400 border-red-800',
      waiting_parts: 'bg-orange-900/30 text-orange-400 border-orange-800',
    };
    return colors[status] || 'bg-gray-800 text-gray-400 border-gray-700';
  };

  const getStatusText = (status) => {
    const labels = {
      pending: 'Na čekanju',
      approved: 'Odobreno',
      in_progress: 'U tijeku',
      completed: 'Završeno',
      cancelled: 'Otkazano',
      waiting_parts: 'Čeka dijelove',
    };
    return labels[status] || status;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-400">Učitavanje...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-100">Radni nalozi</h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          disabled={!['owner', 'receptionist', 'head_mechanic'].some(r => user?.roles?.includes(r))}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Novi radni nalog
        </button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '170px' }}>Status</th>
              <th style={{ width: '160px' }}>Vozilo</th>
              <th style={{ width: '130px' }}>Klijent</th>
              <th style={{ width: '180px' }}>Mehaničar</th>
              <th>Opis</th>
              <th style={{ width: '90px', textAlign: 'right' }}>Cijena</th>
              <th style={{ width: '90px' }}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.work_order_id}>
                <td>
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.work_order_id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    disabled={
                      !['owner', 'receptionist', 'head_mechanic'].some(r => user?.roles?.includes(r)) &&
                      !(user?.roles?.includes('mechanic') && order.mechanic_id === user?.user_id)
                    }
                    className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-sm text-gray-100 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="pending">Na čekanju</option>
                    <option value="approved">Odobreno</option>
                    <option value="in_progress">U tijeku</option>
                    <option value="waiting_parts">Čeka dijelove</option>
                    <option value="completed">Završeno</option>
                    <option value="cancelled">Otkazano</option>
                  </select>
                </td>
                <td onClick={() => fetchOrderDetails(order.work_order_id)} className="cursor-pointer">
                  <div className="font-medium text-sm">{order.license_plate}</div>
                  <div className="text-xs text-gray-500">{order.brand} {order.model}</div>
                </td>
                <td onClick={() => fetchOrderDetails(order.work_order_id)} className="text-sm cursor-pointer">
                  {order.customer_name}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <select
                    value={order.mechanic_id || ''}
                    onChange={(e) => {
                      const mechanicId = e.target.value;
                      handleAssignMechanic(order.work_order_id, mechanicId);
                    }}
                    disabled={!['owner', 'receptionist', 'head_mechanic'].some(r => user?.roles?.includes(r))}
                    className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-sm text-gray-100 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">Nije dodijeljen</option>
                    {mechanics.map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.username}</option>
                    ))}
                  </select>
                </td>
                <td onClick={() => fetchOrderDetails(order.work_order_id)} className="text-sm cursor-pointer">
                  <div className="truncate" style={{ maxWidth: '300px' }} title={order.description}>
                    {order.description}
                  </div>
                </td>
                <td onClick={() => fetchOrderDetails(order.work_order_id)} className="text-right text-sm cursor-pointer">
                  {order.estimated_cost ? `€${parseFloat(order.estimated_cost).toFixed(2)}` : '-'}
                </td>
                <td>
                  <button 
                    onClick={() => fetchOrderDetails(order.work_order_id)}
                    className="text-blue-400 hover:text-blue-300 text-sm underline"
                  >
                    Detalji
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Novi radni nalog">
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Vozilo</label>
            <select
              value={formData.vehicle_id}
              onChange={(e) => setFormData({...formData, vehicle_id: e.target.value})}
              className="input"
              required
            >
              <option value="">Odaberi vozilo</option>
              {vehicles.map(v => (
                <option key={v.vehicle_id} value={v.vehicle_id}>
                  {v.license_plate} - {v.brand} {v.model} ({v.owner_name})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Opis problema</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="input"
              rows="4"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Procijenjena cijena (€)</label>
            <input
              type="number"
              step="0.01"
              value={formData.estimated_cost}
              onChange={(e) => setFormData({...formData, estimated_cost: e.target.value})}
              className="input"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Dodijeli mehaničara (opciono)</label>
            <select
              value={formData.assigned_mechanic_id}
              onChange={(e) => setFormData({...formData, assigned_mechanic_id: e.target.value})}
              className="input"
            >
              <option value="">Kasnije</option>
              {mechanics.map(m => (
                <option key={m.user_id} value={m.user_id}>{m.username}</option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn-primary flex-1">Kreiraj nalog</button>
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn-secondary flex-1">
              Odustani
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)} 
        title={`Radni nalog - ${selectedOrder?.license_plate}`}
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-400 text-sm">Vozilo:</span>
                <p className="text-gray-100 font-medium">{selectedOrder.brand} {selectedOrder.model}</p>
                <p className="text-gray-400 text-sm">{selectedOrder.license_plate}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Klijent:</span>
                <p className="text-gray-100 font-medium">{selectedOrder.customer_name}</p>
                <p className="text-gray-400 text-sm">{selectedOrder.customer_email}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Status:</span>
                <p><span className={`px-2 py-1 text-xs rounded border ${getStatusColor(selectedOrder.status)}`}>
                  {getStatusText(selectedOrder.status)}
                </span></p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Mehaničar:</span>
                <p className="text-gray-100">{selectedOrder.mechanic_name || 'Nije dodjeljen'}</p>
              </div>
            </div>
            
            <div>
              <span className="text-gray-400 text-sm">Opis:</span>
              <p className="text-gray-100 mt-1">{selectedOrder.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-400 text-sm">Procjena:</span>
                <p className="text-gray-100 text-lg">
                  {selectedOrder.estimated_cost ? `€${parseFloat(selectedOrder.estimated_cost).toFixed(2)}` : '-'}
                </p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Stvarno:</span>
                <p className="text-gray-100 text-lg">
                  {selectedOrder.actual_cost ? `€${parseFloat(selectedOrder.actual_cost).toFixed(2)}` : '-'}
                </p>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-100 mb-3">Zapisi rada</h3>
              <div className="space-y-2 mb-4">
                {selectedOrder.work_logs && selectedOrder.work_logs.length > 0 ? (
                  selectedOrder.work_logs.map((log) => (
                    <div key={log.log_id} className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-gray-300 font-medium text-sm">{log.mechanic_name}</span>
                        <span className="text-gray-500 text-xs">
                          {new Date(log.timestamp).toLocaleString('hr-HR')}
                        </span>
                      </div>
                      <p className="text-gray-100 text-sm">{log.log_entry}</p>
                      {log.hours_worked && (
                        <span className="text-gray-400 text-xs">⏱ {log.hours_worked}h</span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">Nema zapisa rada</p>
                )}
              </div>

              {!user?.roles?.includes('customer') && (
                <form onSubmit={handleAddLog} className="space-y-3 bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <h4 className="text-sm font-medium text-gray-300">Dodaj novi zapis</h4>
                  <textarea
                    value={logData.log_entry}
                    onChange={(e) => setLogData({...logData, log_entry: e.target.value})}
                    className="input text-sm"
                    rows="2"
                    placeholder="Opis izvršenog rada..."
                    required
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={logData.hours_worked}
                    onChange={(e) => setLogData({...logData, hours_worked: e.target.value})}
                    className="input text-sm"
                    placeholder="Sati rada (opciono)"
                  />
                  <button
                    type="submit"
                    disabled={!['owner', 'receptionist', 'head_mechanic'].some(r => user?.roles?.includes(r)) &&
                              String(selectedOrder?.mechanic_id) !== String(user?.user_id)}
                    className="btn-primary w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Dodaj zapis
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}