import { useState, useEffect, useRef } from 'react';

const COFFEE_DEMO_URL =
    import.meta.env.VITE_COFFEE_DEMO_URL ||
    (import.meta.env.DEV ? 'http://localhost:5174' : 'https://cph-coffee-shop-demo.vercel.app');

const POS_DEMO_URL =
    import.meta.env.VITE_POS_DEMO_URL ||
    (import.meta.env.DEV ? 'http://localhost:5175' : 'https://cph-pos-demo.vercel.app');

const TEMPLATES = [
    {
        id: 'coffee-shop',
        title: 'Coffee Shop System',
        category: '☕ Coffee Shop',
        categoryColor: 'amber',
        description: 'Order management, product menu with pricing, sales statistics, and admin dashboard.',
        price: 'starts at ₱2,500',
        status: 'available',
        demoUrl: COFFEE_DEMO_URL,
        demoEmail: 'admin@demo.com',
        demoPassword: 'demo1234',
        gradient: 'from-amber-500/20 to-orange-500/20',
        glowColor: 'hover:shadow-amber-500/10',
    },
    {
        id: 'pos-system',
        title: 'POS System with Inventory',
        category: '🛒 Point of Sale',
        categoryColor: 'blue',
        description: 'Full cashiering system with inventory management, low-stock alerts, transaction history, payment tracking, and sales dashboard.',
        price: 'starts at ₱3,500',
        status: 'available',
        demoUrl: POS_DEMO_URL,
        demoEmail: 'admin@demo.com',
        demoPassword: 'demo1234',
        gradient: 'from-blue-500/20 to-cyan-500/20',
        glowColor: 'hover:shadow-blue-500/10',
    },
    {
        id: 'ordering-system',
        title: 'Ordering System',
        category: '📦 Ordering System',
        categoryColor: 'green',
        description: 'QR-based table ordering, kitchen display, order queue, and real-time tracking.',
        price: 'starts at ₱3,000',
        status: 'coming',
        demoUrl: null,
        demoEmail: null,
        demoPassword: null,
        gradient: 'from-emerald-500/20 to-teal-500/20',
        glowColor: 'hover:shadow-emerald-500/10',
    },
    {
        id: 'ecommerce-system',
        title: 'E-commerce System',
        category: '🏪 E-commerce',
        categoryColor: 'purple',
        description: 'Online store with product catalog, cart, checkout, orders, and admin dashboard.',
        price: 'starts at ₱5,000',
        status: 'coming',
        demoUrl: null,
        demoEmail: null,
        demoPassword: null,
        gradient: 'from-purple-500/20 to-pink-500/20',
        glowColor: 'hover:shadow-purple-500/10',
    },
];

const CATEGORY_BADGE_STYLES = {
    amber: 'bg-amber-500/10 text-amber-300 border border-amber-500/20',
    blue: 'bg-blue-500/10 text-blue-300 border border-blue-500/20',
    green: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',
    purple: 'bg-purple-500/10 text-purple-300 border border-purple-500/20',
};

const FAQ_ITEMS = [
    { q: 'Do I need to know how to code?', a: 'No. We handle the full setup and deployment for you.' },
    { q: 'What do I need to provide?', a: 'Just your business name, logo (optional), and a Gmail account for Firebase.' },
    { q: 'Is there a monthly fee?', a: 'No monthly fee from us. Firebase free tier is enough for most small businesses.' },
    { q: 'Can I request custom features?', a: 'Yes, custom features are available at an additional cost. Contact us to discuss.' },
    { q: 'What if I need help after setup?', a: 'We offer maintenance plans starting at ₱1,500/month.' },
];

function BackgroundOrbs() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-[100px] animate-pulse-slow" />
            <div className="absolute top-1/3 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] animate-pulse-slow" />
            <div className="absolute -bottom-40 right-1/4 w-72 h-72 bg-blue-600/15 rounded-full blur-[100px] animate-pulse-slow" />
        </div>
    );
}

