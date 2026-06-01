import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

const DEMO_MODE = import.meta.env.VITE_IS_DEMO === 'true';

export function Sidebar({ navLinks = [], brandName = 'CronzPH' }) {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const closeSidebar = () => setOpen(false);

    return (
        <>
            {/* ── Mobile top bar ── */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#111111] border-b border-white/5 flex items-center justify-between px-4 h-14">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center text-gray-900 font-bold text-xs">☕</div>
                    <span className="text-sm font-bold text-white">{brandName}</span>
                </div>
                <div className="flex items-center gap-2">
                    {DEMO_MODE && (
                        <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full">
                            🎯 Demo
                        </span>
                    )}
                    <button
                        onClick={() => setOpen((v) => !v)}
                        className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* ── Mobile overlay backdrop ── */}
            {open && (
                <div
                    className="md:hidden fixed inset-0 z-50 bg-black/70"
                    onClick={closeSidebar}
                />
            )}

            {/* ── Sidebar panel ── */}
            {/* On desktop: always visible, fixed left. On mobile: slides in as overlay */}
            <aside className={`
                fixed top-0 left-0 h-full w-64 bg-[#111111] border-r border-white/5 text-white flex flex-col
                transition-transform duration-200 ease-in-out
                z-50
                md:translate-x-0
                ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                {/* Brand */}
                <div className="flex items-center justify-between p-5 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-gray-900 font-bold text-sm">☕</div>
                        <div>
                            <h2 className="text-sm font-bold text-white leading-none">{brandName}</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Management System</p>
                        </div>
                    </div>
                    {/* Close button — mobile only */}
                    <button
                        onClick={closeSidebar}
                        className="md:hidden p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            onClick={closeSidebar}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                                }`
                            }
                        >
                            {link.icon && <span className="text-base">{link.icon}</span>}
                            <span>{link.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-3 space-y-1.5 border-t border-white/5">
                    {DEMO_MODE && (
                        <div className="space-y-1.5 mb-1">
                            <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                <span className="text-amber-400 text-sm">🎯</span>
                                <span className="text-amber-300 text-xs font-semibold">Demo Mode</span>
                            </div>
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium text-gray-400 hover:text-white transition-colors"
                            >
                                <span>↻</span>
                                <span>Reset Demo</span>
                            </button>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                    >
                        <span className="text-base">🚪</span>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
