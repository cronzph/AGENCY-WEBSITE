import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { verifyPassword } from '../../components/shared/SetPassword';

const ClientLogin = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [needsPassword, setNeedsPassword] = useState(false);
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // If client is already logged in, redirect to portal
    useEffect(() => {
        const stored = localStorage.getItem('clientPortal');
        if (stored) {
            const data = JSON.parse(stored);
            if (data.authenticated) {
                navigate('/portal', { replace: true });
            }
        }
    }, [navigate]);

    const handleEmailSubmit = async (e) => {
        e.preventDefault();

        if (!email.trim()) {
            setError('Please enter your email address.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Query Firestore for projects with this email
            const projectsQuery = query(
                collection(db, 'projects'),
                where('email', '==', email.trim().toLowerCase())
            );

            let snapshot = await getDocs(projectsQuery);

            // Try without lowercase if empty
            if (snapshot.empty) {
                const altQuery = query(
                    collection(db, 'projects'),
                    where('email', '==', email.trim())
                );
                snapshot = await getDocs(altQuery);
            }

            if (snapshot.empty) {
                setError('No projects found for this email address.');
                setIsLoading(false);
                return;
            }

            const foundProjects = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Check if any project has a password set
            const hasPassword = foundProjects.some(p => p.clientPassword);

            if (hasPassword) {
                // Require password
                setProjects(foundProjects);
                setNeedsPassword(true);
            } else {
                // No password set — allow direct access (pre-proposal stage)
                localStorage.setItem('clientPortal', JSON.stringify({
                    email: email.trim().toLowerCase(),
                    authenticated: true,
                    passwordSet: false,
                    projects: foundProjects.map(p => ({ id: p.id, name: p.businessName }))
                }));
                navigate('/portal');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Failed to verify email. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (!password.trim()) {
            setError('Please enter your password.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // Verify password against any project that has one
            const projectWithPassword = projects.find(p => p.clientPassword);

            if (projectWithPassword) {
                const isValid = await verifyPassword(password, projectWithPassword.clientPassword);

                if (!isValid) {
                    setError('Incorrect password. Please try again.');
                    setIsLoading(false);
                    return;
                }
            }

            // Password verified — grant access
            localStorage.setItem('clientPortal', JSON.stringify({
                email: email.trim().toLowerCase(),
                authenticated: true,
                passwordSet: true,
                projects: projects.map(p => ({ id: p.id, name: p.businessName }))
            }));

            navigate('/portal');
        } catch (err) {
            console.error('Password verification error:', err);
            setError('Failed to verify password. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white">
                        Cronz<span className="text-blue-400">PH</span>
                    </h1>
                    <p className="text-gray-400 mt-2">Client Portal</p>
                </div>

                {/* Login Form */}
                <div className="bg-gray-800 rounded-lg p-8">
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">
                        Access Your Project
                    </h2>

                    {error && (
                        <div className="bg-red-500/20 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
                            {error}
                        </div>
                    )}

                    {!needsPassword ? (
                        /* Step 1: Email */
                        <form onSubmit={handleEmailSubmit}>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-gray-500 text-sm mt-2">
                                    Use the same email you provided when submitting your inquiry.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold disabled:opacity-50"
                            >
                                {isLoading ? 'Verifying...' : 'Continue'}
                            </button>
                        </form>
                    ) : (
                        /* Step 2: Password */
                        <form onSubmit={handlePasswordSubmit}>
                            <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                                <p className="text-gray-400 text-sm">
                                    Logging in as: <span className="text-white font-medium">{email}</span>
                                </p>
                                <button
                                    type="button"
                                    onClick={() => { setNeedsPassword(false); setPassword(''); setError(''); }}
                                    className="text-blue-400 text-xs hover:text-blue-300 mt-1"
                                >
                                    Use different email
                                </button>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-gray-500 text-sm mt-2">
                                    Enter the password you set after accepting your proposal.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold disabled:opacity-50"
                            >
                                {isLoading ? 'Verifying...' : '🔒 Login'}
                            </button>
                        </form>
                    )}
                </div>

                {/* Back Link */}
                <div className="text-center mt-6">
                    <Link to="/" className="text-gray-400 hover:text-white">
                        ← Back to Homepage
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ClientLogin;
