import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, getUserPermissions, getRoles } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [roles, setRoles] = useState([]);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    role_name: '',
    status: 'active',
    metadata: {
      address: '',
      date_of_birth: '',
      notes: ''
    }
  });

  const [editFormData, setEditFormData] = useState({
    email: '',
    phone: '',
    status: 'active',
    metadata: {
      address: '',
      date_of_birth: '',
      notes: ''
    }
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchRoles = async () => {
    try {
      const response = await getRoles();
      setRoles(response.data);
    } catch (error) {
      console.error('Failed to fetch roles', error);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await createUser(formData);
      setIsCreateModalOpen(false);
      setFormData({
        username: '',
        email: '',
        phone: '',
        password: '',
        role_name: '',
        status: 'active',
        metadata: { address: '', date_of_birth: '', notes: '' }
      });
      fetchUsers();
    } catch (error) {
      console.error('Greška: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      await updateUser(selectedUser.user_id, editFormData);
      setIsEditModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Greška: ' + (error.response?.data?.error || error.message));
      alert('Greška: ' + (error.response?.data?.error || error.message));
    }
  };

  const openEditModal = (userToEdit) => {
    setSelectedUser(userToEdit);
    setEditFormData({
      email: userToEdit.email || '',
      phone: userToEdit.phone || '',
      status: userToEdit.status || 'active',
      metadata: userToEdit.metadata || { address: '', date_of_birth: '', notes: '' }
    });
    setIsEditModalOpen(true);
  };

  const openPermissionsModal = async (userToView) => {
    try {
      const response = await getUserPermissions(userToView.user_id);
      setUserPermissions(response.data);
      setSelectedUser(userToView);
      setIsPermissionsModalOpen(true);
    } catch (error) {
      console.error('Greška pri dohvaćanju dozvola:', error);
      alert('Greška: ' + (error.response?.data?.error || error.message));
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      owner: 'bg-red-900/30 text-red-400 border-red-800',
      head_mechanic: 'bg-purple-900/30 text-purple-400 border-purple-800',
      mechanic: 'bg-blue-900/30 text-blue-400 border-blue-800',
      receptionist: 'bg-green-900/30 text-green-400 border-green-800',
      accountant: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
      customer: 'bg-gray-700/30 text-gray-400 border-gray-600',
    };
    return colors[role] || 'bg-gray-800 text-gray-400 border-gray-700';
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
        <h1 className="text-3xl font-bold text-gray-100">Korisnici</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400">{users.length} ukupno</span>
          <button 
            onClick={() => setIsCreateModalOpen(true)} 
            disabled={user?.roles?.[0] !== 'owner'}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Dodaj korisnika
          </button>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '150px' }}>Korisničko ime</th>
              <th style={{ width: '200px' }}>Email</th>
              <th style={{ width: '220px' }}>Uloge</th>
              <th style={{ width: '100px' }}>Status</th>
              <th style={{ width: '140px' }}>Zadnja prijava</th>
              <th style={{ width: '160px' }}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {users.map((userItem) => (
              <tr key={userItem.user_id}>
                <td className="font-medium">{userItem.username}</td>
                <td className="text-sm">{userItem.email}</td>
                <td>
                  <div className="flex gap-1 flex-wrap">
                    {userItem.roles?.map((role, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-1 text-xs rounded border ${getRoleColor(role)}`}
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      userItem.status === 'active'
                        ? 'bg-green-900/30 text-green-400 border border-green-800'
                        : 'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}
                  >
                    {userItem.status}
                  </span>
                </td>
                <td className="text-sm text-gray-400">
                  {userItem.last_login
                    ? new Date(userItem.last_login).toLocaleString('hr-HR')
                    : 'Nikad'
                  }
                </td>
                <td>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(userItem)}
                      className="text-blue-400 hover:text-blue-300 text-sm underline"
                    >
                      Uredi
                    </button>
                    <button
                      onClick={() => openPermissionsModal(userItem)}
                      className="text-green-400 hover:text-green-300 text-sm underline"
                    >
                      Dozvole
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Dodaj novog korisnika">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Korisničko ime *</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="input"
              placeholder="ivan_ivic"
              required
              minLength="3"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="input"
              placeholder="ivan@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Telefon</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="input"
              placeholder="+385 91 234 5678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Lozinka *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="input"
              placeholder="Minimalno 8 znakova"
              required
              minLength="8"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Uloga *</label>
            <select
              value={formData.role_name}
              onChange={(e) => setFormData({...formData, role_name: e.target.value})}
              className="input"
              required
            >
              <option value="">Odaberi ulogu</option>
              {roles.map(role => (
                <option key={role.role_id} value={role.role_name}>
                  {role.role_name} - {role.description}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="input"
            >
              <option value="active">Aktivan</option>
              <option value="inactive">Neaktivan</option>
              <option value="pending">Na čekanju</option>
            </select>
          </div>

          <div className="border-t border-gray-700 pt-4 mt-4">
            <h3 className="text-md font-semibold text-gray-200 mb-3">Dodatne informacije</h3>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Adresa</label>
              <input
                type="text"
                value={formData.metadata.address}
                onChange={(e) => setFormData({
                  ...formData,
                  metadata: {...formData.metadata, address: e.target.value}
                })}
                className="input"
                placeholder="Ulica 123, Zagreb"
              />
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-300 mb-2">Datum rođenja</label>
              <input
                type="date"
                value={formData.metadata.date_of_birth}
                onChange={(e) => setFormData({
                  ...formData,
                  metadata: {...formData.metadata, date_of_birth: e.target.value}
                })}
                className="input"
              />
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-300 mb-2">Napomene</label>
              <textarea
                value={formData.metadata.notes}
                onChange={(e) => setFormData({
                  ...formData,
                  metadata: {...formData.metadata, notes: e.target.value}
                })}
                className="input"
                rows="2"
                placeholder="Dodatne napomene..."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn-primary flex-1">Kreiraj korisnika</button>
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn-secondary flex-1">
              Odustani
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Uredi korisnika">
        {selectedUser && (
          <form onSubmit={handleEditUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Korisničko ime</label>
              <input
                type="text"
                value={selectedUser.username}
                className="input bg-gray-800"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">Korisničko ime se ne može mijenjati</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Telefon</label>
              <input
                type="tel"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                className="input"
                placeholder="+385 91 234 5678"
              />
            </div>

            {user?.roles?.includes('owner') && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                  className="input"
                >
                  <option value="active">Aktivan</option>
                  <option value="inactive">Neaktivan</option>
                  <option value="pending">Na čekanju</option>
                  <option value="banned">Zabranjen</option>
                </select>
              </div>
            )}

            <div className="border-t border-gray-700 pt-4 mt-4">
              <h3 className="text-md font-semibold text-gray-200 mb-3">Dodatne informacije</h3>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Adresa</label>
                <input
                  type="text"
                  value={editFormData.metadata?.address || ''}
                  onChange={(e) => setEditFormData({
                    ...editFormData,
                    metadata: {...editFormData.metadata, address: e.target.value}
                  })}
                  className="input"
                  placeholder="Ulica 123, Zagreb"
                />
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-300 mb-2">Datum rođenja</label>
                <input
                  type="date"
                  value={editFormData.metadata?.date_of_birth || ''}
                  onChange={(e) => setEditFormData({
                    ...editFormData,
                    metadata: {...editFormData.metadata, date_of_birth: e.target.value}
                  })}
                  className="input"
                />
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-300 mb-2">Napomene</label>
                <textarea
                  value={editFormData.metadata?.notes || ''}
                  onChange={(e) => setEditFormData({
                    ...editFormData,
                    metadata: {...editFormData.metadata, notes: e.target.value}
                  })}
                  className="input"
                  rows="2"
                  placeholder="Dodatne napomene..."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" className="btn-primary flex-1">Spremi promjene</button>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn-secondary flex-1">
                Odustani
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={isPermissionsModalOpen} onClose={() => setIsPermissionsModalOpen(false)} title="Dozvole korisnika">
        {selectedUser && (
          <div className="space-y-4">
            <div>
              <span className="text-gray-400">Korisnik:</span>
              <span className="text-gray-100 font-medium ml-2">{selectedUser.username}</span>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <h3 className="text-md font-semibold text-gray-200 mb-3">Dodijeljene dozvole</h3>

              {userPermissions.length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(
                    userPermissions.reduce((acc, perm) => {
                      if (!acc[perm.resource_type]) acc[perm.resource_type] = [];
                      acc[perm.resource_type].push(perm);
                      return acc;
                    }, {})
                  ).map(([resource, perms]) => (
                    <div key={resource} className="bg-gray-800 p-3 rounded border border-gray-700">
                      <div className="font-medium text-gray-200 mb-2">{resource}</div>
                      <div className="flex gap-2 flex-wrap">
                        {perms.map((perm, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs rounded bg-blue-900/30 text-blue-400 border border-blue-800"
                          >
                            {perm.action}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Nema dodijeljenih dozvola</p>
              )}
            </div>

            <div className="pt-4">
              <button
                onClick={() => setIsPermissionsModalOpen(false)}
                className="btn-secondary w-full"
              >
                Zatvori
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}