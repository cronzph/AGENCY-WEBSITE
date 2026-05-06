import { Navigate } from 'react-router-dom';

/**
 * Redirects logged-in clients away from public pages (like Landing)
 * back to the client portal. If not logged in, renders children normally.
 */
const ClientRedirect = ({ children }) => {
    const stored = localStorage.getItem('clientPortal');

    if (stored) {
        // Client is logged in, redirect to portal
        return <Navigate to="/portal" replace />;
    }

    return children;
};

export default ClientRedirect;
