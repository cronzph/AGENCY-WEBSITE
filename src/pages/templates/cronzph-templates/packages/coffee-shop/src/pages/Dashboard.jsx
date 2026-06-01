import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@shared/components/index.js';
import { useFirestore } from '@shared/hooks/index.js';

const DEMO_MODE = import.meta.env.VITE_IS_DEMO === 'true';

const navLinks = [
    { label: 'Dashboard', icon: '📊', path: '/dashboard' },
    { label: 'Products', icon: '☕', path: '/products' },
    { label: 'Orders', icon: '📋', path: '/orders' },
    { label: 'Statistics', icon: '📈', path: '/statistics' },
];

const STATUS_STYLES = {
    pending: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
    preparing: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
    completed: 'bg-green-500/15 text-green-400 border border-green-500/20',
    cancelled: 'bg-red-500/15 text-red-400 border border-red-500/20',
};

function StatCard({ icon, label, value, sub, accent = 'amber' }) {
    const accents = {
        amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        green: 'bg-green-500/10 border-green-500/20 text-green-400',
        purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
        blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    };
    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-colors">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className="text-2xl font-bold text-white">{value}</p>
                    {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border ${accents[accent]}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

function Dashboard() {
    const navigate = useNavigate();

    const { documents: products, loading: productsLoading } = useFirestore(
        DEMO_MODE ? 'demo_coffee_products' : 'products'
    );
    const { documents: orders, loading: ordersLoading } = useFirestore(
        DEMO_MODE ? 'demo_coffee_orders' : 'orders'
    );

    const isLoading = productsLoading || ordersLoading;

    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter((o) => o.timestamp?.startsWith(today));
    const todayRevenue = todayOrders.reduce((s, o) => s + (o.total || 0), 0);
    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'preparing');
    const completedOrders = orders.filter((o) => o.status === 'completed');
    const availableProducts = products.filter((p) => p.available !== false);

    const productCount = {};
    orders.forEach((order) => {
        (order.items || []).forEach((item) => {
            productCount[item.name] = (productCount[item.name] || 0) + (item.quantity || 1);
        });
    });
    const topProduct = Object.entries(productCount).sort((a, b) => b[1] - a[1])[0];

    const recentOrders = [...orders]
        .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
        .slice(0, 5);

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

    if (isLoading) {
        return (
            <div className="bg-[#0a0a0a] min-h-screen">
                <Sidebar navLinks={navLinks} brandName="Coffee Shop" />
                <main className="md:ml-64 flex items-center justify-center pt-14 md:pt-0 min-h-screen">
                    <svg className="animate-spin h-8 w-8 text-amber-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </main>
            </div>
        );
    }

    return (
        <div className="bg-[#0a0a0a] min-h-screen">
            <Sidebar navLinks={navLinks} brandName="Coffee Shop" />
            <main className="md:ml-64 p-4 md:p-8 pt-16 md:pt-8">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                    <StatCard icon="📋" label="Today's Orders" value={todayOrders.length} sub={`${pendingOrders.length} pending`} accent="blue" />
                    <StatCard icon="💰" label="Today's Revenue" value={`₱${todayRevenue.toFixed(2)}`} sub={`${todayOrders.length} transactions`} accent="green" />
                    <StatCard icon="📈" label="Total Revenue" value={`₱${totalRevenue.toFixed(2)}`} sub={`${completedOrders.length} completed`} accent="purple" />
                    <StatCard icon="⭐" label="Best Seller" value={topProduct ? topProduct[0] : 'N/A'} sub={topProduct ? `${topProduct[1]} sold` : 'No data'} accent="amber" />
                </div>

                {/* Quick Actions — horizontal row above everything */}
                <div className="mb-6">
                    <h2 className="text-sm font-semibold text-white mb-3">Quick Actions</h2>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => navigate('/orders')}
                            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-gray-900 rounded-xl text-sm font-semibold transition-colors"
                        >
                            <span>📋</span> New Order
                        </button>
                        <button
                            onClick={() => navigate('/products')}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                        >
                            <span>☕</span> Manage Products
                        </button>
                        <button
                            onClick={() => navigate('/statistics')}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                        >
                            <span>📈</span> View Statistics
                        </button>
                    </div>
                </div>

                {/* Two column */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                    {/* Recent Orders */}
                    <div className="xl:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-white">Recent Orders</h2>
                            <button onClick={() => navigate('/orders')} className="text-xs text-gray-500 hover:text-amber-400 transition-colors">
                                View all →
                            </button>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                            {recentOrders.length === 0 ? (
                                <div className="p-10 text-center">
                                    <div className="text-3xl mb-2">📋</div>
                                    <p className="text-gray-500 text-sm">No orders yet.</p>
                                    <button onClick={() => navigate('/orders')} className="mt-3 text-xs text-amber-400 hover:text-amber-300">
                                        Create first order →
                                    </button>
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {recentOrders.map((order) => (
                                            <tr key={order.id} className="hover:bg-white/[0.03] transition-colors">
                                                <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                                                    {order.customerName || <span className="text-gray-600">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 max-w-[160px]">
                                                    <span className="line-clamp-1 text-xs">
                                                        {(order.items || []).map((i) => `${i.name} ×${i.quantity || 1}`).join(', ') || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-white">₱{(order.total || 0).toFixed(2)}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${STATUS_STYLES[order.status] || 'bg-white/10 text-gray-400'}`}>
                                                        {order.status || 'pending'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Right column — Menu only */}
                    <div className="space-y-6">

                        {/* Menu */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-semibold text-white">Menu</h2>
                                <span className="text-xs text-gray-500">{availableProducts.length} available</span>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl divide-y divide-white/5">
                                {products.length === 0 ? (
                                    <div className="p-6 text-center">
                                        <p className="text-gray-500 text-sm">No products yet.</p>
                                        <button onClick={() => navigate('/products')} className="mt-2 text-xs text-amber-400 hover:text-amber-300">
                                            Add first product →
                                        </button>
                                    </div>
                                ) : (
                                    products.slice(0, 6).map((product) => (
                                        <div key={product.id} className="flex items-center justify-between px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-lg">{product.emoji || '☕'}</span>
                                                <div>
                                                    <p className="text-sm font-medium text-white">{product.name}</p>
                                                    <p className="text-xs text-gray-500">{product.category}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-amber-400">₱{(product.price || 0).toFixed(2)}</p>
                                                <span className={`text-xs ${product.available !== false ? 'text-green-500' : 'text-gray-600'}`}>
                                                    {product.available !== false ? '● On' : '○ Off'}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                                {products.length > 6 && (
                                    <div className="px-4 py-3 text-center">
                                        <button onClick={() => navigate('/products')} className="text-xs text-gray-500 hover:text-amber-400 transition-colors">
                                            +{products.length - 6} more →
                                        </button>
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
