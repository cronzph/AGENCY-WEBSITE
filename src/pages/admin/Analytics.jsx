import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, getDocs } from 'firebase/firestore';
import {
    LineChart, Line, BarChart, Bar, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const Analytics = () => {
    const [dateRange, setDateRange] = useState('12months');
    const [isLoading, setIsLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [payments, setPayments] = useState([]);
    const [bugReports, setBugReports] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch all projects
                const projectsQuery = query(collection(db, 'projects'));
                const projectsSnapshot = await getDocs(projectsQuery);
                setProjects(projectsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));

                // Fetch all payments
                const paymentsQuery = query(collection(db, 'payments'));
                const paymentsSnapshot = await getDocs(paymentsQuery);
                setPayments(paymentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));

                // Fetch all bug reports
                const allBugs = [];
                for (const projectDoc of projectsSnapshot.docs) {
                    const bugsQuery = query(collection(db, 'projects', projectDoc.id, 'bugReports'));
                    const bugsSnapshot = await getDocs(bugsQuery);
                    bugsSnapshot.docs.forEach(bugDoc => {
                        allBugs.push({ id: bugDoc.id, projectId: projectDoc.id, ...bugDoc.data() });
                    });
                }
                setBugReports(allBugs);
            } catch (err) {
                console.error('Error fetching analytics data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const getDateFilter = () => {
        const now = new Date();
        const ranges = {
            '30days': new Date(now.setDate(now.getDate() - 30)),
            '90days': new Date(now.setDate(now.getDate() - 90)),
            '6months': new Date(now.setMonth(now.getMonth() - 6)),
            '12months': new Date(now.setMonth(now.getMonth() - 12)),
            'alltime': new Date(0),
        };
        return ranges[dateRange] || new Date(0);
    };

    const filterByDate = (item) => {
        const date = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
        return date >= getDateFilter();
    };

    // Revenue by month (last 12 months)
    const getRevenueByMonth = () => {
        const confirmedPayments = payments.filter(p => p.status === 'confirmed' && filterByDate(p));
        const monthlyRevenue = {};

        confirmedPayments.forEach(payment => {
            const date = payment.confirmedAt?.toDate ? payment.confirmedAt.toDate() : new Date();
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyRevenue[key] = (monthlyRevenue[key] || 0) + (payment.amount || 0);
        });

        return Object.entries(monthlyRevenue)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, revenue]) => ({
                month,
                revenue,
                monthLabel: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
            }));
    };

    // Conversion Pipeline
    const getConversionPipeline = () => {
        const filteredProjects = projects.filter(filterByDate);
        return [
            { stage: 'Inquiry', count: filteredProjects.length },
            { stage: 'Assessed', count: filteredProjects.filter(p => p.status !== 'inquiry').length },
            { stage: 'Proposal', count: filteredProjects.filter(p => ['proposal_sent', 'assessed'].includes(p.status)).length },
            { stage: 'Accepted', count: filteredProjects.filter(p => ['proposal_accepted', 'awaiting_payment', 'payment_submitted', 'in_progress', 'delivered', 'completed'].includes(p.status)).length },
            { stage: 'Paid', count: filteredProjects.filter(p => ['payment_submitted', 'payment_confirmed', 'in_progress', 'delivered', 'completed'].includes(p.status)).length },
            { stage: 'Delivered', count: filteredProjects.filter(p => ['delivered', 'completed'].includes(p.status)).length },
        ];
    };

    // Client Acquisition by month
    const getClientAcquisition = () => {
        const filteredProjects = projects.filter(filterByDate);
        const monthlyClients = {};

        filteredProjects.forEach(project => {
            const date = project.createdAt?.toDate ? project.createdAt.toDate() : new Date();
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyClients[key] = (monthlyClients[key] || 0) + 1;
        });

        return Object.entries(monthlyClients)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, clients]) => ({
                month,
                clients,
                monthLabel: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
            }));
    };

    // Average Project Value by Type
    const getAvgProjectValue = () => {
        const filteredProjects = projects.filter(p => p.aiAssessment?.suggestedPrice && filterByDate(p));
        const typeValues = {};

        filteredProjects.forEach(project => {
            const type = project.aiAssessment.projectType || 'Other';
            if (!typeValues[type]) {
                typeValues[type] = { total: 0, count: 0 };
            }
            typeValues[type].total += project.aiAssessment.suggestedPrice;
            typeValues[type].count += 1;
        });

        return Object.entries(typeValues).map(([type, data]) => ({
            type,
            avgValue: Math.round(data.total / data.count)
        }));
    };

    // SaaS MRR Growth
    const getSaaSMRRGrowth = () => {
        const tierPrices = {
            starter: 2750,
            growth: 6500,
            business: 20000,
            enterprise: 40000,
        };

        const monthlyMRR = {};
        const confirmedProjects = projects.filter(p =>
            p.paymentPreference === 'saas' &&
            p.saasTier &&
            ['in_progress', 'planning', 'building', 'for_review', 'delivered', 'completed'].includes(p.status)
        );

        confirmedProjects.forEach(project => {
            const date = project.paymentConfirmedAt?.toDate ? project.paymentConfirmedAt.toDate() : new Date();
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const price = tierPrices[project.saasTier] || 0;
            monthlyMRR[key] = (monthlyMRR[key] || 0) + price;
        });

        return Object.entries(monthlyMRR)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, mrr]) => ({
                month,
                mrr,
                monthLabel: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
            }));
    };

    // Bug Stats
    const getBugStats = () => {
        const filteredBugs = bugReports.filter(filterByDate);
        return [
            { severity: 'Minor', count: filteredBugs.filter(b => b.aiAnalysis?.severity === 'minor').length },
            { severity: 'Medium', count: filteredBugs.filter(b => b.aiAnalysis?.severity === 'medium').length },
            { severity: 'Major', count: filteredBugs.filter(b => b.aiAnalysis?.severity === 'major').length },
            { severity: 'Critical', count: filteredBugs.filter(b => b.aiAnalysis?.severity === 'critical').length },
        ];
    };

    const getBugStatusBreakdown = () => {
        const filteredBugs = bugReports.filter(filterByDate);
        return [
            { status: 'Submitted', count: filteredBugs.filter(b => b.status === 'submitted').length },
            { status: 'Analyzing', count: filteredBugs.filter(b => b.status === 'analyzing').length },
            { status: 'Analyzed', count: filteredBugs.filter(b => b.status === 'analyzed').length },
            { status: 'Fixed', count: filteredBugs.filter(b => b.status === 'fixed').length },
            { status: 'Closed', count: filteredBugs.filter(b => b.status === 'closed').length },
        ];
    };

    // Summary Cards
    const getSummaryCards = () => {
        const confirmedPayments = payments.filter(p => p.status === 'confirmed');
        const totalRevenue = confirmedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const avgRevenue = projects.length > 0 ? Math.round(totalRevenue / projects.filter(p => p.aiAssessment?.suggestedPrice).length) : 0;
        const openBugs = bugReports.filter(b => !['fixed', 'closed'].includes(b.status)).length;
        const delivered = projects.filter(p => ['delivered', 'completed'].includes(p.status)).length;
        const conversionRate = projects.length > 0 ? Math.round((delivered / projects.length) * 100) : 0;

        const tierPrices = { starter: 2750, growth: 6500, business: 20000, enterprise: 40000 };
        const activeSaaS = projects.filter(p =>
            p.paymentPreference === 'saas' &&
            ['delivered', 'completed'].includes(p.status)
        ).reduce((sum, p) => sum + (tierPrices[p.saasTier] || 0), 0);

        return [
            { label: 'Total Revenue', value: `₱${totalRevenue.toLocaleString()}`, color: 'text-green-400' },
            { label: 'Avg Project Value', value: `₱${avgRevenue.toLocaleString()}`, color: 'text-blue-400' },
            { label: 'Bug Reports', value: bugReports.length, subValue: `${openBugs} open`, color: 'text-yellow-400' },
            { label: 'Conversion Rate', value: `${conversionRate}%`, subValue: `${delivered}/${projects.length} delivered`, color: 'text-purple-400' },
            { label: 'SaaS MRR', value: `₱${activeSaaS.toLocaleString()}`, color: 'text-cyan-400' },
        ];
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading analytics...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
                        <p className="text-gray-400">Comprehensive insights into your business</p>
                    </div>
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                        <option value="30days">Last 30 days</option>
                        <option value="90days">Last 90 days</option>
                        <option value="6months">Last 6 months</option>
                        <option value="12months">Last 12 months</option>
                        <option value="alltime">All time</option>
                    </select>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                    {getSummaryCards().map((card, idx) => (
                        <div key={idx} className="bg-gray-800 rounded-lg p-4">
                            <p className="text-gray-400 text-sm">{card.label}</p>
                            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                            {card.subValue && <p className="text-gray-500 text-xs">{card.subValue}</p>}
                        </div>
                    ))}
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Revenue Trend */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Revenue Trend (12 months)</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={getRevenueByMonth()}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="monthLabel" stroke="#9CA3AF" fontSize={12} />
                                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(v) => `₱${(v / 1000)}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                                    formatter={(value) => [`₱${value.toLocaleString()}`, 'Revenue']}
                                />
                                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Conversion Pipeline */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Conversion Pipeline</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={getConversionPipeline()} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                                <YAxis type="category" dataKey="stage" stroke="#9CA3AF" fontSize={12} width={80} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                                />
                                <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Client Acquisition */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Client Acquisition</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={getClientAcquisition()}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="monthLabel" stroke="#9CA3AF" fontSize={12} />
                                <YAxis stroke="#9CA3AF" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                                />
                                <Area type="monotone" dataKey="clients" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Average Project Value */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Avg Project Value by Type</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={getAvgProjectValue()}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="type" stroke="#9CA3AF" fontSize={10} angle={-45} textAnchor="end" height={80} />
                                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(v) => `₱${(v / 1000)}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                                    formatter={(value) => [`₱${value.toLocaleString()}`, 'Avg Value']}
                                />
                                <Bar dataKey="avgValue" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* SaaS MRR Growth */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">SaaS MRR Growth</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={getSaaSMRRGrowth()}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="monthLabel" stroke="#9CA3AF" fontSize={12} />
                                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(v) => `₱${(v / 1000)}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                                    formatter={(value) => [`₱${value.toLocaleString()}`, 'MRR']}
                                />
                                <Line type="monotone" dataKey="mrr" stroke="#06B6D4" strokeWidth={2} dot={{ fill: '#06B6D4' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Bug Report Stats */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Bug Reports by Severity</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={getBugStats()}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="severity" stroke="#9CA3AF" fontSize={12} />
                                <YAxis stroke="#9CA3AF" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                                />
                                <Bar dataKey="count" fill="#EF4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Bug Status Breakdown */}
                <div className="mt-6 bg-gray-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Bug Report Status Breakdown</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={getBugStatusBreakdown()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="status" stroke="#9CA3AF" fontSize={12} />
                            <YAxis stroke="#9CA3AF" fontSize={12} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                            />
                            <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Analytics;