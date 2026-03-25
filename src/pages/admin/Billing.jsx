import { useState, useEffect } from 'react';
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    doc,
    serverTimestamp,
    query,
    where,
    getDoc
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { useToast } from '../../components/shared/Toast';

const Billing = () => {
    const [billingRecords, setBillingRecords] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [statusFilter, setStatusFilter] = useState('all');
    const [generating, setGenerating] = useState(false);
    const [expandedClient, setExpandedClient] = useState(null);
    const [generateModalOpen, setGenerateModalOpen] = useState(false);
    const { showToast } = useToast();

    // Fetch SaaS projects and billing records
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch all projects
                const projectsSnap = await getDocs(collection(db, 'projects'));
                const allProjects = projectsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Filter SaaS clients (where monthlySassPrice > 0)
                const saasProjects = allProjects.filter(p =>
                    p.aiAssessment?.monthlySassPrice > 0
                );

                // Get unique SaaS clients (by email)
                const uniqueClients = [];
                const seenEmails = new Set();
                saasProjects.forEach(p => {
                    if (!seenEmails.has(p.email)) {
                        seenEmails.add(p.email);
                        uniqueClients.push(p);
                    }
                });

                setProjects(uniqueClients);

                // Fetch billing records
                const billingSnap = await getDocs(collection(db, 'billingRecords'));
                const billingData = billingSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setBillingRecords(billingData);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Get filtered records
    const filteredRecords = billingRecords.filter(record => {
        const matchesMonth = record.billingMonth === selectedMonth;
        const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
        return matchesMonth && matchesStatus;
    });

    // Calculate summary stats
    const getSummaryStats = () => {
        // Total MRR - sum of all active SaaS monthly prices
        const totalMRR = projects.reduce((sum, p) =>
            sum + (p.aiAssessment?.monthlySassPrice || 0), 0
        );

        // Current month records
        const currentMonthRecords = billingRecords.filter(r => r.billingMonth === selectedMonth);

        const paidRecords = currentMonthRecords.filter(r => r.status === 'paid');
        const pendingRecords = currentMonthRecords.filter(r => r.status === 'pending');
        const overdueRecords = currentMonthRecords.filter(r => r.status === 'overdue');

        return {
            totalMRR,
            paidCount: paidRecords.length,
            paidAmount: paidRecords.reduce((sum, r) => sum + (r.amount || 0), 0),
            pendingCount: pendingRecords.length,
            pendingAmount: pendingRecords.reduce((sum, r) => sum + (r.amount || 0), 0),
            overdueCount: overdueRecords.length,
            overdueAmount: overdueRecords.reduce((sum, r) => sum + (r.amount || 0), 0),
        };
    };

    const stats = getSummaryStats();

    // Check if record is overdue (pending and month has passed)
    const isOverdue = (record) => {
        if (record.status !== 'pending') return false;
        const [year, month] = record.billingMonth.split('-').map(Number);
        const now = new Date();
        return now.getFullYear() > year ||
            (now.getFullYear() === year && now.getMonth() + 1 > month);
    };

    // Generate monthly bills
    const generateMonthlyBills = async () => {
        if (generating) return;
        setGenerating(true);
        try {
            // Check which clients already have a record for this month
            const existingRecords = billingRecords.filter(r => r.billingMonth === selectedMonth);
            const existingEmails = new Set(existingRecords.map(r => r.email));

            // Create records for clients without one
            const newRecords = [];
            for (const project of projects) {
                if (!existingEmails.has(project.email)) {
                    newRecords.push({
                        projectId: project.id,
                        clientName: project.clientName || project.name || 'Unknown',
                        businessName: project.businessName || 'N/A',
                        email: project.email,
                        sassTier: project.aiAssessment?.sassTier || 'starter',
                        amount: project.aiAssessment?.monthlySassPrice || 0,
                        billingMonth: selectedMonth,
                        status: 'pending',
                        notes: '',
                        createdAt: serverTimestamp(),
                    });
                }
            }

            // Add all new records to Firestore
            for (const record of newRecords) {
                await addDoc(collection(db, 'billingRecords'), record);
            }

            // Refresh data
            const billingSnap = await getDocs(collection(db, 'billingRecords'));
            const billingData = billingSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setBillingRecords(billingData);

            showToast(`Created ${newRecords.length} billing record(s)`, 'success');
        } catch (error) {
            console.error('Error generating bills:', error);
            showToast('Error generating bills. Please try again.', 'error');
        } finally {
            setGenerating(false);
        }
    };

    // Mark as paid
    const markAsPaid = async (recordId) => {
        try {
            const recordDoc = doc(db, 'billingRecords', recordId);
            await updateDoc(recordDoc, {
                status: 'paid',
                paidAt: serverTimestamp(),
            });

            // Update local state
            setBillingRecords(prev => prev.map(r =>
                r.id === recordId ? { ...r, status: 'paid', paidAt: new Date() } : r
            ));
        } catch (error) {
            console.error('Error marking as paid:', error);
        }
    };

    // Mark as overdue
    const markAsOverdue = async (recordId) => {
        try {
            const recordDoc = doc(db, 'billingRecords', recordId);
            await updateDoc(recordDoc, {
                status: 'overdue',
            });

            // Update local state
            setBillingRecords(prev => prev.map(r =>
                r.id === recordId ? { ...r, status: 'overdue' } : r
            ));
        } catch (error) {
            console.error('Error marking as overdue:', error);
        }
    };

    // Update notes
    const updateNotes = async (recordId, notes) => {
        try {
            const recordDoc = doc(db, 'billingRecords', recordId);
            await updateDoc(recordDoc, { notes });

            // Update local state
            setBillingRecords(prev => prev.map(r =>
                r.id === recordId ? { ...r, notes } : r
            ));
        } catch (error) {
            console.error('Error updating notes:', error);
        }
    };

    // Get client billing history
    const getClientHistory = (email) => {
        return billingRecords
            .filter(r => r.email === email)
            .sort((a, b) => b.billingMonth.localeCompare(a.billingMonth));
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
        }).format(amount);
    };

    // Get available months for dropdown
    const getAvailableMonths = () => {
        const months = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months.push(monthStr);
        }
        return months;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <>
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">SaaS Billing</h1>
                <p className="text-gray-400 mt-1">Manage monthly billing for SaaS clients</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                    <p className="text-gray-400 text-sm mb-1">Total MRR</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalMRR)}</p>
                    <p className="text-xs text-gray-500 mt-1">Monthly Recurring Revenue</p>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                    <p className="text-gray-400 text-sm mb-1">Paid This Month</p>
                    <p className="text-2xl font-bold text-green-400">{stats.paidCount}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatCurrency(stats.paidAmount)}</p>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                    <p className="text-gray-400 text-sm mb-1">Pending This Month</p>
                    <p className="text-2xl font-bold text-yellow-400">{stats.pendingCount}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatCurrency(stats.pendingAmount)}</p>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 border-l-4 border-l-red-500">
                    <p className="text-gray-400 text-sm mb-1">Overdue</p>
                    <p className="text-2xl font-bold text-red-400">{stats.overdueCount}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatCurrency(stats.overdueAmount)}</p>
                </div>
            </div>

            {/* Generate Bills Button and Filters */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setGenerateModalOpen(true)}
                        disabled={generating}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        {generating ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Generating...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Generate Monthly Bills
                            </>
                        )}
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    {/* Month Filter */}
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    >
                        {getAvailableMonths().map(month => (
                            <option key={month} value={month}>{month}</option>
                        ))}
                    </select>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                    </select>
                </div>
            </div>

            {/* Billing Table */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Client</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Business</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tier</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Month</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Notes</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-4 py-8 text-center text-gray-400">
                                        No billing records for {selectedMonth}
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map(record => {
                                    const overdue = isOverdue(record);
                                    return (
                                        <>
                                            <tr
                                                key={record.id}
                                                className={`hover:bg-gray-700/30 transition-colors ${overdue ? 'bg-red-900/10' : ''}`}
                                            >
                                                <td className="px-4 py-3">
                                                    <button
                                                        onClick={() => setExpandedClient(expandedClient === record.email ? null : record.email)}
                                                        className="text-white hover:text-blue-400 font-medium text-left"
                                                    >
                                                        {record.clientName}
                                                    </button>
                                                    <p className="text-xs text-gray-500">{record.email}</p>
                                                </td>
                                                <td className="px-4 py-3 text-gray-300">{record.businessName}</td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-1 text-xs font-medium rounded bg-blue-600/20 text-blue-400 capitalize">
                                                        {record.sassTier}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-white font-medium">{formatCurrency(record.amount)}</td>
                                                <td className="px-4 py-3 text-gray-300">{record.billingMonth}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 text-xs font-medium rounded ${record.status === 'paid' ? 'bg-green-600/20 text-green-400' :
                                                            record.status === 'overdue' ? 'bg-red-600/20 text-red-400' :
                                                                'bg-yellow-600/20 text-yellow-400'
                                                        }`}>
                                                        {overdue && record.status === 'pending' ? 'Overdue' : record.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="text"
                                                        value={record.notes || ''}
                                                        onChange={(e) => updateNotes(record.id, e.target.value)}
                                                        placeholder="Add note..."
                                                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {record.status !== 'paid' && (
                                                            <button
                                                                onClick={() => markAsPaid(record.id)}
                                                                className="px-2 py-1 text-xs bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
                                                            >
                                                                Mark Paid
                                                            </button>
                                                        )}
                                                        {record.status !== 'overdue' && record.status !== 'paid' && (
                                                            <button
                                                                onClick={() => markAsOverdue(record.id)}
                                                                className="px-2 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
                                                            >
                                                                Overdue
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Expanded Client History */}
                                            {expandedClient === record.email && (
                                                <tr className="bg-gray-900/50">
                                                    <td colSpan="8" className="px-4 py-4">
                                                        <div className="bg-gray-800 rounded-lg p-4">
                                                            <h4 className="text-white font-medium mb-3">Billing History for {record.clientName}</h4>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                {getClientHistory(record.email).map(history => (
                                                                    <div
                                                                        key={history.id}
                                                                        className={`p-3 rounded-lg border ${history.status === 'paid' ? 'border-green-700 bg-green-900/10' :
                                                                                history.status === 'overdue' ? 'border-red-700 bg-red-900/10' :
                                                                                    'border-yellow-700 bg-yellow-900/10'
                                                                            }`}
                                                                    >
                                                                        <div className="flex justify-between items-start mb-1">
                                                                            <span className="text-white font-medium">{history.billingMonth}</span>
                                                                            <span className={`text-xs px-2 py-0.5 rounded ${history.status === 'paid' ? 'bg-green-600/20 text-green-400' :
                                                                                    history.status === 'overdue' ? 'bg-red-600/20 text-red-400' :
                                                                                        'bg-yellow-600/20 text-yellow-400'
                                                                                }`}>
                                                                                {history.status}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-gray-300 text-sm">{formatCurrency(history.amount)}</p>
                                                                        {history.paidAt && (
                                                                            <p className="text-gray-500 text-xs mt-1">
                                                                                Paid: {history.paidAt.toDate ? new Date(history.paidAt.toDate()).toLocaleDateString() : 'N/A'}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SaaS Clients Reference */}
            <div className="mt-8 bg-gray-800 border border-gray-700 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-white mb-4">Active SaaS Clients ({projects.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map(project => (
                        <div key={project.id} className="bg-gray-700/30 rounded-lg p-4">
                            <p className="text-white font-medium">{project.clientName || project.name}</p>
                            <p className="text-gray-400 text-sm">{project.businessName || 'N/A'}</p>
                            <p className="text-blue-400 text-sm mt-1">{formatCurrency(project.aiAssessment?.monthlySassPrice || 0)}/mo</p>
                            <p className="text-gray-500 text-xs capitalize">{project.aiAssessment?.sassTier || 'starter'} tier</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        <ConfirmModal
            isOpen={generateModalOpen}
            title={`Generate bills for ${selectedMonth}?`}
            message="This will create billing records for all SaaS clients who don't already have one for this month."
            confirmText="Generate"
            variant="info"
            onConfirm={() => { setGenerateModalOpen(false); generateMonthlyBills(); }}
            onCancel={() => setGenerateModalOpen(false)}
        />
        </>
    );
};

export default Billing;
