import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'

// Public Pages
import Landing from './pages/public/Landing'
import Inquiry from './pages/public/Inquiry'
import Proposal from './pages/public/Proposal'
import Payment from './pages/public/Payment'
import Delivery from './pages/public/Delivery'

// Admin Pages
import Dashboard from './pages/admin/Dashboard'
import Login from './pages/admin/Login'
import Clients from './pages/admin/Clients'
import Projects from './pages/admin/Projects'
import Payments from './pages/admin/Payments'
import Settings from './pages/admin/Settings'
import ProjectPlan from './pages/admin/ProjectPlan'

// Components
import ProtectedRoute from './components/shared/ProtectedRoute'
import AdminLayout from './components/admin/AdminLayout'
import { ToastProvider } from './components/shared/Toast'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/inquiry" element={<Inquiry />} />
          <Route path="/proposal/:id" element={<Proposal />} />
          <Route path="/payment/:id" element={<Payment />} />
          <Route path="/delivery/:id" element={<Delivery />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<Login />} />
          <Route element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/clients" element={<Clients />} />
            <Route path="/admin/projects" element={<Projects />} />
            <Route path="/admin/projects/:id/plan" element={<ProjectPlan />} />
            <Route path="/admin/payments" element={<Payments />} />
            <Route path="/admin/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  </StrictMode>,
)
