import { useState, useEffect } from 'react';
import { getVehicles, createVehicle, getCustomers } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

export default function Vehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  
  const [formData, setFormData] = useState({
    owner_id: '',
    license_plate: '',
    brand: '',
    model: '',
    year: '',
    vin: ''
  });

  useEffect(() => {
    fetchVehicles();
    fetchCustomers();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await getVehicles();
      setVehicles(response.data);
    } catch (error) {
      console.error('Failed to fetch vehicles', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCustomers = async () => {
    try {
      const response = await getCustomers();
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to fetch customers', error);
    }
  };

  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = { ...formData };
      if (user?.roles?.includes('customer') && !dataToSend.owner_id) {
        dataToSend.owner_id = user.user_id;
      }

      await createVehicle(dataToSend);
      setIsCreateModalOpen(false);
      setFormData({ owner_id: '', license_plate: '', brand: '', model: '', year: '', vin: '' });
      fetchVehicles();
    } catch (error) {
      console.error('Greška: ' + (error.response?.data?.error || error.message));
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-100">Vozila</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400">{vehicles.length} ukupno</span>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary"
          >
            + Dodaj vozilo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((vehicle) => (
          <div key={vehicle.vehicle_id} className="card hover:border-gray-600">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-100">
                  {vehicle.brand} {vehicle.model}
                </h3>
                <p className="text-sm text-gray-400">Godina: {vehicle.year}</p>
              </div>
              <span className="px-3 py-1 bg-blue-900/30 text-blue-400 text-sm rounded border border-blue-800 font-mono">
                {vehicle.license_plate}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              {vehicle.vin && (
                <div className="flex justify-between">
                  <span className="text-gray-500">VIN:</span>
                  <span className="text-gray-300 font-mono text-xs">
                    {vehicle.vin}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Vlasnik:</span>
                <span className="text-gray-300">{vehicle.owner_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email:</span>
                <span className="text-gray-300 text-xs">{vehicle.owner_email}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Dodaj novo vozilo">
        <form onSubmit={handleCreateVehicle} className="space-y-4">
          {['owner', 'receptionist'].some(r => user?.roles?.includes(r)) ? (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Vlasnik (klijent)</label>
              <select
                value={formData.owner_id}
                onChange={(e) => setFormData({...formData, owner_id: e.target.value})}
                className="input"
                required
              >
                <option value="">Odaberi klijenta</option>
                {customers.map(c => (
                  <option key={c.user_id} value={c.user_id}>
                    {c.username} ({c.email})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Vlasnik</label>
              <input
                type="text"
                value={user?.username || ''}
                className="input bg-gray-800"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">Dodajete vozilo za sebe</p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Registarska tablica *</label>
            <input
              type="text"
              value={formData.license_plate}
              onChange={(e) => setFormData({...formData, license_plate: e.target.value.toUpperCase()})}
              className="input"
              placeholder="ZG-1234-AB"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Marka *</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({...formData, brand: e.target.value})}
                className="input"
                placeholder="BMW"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Model *</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({...formData, model: e.target.value})}
                className="input"
                placeholder="320d"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Godina</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({...formData, year: e.target.value})}
                className="input"
                placeholder="2020"
                min="1900"
                max={new Date().getFullYear() + 1}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">VIN (opciono)</label>
              <input
                type="text"
                value={formData.vin}
                onChange={(e) => setFormData({...formData, vin: e.target.value.toUpperCase()})}
                className="input"
                placeholder="17 znakova"
                maxLength="17"
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn-primary flex-1">Dodaj vozilo</button>
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn-secondary flex-1">
              Odustani
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}