import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/hooks/index.js';

const DEMO_MODE = import.meta.env.VITE_IS_DEMO === 'true';

export function POSSidebar({ navLinks = [] }) {
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
            {/* Mobile top bar */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0d0d0d]/95 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-4 h-14">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-500/20">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                        </svg>
                    </div>
                    <span className="text-sm font-bold text-white">POS System</span>
                </div>
                <div className="flex items-center gap-2">
                    {DEMO_MODE && (
                        <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                            Demo
                        </span>
                    )}
                    <button
                        onClick={() => setOpen((v) => !v)}
                        className="p-2 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            {open ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile overlay */}
            {open && (
                <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={closeSidebar} />
            )}

            {/* Sidebar panel */}
            <aside className={`
                fixed top-0 left-0 h-full w-[260px] bg-[#0d0d0d] border-r border-white/[0.06] text-white flex flex-col
                transition-transform duration-300 ease-out z-50
                md:translate-x-0
                ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                {/* Brand */}
                <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white leading-none">POS System</h2>
                            <p className="text-[10px] text-white/30 mt-0.5 uppercase tracking-wider">Point of Sale</p>
                        </div>
                    </div>
                    <button
                        onClick={closeSidebar}
                        className="md:hidden p-1.5 text-white/30 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    <p className="px-3 pt-2 pb-2 text-[10px] font-semibold text-white/20 uppercase tracking-[0.15em]">Menu</p>
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            onClick={closeSidebar}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                    ? 'bg-blue-500/15 text-blue-400 shadow-sm'
                                    : 'text-white/50 hover:bg-white/[0.04] hover:text-white/80'
                                }`
                            }
                        >
                            {link.icon && <span className="text-base w-5 text-center">{link.icon}</span>}
                            <span>{link.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-3 space-y-1.5 border-t border-white/[0.06]">
                    {DEMO_MODE && (
                        <div className="mb-2">
                            <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/15 rounded-xl">
                                <span className="text-blue-400 text-xs">🎯</span>
                                <span className="text-blue-300/80 text-[11px] font-semibold">Demo Mode</span>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
