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

const CATEGORIES = ['Hot Coffee', 'Iced Coffee', 'Specialty', 'Non-Coffee', 'Food'];
const EMOJIS = ['☕', '🥛', '🍵', '🧊', '🍫', '🥤', '🍰', '🥐'];

function ProductModal({ product, onClose, onSave }) {
    const [form, setForm] = useState({
        name: product?.name || '',
        category: product?.category || 'Hot Coffee',
        price: product?.price || '',
        emoji: product?.emoji || '☕',
        description: product?.description || '',
        available: product?.available ?? true,
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        await onSave({ ...form, price: parseFloat(form.price) });
        setSaving(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="bg-[#111111] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <h2 className="text-base font-bold text-white">{product ? 'Edit Product' : 'Add Product'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none transition-colors">×</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Emoji picker */}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2">Icon</label>
                        <div className="flex flex-wrap gap-2">
                            {EMOJIS.map((e) => (
                                <button
                                    key={e}
                                    type="button"
                                    onClick={() => setForm((f) => ({ ...f, emoji: e }))}
                                    className={`w-10 h-10 text-xl rounded-lg border transition-all ${form.emoji === e
                                        ? 'border-amber-500/50 bg-amber-500/10'
                                        : 'border-white/10 bg-white/5 hover:border-white/20'
                                        }`}
                                >
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Product Name</label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 outline-none text-sm transition-colors"
                            placeholder="e.g. Caramel Latte"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">Category</label>
                            <select
                                value={form.category}
                                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-amber-500/40 outline-none text-sm"
                            >
                                {CATEGORIES.map((c) => <option key={c} className="bg-[#111]">{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">Price (₱)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={form.price}
                                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-500/40 outline-none text-sm"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
                        <textarea
                            rows={2}
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-500/40 outline-none text-sm resize-none"
                            placeholder="Short description..."
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="available"
                            checked={form.available}
                            onChange={(e) => setForm((f) => ({ ...f, available: e.target.checked }))}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 accent-amber-500"
                        />
                        <label htmlFor="available" className="text-sm text-gray-400">Available for ordering</label>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-white/10 text-gray-400 hover:text-white text-sm font-medium rounded-lg hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 text-sm font-semibold rounded-lg transition-colors"
                        >
                            {saving ? 'Saving...' : product ? 'Save Changes' : 'Add Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function DeleteConfirm({ product, onClose, onConfirm }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="bg-[#111111] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div className="text-center mb-5">
                    <div className="text-4xl mb-3">{product.emoji}</div>
                    <h2 className="text-base font-bold text-white">Delete Product?</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Are you sure you want to delete <strong className="text-white">{product.name}</strong>?
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-white/10 text-gray-400 hover:text-white text-sm font-medium rounded-lg hover:bg-white/5 transition-colors">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-red-500/80 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition-colors">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

function Products() {
    const collectionName = DEMO_MODE ? 'demo_coffee_products' : 'products';
    const { documents: products, loading, addDocument, updateDocument, deleteDocument } = useFirestore(collectionName);

    const [showModal, setShowModal] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [deleteProduct, setDeleteProduct] = useState(null);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');

    const filtered = products.filter((p) => {
        const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase());
        const matchCat = filterCategory === 'All' || p.category === filterCategory;
        return matchSearch && matchCat;
    });

    const handleSave = async (data) => {
        if (editProduct) {
            await updateDocument(editProduct.id, data);
        } else {
            await addDocument(data);
        }
        setEditProduct(null);
    };

    const handleDelete = async () => {
        await deleteDocument(deleteProduct.id);
        setDeleteProduct(null);
    };

    return (
        <div className="bg-[#0a0a0a] min-h-screen">
            <Sidebar navLinks={navLinks} brandName="Coffee Shop" />
            <main className="md:ml-64 p-4 md:p-8 pt-16 md:pt-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Products</h1>
                        <p className="text-gray-500 text-sm mt-1">{products.length} menu items</p>
                    </div>
                    <button
                        onClick={() => { setEditProduct(null); setShowModal(true); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-gray-900 text-sm font-semibold rounded-xl transition-colors"
                    >
                        <span>+</span> Add Product
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-600 text-sm focus:ring-2 focus:ring-amber-500/40 outline-none w-52"
                    />
                    <div className="flex gap-2 flex-wrap">
                        {['All', ...CATEGORIES].map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setFilterCategory(cat)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${filterCategory === cat
                                    ? 'bg-amber-500 text-gray-900'
                                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <svg className="animate-spin h-7 w-7 text-amber-500" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
                        <div className="text-4xl mb-3">☕</div>
                        <p className="text-gray-500">No products found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filtered.map((product) => (
                            <div key={product.id} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] hover:border-white/20 transition-all">
                                <div className="flex items-start justify-between mb-3">
                                    <span className="text-3xl">{product.emoji || '☕'}</span>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${product.available
                                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                        : 'bg-white/5 text-gray-500 border-white/10'
                                        }`}>
                                        {product.available ? 'Available' : 'Off'}
                                    </span>
                                </div>
                                <h3 className="font-semibold text-white mb-1">{product.name}</h3>
                                <p className="text-xs text-gray-500 mb-2">{product.category}</p>
                                {product.description && (
                                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                                )}
                                <p className="text-lg font-bold text-amber-400 mb-4">₱{(product.price || 0).toFixed(2)}</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setEditProduct(product); setShowModal(true); }}
                                        className="flex-1 px-3 py-1.5 text-xs font-medium border border-white/10 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => setDeleteProduct(product)}
                                        className="flex-1 px-3 py-1.5 text-xs font-medium border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {DEMO_MODE && (
                    <p className="mt-6 text-xs text-gray-600 text-center">
                        Demo mode: changes are local only and reset on page reload.
                    </p>
                )}
            </main>

            {showModal && (
                <ProductModal
                    product={editProduct}
                    onClose={() => { setShowModal(false); setEditProduct(null); }}
                    onSave={handleSave}
                />
            )}
            {deleteProduct && (
                <DeleteConfirm
                    product={deleteProduct}
                    onClose={() => setDeleteProduct(null)}
                    onConfirm={handleDelete}
                />
            )}
        </div>
    );
}

export default Products;
