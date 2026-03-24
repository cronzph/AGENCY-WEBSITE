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
import Discovery from './pages/public/Discovery'
import Contract from './pages/public/Contract'
import BugReport from './pages/public/BugReport'
import FeatureRequest from './pages/public/FeatureRequest'
import ClientLogin from './pages/public/ClientLogin'
import ClientPortal from './pages/public/ClientPortal'

// Admin Pages
import Dashboard from './pages/admin/Dashboard'
import Login from './pages/admin/Login'
import SeedAdmin from './pages/admin/SeedAdmin'
import ChangePassword from './pages/admin/ChangePassword'
import Clients from './pages/admin/Clients'
import Projects from './pages/admin/Projects'
import Payments from './pages/admin/Payments'
import Settings from './pages/admin/Settings'
import ProjectPlan from './pages/admin/ProjectPlan'
import DiscoveryView from './pages/admin/DiscoveryView'
import ContractView from './pages/admin/ContractView'
import BugReports from './pages/admin/BugReports'
import Analytics from './pages/admin/Analytics'
import Portfolio from './pages/admin/Portfolio'
import Billing from './pages/admin/Billing'
import DevDashboard from './pages/admin/DevDashboard'
import ProjectBugs from './pages/admin/ProjectBugs'
import FeatureRequests from './pages/admin/FeatureRequests'

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
          <Route path="/discovery/:id" element={<Discovery />} />
          <Route path="/contract/:id" element={<Contract />} />
          <Route path="/bug-report/:id" element={<BugReport />} />
          <Route path="/feature-request/:id" element={<FeatureRequest />} />
          <Route path="/portal/login" element={<ClientLogin />} />
          <Route path="/portal" element={<ClientPortal />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin/seed" element={<SeedAdmin />} />
          <Route element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/clients" element={<Clients />} />
            <Route path="/admin/projects" element={<Projects />} />
            <Route path="/admin/projects/:id/plan" element={<ProjectPlan />} />
            <Route path="/admin/projects/:id/discovery" element={<DiscoveryView />} />
            <Route path="/admin/projects/:id/contract" element={<ContractView />} />
            <Route path="/admin/projects/:id/bugs" element={<ProjectBugs />} />
            <Route path="/admin/bugs" element={<BugReports />} />
            <Route path="/admin/analytics" element={<Analytics />} />
            <Route path="/admin/portfolio" element={<Portfolio />} />
            <Route path="/admin/billing" element={<Billing />} />
            <Route path="/admin/dev-dashboard" element={<DevDashboard />} />
            <Route path="/admin/feature-requests" element={<FeatureRequests />} />
            <Route path="/admin/payments" element={<Payments />} />
            <Route path="/admin/settings" element={<Settings />} />
            <Route path="/admin/change-password" element={<ChangePassword />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  </StrictMode>,
)
