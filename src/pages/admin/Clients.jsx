import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, where, getDocs } from 'firebase/firestore';
import StatusBadge from '../../components/shared/StatusBadge';

const Clients = () => {
  const [authReady, setAuthReady] = useState(false);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientProjects, setClientProjects] = useState([]);
  const [clientPayments, setClientPayments] = useState([]);

  // Wait for auth before subscribing to Firestore
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    
    const projectsQuery = query(
      collection(db, 'projects'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(projectsQuery, async (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Group projects by email
      const clientsMap = {};
      projectsData.forEach(project => {
        const email = project.email;
        if (!clientsMap[email]) {
          clientsMap[email] = {
            email,
            clientName: project.clientName,
            businessName: project.businessName,
            businessType: project.businessType,
            phone: project.phone,
            fbLink: project.fbLink,
            firstProjectDate: project.createdAt,
            projects: [],
          };
        }
        clientsMap[email].projects.push(project);
        // Update earliest date
        if (!clientsMap[email].firstProjectDate || 
            (project.createdAt && project.createdAt.toDate && 
             project.createdAt.toDate() < clientsMap[email].firstProjectDate.toDate())) {
          clientsMap[email].firstProjectDate = project.createdAt;
        }
      });

      // Get payments for all clients
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('status', '==', 'confirmed')
      );
      const paymentsSnap = await getDocs(paymentsQuery);
      const paymentsData = paymentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate totals per client
      const clientsList = Object.values(clientsMap).map(client => {
        const clientPayments = paymentsData.filter(p => p.clientId === client.email);
        const totalPaid = clientPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const activeProjects = client.projects.filter(p => 
          !['delivered', 'completed', 'cancelled'].includes(p.status)
        ).length;
        
        // Check SaaS subscription
        const hasSaaS = client.projects.some(p => 
          p.aiAssessment?.monthlySassPrice > 0
        );

        return {
          ...client,
          totalProjects: client.projects.length,
          activeProjects,
          totalPaid,
          hasSaaS,
          payments: clientPayments,
        };
      });

      setClients(clientsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authReady]);

  const openClientProfile = async (client) => {
    setSelectedClient(client);
    // Get payments for this client
    const paymentsQuery = query(
      collection(db, 'payments'),
      where('clientId', '==', client.email)
    );
    const paymentsSnap = await getDocs(paymentsQuery);
    const payments = paymentsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setClientPayments(payments);
    setClientProjects(client.projects);
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPaymentStatusBadge = (status) => {
    const classes = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      pending_request: 'bg-blue-100 text-blue-800',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
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
      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Clients ({clients.length})</h1>
        <p className="text-gray-400 mt-1">Manage your client relationships</p>
      </div>

      {/* Clients Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800 text-left text-sm text-gray-400 font-semibold border-b border-gray-700">
                <th className="px-6 py-4">Client Name</th>
                <th className="px-6 py-4">Business</th>
                <th className="px-6 py-4">Business Type</th>
                <th className="px-6 py-4">Projects</th>
                <th className="px-6 py-4">Active</th>
                <th className="px-6 py-4">Total Paid</th>
                <th className="px-6 py-4">SaaS</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <p className="text-gray-500">No clients found</p>
                  </td>
                </tr>
              ) : (
                clients.map((client, idx) => (
                  <tr key={client.email} className={`hover:bg-gray-800 transition-colors ${idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800/50'}`}>
                    <td className="px-6 py-4 text-white font-medium">{client.clientName || '-'}</td>
                    <td className="px-6 py-4 text-gray-400">{client.businessName || '-'}</td>
                    <td className="px-6 py-4 text-gray-400">{client.businessType || '-'}</td>
                    <td className="px-6 py-4 text-white font-semibold">{client.totalProjects}</td>
                    <td className="px-6 py-4 text-white font-semibold">{client.activeProjects}</td>
                    <td className="px-6 py-4 text-green-400 font-semibold">{formatCurrency(client.totalPaid)}</td>
                    <td className="px-6 py-4">
                      {client.hasSaaS ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-400">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-400">{formatDate(client.firstProjectDate)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Link
                          to={`/admin/projects?email=${encodeURIComponent(client.email)}`}
                          className="px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                        >
                          View Projects
                        </Link>
                        <button
                          onClick={() => openClientProfile(client)}
                          className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          View Profile
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client Profile Modal */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-800">
            {/* Header */}
            <div className="p-6 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-white">{selectedClient.clientName}</h2>
                  <p className="text-gray-400 text-sm mt-1">{selectedClient.businessName}</p>
                </div>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="text-gray-500 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Client Details */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Contact Information</h3>
                <div className="bg-gray-800 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 text-xs">Name</p>
                    <p className="text-white">{selectedClient.clientName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Email</p>
                    <p className="text-white">{selectedClient.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Phone</p>
                    <p className="text-white">{selectedClient.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Facebook Link</p>
                    <a 
                      href={selectedClient.fbLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {selectedClient.fbLink || '-'}
                    </a>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Business Type</p>
                    <p className="text-white">{selectedClient.businessType || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Date Joined</p>
                    <p className="text-white">{formatDate(selectedClient.firstProjectDate)}</p>
                  </div>
                </div>
              </div>

              {/* Revenue Summary */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Revenue Summary</h3>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-gray-500 text-xs">Total Projects</p>
                      <p className="text-2xl font-bold text-white">{selectedClient.totalProjects}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Active Projects</p>
                      <p className="text-2xl font-bold text-blue-400">{selectedClient.activeProjects}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-400">{formatCurrency(selectedClient.totalPaid)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">SaaS Status</p>
                      {selectedClient.hasSaaS ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-500/20 text-purple-400">
                          Subscribed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-700 text-gray-400">
                          Not Subscribed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Projects */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Projects ({clientProjects.length})</h3>
                <div className="space-y-3">
                  {clientProjects.length === 0 ? (
                    <div className="text-center py-8 bg-gray-800 rounded-lg">
                      <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-gray-500">No projects</p>
                    </div>
                  ) : (
                    clientProjects.map((project) => (
                      <div key={project.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-gray-900 font-medium">{project.businessName}</p>
                            <p className="text-gray-500 text-sm">{project.servicesNeeded?.join(', ')}</p>
                          </div>
                          <StatusBadge status={project.status || 'inquiry'} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-gray-500 text-xs">Budget</p>
                            <p className="text-gray-900">{project.aiAssessment?.suggestedPrice ? formatCurrency(project.aiAssessment.suggestedPrice) : project.budgetRange || '-'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Date</p>
                            <p className="text-gray-900">{formatDate(project.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Payment History */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Payment History ({clientPayments.length})</h3>
                {clientPayments.length === 0 ? (
                  <div className="text-center py-8 bg-gray-800 rounded-lg">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-gray-500">No payment history</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-gray-400 font-semibold border-b border-gray-700">
                          <th className="pb-2 pr-4">Date</th>
                          <th className="pb-2 pr-4">Project</th>
                          <th className="pb-2 pr-4">Type</th>
                          <th className="pb-2 pr-4">Amount</th>
                          <th className="pb-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {clientPayments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-gray-800">
                            <td className="py-2 pr-4 text-white">{formatDate(payment.createdAt)}</td>
                            <td className="py-2 pr-4 text-gray-400">{payment.projectType || '-'}</td>
                            <td className="py-2 pr-4 text-gray-400 capitalize">{payment.type || 'downpayment'}</td>
                            <td className="py-2 pr-4 text-green-400 font-semibold">{formatCurrency(payment.amount)}</td>
                            <td className="py-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPaymentStatusBadge(payment.status)}`}>
                                {payment.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
