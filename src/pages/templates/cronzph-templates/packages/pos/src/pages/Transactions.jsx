import { useState, useMemo } from 'react';
import { POSSidebar } from '../components/POSSidebar.jsx';
import { useFirestore } from '@shared/hooks/index.js';

const DEMO_MODE = import.meta.env.VITE_IS_DEMO === 'true';

const navLinks = [
    { label: 'Dashboard', icon: '📊', path: '/dashboard' },
    { label: 'Cashier', icon: '💳', path: '/cashier' },
    { label: 'Products', icon: '📦', path: '/products' },
    { label: 'Transactions', icon: '🧾', path: '/transactions' },
    { label: 'Settings', icon: '⚙️', path: '/settings' },
];

function Transactions() {
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('today');
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    const { documents: transactions } = useFirestore(
        DEMO_MODE ? 'demo_pos_transactions' : 'transactions'
    );

    // Date filtering
    const filteredTransactions = useMemo(() => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().split('T')[0];

        return transactions
            .filter((t) => {
                // Date filter
                if (dateFilter === 'today') return t.timestamp?.startsWith(today);
                if (dateFilter === 'week') return t.timestamp >= weekAgo;
                if (dateFilter === 'month') return t.timestamp >= monthAgo;
                return true;
            })
            .filter((t) => {
                if (!searchQuery) return true;
                const query = searchQuery.toLowerCase();
                return (
                    t.id?.toLowerCase().includes(query) ||
                    (t.items || []).some((i) => i.name?.toLowerCase().includes(query)) ||
                    t.paymentMethod?.toLowerCase().includes(query)
                );
            })
            .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    }, [transactions, dateFilter, searchQuery]);

    // Stats for filtered period
    const totalRevenue = filteredTransactions.reduce((s, t) => s + (t.total || 0), 0);
    const totalCount = filteredTransactions.length;
    const avgTransaction = totalCount > 0 ? totalRevenue / totalCount : 0;

    function formatDate(ts) {
        if (!ts) return '—';
        const d = new Date(ts);
        if (isNaN(d)) return ts;
        return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function formatTime(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        if (isNaN(d)) return '';
        return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    }

    return (
        <div className="bg-[#0a0a0a] min-h-screen">
            <POSSidebar navLinks={navLinks} />
            <main className="md:ml-[260px] p-5 md:p-8 pt-[72px] md:pt-8">

                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white">Transactions</h1>
                    <p className="text-white/40 text-sm mt-1">View and manage all sales transactions</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="stat-card">
                        <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-1">Total Sales</p>
                        <p className="text-xl font-bold text-white">{totalCount}</p>
                    </div>
                    <div className="stat-card">
                        <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-1">Revenue</p>
                        <p className="text-xl font-bold text-emerald-400">₱{totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="stat-card">
                        <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-1">Avg. Transaction</p>
                        <p className="text-xl font-bold text-blue-400">₱{avgTransaction.toFixed(2)}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search transactions..."
                            className="input-field !pl-10 !py-2.5 text-sm"
                        />
                    </div>
                    <div className="flex gap-2">
                        {[
                            { key: 'today', label: 'Today' },
                            { key: 'week', label: '7 Days' },
                            { key: 'month', label: '30 Days' },
                            { key: 'all', label: 'All' },
                        ].map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setDateFilter(f.key)}
                                className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all ${dateFilter === f.key
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                    : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Transactions Table */}
                <div className="glass-card overflow-hidden">
                    {filteredTransactions.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="text-3xl mb-2">🧾</div>
                            <p className="text-white/40 text-sm">No transactions found for this period.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">ID</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Items</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Total</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Payment</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredTransactions.map((txn) => (
                                        <tr key={txn.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs text-white/60">
                                                #{(txn.id || '').slice(-6).toUpperCase()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-xs text-white/70">{formatDate(txn.timestamp)}</div>
                                                <div className="text-[10px] text-white/30">{formatTime(txn.timestamp)}</div>
                                            </td>
                                            <td className="px-4 py-3 text-white/50 max-w-[200px]">
                                                <span className="line-clamp-1 text-xs">
                                                    {(txn.items || []).length} item{(txn.items || []).length !== 1 ? 's' : ''}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-white">
                                                ₱{(txn.total || 0).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${txn.paymentMethod === 'cash'
                                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                                    : txn.paymentMethod === 'gcash'
                                                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                                                        : 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                                                    }`}>
                                                    {txn.paymentMethod || 'cash'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                                    {txn.status || 'completed'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => setSelectedTransaction(txn)}
                                                    className="text-xs text-white/30 hover:text-blue-400 transition-colors"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Transaction Detail Modal */}
            {selectedTransaction && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="glass-card w-full max-w-md p-6 animate-slide-up">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-white">Transaction Details</h3>
                            <button
                                onClick={() => setSelectedTransaction(null)}
                                className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-3 mb-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-white/40">Transaction ID</span>
                                <span className="font-mono text-xs text-white/70">#{(selectedTransaction.id || '').slice(-8).toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-white/40">Date & Time</span>
                                <span className="text-white/70">{formatDate(selectedTransaction.timestamp)} {formatTime(selectedTransaction.timestamp)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-white/40">Payment Method</span>
                                <span className="text-white/70 capitalize">{selectedTransaction.paymentMethod || 'cash'}</span>
                            </div>
                        </div>

                        <div className="border-t border-white/10 pt-4 mb-4">
                            <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">Items</p>
                            <div className="space-y-2">
                                {(selectedTransaction.items || []).map((item, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <span className="text-white/60">{item.name} × {item.quantity}</span>
                                        <span className="text-white font-medium">₱{(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-white/10 pt-3 space-y-1.5">
                            <div className="flex justify-between text-sm">
                                <span className="text-white/50">Total</span>
                                <span className="text-lg font-bold text-white">₱{(selectedTransaction.total || 0).toFixed(2)}</span>
                            </div>
                            {selectedTransaction.paymentMethod === 'cash' && selectedTransaction.amountPaid && (
                                <>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-white/50">Amount Paid</span>
                                        <span className="text-white/70">₱{(selectedTransaction.amountPaid || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-white/50">Change</span>
                                        <span className="text-emerald-400">₱{(selectedTransaction.change || 0).toFixed(2)}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            onClick={() => setSelectedTransaction(null)}
                            className="btn-secondary w-full mt-5 text-sm"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Transactions;
