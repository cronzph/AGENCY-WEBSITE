import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '../../components/shared/Toast';

const Settings = () => {
  // Agency settings
  const [agencyName, setAgencyName] = useState('');
  const [agencyEmail, setAgencyEmail] = useState('');
  const [agencyFbPage, setAgencyFbPage] = useState('');
  // Payment methods
  const [paymentMethods, setPaymentMethods] = useState([]);
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const paymentTypeOptions = [
    { value: 'gcash', label: 'GCash', color: 'green' },
    { value: 'maya', label: 'Maya', color: 'blue' },
    { value: 'cimb', label: 'CIMB', color: 'red' },
    { value: 'maribank', label: 'Maribank', color: 'purple' },
    { value: 'coinsph', label: 'Coins.ph', color: 'orange' },
    { value: 'others', label: 'Others', color: 'gray' },
  ];

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setAgencyName(data.agencyName || '');
          setAgencyEmail(data.agencyEmail || '');
          setAgencyFbPage(data.agencyFbPage || '');
        }

        const methodsDoc = await getDoc(doc(db, 'settings', 'paymentMethods'));
        if (methodsDoc.exists() && methodsDoc.data().methods) {
          setPaymentMethods(methodsDoc.data().methods);
        } else {
          // Default payment methods
          setPaymentMethods([
            { id: '1', type: 'gcash', accountNumber: '', accountName: '', active: false },
          ]);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const addPaymentMethod = () => {
    setPaymentMethods([
      ...paymentMethods,
      {
        id: Date.now().toString(),
        type: 'gcash',
        accountNumber: '',
        accountName: '',
        customName: '',
        active: false,
      },
    ]);
  };

  const updatePaymentMethod = (id, field, value) => {
    setPaymentMethods(
      paymentMethods.map((method) =>
        method.id === id ? { ...method, [field]: value } : method
      )
    );
  };

  const deletePaymentMethod = (id) => {
    setPaymentMethods(paymentMethods.filter((method) => method.id !== id));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), {
        agencyName,
        agencyEmail,
        agencyFbPage,
      }, { merge: true });

      await setDoc(doc(db, 'settings', 'paymentMethods'), {
        methods: paymentMethods,
      }, { merge: true });

      showToast('Settings saved successfully!', 'success');
    } catch (err) {
      console.error('Error saving settings:', err);
      showToast('Failed to save settings. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Agency Settings</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6 w-full">
          {/* Agency Information */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full">
            <h2 className="text-white font-semibold text-lg mb-4">Agency Information</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="agencyName" className="block text-sm font-medium text-gray-300 mb-2">
                  Agency Name
                </label>
                <input
                  type="text"
                  id="agencyName"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter agency name"
                />
              </div>
              <div>
                <label htmlFor="agencyEmail" className="block text-sm font-medium text-gray-300 mb-2">
                  Agency Email
                </label>
                <input
                  type="email"
                  id="agencyEmail"
                  value={agencyEmail}
                  onChange={(e) => setAgencyEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="agency@example.com"
                />
              </div>
              <div>
                <label htmlFor="agencyFbPage" className="block text-sm font-medium text-gray-300 mb-2">
                  Agency FB Page URL
                </label>
                <input
                  type="url"
                  id="agencyFbPage"
                  value={agencyFbPage}
                  onChange={(e) => setAgencyFbPage(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="https://facebook.com/youragency"
                />
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white font-semibold text-lg">Payment Methods</h2>
              <button
                type="button"
                onClick={addPaymentMethod}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm"
              >
                + Add Payment Method
              </button>
            </div>

            <div className="space-y-4">
              {paymentMethods.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No payment methods added yet.</p>
              ) : (
                paymentMethods.map((method) => {
                  const isOthers = method.type === 'others';

                  return (
                    <div key={method.id} className={`p-4 rounded-lg border ${method.active ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-800 border-gray-700 opacity-60'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => updatePaymentMethod(method.id, 'active', !method.active)}
                            className={`w-12 h-6 rounded-full transition-colors ${method.active ? 'bg-green-500' : 'bg-gray-600'}`}
                          >
                            <div className={`w-5 h-5 bg-white rounded-full transform transition-transform ${method.active ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                          </button>
                          <span className="text-sm text-gray-300">{method.active ? 'Enabled' : 'Disabled'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => deletePaymentMethod(method.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Type</label>
                          <select
                            value={method.type}
                            onChange={(e) => updatePaymentMethod(method.id, 'type', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                          >
                            {paymentTypeOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>

                        {isOthers && (
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Method Name</label>
                            <input
                              type="text"
                              value={method.customName || ''}
                              onChange={(e) => updatePaymentMethod(method.id, 'customName', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                              placeholder="e.g. BDO, BPI"
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Account Number</label>
                          <input
                            type="text"
                            value={method.accountNumber}
                            onChange={(e) => updatePaymentMethod(method.id, 'accountNumber', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                            placeholder="Account number"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Account Name</label>
                          <input
                            type="text"
                            value={method.accountName}
                            onChange={(e) => updatePaymentMethod(method.id, 'accountName', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                            placeholder="Account name"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      )}
    </div>
  );
};

export default Settings;