function PreviewWireframe({ isComingSoon }) {
    return (
        <div className={`relative w-full h-full p-5 ${isComingSoon ? 'opacity-30' : ''}`}>
            <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                </div>
                <div className="flex-1 h-5 bg-white/5 rounded-md mx-4" />
            </div>
            <div className="flex gap-3" style={{ height: 'calc(100% - 3rem)' }}>
                <div className="w-16 flex flex-col gap-2.5 pt-2">
                    {[0.6, 0.8, 0.5, 0.4, 0.3].map((opacity, i) => (
                        <div key={i} className="h-2.5 rounded-md bg-white" style={{ opacity: opacity * 0.3, width: `${60 + i * 8}%` }} />
                    ))}
                </div>
                <div className="flex-1 flex flex-col gap-3">
                    <div className="flex gap-2">
                        {[0.2, 0.25, 0.15].map((opacity, i) => (
                            <div key={i} className="flex-1 h-12 rounded-lg bg-white" style={{ opacity }} />
                        ))}
                    </div>
                    <div className="flex-1 rounded-lg bg-white/5 p-3">
                        <div className="space-y-2">
                            {[1, 0.8, 0.9, 0.7, 0.6].map((w, i) => (
                                <div key={i} className="h-2 rounded bg-white/10" style={{ width: `${w * 100}%` }} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {isComingSoon && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-zinc-900/90 backdrop-blur-sm text-white/80 text-xs font-semibold px-5 py-2 rounded-full border border-white/10 shadow-lg">
                        Coming soon
                    </span>
                </div>
            )}
        </div>
    );
}

function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <button onClick={handleCopy} className="ml-2 text-white/30 hover:text-white/70 transition-colors" title="Copy">
            {copied ? (
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            )}
        </button>
    );
}

