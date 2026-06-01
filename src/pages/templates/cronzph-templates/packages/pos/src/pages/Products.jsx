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

function Products() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        category: '',
        stock: '',
        emoji: '📦',
        barcode: '',
        lowStockThreshold: '5',
    });

    const collectionName = DEMO_MODE ? 'demo_pos_products' : 'products';
    const { documents: products, addDocument, updateDocument, deleteDocument } = useFirestore(collectionName);

    const categories = useMemo(() => {
        const cats = [...new Set(products.map((p) => p.category || 'Other'))];
        return ['all', ...cats];
    }, [products]);

    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === 'all' || (p.category || 'Other') === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, activeCategory]);

    const openAddModal = () => {
        setFormData({ name: '', price: '', category: '', stock: '', emoji: '📦', barcode: '', lowStockThreshold: '5' });
        setEditingProduct(null);
        setShowAddModal(true);
    };

    const openEditModal = (product) => {
        setFormData({
            name: product.name || '',
            price: String(product.price || ''),
            category: product.category || '',
            stock: String(product.stock || ''),
            emoji: product.emoji || '📦',
            barcode: product.barcode || '',
            lowStockThreshold: String(product.lowStockThreshold || '5'),
        });
        setEditingProduct(product);
        setShowAddModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = {
            name: formData.name.trim(),
            price: parseFloat(formData.price) || 0,
            category: formData.category.trim() || 'Other',
            stock: parseInt(formData.stock) || 0,
            emoji: formData.emoji || '📦',
            barcode: formData.barcode.trim(),
            lowStockThreshold: parseInt(formData.lowStockThreshold) || 5,
            available: true,
            updatedAt: new Date().toISOString(),
        };

        if (editingProduct) {
            await updateDocument(editingProduct.id, data);
        } else {
            data.createdAt = new Date().toISOString();
            await addDocument(data);
        }

        setShowAddModal(false);
        setEditingProduct(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            await deleteDocument(id);
        }
    };

    const toggleAvailability = async (product) => {
        await updateDocument(product.id, { available: !product.available });
    };

    return (
        <div className="bg-[#0a0a0a] min-h-screen">
            <POSSidebar navLinks={navLinks} />
            <main className="md:ml-[260px] p-5 md:p-8 pt-[72px] md:pt-8">

                {/* Header */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Products</h1>
                        <p className="text-white/40 text-sm mt-1">{products.length} total products</p>
                    </div>
                    <button onClick={openAddModal} className="btn-primary text-sm !px-5 !py-2.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Product
                    </button>
                </div>

                {/* Search & Filter */}
                <div className="mb-6">
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <div className="relative flex-1">
                            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name or barcode..."
                                className="input-field !pl-10 !py-2.5 text-sm"
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${activeCategory === cat
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                    : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                {cat === 'all' ? 'All' : cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Products Grid */}
                {filteredProducts.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <div className="text-4xl mb-3">📦</div>
                        <p className="text-white/50 text-sm">No products found</p>
                        <button onClick={openAddModal} className="mt-3 text-xs text-blue-400 hover:text-blue-300">
                            Add your first product →
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredProducts.map((product) => (
                            <div key={product.id} className="glass-card-hover p-5 group">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                            {product.emoji || '📦'}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-white">{product.name}</h3>
                                            <p className="text-xs text-white/30">{product.category || 'Other'}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleAvailability(product)}
                                        className={`w-9 h-5 rounded-full transition-colors relative ${product.available !== false ? 'bg-emerald-500' : 'bg-white/20'}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${product.available !== false ? 'left-[18px]' : 'left-0.5'}`} />
                                    </button>
                                </div>

                                {product.barcode && (
                                    <p className="text-[10px] font-mono text-white/20 mb-2">Barcode: {product.barcode}</p>
                                )}

                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className="text-lg font-bold text-blue-400">₱{(product.price || 0).toFixed(2)}</p>
                                        <p className={`text-xs mt-1 ${(product.stock || 0) <= (product.lowStockThreshold || 5) ? 'text-amber-400' : 'text-white/30'}`}>
                                            {product.stock || 0} in stock
                                            {(product.stock || 0) <= (product.lowStockThreshold || 5) && ' ⚠️'}
                                        </p>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => openEditModal(product)}
                                            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product.id)}
                                            className="p-2 rounded-lg bg-white/5 border border-white/10 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-colors"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="glass-card w-full max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-white">
                                {editingProduct ? 'Edit Product' : 'Add Product'}
                            </h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-[auto_1fr] gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-white/40 mb-2">Icon</label>
                                    <input
                                        type="text"
                                        value={formData.emoji}
                                        onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                                        className="input-field !w-14 !text-center text-xl !py-2"
                                        maxLength={2}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-white/40 mb-2">Product Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="input-field text-sm"
                                        placeholder="e.g. Coca-Cola 330ml"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-white/40 mb-2">Price (₱) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        className="input-field text-sm"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-white/40 mb-2">Stock *</label>
                                    <input
                                        type="number"
                                        value={formData.stock}
                                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                        className="input-field text-sm"
                                        placeholder="0"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-white/40 mb-2">Category</label>
                                    <input
                                        type="text"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="input-field text-sm"
                                        placeholder="e.g. Beverages"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-white/40 mb-2">Low Stock Alert</label>
                                    <input
                                        type="number"
                                        value={formData.lowStockThreshold}
                                        onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                                        className="input-field text-sm"
                                        placeholder="5"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-white/40 mb-2">Barcode (optional)</label>
                                <input
                                    type="text"
                                    value={formData.barcode}
                                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                    className="input-field text-sm"
                                    placeholder="e.g. 4800016123456"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="btn-secondary flex-1 text-sm"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary flex-1 text-sm">
                                    {editingProduct ? 'Save Changes' : 'Add Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Products;
