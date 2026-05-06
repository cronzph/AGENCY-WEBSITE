import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase/config';

/**
 * Redirects logged-in clients away from public pages (like Landing)
 * back to the client portal. If not logged in, renders children normally.
 * Does NOT redirect if the user is an admin (Firebase authenticated).
 */
const ClientRedirect = ({ children }) => {
    const [isAdmin, setIsAdmin] = useState(null); // null = loading

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setIsAdmin(!!user);
        });
        return () => unsubscribe();
    }, []);

    // Still checking auth state
    if (isAdmin === null) return null;

    // If admin is logged in, never redirect to client portal
    if (isAdmin) return children;

    const stored = localStorage.getItem('clientPortal');
    if (stored) {
        return <Navigate to="/portal" replace />;
    }

    return children;
};

export default ClientRedirect;
