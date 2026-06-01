import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@shared/components/index.js';
import LoginPage from './pages/LoginPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Cashier from './pages/Cashier.jsx';
import Products from './pages/Products.jsx';
import Transactions from './pages/Transactions.jsx';
import Settings from './pages/Settings.jsx';

function App() {
    return (
        <div className="relative">
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/cashier"
                    element={
                        <ProtectedRoute>
                            <Cashier />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/products"
                    element={
                        <ProtectedRoute>
                            <Products />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/transactions"
                    element={
                        <ProtectedRoute>
                            <Transactions />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/settings"
                    element={
                        <ProtectedRoute>
                            <Settings />
                        </ProtectedRoute>
                    }
                />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </div>
    );
}

export default App;
