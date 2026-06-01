import { useState } from 'react';
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

function AddOrderModal({ products, onClose, onSave }) {
    const [customerName, setCustomerName] = useState('');
    const [items, setItems] = useState([{ productId: '', name: '', price: 0, quantity: 1 }]);
    const [saving, setSaving] = useState(false);

    const handleProductChange = (index, productId) => {
        const product = products.find((p) => p.id === productId);
        setItems((prev) =>
            prev.map((item, i) =>
                i === index ? { ...item, productId, name: product?.name || '', price: product?.price || 0 } : item
            )
        );
    };

    const handleQtyChange = (index, qty) => {
        setItems((prev) =>
            prev.map((item, i) => (i === index ? { ...item, quantity: Math.max(1, parseInt(qty) || 1) } : item))
        );
    };

    const addItem = () => setItems((prev) => [...prev, { productId: '', name: '', price: 0, quantity: 1 }]);
    const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validItems = items.filter((i) => i.productId);
        if (validItems.length === 0) return;
        setSaving(true);
        await onSave({
            customerName,
            items: validItems,
            total,
            status: 'pending',
            timestamp: new Date().toISOString(),
        });
        setSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="bg-[#111111] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-white/5 sticky top-0 bg-[#111111]">
                    <h2 className="text-base font-bold text-white">New Order</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none transition-colors">×</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Customer Name</label>
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 outline-none text-sm"
                            placeholder="e.g. Juan Dela Cruz"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">Order Items</label>
                        <div className="space-y-2.5">
                            {items.map((item, index) => (
                                <div key={index} className="flex gap-2 items-center">
                                    <select
                                        value={item.productId}
                                        onChange={(e) => handleProductChange(index, e.target.value)}
                                        required
                                        className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-amber-500/40 outline-none"
                                    >
                                        <option value="" className="bg-[#111]">Select product...</option>
                                        {products.filter((p) => p.available !== false).map((p) => (
                                            <option key={p.id} value={p.id} className="bg-[#111]">
                                                {p.emoji} {p.name} — ₱{(p.price || 0).toFixed(2)}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => handleQtyChange(index, e.target.value)}
                                        className="w-16 px-2 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm text-center focus:ring-2 focus:ring-amber-500/40 outline-none"
                                    />
                                    <span className="text-sm text-gray-500 w-20 text-right">
                                        ₱{(item.price * item.quantity).toFixed(2)}
                                    </span>
                                    {items.length > 1 && (
                                        <button type="button" onClick={() => removeItem(index)} className="text-gray-600 hover:text-red-400 text-lg leading-none transition-colors">×</button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addItem} className="mt-2 text-xs text-gray-500 hover:text-amber-400 flex items-center gap-1 transition-colors">
                            <span>+</span> Add item
                        </button>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-300">Total</span>
                        <span className="text-xl font-bold text-amber-400">₱{total.toFixed(2)}</span>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-white/10 text-gray-400 hover:text-white text-sm font-medium rounded-lg hover:bg-white/5 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 text-sm font-semibold rounded-lg transition-colors">
                            {saving ? 'Saving...' : 'Create Order'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function OrderDetailModal({ order, onClose, onStatusChange }) {
    const [status, setStatus] = useState(order.status || 'pending');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await onStatusChange(order.id, status);
        setSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="bg-[#111111] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <h2 className="text-base font-bold text-white">Order Details</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none transition-colors">×</button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Customer</span>
                        <span className="font-medium text-white">{order.customerName || '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Date &amp; Time</span>
                        <span className="font-medium text-white">
                            {formatDate(order.timestamp)}
                            {order.timestamp && <span className="text-gray-500 text-xs ml-1">{formatTime(order.timestamp)}</span>}
                        </span>
                    </div>

                    <div>
                        <p className="text-xs text-gray-500 mb-2">Items</p>
                        <div className="bg-white/5 border border-white/5 rounded-xl divide-y divide-white/5">
                            {(order.items || []).map((item, i) => (
                                <div key={i} className="flex justify-between px-3 py-2.5 text-sm">
                                    <span className="text-gray-300">{item.name} × {item.quantity || 1}</span>
                                    <span className="text-white font-medium">₱{((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between items-center bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                        <span className="text-sm font-semibold text-gray-300">Total</span>
                        <span className="text-xl font-bold text-amber-400">₱{(order.total || 0).toFixed(2)}</span>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Update Status</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-amber-500/40 outline-none"
                        >
                            <option value="pending" className="bg-[#111]">Pending</option>
                            <option value="preparing" className="bg-[#111]">Preparing</option>
                            <option value="completed" className="bg-[#111]">Completed</option>
                            <option value="cancelled" className="bg-[#111]">Cancelled</option>
                        </select>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-white/10 text-gray-400 hover:text-white text-sm font-medium rounded-lg hover:bg-white/5 transition-colors">
                            Close
                        </button>
                        <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 text-sm font-semibold rounded-lg transition-colors">
                            {saving ? 'Saving...' : 'Update Status'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Orders() {
    const ordersCollection = DEMO_MODE ? 'demo_coffee_orders' : 'orders';
    const productsCollection = DEMO_MODE ? 'demo_coffee_products' : 'products';

    const { documents: orders, loading, addDocument, updateDocument, deleteDocument } = useFirestore(ordersCollection);
    const { documents: products } = useFirestore(productsCollection);

    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [search, setSearch] = useState('');

    const filtered = orders.filter((o) => {
        const matchStatus = filterStatus === 'all' || o.status === filterStatus;
        const matchSearch =
            (o.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
            (o.items || []).some((i) => i.name?.toLowerCase().includes(search.toLowerCase()));
        return matchStatus && matchSearch;
    });

    const handleAddOrder = async (data) => { await addDocument(data); };
    const handleStatusChange = async (id, status) => { await updateDocument(id, { status }); };
    const handleDelete = async (id) => {
        if (window.confirm('Delete this order?')) await deleteDocument(id);
    };

    const statusFilters = ['all', 'pending', 'preparing', 'completed', 'cancelled'];

    return (
        <div className="bg-[#0a0a0a] min-h-screen">
            <Sidebar navLinks={navLinks} brandName="Coffee Shop" />
            <main className="md:ml-64 p-4 md:p-8 pt-16 md:pt-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Orders</h1>
                        <p className="text-gray-500 text-sm mt-1">{orders.length} total orders</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-gray-900 text-sm font-semibold rounded-xl transition-colors"
                    >
                        <span>+</span> New Order
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <input
                        type="text"
                        placeholder="Search by customer or item..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 text-sm focus:ring-2 focus:ring-amber-500/40 outline-none w-full md:w-64"
                    />
                    <div className="flex gap-2 flex-wrap">
                        {statusFilters.map((s) => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize transition-colors ${filterStatus === s
                                    ? 'bg-amber-500 text-gray-900'
                                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                                    }`}
                            >
                                {s === 'all' ? 'All' : s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Orders list */}
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <svg className="animate-spin h-7 w-7 text-amber-500" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
                        <div className="text-4xl mb-3">📋</div>
                        <p className="text-gray-500">No orders found.</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile/tablet: card list */}
                        <div className="lg:hidden space-y-3">
                            {filtered.map((order) => (
                                <div
                                    key={order.id}
                                    className="bg-white/5 border border-white/10 rounded-xl p-4"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="font-semibold text-white text-sm">{order.customerName || '—'}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{formatDate(order.timestamp)} · {formatTime(order.timestamp)}</p>
                                        </div>
                                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${STATUS_STYLES[order.status] || 'bg-white/10 text-gray-400'}`}>
                                            {order.status || 'pending'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                                        {(order.items || []).map((i) => `${i.name} ×${i.quantity || 1}`).join(', ') || '—'}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-base font-bold text-amber-400">₱{(order.total || 0).toFixed(2)}</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setSelectedOrder(order)}
                                                className="px-3 py-1.5 text-xs font-medium border border-white/10 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                                            >
                                                View
                                            </button>
                                            <button
                                                onClick={() => handleDelete(order.id)}
                                                className="px-3 py-1.5 text-xs font-medium border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop: table */}
                        <div className="hidden lg:block bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filtered.map((order) => (
                                        <tr key={order.id} className="hover:bg-white/[0.03] transition-colors">
                                            <td className="px-4 py-3 font-medium text-white">
                                                {order.customerName || <span className="text-gray-600">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 max-w-xs">
                                                <span className="line-clamp-1 text-xs">
                                                    {(order.items || []).map((i) => `${i.name} ×${i.quantity || 1}`).join(', ') || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-amber-400">
                                                ₱{(order.total || 0).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full capitalize ${STATUS_STYLES[order.status] || 'bg-white/10 text-gray-400'}`}>
                                                    {order.status || 'pending'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="text-sm text-gray-300">{formatDate(order.timestamp)}</div>
                                                <div className="text-xs text-gray-600">{formatTime(order.timestamp)}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setSelectedOrder(order)}
                                                        className="px-2.5 py-1 text-xs font-medium border border-white/10 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                                                    >
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(order.id)}
                                                        className="px-2.5 py-1 text-xs font-medium border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {DEMO_MODE && (
                    <p className="mt-6 text-xs text-gray-600 text-center">
                        Demo mode: changes are local only and reset on page reload.
                    </p>
                )}
            </main>

            {showAddModal && (
                <AddOrderModal
                    products={products}
                    onClose={() => setShowAddModal(false)}
                    onSave={handleAddOrder}
                />
            )}
            {selectedOrder && (
                <OrderDetailModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onStatusChange={handleStatusChange}
                />
            )}
        </div>
    );
}

export default Orders;