function TemplateCard({ template }) {
    const [notifyEmail, setNotifyEmail] = useState('');
    const [notifySuccess, setNotifySuccess] = useState(false);
    const [showNotifyInput, setShowNotifyInput] = useState(false);
    const isComingSoon = template.status === 'coming';

    const handleNotifySubmit = (e) => {
        e.preventDefault();
        if (notifyEmail.trim()) {
            setNotifySuccess(true);
            setNotifyEmail('');
        }
    };

    return (
        <div className={`group relative bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-white/[0.06] overflow-hidden card-hover ${template.glowColor}`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${template.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <div className="relative h-48 bg-zinc-950/80 border-b border-white/[0.06]">
                <PreviewWireframe isComingSoon={isComingSoon} />
            </div>
            <div className="relative p-6">
                <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4 ${CATEGORY_BADGE_STYLES[template.categoryColor]}`}>
                    {template.category}
                </span>
                <h3 className="text-xl font-bold text-white mb-2">{template.title}</h3>
                <p className="text-sm text-white/50 mb-4 leading-relaxed">{template.description}</p>
                <div className="flex items-center gap-2 mb-5">
                    <span className="text-lg font-bold gradient-text">{template.price}</span>
                </div>
                {template.status === 'available' ? (
                    <div>
                        <a
                            href={template.demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 btn-primary text-sm"
                        >
                            <span>Live demo</span>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </a>
                        <div className="mt-4 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-xs">
                            <p className="text-white/30 text-[10px] uppercase tracking-wider font-semibold mb-2">Demo credentials</p>
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-white/40">Email:</span>
                                <span className="font-mono text-white/70">{template.demoEmail}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-white/40">Password:</span>
                                <span className="font-mono text-white/70">{template.demoPassword}</span>
                                <CopyButton text={template.demoPassword} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        {!showNotifyInput && !notifySuccess && (
                            <button
                                onClick={() => setShowNotifyInput(true)}
                                className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/10 text-white/70 text-sm font-medium rounded-xl hover:border-white/20 hover:bg-white/5 transition-all duration-300"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                Get notified
                            </button>
                        )}
                        {showNotifyInput && !notifySuccess && (
                            <form onSubmit={handleNotifySubmit} className="flex gap-2">
                                <input
                                    type="email"
                                    value={notifyEmail}
                                    onChange={(e) => setNotifyEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    required
                                    className="flex-1 px-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all"
                                />
                                <button type="submit" className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 transition-colors whitespace-nowrap">
                                    Notify me
                                </button>
                            </form>
                        )}
                        {notifySuccess && (
                            <p className="text-sm text-emerald-400 font-medium flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                We'll let you know!
                            </p>
                        )}
                        <p className="text-xs text-white/30 mt-3">Be the first to know when this template is ready.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function FAQItem({ question, answer, isOpen, onToggle }) {
    return (
        <div className="border-b border-white/[0.06] last:border-0">
            <button onClick={onToggle} className="w-full flex items-center justify-between py-6 text-left gap-4 group">
                <span className="text-base font-medium text-white/90 group-hover:text-white transition-colors">{question}</span>
                <span className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/50 transition-all duration-300 ${isOpen ? 'rotate-45 bg-blue-500/20 border-blue-500/30 text-blue-400' : 'group-hover:border-white/20'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                </span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-40 pb-6' : 'max-h-0'}`}>
                <p className="text-sm text-white/50 leading-relaxed">{answer}</p>
            </div>
        </div>
    );
}

function LandingPage() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');
    const [openFaqIndexes, setOpenFaqIndexes] = useState([]);
    const templatesRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTemplates = () => {
        templatesRef.current?.scrollIntoView({ behavior: 'smooth' });
        setMobileMenuOpen(false);
    };

    const toggleFaq = (index) => {
        setOpenFaqIndexes((prev) =>
            prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
        );
    };

    const filteredTemplates = TEMPLATES.filter((t) => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'available') return t.status === 'available';
        if (activeFilter === 'coming') return t.status === 'coming';
        return true;
    });

    const filters = [
        { key: 'all', label: 'All templates' },
        { key: 'available', label: 'Available now' },
        { key: 'coming', label: 'Coming soon' },
    ];

    return (
        <div className="min-h-screen bg-zinc-950 font-sans text-white overflow-x-hidden">
            {/* Navbar */}
            <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-zinc-950/80 backdrop-blur-xl border-b border-white/[0.06] shadow-lg shadow-black/20' : 'bg-transparent'}`}>
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo.jpg" alt="CronzPH" className="w-9 h-9 rounded-full" />
                        <span className="text-lg font-bold text-white">CronzPH</span>
                        <span className="hidden sm:inline-block text-[10px] font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 uppercase tracking-wider">Templates</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-2">
                        <a href="https://www.facebook.com/cronzph" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-white/60 hover:text-white px-4 py-2 rounded-lg hover:bg-white/5 transition-all">Contact us</a>
                        <button onClick={scrollToTemplates} className="btn-primary text-sm !py-2.5 !px-5">View templates</button>
                    </nav>
                    <button className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors" onClick={() => setMobileMenuOpen((v) => !v)}>
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            {mobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>
                {mobileMenuOpen && (
                    <div className="md:hidden bg-zinc-900/95 backdrop-blur-xl border-t border-white/[0.06] px-6 py-5 flex flex-col gap-3 animate-slide-up">
                        <a href="https://www.facebook.com/cronzph" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-white/70 py-2">Contact us</a>
                        <button onClick={scrollToTemplates} className="btn-primary text-sm text-center">View templates</button>
                    </div>
                )}
            </header>

            {/* Hero Section */}
            <section className="relative pt-32 pb-32 px-6 overflow-hidden">
                <BackgroundOrbs />
                <div className="absolute inset-0 hero-glow" />
                <div className="absolute inset-0 noise-bg" />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '80px 80px' }} />

                <div className="max-w-5xl mx-auto text-center relative">
                    <div className="inline-flex items-center gap-2 glass-dark text-white/80 text-xs font-medium px-5 py-2 rounded-full mb-8 animate-fade-in">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Now accepting orders
                    </div>

                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6 animate-slide-up text-balance">
                        <span className="text-white">Business systems</span>
                        <br />
                        <span className="gradient-text">built for Filipino</span>
                        <br />
                        <span className="text-white">entrepreneurs</span>
                    </h1>

                    <p className="text-base sm:text-lg text-white/50 mb-12 max-w-2xl mx-auto leading-relaxed animate-fade-in">
                        Ready-to-deploy web systems. Buy once, setup included, own it forever.
                        <br className="hidden sm:block" />
                        No monthly fees. No coding required.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 animate-slide-up">
                        <button onClick={scrollToTemplates} className="btn-primary text-sm">Browse templates</button>
                        <a href="https://www.facebook.com/cronzph" target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">Contact us</a>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 animate-fade-in">
                        {[
                            { value: '4+', label: 'Templates', icon: '📦' },
                            { value: 'React', label: '+ Firebase', icon: '⚛️' },
                            { value: 'Free', label: 'Setup', icon: '🛠️' },
                            { value: 'Own it', label: 'Forever', icon: '♾️' },
                        ].map((stat, i) => (
                            <div key={i} className="flex items-center gap-3 glass-dark px-4 py-2.5 rounded-xl">
                                <span className="text-lg">{stat.icon}</span>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-white">{stat.value}</p>
                                    <p className="text-[10px] text-white/40 uppercase tracking-wider">{stat.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-zinc-950" />
            </section>

            {/* Templates Section */}
            <section ref={templatesRef} className="section-padding bg-zinc-950 relative">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-12 text-center">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                            Available <span className="gradient-text">templates</span>
                        </h2>
                        <p className="text-white/50 max-w-lg mx-auto">Click Live demo to explore each system with a real demo account. No signup needed.</p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2 mb-10">
                        {filters.map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setActiveFilter(f.key)}
                                className={`px-5 py-2.5 text-sm font-medium rounded-full transition-all duration-300 ${activeFilter === f.key ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'bg-white/[0.03] text-white/50 border border-white/[0.06] hover:border-white/10 hover:text-white/70'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredTemplates.map((template) => (
                            <TemplateCard key={template.id} template={template} />
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="section-padding bg-zinc-950 relative border-t border-white/[0.04]">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[150px]" />
                </div>
                <div className="max-w-5xl mx-auto relative">
                    <div className="mb-14 text-center">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                            How it <span className="gradient-text">works</span>
                        </h2>
                        <p className="text-white/50">Simple process, from browsing to going live.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { step: '01', icon: '🔍', title: 'Browse & preview', desc: "Explore live demos with real dummy data. See exactly what you're getting." },
                            { step: '02', icon: '💳', title: 'Purchase & pay', desc: 'Pay via GCash or bank transfer. No hidden fees.' },
                            { step: '03', icon: '🚀', title: 'Get your system', desc: "We deploy it for you. Setup included. You're live in 24–48 hours." },
                        ].map((item) => (
                            <div key={item.step} className="group relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-blue-500/20 hover:bg-white/[0.04] transition-all duration-300">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-amber-500/10 border border-blue-500/20 flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-300">
                                        {item.icon}
                                    </div>
                                    <span className="text-[10px] font-bold text-blue-400/60 uppercase tracking-[0.2em]">Step {item.step}</span>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                                <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="section-padding bg-zinc-950 relative border-t border-white/[0.04]">
                <div className="max-w-2xl mx-auto">
                    <div className="mb-12 text-center">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                            Frequently asked <span className="gradient-text">questions</span>
                        </h2>
                        <p className="text-white/50">Everything you need to know before buying.</p>
                    </div>
                    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] px-6">
                        {FAQ_ITEMS.map((item, index) => (
                            <FAQItem
                                key={index}
                                question={item.q}
                                answer={item.a}
                                isOpen={openFaqIndexes.includes(index)}
                                onToggle={() => toggleFaq(index)}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="section-padding bg-zinc-950 relative border-t border-white/[0.04]">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/10 rounded-full blur-[150px]" />
                </div>
                <div className="max-w-3xl mx-auto text-center relative">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Ready to <span className="gradient-text">get started</span>?
                    </h2>
                    <p className="text-white/50 mb-8 max-w-lg mx-auto">
                        Message us on Facebook or email to get your system up and running in 24-48 hours.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a href="https://www.facebook.com/cronzph" target="_blank" rel="noopener noreferrer" className="btn-primary text-sm">Message us on Facebook</a>
                        <a href="https://www.facebook.com/cronzph" target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">Send an email</a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-zinc-950 border-t border-white/[0.06] py-12 px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                        <div className="flex items-center gap-3">
                            <img src="/logo.jpg" alt="CronzPH" className="w-9 h-9 rounded-full" />
                            <span className="text-lg font-bold text-white">CronzPH</span>
                        </div>
                        <nav className="flex items-center gap-6">
                            <button onClick={scrollToTemplates} className="text-sm text-white/40 hover:text-white transition-colors">Templates</button>
                            <a href="https://www.facebook.com/cronzph" target="_blank" rel="noopener noreferrer" className="text-sm text-white/40 hover:text-white transition-colors">Contact</a>
                            <a href="https://www.facebook.com/cronzph" target="_blank" rel="noopener noreferrer" className="text-sm text-white/40 hover:text-white transition-colors">Facebook</a>
                        </nav>
                    </div>
                    <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-xs text-white/30">&copy; 2025 CronzPH. All rights reserved.</p>
                        <p className="text-xs text-white/20">Built with React + Firebase</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default LandingPage;
