import { useState, useEffect } from 'react';
import { getInvoices, markInvoicePaid } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Invoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await getInvoices();
      setInvoices(response.data);
    } catch (error) {
      console.error('Failed to fetch invoices', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (invoiceId) => {
    if (!window.confirm('Označiti račun kao plaćen?')) return;

    try {
      await markInvoicePaid(invoiceId);
      fetchInvoices();
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      alert('Greška: ' + (error.response?.data?.error || error.message));
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-700/30 text-gray-400 border-gray-600',
      issued: 'bg-blue-900/30 text-blue-400 border-blue-800',
      paid: 'bg-green-900/30 text-green-400 border-green-800',
      cancelled: 'bg-red-900/30 text-red-400 border-red-800',
      overdue: 'bg-orange-900/30 text-orange-400 border-orange-800',
    };
    return colors[status] || 'bg-gray-800 text-gray-400 border-gray-700';
  };

  const getStatusText = (status) => {
    const labels = {
      draft: 'Nacrt',
      issued: 'Izdan',
      paid: 'Plaćen',
      cancelled: 'Otkazan',
      overdue: 'Dospjeo',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Učitavanje...</div>
      </div>
    );
  }

  const canMarkPaid = user?.roles?.some(r => ['owner', 'accountant'].includes(r));

  const handlePrint = () => {
    window.print();
  };

  if (selectedInvoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <button
            onClick={() => setSelectedInvoice(null)}
            className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
          >
            ← Povratak na listu
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            🖨️ Ispiši
          </button>
        </div>

        <div className="card max-w-4xl mx-auto print:bg-white print:text-gray-900 print:border-0">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-100 mb-2 print:text-gray-900">RAČUN</h1>
              <p className="text-sm text-gray-400 print:text-gray-600">Broj: {selectedInvoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <div className="font-bold text-xl text-gray-100 print:text-gray-900">Autoservis</div>
              <div className="text-sm text-gray-400 mt-1 print:text-gray-600">
                Varaždin, Hrvatska<br/>
                OIB: 12345678901<br/>
                Tel: +385 42 123 456
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-700 print:border-gray-300">
            <div>
              <h3 className="font-semibold text-gray-300 mb-2 print:text-gray-700">Kupac:</h3>
              <div className="text-gray-100 print:text-gray-900">
                <div className="font-medium">{selectedInvoice.customer_name}</div>
                <div className="text-sm text-gray-400 print:text-gray-600">{selectedInvoice.customer_email}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="mb-2">
                <span className="text-gray-400 print:text-gray-600">Datum izdavanja:</span>{' '}
                <span className="font-medium text-gray-100 print:text-gray-900">
                  {new Date(selectedInvoice.issued_at).toLocaleDateString('hr-HR')}
                </span>
              </div>
              {selectedInvoice.paid_at && (
                <div>
                  <span className="text-gray-400 print:text-gray-600">Datum plaćanja:</span>{' '}
                  <span className="font-medium text-green-400 print:text-green-600">
                    {new Date(selectedInvoice.paid_at).toLocaleDateString('hr-HR')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-gray-300 mb-3 print:text-gray-700">Vozilo:</h3>
            <div className="bg-gray-800 p-4 rounded print:bg-gray-50">
              <div className="font-medium text-gray-100 text-lg print:text-gray-900">{selectedInvoice.license_plate}</div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-gray-300 mb-3 print:text-gray-700">Opis usluga:</h3>
            <div className="bg-gray-800 p-4 rounded print:bg-gray-50">
              <p className="text-gray-100 print:text-gray-900">{selectedInvoice.work_description}</p>
            </div>
          </div>

          <div className="border-t-2 border-gray-700 pt-6 print:border-gray-300">
            <div className="space-y-2">
              <div className="flex justify-between text-gray-300 print:text-gray-700">
                <span>Osnovica:</span>
                <span className="font-medium">
                  €{(parseFloat(selectedInvoice.total_amount) - parseFloat(selectedInvoice.tax_amount)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-gray-300 print:text-gray-700">
                <span>PDV (25%):</span>
                <span className="font-medium">€{parseFloat(selectedInvoice.tax_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-2xl font-bold text-gray-100 pt-4 border-t border-gray-700 print:text-gray-900 print:border-gray-300">
                <span>UKUPNO:</span>
                <span>€{parseFloat(selectedInvoice.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-700 print:border-gray-300">
            <div className="flex justify-between items-center">
              <div>
                <span className={`px-3 py-1 rounded font-medium ${
                  selectedInvoice.status === 'paid'
                    ? 'bg-green-900/30 text-green-400 border border-green-800 print:bg-green-100 print:text-green-800 print:border-0'
                    : selectedInvoice.status === 'overdue'
                    ? 'bg-red-900/30 text-red-400 border border-red-800 print:bg-red-100 print:text-red-800 print:border-0'
                    : 'bg-blue-900/30 text-blue-400 border border-blue-800 print:bg-blue-100 print:text-blue-800 print:border-0'
                }`}>
                  {getStatusText(selectedInvoice.status)}
                </span>
              </div>
              {selectedInvoice.days_overdue > 0 && (
                <div className="text-red-400 font-medium print:text-red-600">
                  Račun dospjeo prije {Math.floor(selectedInvoice.days_overdue)} dana
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 text-center text-sm text-gray-400 print:text-gray-500">
            <p>Hvala na povjerenju!</p>
            <p className="mt-2">Rok plaćanja: 15 dana od datuma izdavanja</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-100">Računi</h1>
        <span className="text-gray-400">{invoices.length} ukupno</span>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: '150px' }}>Broj računa</th>
              <th style={{ width: '120px' }}>Status</th>
              <th style={{ width: '180px' }}>Klijent</th>
              <th style={{ width: '140px' }}>Vozilo</th>
              <th>Opis rada</th>
              <th style={{ width: '100px', textAlign: 'right' }}>Iznos</th>
              <th style={{ width: '120px' }}>Datum izdavanja</th>
              <th style={{ width: '140px' }}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.invoice_id}>
                <td className="font-mono text-sm">
                  <button
                    onClick={() => setSelectedInvoice(invoice)}
                    className="text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    {invoice.invoice_number}
                  </button>
                </td>
                <td>
                  <span className={`px-2 py-1 text-xs rounded border ${getStatusColor(invoice.status)}`}>
                    {getStatusText(invoice.status)}
                  </span>
                </td>
                <td>
                  <div className="text-sm font-medium">{invoice.customer_name}</div>
                  <div className="text-xs text-gray-500">{invoice.customer_email}</div>
                </td>
                <td className="font-medium text-sm">{invoice.license_plate}</td>
                <td className="text-sm">
                  <div className="truncate" style={{ maxWidth: '250px' }} title={invoice.work_description}>
                    {invoice.work_description}
                  </div>
                </td>
                <td className="text-right font-medium">
                  €{parseFloat(invoice.total_amount).toFixed(2)}
                  <div className="text-xs text-gray-500">
                    (+€{parseFloat(invoice.tax_amount).toFixed(2)} PDV)
                  </div>
                </td>
                <td className="text-sm text-gray-400">
                  {invoice.issued_at
                    ? new Date(invoice.issued_at).toLocaleDateString('hr-HR')
                    : '-'
                  }
                  {invoice.days_overdue > 0 && (
                    <div className="text-xs text-orange-400">
                      Kasni {Math.floor(invoice.days_overdue)} dana
                    </div>
                  )}
                </td>
                <td>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedInvoice(invoice)}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      Detalji
                    </button>
                    {canMarkPaid && (invoice.status === 'issued' || invoice.status === 'overdue') && (
                      <button
                        onClick={() => handleMarkPaid(invoice.invoice_id)}
                        className="text-green-400 hover:text-green-300 text-sm"
                      >
                        Plaćeno
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {invoices.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Nema računa za prikaz
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-sm text-gray-400">Ukupno računa</div>
          <div className="text-2xl font-bold text-gray-100 mt-1">
            {invoices.length}
          </div>
        </div>

        <div className="card">
          <div className="text-sm text-gray-400">Plaćeno</div>
          <div className="text-2xl font-bold text-green-400 mt-1">
            €{invoices
              .filter(i => i.status === 'paid')
              .reduce((sum, i) => sum + parseFloat(i.total_amount), 0)
              .toFixed(2)
            }
          </div>
        </div>

        <div className="card">
          <div className="text-sm text-gray-400">Neplaćeno</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            €{invoices
              .filter(i => i.status === 'issued' || i.status === 'overdue')
              .reduce((sum, i) => sum + parseFloat(i.total_amount), 0)
              .toFixed(2)
            }
          </div>
        </div>

        <div className="card">
          <div className="text-sm text-gray-400">Dospjeli</div>
          <div className="text-2xl font-bold text-orange-400 mt-1">
            {invoices.filter(i => i.days_overdue > 0).length}
          </div>
        </div>
      </div>
    </div>
  );
}
