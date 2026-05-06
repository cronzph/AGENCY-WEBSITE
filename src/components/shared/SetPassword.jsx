import { useState } from 'react';
import { db } from '../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';

/**
 * SetPassword - Modal/page component for client to set their portal password
 * Shows after proposal is accepted to secure their documents
 */
const SetPassword = ({ projectId, clientName, onComplete }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsSubmitting(true);

        try {
            // Hash password (simple hash for client-side — not cryptographically secure but sufficient for portal access)
            const hashedPassword = await hashPassword(password);

            // Save to project document
            await updateDoc(doc(db, 'projects', projectId), {
                clientPassword: hashedPassword,
                passwordSetAt: new Date().toISOString(),
            });

            // Store in localStorage so client stays logged in
            const stored = localStorage.getItem('clientPortal');
            if (stored) {
                const data = JSON.parse(stored);
                data.authenticated = true;
                data.passwordSet = true;
                localStorage.setItem('clientPortal', JSON.stringify(data));
            }

            if (onComplete) onComplete();
        } catch (err) {
            console.error('Error setting password:', err);
            setError('Failed to set password. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-md w-full p-8">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🔒</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white">Secure Your Portal</h2>
                    <p className="text-gray-400 text-sm mt-2">
                        Set a password to protect your documents (proposal, contract, payments).
                    </p>
                </div>

                {/* Info Banner */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-6">
                    <p className="text-blue-300 text-xs">
                        🔐 This password will be required to access your project documents.
                        Only you will be able to view your proposal, contract, and payment details.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Create Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Minimum 6 characters"
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter your password"
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !password || !confirmPassword}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Setting up...' : '🔒 Set Password & Continue'}
                    </button>
                </form>

                <p className="text-gray-600 text-xs text-center mt-4">
                    You'll use this password along with your email to access the Client Portal.
                </p>
            </div>
        </div>
    );
};

/**
 * Simple password hashing using SubtleCrypto (SHA-256)
 * Note: For production, use bcrypt on a server. This is client-side only.
 */
export const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + '_cronzph_salt_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Verify password against stored hash
 */
export const verifyPassword = async (password, storedHash) => {
    const hash = await hashPassword(password);
    return hash === storedHash;
};

export default SetPassword;
