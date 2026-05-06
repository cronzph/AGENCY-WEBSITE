import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

const ClientLogin = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // If client is already logged in, redirect to portal
    useEffect(() => {
        const stored = localStorage.getItem('clientPortal');
        if (stored) {
            navigate('/portal', { replace: true });
        }
    }, [navigate]);

    const handleSubmit = async (e) => {
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

            const snapshot = await getDocs(projectsQuery);

            if (snapshot.empty) {
                // Try alternative field names
                const altQuery = query(
                    collection(db, 'projects'),
                    where('email', '==', email.trim())
                );
                const altSnapshot = await getDocs(altQuery);

                if (altSnapshot.empty) {
                    setError('No projects found for this email address.');
                    setIsLoading(false);
                    return;
                }

                // Store client info and redirect
                const projects = altSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                localStorage.setItem('clientPortal', JSON.stringify({
                    email: email.trim(),
                    projects: projects.map(p => ({ id: p.id, name: p.businessName }))
                }));

                navigate('/portal');
                return;
            }

            // Store client info and redirect
            const projects = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            localStorage.setItem('clientPortal', JSON.stringify({
                email: email.trim().toLowerCase(),
                projects: projects.map(p => ({ id: p.id, name: p.businessName }))
            }));

            navigate('/portal');
        } catch (err) {
            console.error('Login error:', err);
            setError('Failed to verify email. Please try again.');
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

                    <form onSubmit={handleSubmit}>
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