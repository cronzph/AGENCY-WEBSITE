import { useState } from 'react';
import { POSSidebar } from '../components/POSSidebar.jsx';

const DEMO_MODE = import.meta.env.VITE_IS_DEMO === 'true';

const navLinks = [
    { label: 'Dashboard', icon: '📊', path: '/dashboard' },
    { label: 'Cashier', icon: '💳', path: '/cashier' },
    { label: 'Products', icon: '📦', path: '/products' },
    { label: 'Transactions', icon: '🧾', path: '/transactions' },
    { label: 'Settings', icon: '⚙️', path: '/settings' },
];

function Settings() {
    const [storeName, setStoreName] = useState('My Store');
    const [storeAddress, setStoreAddress] = useState('');
    const [receiptFooter, setReceiptFooter] = useState('Thank you for your purchase!');
    const [taxRate, setTaxRate] = useState('0');
    const [currency, setCurrency] = useState('PHP');
    const [saved, setSaved] = useState(false);

    const handleSave = (e) => {
        e.preventDefault();
        // In production, this would save to Firestore
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="bg-[#0a0a0a] min-h-screen">
            <POSSidebar navLinks={navLinks} />
            <main className="md:ml-[260px] p-5 md:p-8 pt-[72px] md:pt-8">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white">Settings</h1>
                    <p className="text-white/40 text-sm mt-1">Configure your POS system</p>
                </div>

                <div className="max-w-2xl space-y-6">

                    {/* Store Information */}
                    <div className="glass-card p-6">
                        <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                            <span className="text-lg">🏪</span> Store Information
                        </h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">Store Name</label>
                                <input
                                    type="text"
                                    value={storeName}
                                    onChange={(e) => setStoreName(e.target.value)}
                                    className="input-field text-sm"
                                    placeholder="My Store"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">Address</label>
                                <input
                                    type="text"
                                    value={storeAddress}
                                    onChange={(e) => setStoreAddress(e.target.value)}
                                    className="input-field text-sm"
                                    placeholder="123 Main St, City"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">Receipt Footer Message</label>
                                <textarea
                                    value={receiptFooter}
                                    onChange={(e) => setReceiptFooter(e.target.value)}
                                    className="input-field text-sm resize-none"
                                    rows={2}
                                    placeholder="Thank you for your purchase!"
                                />
                            </div>
                        </form>
                    </div>

                    {/* POS Configuration */}
                    <div className="glass-card p-6">
                        <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                            <span className="text-lg">⚙️</span> POS Configuration
                        </h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">Tax Rate (%)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={taxRate}
                                        onChange={(e) => setTaxRate(e.target.value)}
                                        className="input-field text-sm"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">Currency</label>
                                    <select
                                        value={currency}
                                        onChange={(e) => setCurrency(e.target.value)}
                                        className="input-field text-sm"
                                    >
                                        <option value="PHP">PHP (₱)</option>
                                        <option value="USD">USD ($)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="glass-card p-6">
                        <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                            <span className="text-lg">💳</span> Payment Methods
                        </h2>
                        <div className="space-y-3">
                            {[
                                { name: 'Cash', icon: '💵', enabled: true },
                                { name: 'GCash', icon: '📱', enabled: true },
                                { name: 'Card', icon: '💳', enabled: false },
                            ].map((method) => (
                                <div key={method.name} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">{method.icon}</span>
                                        <span className="text-sm font-medium text-white">{method.name}</span>
                                    </div>
                                    <div className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${method.enabled ? 'bg-emerald-500' : 'bg-white/20'}`}>
                                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${method.enabled ? 'left-[18px]' : 'left-0.5'}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Account */}
                    <div className="glass-card p-6">
                        <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
                            <span className="text-lg">👤</span> Account
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                                <div>
                                    <p className="text-sm font-medium text-white">Admin Account</p>
                                    <p className="text-xs text-white/30">admin@demo.com</p>
                                </div>
                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">
                                    Admin
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center gap-4">
                        <button onClick={handleSave} className="btn-primary text-sm">
                            Save Settings
                        </button>
                        {saved && (
                            <span className="text-sm text-emerald-400 font-medium flex items-center gap-1.5 animate-fade-in">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Settings saved!
                            </span>
                        )}
                    </div>

                    {/* System Info */}
                    <div className="glass-card p-6">
                        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                            <span className="text-lg">ℹ️</span> System Info
                        </h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-white/40">Version</span>
                                <span className="text-white/70">1.0.0</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/40">Built with</span>
                                <span className="text-white/70">React + Firebase</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/40">Template by</span>
                                <span className="text-white/70">CronzPH</span>
                            </div>
                            {DEMO_MODE && (
                                <div className="flex justify-between">
                                    <span className="text-white/40">Mode</span>
                                    <span className="text-amber-400 font-medium">Demo</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Settings;
