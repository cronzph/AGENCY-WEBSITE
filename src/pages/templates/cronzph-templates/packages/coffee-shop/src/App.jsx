import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@shared/components/index.js';
import LoginPage from './pages/LoginPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import Orders from './pages/Orders.jsx';
import Statistics from './pages/Statistics.jsx';

const DEMO_MODE = import.meta.env.VITE_IS_DEMO === 'true';

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
                    path="/products"
                    element={
                        <ProtectedRoute>
                            <Products />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/orders"
                    element={
                        <ProtectedRoute>
                            <Orders />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/statistics"
                    element={
                        <ProtectedRoute>
                            <Statistics />
                        </ProtectedRoute>
                    }
                />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </div>
    );
}

export default App;
