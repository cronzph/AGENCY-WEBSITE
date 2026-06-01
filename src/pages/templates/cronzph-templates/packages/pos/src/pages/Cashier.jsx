import { useState, useMemo, useCallback } from 'react';
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

function Cashier() {
    const [cart, setCart] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [amountPaid, setAmountPaid] = useState('');
    const [showCheckout, setShowCheckout] = useState(false);
    const [receiptData, setReceiptData] = useState(null);
    const [mobileCartOpen, setMobileCartOpen] = useState(false);
    const [addedProductId, setAddedProductId] = useState(null);

    const { documents: products } = useFirestore(
        DEMO_MODE ? 'demo_pos_products' : 'products'
    );
    const { addDocument } = useFirestore(
        DEMO_MODE ? 'demo_pos_transactions' : 'transactions'
    );

    // Get unique categories
    const categories = useMemo(() => {
        const cats = [...new Set(products.map((p) => p.category || 'Other'))];
        return ['all', ...cats];
    }, [products]);

    // Filter products
    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === 'all' || (p.category || 'Other') === activeCategory;
            const isAvailable = p.available !== false && (p.stock || 0) > 0;
            return matchesSearch && matchesCategory && isAvailable;
        });
    }, [products, searchQuery, activeCategory]);

    // Cart calculations
    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const change = parseFloat(amountPaid || 0) - cartTotal;

    // Cart actions
    const addToCart = useCallback((product) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.id === product.id);
            if (existing) {
                return prev.map((item) =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
        });
        // Show add animation
        setAddedProductId(product.id);
        setTimeout(() => setAddedProductId(null), 600);
    }, []);

    const updateQuantity = (id, delta) => {
        setCart((prev) =>
            prev
                .map((item) =>
                    item.id === id ? { ...item, quantity: item.quantity + delta } : item
                )
                .filter((item) => item.quantity > 0)
        );
    };

    const removeFromCart = (id) => {
        setCart((prev) => prev.filter((item) => item.id !== id));
    };

    const clearCart = () => {
        setCart([]);
        setAmountPaid('');
        setShowCheckout(false);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        const transaction = {
            items: cart,
            total: cartTotal,
            paymentMethod,
            amountPaid: parseFloat(amountPaid || cartTotal),
            change: Math.max(0, change),
            timestamp: new Date().toISOString(),
            status: 'completed',
        };

        try {
            await addDocument(transaction);
            setReceiptData(transaction);
            setCart([]);
            setAmountPaid('');
            setShowCheckout(false);
            setMobileCartOpen(false);
        } catch (err) {
            console.error('Transaction failed:', err);
        }
    };

    const closeReceipt = () => setReceiptData(null);

    return (
        <div className="bg-[#0a0a0a] min-h-screen">
            <POSSidebar navLinks={navLinks} />
            <main className="md:ml-[260px] pt-[60px] md:pt-0 min-h-screen flex flex-col lg:flex-row">

                {/* Left: Product Grid */}
                <div className="flex-1 p-4 md:p-6 overflow-y-auto pb-24 lg:pb-6">
                    {/* Search & Filter */}
                    <div className="mb-4">
                        <div className="flex flex-col sm:flex-row gap-3 mb-3">
                            <div className="relative flex-1">
                                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search products..."
                                    className="input-field !pl-10 !py-2.5 text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${activeCategory === cat
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                            : 'bg-white/5 text-white/50 border border-white/[0.08] hover:bg-white/10 hover:text-white/70'
                                        }`}
                                >
                                    {cat === 'all' ? 'All' : cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-3">
                        {filteredProducts.map((product) => (
                            <button
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className={`group relative bg-[#111111] border border-white/[0.06] hover:border-white/[0.12] rounded-xl p-3 md:p-4 text-left transition-all duration-200 active:scale-[0.97] ${addedProductId === product.id ? 'ring-2 ring-blue-500/50 border-blue-500/30 scale-[0.97]' : ''
                                    }`}
                            >
                                {/* Added indicator */}
                                {addedProductId === product.id && (
                                    <div className="absolute inset-0 bg-blue-500/10 rounded-xl animate-fade-in pointer-events-none" />
                                )}

                                {/* Added badge animation */}
                                {addedProductId === product.id && (
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-slide-up z-10 shadow-lg shadow-blue-500/40">
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}

                                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20 flex items-center justify-center text-base md:text-lg mb-2 group-hover:scale-110 transition-transform">
                                    {product.emoji || '📦'}
                                </div>
                                <p className="text-xs md:text-sm font-semibold text-white truncate">{product.name}</p>
                                <p className="text-[10px] text-white/25 mt-0.5 truncate">{product.category || 'Other'}</p>
                                <div className="flex items-center justify-between mt-1.5">
                                    <p className="text-xs md:text-sm font-bold text-blue-400">₱{(product.price || 0).toFixed(2)}</p>
                                    <span className="text-[9px] text-white/20">{product.stock || 0} left</span>
                                </div>
                            </button>
                        ))}
                        {filteredProducts.length === 0 && (
                            <div className="col-span-full py-16 text-center">
                                <div className="text-3xl mb-2 opacity-30">🔍</div>
                                <p className="text-white/30 text-sm">No products found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile: Floating Cart Button */}
                {cart.length > 0 && !mobileCartOpen && (
                    <button
                        onClick={() => setMobileCartOpen(true)}
                        className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-2xl shadow-blue-500/30 transition-all animate-slide-up"
                    >
                        <div className="relative">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                            </svg>
                            <span className="absolute -top-2 -right-2 w-4 h-4 bg-white text-blue-600 text-[10px] font-bold rounded-full flex items-center justify-center">
                                {cartItemCount}
                            </span>
                        </div>
                        <span className="text-sm font-semibold">View Cart</span>
                        <span className="text-sm font-bold">₱{cartTotal.toFixed(2)}</span>
                    </button>
                )}

                {/* Mobile Cart Overlay */}
                {mobileCartOpen && (
                    <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setMobileCartOpen(false)} />
                )}

                {/* Cart Panel — Desktop: side panel, Mobile: slide-up sheet */}
                <div className={`
                    fixed lg:relative inset-x-0 bottom-0 lg:inset-auto
                    w-full lg:w-96 bg-[#0d0d0d] lg:bg-[#111111] border-t lg:border-t-0 lg:border-l border-white/[0.06]
                    flex flex-col lg:min-h-screen
                    transition-transform duration-300 ease-out z-50 lg:z-auto
                    ${mobileCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
                    max-h-[85vh] lg:max-h-none rounded-t-3xl lg:rounded-none
                `}>
                    {/* Cart Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                        <div className="flex items-center gap-2">
                            {/* Mobile drag handle */}
                            <div className="lg:hidden w-10 h-1 bg-white/20 rounded-full absolute top-2 left-1/2 -translate-x-1/2" />
                            <h2 className="text-sm font-bold text-white">Cart</h2>
                            {cartItemCount > 0 && (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded-full">
                                    {cartItemCount}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {cart.length > 0 && (
                                <button onClick={clearCart} className="text-[11px] text-red-400/70 hover:text-red-400 transition-colors font-medium">
                                    Clear
                                </button>
                            )}
                            <button
                                onClick={() => setMobileCartOpen(false)}
                                className="lg:hidden p-1.5 rounded-lg hover:bg-white/5 text-white/40"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center py-8">
                                <div className="text-3xl mb-2 opacity-20">🛒</div>
                                <p className="text-white/25 text-sm font-medium">Cart is empty</p>
                                <p className="text-white/15 text-xs mt-1">Tap products to add</p>
                            </div>
                        ) : (
                            cart.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{item.name}</p>
                                        <p className="text-[11px] text-white/30">₱{item.price.toFixed(2)} each</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => updateQuantity(item.id, -1)}
                                            className="w-7 h-7 rounded-lg bg-white/5 border border-white/[0.08] text-white/50 hover:bg-white/10 flex items-center justify-center text-sm transition-colors"
                                        >
                                            −
                                        </button>
                                        <span className="w-6 text-center text-sm font-semibold text-white">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.id, 1)}
                                            className="w-7 h-7 rounded-lg bg-white/5 border border-white/[0.08] text-white/50 hover:bg-white/10 flex items-center justify-center text-sm transition-colors"
                                        >
                                            +
                                        </button>
                                    </div>
                                    <div className="text-right ml-1">
                                        <p className="text-sm font-bold text-white">₱{(item.price * item.quantity).toFixed(2)}</p>
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="text-[10px] text-red-400/50 hover:text-red-400 transition-colors"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Cart Footer */}
                    {cart.length > 0 && (
                        <div className="border-t border-white/[0.06] p-4 space-y-3">
                            {!showCheckout ? (
                                <>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-white/40">Total</span>
                                        <span className="text-xl font-extrabold text-white">₱{cartTotal.toFixed(2)}</span>
                                    </div>
                                    <button
                                        onClick={() => setShowCheckout(true)}
                                        className="btn-primary w-full"
                                    >
                                        Checkout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-white/40">Total</span>
                                            <span className="text-lg font-extrabold text-white">₱{cartTotal.toFixed(2)}</span>
                                        </div>

                                        {/* Payment Method */}
                                        <div>
                                            <label className="block text-[10px] font-semibold text-white/30 mb-1.5 uppercase tracking-wider">Payment</label>
                                            <div className="flex gap-1.5">
                                                {['cash', 'gcash', 'card'].map((method) => (
                                                    <button
                                                        key={method}
                                                        onClick={() => setPaymentMethod(method)}
                                                        className={`flex-1 py-2 text-xs font-medium rounded-lg capitalize transition-all ${paymentMethod === method
                                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                                                : 'bg-white/5 text-white/40 border border-white/[0.08] hover:bg-white/10'
                                                            }`}
                                                    >
                                                        {method}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Amount Paid */}
                                        {paymentMethod === 'cash' && (
                                            <div>
                                                <label className="block text-[10px] font-semibold text-white/30 mb-1.5 uppercase tracking-wider">Amount Paid</label>
                                                <input
                                                    type="number"
                                                    value={amountPaid}
                                                    onChange={(e) => setAmountPaid(e.target.value)}
                                                    placeholder={cartTotal.toFixed(2)}
                                                    className="input-field text-sm !py-2.5"
                                                />
                                                {amountPaid && change >= 0 && (
                                                    <p className="text-xs text-emerald-400 mt-1 font-medium">
                                                        Change: ₱{change.toFixed(2)}
                                                    </p>
                                                )}
                                                {amountPaid && change < 0 && (
                                                    <p className="text-xs text-red-400 mt-1 font-medium">
                                                        Short: ₱{Math.abs(change).toFixed(2)}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Quick amounts */}
                                        {paymentMethod === 'cash' && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {[20, 50, 100, 200, 500, 1000].map((amt) => (
                                                    <button
                                                        key={amt}
                                                        onClick={() => setAmountPaid(String(amt))}
                                                        className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${amountPaid === String(amt)
                                                                ? 'bg-blue-600/20 border border-blue-500/30 text-blue-300'
                                                                : 'bg-white/5 border border-white/[0.08] text-white/40 hover:bg-white/10'
                                                            }`}
                                                    >
                                                        ₱{amt}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={() => setShowCheckout(false)}
                                            className="btn-secondary flex-1 !text-xs !py-2.5"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={handleCheckout}
                                            disabled={paymentMethod === 'cash' && change < 0}
                                            className="btn-success flex-1 !text-xs !py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            Complete ₱{cartTotal.toFixed(2)}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Receipt Modal */}
            {receiptData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-[#111111] border border-white/[0.08] rounded-2xl w-full max-w-sm p-6 animate-slide-up">
                        <div className="text-center mb-5">
                            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-white">Transaction Complete!</h3>
                            <p className="text-xs text-white/30 mt-1">{new Date(receiptData.timestamp).toLocaleString('en-PH')}</p>
                        </div>

                        <div className="space-y-1.5 mb-4">
                            {receiptData.items.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span className="text-white/50">{item.name} ×{item.quantity}</span>
                                    <span className="text-white font-medium">₱{(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-white/[0.08] pt-3 space-y-1.5">
                            <div className="flex justify-between">
                                <span className="text-sm text-white/40">Total</span>
                                <span className="text-lg font-extrabold text-white">₱{receiptData.total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-white/40">Payment</span>
                                <span className="text-white/60 capitalize">{receiptData.paymentMethod}</span>
                            </div>
                            {receiptData.paymentMethod === 'cash' && (
                                <>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-white/40">Paid</span>
                                        <span className="text-white/60">₱{receiptData.amountPaid.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-white/40">Change</span>
                                        <span className="text-emerald-400 font-semibold">₱{receiptData.change.toFixed(2)}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        <button onClick={closeReceipt} className="btn-primary w-full mt-5">
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Cashier;
