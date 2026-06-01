import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/hooks/index.js';

const DEMO_MODE = import.meta.env.VITE_IS_DEMO === 'true';

// Default landing URLs per environment
const DEV_LANDING_URL = 'http://localhost:5173';
const PROD_LANDING_URL = 'https://system-templates.vercel.app';

const isLocalUrl = (url) => /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(url);

/**
 * Resolves the landing page URL based on the current environment:
 *  - DEV mode:  use DEV_LANDING_URL (ignores production URLs from .env)
 *  - PROD mode: use VITE_LANDING_URL if it's a valid remote URL,
 *               otherwise fall back to PROD_LANDING_URL
 */
const resolveLandingUrl = () => {
    const envUrl = import.meta.env.VITE_LANDING_URL?.trim();

    if (import.meta.env.DEV) {
        // In dev, use localhost — ignore any production URL left in .env
        return DEV_LANDING_URL;
    }

    // In production, use the env var only if it's a non-empty remote URL;
    // reject localhost values that were accidentally left in the env config.
    if (envUrl && !isLocalUrl(envUrl)) {
        return envUrl;
    }

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
            className="ml-1.5 text-amber-400 hover:text-amber-200 transition-colors"
            title="Copy"
        >
            {copied ? (
                <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-4">
                <a
                    href={LANDING_URL}
                    className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to CronzPH
                </a>

                {DEMO_MODE && (
                    <span className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-full">
                        🎯 Demo Mode
                    </span>
                )}
            </div>

            {/* Main content */}
            <div className="flex-1 flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-sm">
                    {/* Logo / Brand */}
                    <div className="text-center mb-8">
                        <div className="text-5xl mb-4">☕</div>
                        <h1 className="text-2xl font-bold text-white">Coffee Shop</h1>
                        <p className="text-gray-500 text-sm mt-1">Sign in to your dashboard</p>
                    </div>

                    {/* Demo credentials box */}
                    {DEMO_MODE && (
                        <div className="mb-6 bg-white/5 border border-white/10 rounded-xl p-4">
                            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3">
                                🎯 Demo Credentials
                            </p>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400">Email</span>
                                    <div className="flex items-center">
                                        <span className="text-xs font-mono text-gray-200">admin@demo.com</span>
                                        <CopyButton text="admin@demo.com" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400">Password</span>
                                    <div className="flex items-center">
                                        <span className="text-xs font-mono text-gray-200">demo1234</span>
                                        <CopyButton text="demo1234" />
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-3">
                                Credentials are pre-filled. Just click Sign In.
                            </p>
                        </div>
                    )}

                    {/* Login form */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-colors text-sm"
                                    placeholder="admin@example.com"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-colors text-sm"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 text-gray-900 font-semibold rounded-lg transition-colors text-sm mt-2"
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
                    <p className="text-center text-xs text-gray-600 mt-6">
                        Powered by{' '}
                        <a href={LANDING_URL} className="text-gray-400 hover:text-white transition-colors">
                            CronzPH Templates
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
