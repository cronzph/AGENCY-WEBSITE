import { useState, useMemo } from 'react';
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

function BarChart({ data, valueKey, labelKey, color = 'bg-amber-500' }) {
    const max = Math.max(...data.map((d) => d[valueKey]), 1);
    return (
        <div className="space-y-2.5">
            {data.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-24 text-right truncate">{item[labelKey]}</span>
                    <div className="flex-1 bg-white/5 rounded-full h-5 overflow-hidden">
                        <div
                            className={`h-full rounded-full ${color} transition-all duration-500`}
                            style={{ width: `${(item[valueKey] / max) * 100}%` }}
                        />
                    </div>
                    <span className="text-xs font-semibold text-gray-300 w-20 text-right">
                        {typeof item[valueKey] === 'number' && item[valueKey] % 1 !== 0
                            ? `₱${item[valueKey].toFixed(2)}`
                            : item[valueKey]}
                    </span>
                </div>
            ))}
        </div>
    );
}

function StatCard({ icon, label, value, sub, accent = 'amber' }) {
    const accents = {
        amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        green: 'bg-green-500/10 border-green-500/20 text-green-400',
        emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
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

function Statistics() {
    const { documents: orders, loading } = useFirestore(
        DEMO_MODE ? 'demo_coffee_orders' : 'orders'
    );

    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const filteredOrders = useMemo(() => {
        return orders.filter((o) => {
            const ts = o.timestamp ? new Date(o.timestamp) : null;
            if (dateFrom && ts && ts < new Date(dateFrom)) return false;
            if (dateTo && ts && ts > new Date(dateTo + 'T23:59:59')) return false;
            if (statusFilter !== 'all' && o.status !== statusFilter) return false;
            return true;
        });
    }, [orders, dateFrom, dateTo, statusFilter]);

    const totalRevenue = filteredOrders.reduce((s, o) => s + (o.total || 0), 0);
    const completedOrders = filteredOrders.filter((o) => o.status === 'completed');
    const completedRevenue = completedOrders.reduce((s, o) => s + (o.total || 0), 0);
    const avgOrderValue = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;
    const cancelledOrders = filteredOrders.filter((o) => o.status === 'cancelled');

    const revenueByDate = useMemo(() => {
        const map = {};
        filteredOrders.forEach((o) => {
            if (!o.timestamp) return;
            const d = new Date(o.timestamp);
            if (isNaN(d)) return;
            const key = d.toISOString().split('T')[0];
            map[key] = (map[key] || 0) + (o.total || 0);
        });
        return Object.entries(map)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-10)
            .map(([date, revenue]) => ({
                date: new Date(date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
                revenue,
            }));
    }, [filteredOrders]);

    const ordersByHour = useMemo(() => {
        const map = {};
        filteredOrders.forEach((o) => {
            if (!o.timestamp) return;
            const d = new Date(o.timestamp);
            if (isNaN(d)) return;
            const hour = d.getHours();
            const label = `${hour.toString().padStart(2, '0')}:00`;
            map[label] = (map[label] || 0) + 1;
        });
        return Object.entries(map)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([hour, count]) => ({ hour, count }));
    }, [filteredOrders]);

    const topProducts = useMemo(() => {
        const map = {};
        filteredOrders.forEach((o) => {
            (o.items || []).forEach((item) => {
                map[item.name] = (map[item.name] || 0) + (item.quantity || 1);
            });
        });
        return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 8).map(([name, qty]) => ({ name, qty }));
    }, [filteredOrders]);

    const topProductsByRevenue = useMemo(() => {
        const map = {};
        filteredOrders.forEach((o) => {
            (o.items || []).forEach((item) => {
                map[item.name] = (map[item.name] || 0) + (item.price || 0) * (item.quantity || 1);
            });
        });
        return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 8).map(([name, revenue]) => ({ name, revenue }));
    }, [filteredOrders]);

    const statusBreakdown = useMemo(() => {
        const map = { pending: 0, preparing: 0, completed: 0, cancelled: 0 };
        filteredOrders.forEach((o) => { const s = o.status || 'pending'; map[s] = (map[s] || 0) + 1; });
        return Object.entries(map).map(([status, count]) => ({ status, count }));
    }, [filteredOrders]);

    const sortedOrders = useMemo(() => {
        return [...filteredOrders].sort((a, b) => {
            const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return tb - ta;
        });
    }, [filteredOrders]);

    const clearFilters = () => { setDateFrom(''); setDateTo(''); setStatusFilter('all'); };

    if (loading) {
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
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white">Statistics & Reports</h1>
                    <p className="text-gray-500 text-sm mt-1">Track your sales, revenue, and order trends.</p>
                </div>

                {/* Filters */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">From</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-amber-500/40 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">To</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-amber-500/40 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-amber-500/40 outline-none"
                        >
                            <option value="all" className="bg-[#111]">All statuses</option>
                            <option value="pending" className="bg-[#111]">Pending</option>
                            <option value="preparing" className="bg-[#111]">Preparing</option>
                            <option value="completed" className="bg-[#111]">Completed</option>
                            <option value="cancelled" className="bg-[#111]">Cancelled</option>
                        </select>
                    </div>
                    {(dateFrom || dateTo || statusFilter !== 'all') && (
                        <button onClick={clearFilters} className="px-3 py-2 text-xs text-gray-500 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
                            Clear filters
                        </button>
                    )}
                    <div className="ml-auto text-sm text-gray-500">
                        Showing <strong className="text-white">{filteredOrders.length}</strong> orders
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                    <StatCard icon="📋" label="Total Orders" value={filteredOrders.length} sub={`${cancelledOrders.length} cancelled`} accent="amber" />
                    <StatCard icon="💰" label="Total Revenue" value={`₱${totalRevenue.toFixed(2)}`} sub="all statuses" accent="green" />
                    <StatCard icon="✅" label="Completed Revenue" value={`₱${completedRevenue.toFixed(2)}`} sub={`${completedOrders.length} orders`} accent="emerald" />
                    <StatCard icon="🧾" label="Avg Order Value" value={`₱${avgOrderValue.toFixed(2)}`} sub="per order" accent="purple" />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                        <h2 className="text-sm font-semibold text-white mb-4">Revenue by Date</h2>
                        {revenueByDate.length === 0
                            ? <p className="text-gray-600 text-sm text-center py-8">No data for selected range.</p>
                            : <BarChart data={revenueByDate} valueKey="revenue" labelKey="date" color="bg-green-500" />}
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                        <h2 className="text-sm font-semibold text-white mb-4">Top Products (by quantity)</h2>
                        {topProducts.length === 0
                            ? <p className="text-gray-600 text-sm text-center py-8">No data.</p>
                            : <BarChart data={topProducts} valueKey="qty" labelKey="name" color="bg-amber-500" />}
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                        <h2 className="text-sm font-semibold text-white mb-4">Orders by Hour of Day</h2>
                        {ordersByHour.length === 0
                            ? <p className="text-gray-600 text-sm text-center py-8">No time data available.</p>
                            : <BarChart data={ordersByHour} valueKey="count" labelKey="hour" color="bg-blue-500" />}
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                        <h2 className="text-sm font-semibold text-white mb-4">Top Products (by revenue)</h2>
                        {topProductsByRevenue.length === 0
                            ? <p className="text-gray-600 text-sm text-center py-8">No data.</p>
                            : <BarChart data={topProductsByRevenue} valueKey="revenue" labelKey="name" color="bg-purple-500" />}
                    </div>
                </div>

                {/* Status Breakdown */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-5">
                    <h2 className="text-sm font-semibold text-white mb-4">Order Status Breakdown</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {statusBreakdown.map(({ status, count }) => (
                            <div key={status} className="text-center">
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full mb-2 capitalize ${STATUS_STYLES[status] || 'bg-white/10 text-gray-400'}`}>
                                    {status}
                                </span>
                                <p className="text-2xl font-bold text-white">{count}</p>
                                <p className="text-xs text-gray-600">
                                    {filteredOrders.length > 0 ? Math.round((count / filteredOrders.length) * 100) : 0}%
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Order Timeline */}
                <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-white">Order Timeline</h2>
                        <span className="text-xs text-gray-500">{sortedOrders.length} orders — newest first</span>
                    </div>
                    {sortedOrders.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="text-3xl mb-2">📋</div>
                            <p className="text-gray-600 text-sm">No orders in selected range.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date &amp; Time</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Items</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Total</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {sortedOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-white/[0.03] transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-200">{formatDate(order.timestamp)}</div>
                                                <div className="text-xs text-gray-600">{formatTime(order.timestamp)}</div>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-white">{order.customerName || <span className="text-gray-600">—</span>}</td>
                                            <td className="px-4 py-3 text-gray-500 max-w-xs">
                                                <span className="line-clamp-1 text-xs">
                                                    {(order.items || []).map((i) => `${i.name} ×${i.quantity || 1}`).join(', ') || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-amber-400 whitespace-nowrap">₱{(order.total || 0).toFixed(2)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${STATUS_STYLES[order.status] || 'bg-white/10 text-gray-400'}`}>
                                                    {order.status || 'pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {DEMO_MODE && (
                    <p className="mt-6 text-xs text-gray-600 text-center">
                        Demo mode: showing seeded demo data.
                    </p>
                )}
            </main>
        </div>
    );
}

export default Statistics;
