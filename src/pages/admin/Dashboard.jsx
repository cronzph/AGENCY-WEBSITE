import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useToast } from '../../components/shared/Toast';
import StatusBadge from '../../components/shared/StatusBadge';

const Dashboard = () => {
  const toast = useToast();
  const [authReady, setAuthReady] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeProjects: 0,
    totalClients: 0,
    pendingActions: 0,
  });
  const [projects, setProjects] = useState([]);
  const [payments, setPayments] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [saasSubscribers, setSaasSubscribers] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [statusCounts, setStatusCounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const statusColors = {
    inquiry: '#6b7280',
    assessed: '#3b82f6',
    proposal_sent: '#06b6d4',
    proposal_accepted: '#6366f1',
    awaiting_payment: '#f97316',
    payment_submitted: '#eab308',
    in_progress: '#a855f7',
    planning: '#8b5cf6',
    building: '#ec4899',
    for_review: '#f59e0b',
    delivered: '#84cc16',
    completed: '#22c55e',
    cancelled: '#ef4444',
  };

  // 1) Auth watcher — must be first
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // 2) Projects listener — only depends on authReady
  useEffect(() => {
    if (!authReady) return;

    const projectsQuery = query(collection(db, 'projects'));

    const unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      setProjects(projectsData);

      const uniqueEmails = new Set(projectsData.map(p => p.email));
      const activeProjects = projectsData.filter(p =>
        p.status === 'in_progress' || p.status === 'planning' || p.status === 'building' || p.status === 'for_review'
      ).length;
      const pendingProposals = projectsData.filter(p => p.status === 'assessed').length;

      const saas = projectsData.filter(p => p.aiAssessment?.monthlySassPrice > 0);
      const uniqueSaas = [];
      const seenEmails = new Set();
      saas.forEach(p => {
        if (!seenEmails.has(p.email)) {
          seenEmails.add(p.email);
          uniqueSaas.push(p);
        }
      });
      setSaasSubscribers(uniqueSaas);

      const counts = {};
      projectsData.forEach(p => {
        const status = p.status || 'inquiry';
        counts[status] = (counts[status] || 0) + 1;
      });
      setStatusCounts(Object.entries(counts).map(([name, value]) => ({ name, value })));

      setStats(prev => ({
        ...prev,
        totalClients: uniqueEmails.size,
        activeProjects,
        pendingActions: pendingProposals,
      }));
    });

    return () => unsubscribe();
  }, [authReady]);

  // 3) Payments listener — only depends on authReady
  useEffect(() => {
    if (!authReady) return;

    const paymentsQuery = query(collection(db, 'payments'));

    const unsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
      const paymentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      setPayments(paymentsData);

      const confirmed = paymentsData.filter(p => p.status === 'confirmed');
      const totalRevenue = confirmed.reduce((sum, p) => sum + (p.amount || 0), 0);

      const monthlyData = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = month.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' });
        monthlyData[monthKey] = 0;
      }
      confirmed.forEach(p => {
        if (p.createdAt) {
          const date = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
          const monthKey = date.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' });
          if (monthlyData.hasOwnProperty(monthKey)) {
            monthlyData[monthKey] += p.amount || 0;
          }
        }
      });
      setMonthlyRevenue(Object.entries(monthlyData).map(([month, amount]) => ({ month, amount })));

      const pendingPayments = paymentsData.filter(p => p.status === 'pending').length;
      setStats(prev => ({
        ...prev,
        totalRevenue,
        pendingActions: prev.pendingActions + pendingPayments,
      }));

      setLoading(false);
    });

    return () => unsubscribe();
  }, [authReady]);

  // 4) Recent activity — computed from state, no Firestore, runs when either data changes
  useEffect(() => {
    if (projects.length === 0 && payments.length === 0) return;

    const activities = [];

    payments.slice(0, 20).forEach(p => {
      if (p.status === 'confirmed') {
        activities.push({
          type: 'payment',
          icon: '💰',
          description: `${p.clientName} submitted payment for ${p.projectType}`,
          date: p.createdAt,
        });
      } else if (p.status === 'pending') {
        activities.push({
          type: 'payment_pending',
          icon: '⏳',
          description: `${p.clientName} payment pending confirmation`,
          date: p.createdAt,
        });
      }
    });

    projects.slice(0, 20).forEach(p => {
      if (p.status === 'proposal_sent') {
        activities.push({ type: 'proposal', icon: '📄', description: `Proposal sent to ${p.clientName}`, date: p.proposalSentAt });
      } else if (p.status === 'proposal_accepted') {
        activities.push({ type: 'accepted', icon: '✅', description: `${p.clientName} accepted proposal`, date: p.proposalAcceptedAt });
      } else if (p.status === 'building') {
        activities.push({ type: 'building', icon: '🔨', description: `Started building ${p.businessName}`, date: p.buildingStartedAt });
      } else if (p.status === 'delivered') {
        activities.push({ type: 'delivered', icon: '🚀', description: `Delivered ${p.businessName}`, date: p.deliveredAt });
      }
    });

    activities.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
      return dateB - dateA;
    });

    setRecentActivity(activities.slice(0, 10));
  }, [projects, payments]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateAgo = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  };

  const getTotalMRR = () => {
    return saasSubscribers.reduce((sum, p) => sum + (p.aiAssessment?.monthlySassPrice || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* ROW 1 - Key Metrics - Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass-card-hover rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-xl backdrop-blur-sm">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">Total Revenue</p>
          </div>
          <p className="text-3xl font-bold text-green-400">{formatCurrency(stats.totalRevenue)}</p>
        </div>
        <div className="glass-card-hover rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl backdrop-blur-sm">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">Active Projects</p>
          </div>
          <p className="text-3xl font-bold text-blue-400">{stats.activeProjects}</p>
        </div>
        <div className="glass-card-hover rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl backdrop-blur-sm">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">Total Clients</p>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalClients}</p>
        </div>
        <div className="glass-card-hover rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl backdrop-blur-sm">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">Pending Actions</p>
          </div>
          <p className="text-3xl font-bold text-yellow-400">{stats.pendingActions}</p>
        </div>
      </div>

      {/* ROW 2 - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Projects by Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height={256}>
              <PieChart>
                <Pie data={statusCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                  {statusCounts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={statusColors[entry.name] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(12px)' }} labelStyle={{ color: '#f9fafb' }} itemStyle={{ color: '#9ca3af' }} />
                <Legend wrapperStyle={{ color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Monthly Revenue</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={monthlyRevenue}>
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" tickFormatter={(value) => `₱${value / 1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(12px)' }} labelStyle={{ color: '#f9fafb' }} formatter={(value) => [formatCurrency(value), 'Revenue']} />
                <Bar dataKey="amount" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ROW 3 - Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/[0.08]">
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
          </div>
          <div className="p-4 max-h-80 overflow-y-auto">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-500">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl hover:bg-white/[0.06] transition-all">
                    <span className="text-xl">{activity.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-300 text-sm truncate">{activity.description}</p>
                      <p className="text-gray-500 text-xs">{formatDateAgo(activity.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/[0.08]">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">SaaS Subscribers</h3>
              <span className="text-green-400 font-semibold">{formatCurrency(getTotalMRR())}/month</span>
            </div>
          </div>
          <div className="p-4 max-h-80 overflow-y-auto">
            {saasSubscribers.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-gray-500">No SaaS subscribers</p>
              </div>
            ) : (
              <div className="space-y-3">
                {saasSubscribers.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/[0.05] rounded-xl hover:bg-white/[0.06] transition-all">
                    <div>
                      <p className="text-white text-sm font-medium">{sub.clientName}</p>
                      <p className="text-gray-500 text-xs">{sub.businessName}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg text-xs capitalize">
                        {sub.aiAssessment?.sassTier || 'starter'}
                      </span>
                      <p className="text-green-400 text-sm font-medium">{formatCurrency(sub.aiAssessment?.monthlySassPrice || 0)}/mo</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
