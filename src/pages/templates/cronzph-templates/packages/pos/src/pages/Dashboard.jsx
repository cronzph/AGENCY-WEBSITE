import { useNavigate } from 'react-router-dom';
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

function StatCard({ icon, label, value, sub, gradient, iconBg }) {
    return (
        <div className="relative group overflow-hidden rounded-2xl bg-[#111111] border border-white/[0.06] p-5 hover:border-white/[0.1] transition-all duration-300">
            {/* Subtle gradient glow on hover */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient}`} />
            <div className="relative flex items-start justify-between">
                <div>
                    <p className="text-[11px] text-white/40 font-semibold uppercase tracking-wider mb-2">{label}</p>
                    <p className="text-2xl font-extrabold text-white tracking-tight">{value}</p>
                    {sub && <p className="text-xs text-white/30 mt-1.5">{sub}</p>}
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg ${iconBg} shadow-lg`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

function Dashboard() {
    const navigate = useNavigate();

    const { documents: products, loading: productsLoading } = useFirestore(
        DEMO_MODE ? 'demo_pos_products' : 'products'
    );
    const { documents: transactions, loading: transactionsLoading } = useFirestore(
        DEMO_MODE ? 'demo_pos_transactions' : 'transactions'
    );

    const isLoading = productsLoading || transactionsLoading;

    // Calculate stats
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = transactions.filter((t) => t.timestamp?.startsWith(today));
    const todayRevenue = todayTransactions.reduce((s, t) => s + (t.total || 0), 0);
    const totalRevenue = transactions.reduce((s, t) => s + (t.total || 0), 0);
    const totalItems = products.length;
    const lowStockItems = products.filter((p) => (p.stock || 0) <= (p.lowStockThreshold || 5));

    // Recent transactions
    const recentTransactions = [...transactions]
        .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
        .slice(0, 6);

    // Top selling products
    const productSales = {};
    transactions.forEach((txn) => {
        (txn.items || []).forEach((item) => {
            productSales[item.name] = (productSales[item.name] || 0) + (item.quantity || 1);
        });
    });
    const topProducts = Object.entries(productSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    function formatTime(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        if (isNaN(d)) return '';
        return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    }

    if (isLoading) {
        return (
            <div className="bg-[#0a0a0a] min-h-screen">
                <POSSidebar navLinks={navLinks} />
                <main className="md:ml-[260px] flex items-center justify-center pt-14 md:pt-0 min-h-screen">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                        <p className="text-sm text-white/30 font-medium">Loading dashboard...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="bg-[#0a0a0a] min-h-screen">
            <POSSidebar navLinks={navLinks} />
            <main className="md:ml-[260px] p-5 md:p-8 pt-[72px] md:pt-8 min-h-screen">

                {/* Header */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-white tracking-tight">Dashboard</h1>
                        <p className="text-white/30 text-sm mt-1 font-medium">
                            {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/cashier')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                        </svg>
                        Open Cashier
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
                    <StatCard
                        icon="🧾"
                        label="Today's Sales"
                        value={todayTransactions.length}
                        sub={`${todayTransactions.length} transaction${todayTransactions.length !== 1 ? 's' : ''}`}
                        gradient="bg-gradient-to-br from-blue-500/10 to-transparent"
                        iconBg="bg-blue-500/20 border border-blue-500/30"
                    />
                    <StatCard
                        icon="💰"
                        label="Today's Revenue"
                        value={`₱${todayRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
                        sub="Total for today"
                        gradient="bg-gradient-to-br from-emerald-500/10 to-transparent"
                        iconBg="bg-emerald-500/20 border border-emerald-500/30"
                    />
                    <StatCard
                        icon="📦"
                        label="Total Products"
                        value={totalItems}
                        sub={lowStockItems.length > 0 ? `${lowStockItems.length} low stock ⚠️` : 'All stocked'}
                        gradient="bg-gradient-to-br from-purple-500/10 to-transparent"
                        iconBg="bg-purple-500/20 border border-purple-500/30"
                    />
                    <StatCard
                        icon="📈"
                        label="Total Revenue"
                        value={`₱${totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
                        sub={`${transactions.length} all-time`}
                        gradient="bg-gradient-to-br from-amber-500/10 to-transparent"
                        iconBg="bg-amber-500/20 border border-amber-500/30"
                    />
                </div>

                {/* Low Stock Alert */}
                {lowStockItems.length > 0 && (
                    <div className="mb-6 p-4 bg-amber-500/[0.07] border border-amber-500/20 rounded-2xl flex items-start gap-3 animate-fade-in">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm">⚠️</span>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-amber-200">Low Stock Alert</p>
                            <p className="text-xs text-amber-200/60 mt-0.5">
                                {lowStockItems.slice(0, 3).map((p) => p.name).join(', ')}
                                {lowStockItems.length > 3 && ` and ${lowStockItems.length - 3} more`}
                            </p>
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="mb-8">
                    <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Quick Actions</h2>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => navigate('/cashier')}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-300 rounded-xl text-xs font-semibold transition-all duration-200"
                        >
                            <span>💳</span> New Transaction
                        </button>
                        <button
                            onClick={() => navigate('/products')}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-white/60 hover:text-white/80 rounded-xl text-xs font-medium transition-all duration-200"
                        >
                            <span>📦</span> Manage Products
                        </button>
                        <button
                            onClick={() => navigate('/transactions')}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-white/60 hover:text-white/80 rounded-xl text-xs font-medium transition-all duration-200"
                        >
                            <span>🧾</span> View Transactions
                        </button>
                    </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

                    {/* Recent Transactions */}
                    <div className="xl:col-span-2">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Recent Transactions</h2>
                            <button onClick={() => navigate('/transactions')} className="text-[11px] text-blue-400/70 hover:text-blue-400 font-medium transition-colors">
                                View all →
                            </button>
                        </div>
                        <div className="rounded-2xl bg-[#111111] border border-white/[0.06] overflow-hidden">
                            {recentTransactions.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                                        <span className="text-xl opacity-40">🧾</span>
                                    </div>
                                    <p className="text-white/30 text-sm font-medium">No transactions yet</p>
                                    <button onClick={() => navigate('/cashier')} className="mt-2 text-xs text-blue-400/70 hover:text-blue-400 font-medium">
                                        Create first transaction →
                                    </button>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/[0.04]">
                                    {recentTransactions.map((txn) => (
                                        <div key={txn.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${txn.paymentMethod === 'gcash' ? 'bg-blue-500/15 text-blue-400' : 'bg-emerald-500/15 text-emerald-400'
                                                    }`}>
                                                    {txn.paymentMethod === 'gcash' ? '📱' : '💵'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-white/80 truncate">
                                                        {(txn.items || []).map((i) => i.name).slice(0, 2).join(', ')}
                                                        {(txn.items || []).length > 2 && ` +${(txn.items || []).length - 2}`}
                                                    </p>
                                                    <p className="text-[11px] text-white/25 mt-0.5">
                                                        {formatTime(txn.timestamp)} • {(txn.items || []).length} item{(txn.items || []).length !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0 ml-3">
                                                <p className="text-sm font-bold text-white">₱{(txn.total || 0).toFixed(2)}</p>
                                                <p className="text-[10px] text-white/20 capitalize mt-0.5">{txn.paymentMethod || 'cash'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-5">

                        {/* Top Selling Products */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Top Sellers</h2>
                            </div>
                            <div className="rounded-2xl bg-[#111111] border border-white/[0.06] overflow-hidden">
                                {topProducts.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <p className="text-white/25 text-xs font-medium">No sales data yet</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/[0.04]">
                                        {topProducts.map(([name, count], i) => (
                                            <div key={name} className="flex items-center justify-between px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-amber-500/20 text-amber-400' :
                                                            i === 1 ? 'bg-white/10 text-white/50' :
                                                                'bg-white/5 text-white/30'
                                                        }`}>
                                                        {i + 1}
                                                    </span>
                                                    <span className="text-sm font-medium text-white/70">{name}</span>
                                                </div>
                                                <span className="text-[11px] font-semibold text-blue-400/80">{count} sold</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Inventory Quick View */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Inventory</h2>
                                <button onClick={() => navigate('/products')} className="text-[11px] text-blue-400/70 hover:text-blue-400 font-medium transition-colors">
                                    Manage →
                                </button>
                            </div>
                            <div className="rounded-2xl bg-[#111111] border border-white/[0.06] overflow-hidden">
                                {products.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <p className="text-white/25 text-xs font-medium">No products yet</p>
                                        <button onClick={() => navigate('/products')} className="mt-1.5 text-[11px] text-blue-400/70 hover:text-blue-400 font-medium">
                                            Add first product →
                                        </button>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/[0.04]">
                                        {products.slice(0, 4).map((product) => (
                                            <div key={product.id} className="flex items-center justify-between px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-base">{product.emoji || '📦'}</span>
                                                    <div>
                                                        <p className="text-sm font-medium text-white/70">{product.name}</p>
                                                        <p className="text-[10px] text-white/20">{product.category || 'Other'}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-semibold text-white/80">₱{(product.price || 0).toFixed(2)}</p>
                                                    <p className={`text-[10px] font-medium ${(product.stock || 0) <= (product.lowStockThreshold || 5) ? 'text-amber-400' : 'text-emerald-400/60'}`}>
                                                        {product.stock || 0} left
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {products.length > 4 && (
                                            <div className="px-4 py-2.5 text-center">
                                                <button onClick={() => navigate('/products')} className="text-[11px] text-white/25 hover:text-blue-400/70 font-medium transition-colors">
                                                    +{products.length - 4} more products
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Dashboard;
