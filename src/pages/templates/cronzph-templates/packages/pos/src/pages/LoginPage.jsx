import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/hooks/index.js';

const DEMO_MODE = import.meta.env.VITE_IS_DEMO === 'true';

// Default landing URLs per environment
const DEV_LANDING_URL = 'http://localhost:5173';
const PROD_LANDING_URL = 'https://system-templates.vercel.app';

const isLocalUrl = (url) => /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(url);

const resolveLandingUrl = () => {
    const envUrl = import.meta.env.VITE_LANDING_URL?.trim();
    if (import.meta.env.DEV) return DEV_LANDING_URL;
    if (envUrl && !isLocalUrl(envUrl)) return envUrl;
    return PROD_LANDING_URL;
};

const LANDING_URL = resolveLandingUrl();

function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <button
            onClick={handleCopy}
            className="ml-1.5 text-blue-400 hover:text-blue-200 transition-colors"
            title="Copy"
        >
            {copied ? (
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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

function LoginPage() {
    const [email, setEmail] = useState(DEMO_MODE ? 'admin@demo.com' : '');
    const [password, setPassword] = useState(DEMO_MODE ? 'demo1234' : '');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(getErrorMessage(err.code));
        } finally {
            setLoading(false);
        }
    };

    const getErrorMessage = (code) => {
        switch (code) {
            case 'auth/invalid-email': return 'Invalid email address.';
            case 'auth/user-not-found': return 'No account found with this email.';
            case 'auth/wrong-password': return 'Incorrect password.';
            case 'auth/invalid-credential': return 'Invalid email or password.';
            case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
            default: return 'Login failed. Please try again.';
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
            {/* Top bar with back link */}
            <div className="flex items-center justify-between px-6 py-4">
                <a
                    href={LANDING_URL}
                    className="flex items-center gap-2 text-white/40 hover:text-white text-sm font-medium transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to CronzPH
                </a>

                {DEMO_MODE && (
                    <span className="flex items-center gap-1.5 bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full">
                        🎯 Demo Mode
                    </span>
                )}
            </div>

            {/* Main content */}
            <div className="flex-1 flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-sm animate-slide-up">
                    {/* Logo / Brand */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4 shadow-lg shadow-blue-500/25">
                            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white">POS System</h1>
                        <p className="text-white/40 text-sm mt-1">Sign in to your dashboard</p>
                    </div>

                    {/* Demo credentials box */}
                    {DEMO_MODE && (
                        <div className="mb-6 bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
                            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">
                                🎯 Demo Credentials
                            </p>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-white/40">Email</span>
                                    <div className="flex items-center">
                                        <span className="text-xs font-mono text-white/70">admin@demo.com</span>
                                        <CopyButton text="admin@demo.com" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-white/40">Password</span>
                                    <div className="flex items-center">
                                        <span className="text-xs font-mono text-white/70">demo1234</span>
                                        <CopyButton text="demo1234" />
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-white/25 mt-3">
                                Credentials are pre-filled. Just click Sign In.
                            </p>
                        </div>
                    )}

                    {/* Login form */}
                    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
                                <span>⚠️</span>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="input-field"
                                    placeholder="admin@example.com"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-xs font-medium text-white/40 mb-2 uppercase tracking-wider">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="input-field"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full !py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Signing in...
                                    </span>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Footer note */}
                    <p className="text-center text-xs text-white/20 mt-6">
                        Powered by{' '}
                        <a href={LANDING_URL} className="text-white/40 hover:text-white transition-colors">
                            CronzPH Templates
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
