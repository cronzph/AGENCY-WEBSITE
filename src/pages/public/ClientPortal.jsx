import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const ClientPortal = () => {
    const navigate = useNavigate();
    const [clientData, setClientData] = useState(null);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [projectDetails, setProjectDetails] = useState(null);
    const [bugReports, setBugReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if client is logged in
        const stored = localStorage.getItem('clientPortal');
        if (!stored) {
            navigate('/portal/login');
            return;
        }

        const data = JSON.parse(stored);
        setClientData(data);
        setProjects(data.projects);

        if (data.projects.length > 0) {
            setSelectedProject(data.projects[0]);
        }
    }, [navigate]);

    useEffect(() => {
        if (!selectedProject) return;

        const fetchProjectDetails = async () => {
            setIsLoading(true);
            try {
                // Get project details
                const projectDoc = await getDoc(doc(db, 'projects', selectedProject.id));
                if (projectDoc.exists()) {
                    setProjectDetails(projectDoc.data());

                    // Get bug reports for this project
                    const bugsQuery = query(
                        collection(db, 'projects', selectedProject.id, 'bugReports'),
                        where('createdAt', '!=', null)
                    );
                    const bugsSnapshot = await getDocs(bugsQuery);
                    setBugReports(bugsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
                }
            } catch (err) {
                console.error('Error fetching project:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjectDetails();
    }, [selectedProject]);

    const handleLogout = () => {
        localStorage.removeItem('clientPortal');
        navigate('/portal/login');
    };

    const getStatusStep = (status) => {
        const steps = {
            inquiry: 0,
            assessed: 1,
            proposal_sent: 2,
            proposal_accepted: 3,
            awaiting_payment: 4,
            payment_submitted: 4,
            payment_confirmed: 4,
            in_progress: 5,
            discovery_completed: 6,
            planning: 6,
            building: 7,
            for_review: 8,
            delivered: 9,
            completed: 10,
        };
        return steps[status] ?? 0;
    };

    const statusPhases = [
        'Inquiry',
        'Proposal',
        'Contract',
        'Payment',
        'Discovery',
        'Planning',
        'Building',
        'Review',
        'Delivered'
    ];

    const getCurrentPhase = (status) => {
        const step = getStatusStep(status);
        return statusPhases[Math.min(step, statusPhases.length - 1)];
    };

    const getActionsForStatus = (status) => {
        const actions = {
            proposal_sent: [{ label: 'View Proposal', link: `/proposal/${selectedProject?.id}`, icon: '📄' }],
            proposal_accepted: [{ label: 'View Contract', link: `/contract/${selectedProject?.id}`, icon: '📝' }],
            awaiting_payment: [{ label: 'Make Payment', link: `/payment/${selectedProject?.id}`, icon: '💳' }],
            payment_submitted: [{ label: 'View Payment', link: `/payment/${selectedProject?.id}`, icon: '💳' }],
            in_progress: [{ label: 'Fill Discovery', link: `/discovery/${selectedProject?.id}`, icon: '📋' }],
            discovery_completed: [{ label: 'View Discovery', link: `/discovery/${selectedProject?.id}`, icon: '📋' }],
            planning: [{ label: 'View Progress', link: '/portal', icon: '📊' }],
            building: [{ label: 'View Progress', link: '/portal', icon: '📊' }],
            for_review: [{ label: 'View Progress', link: '/portal', icon: '📊' }],
            delivered: [
                { label: 'View Delivery', link: `/delivery/${selectedProject?.id}`, icon: '🚀' },
                { label: 'Report Bug', link: `/bug-report/${selectedProject?.id}`, icon: '🐛' }
            ],
        };
        return actions[status] || [];
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const formatCurrency = (amount) => {
        if (!amount) return 'N/A';
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    const currentPhase = projectDetails ? getCurrentPhase(projectDetails.status) : 'Inquiry';
    const progress = projectDetails ? (getStatusStep(projectDetails.status) / (statusPhases.length - 1)) * 100 : 0;
    const actions = projectDetails ? getActionsForStatus(projectDetails.status) : [];

    return (
        <div className="min-h-screen bg-gray-900">
            {/* Header */}
            <header className="bg-gray-800 border-b border-gray-700">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-white">
                            Cronz<span className="text-blue-400">PH</span>
                        </h1>
                        {clientData && (
                            <span className="text-gray-400">| {clientData.email}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            to="/inquiry"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                        >
                            + New Project
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Project Selector */}
                {projects.length > 1 && (
                    <div className="mb-6">
                        <label className="block text-sm text-gray-400 mb-2">Select Project</label>
                        <select
                            value={selectedProject?.id}
                            onChange={(e) => setSelectedProject(projects.find(p => p.id === e.target.value))}
                            className="w-full md:w-auto px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        >
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {projectDetails ? (
                    <div className="space-y-6">
                        {/* Project Name */}
                        <div className="bg-gray-800 rounded-lg p-6">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                {projectDetails.businessName}
                            </h2>
                            <p className="text-gray-400">{projectDetails.clientName}</p>
                            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm ${projectDetails.status === 'delivered' || projectDetails.status === 'completed'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                {currentPhase}
                            </span>
                        </div>

                        {/* Status Tracker */}
                        <div className="bg-gray-800 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Project Progress</h3>
                            <div className="relative">
                                <div className="h-2 bg-gray-700 rounded-full">
                                    <div
                                        className="h-2 bg-blue-500 rounded-full transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between mt-2">
                                    {statusPhases.map((phase, idx) => (
                                        <div
                                            key={phase}
                                            className={`text-xs ${idx <= getStatusStep(projectDetails.status)
                                                ? 'text-blue-400'
                                                : 'text-gray-500'
                                                }`}
                                        >
                                            {phase}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        {actions.length > 0 && (
                            <div className="bg-gray-800 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {actions.map((action, idx) => (
                                        <Link
                                            key={idx}
                                            to={action.link}
                                            className="flex items-center gap-3 p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                                        >
                                            <span className="text-2xl">{action.icon}</span>
                                            <span className="text-white font-medium">{action.label}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Documents Hub */}
                        <div className="bg-gray-800 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Documents</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                                <Link
                                    to={`/proposal/${selectedProject?.id}`}
                                    className="flex flex-col items-center p-4 bg-gray-700 hover:bg-gray-600 rounded-lg"
                                >
                                    <span className="text-2xl mb-2">📄</span>
                                    <span className="text-white text-sm">Proposal</span>
                                </Link>
                                <Link
                                    to={`/contract/${selectedProject?.id}`}
                                    className="flex flex-col items-center p-4 bg-gray-700 hover:bg-gray-600 rounded-lg"
                                >
                                    <span className="text-2xl mb-2">📝</span>
                                    <span className="text-white text-sm">Contract</span>
                                </Link>
                                <Link
                                    to={`/payment/${selectedProject?.id}`}
                                    className="flex flex-col items-center p-4 bg-gray-700 hover:bg-gray-600 rounded-lg"
                                >
                                    <span className="text-2xl mb-2">💳</span>
                                    <span className="text-white text-sm">Payment</span>
                                </Link>
                                <Link
                                    to={`/discovery/${selectedProject?.id}`}
                                    className="flex flex-col items-center p-4 bg-gray-700 hover:bg-gray-600 rounded-lg"
                                >
                                    <span className="text-2xl mb-2">📋</span>
                                    <span className="text-white text-sm">Discovery</span>
                                </Link>
                                <Link
                                    to={`/bug-report/${selectedProject?.id}`}
                                    className="flex flex-col items-center p-4 bg-gray-700 hover:bg-gray-600 rounded-lg"
                                >
                                    <span className="text-2xl mb-2">🐛</span>
                                    <span className="text-white text-sm">Report Bug</span>
                                </Link>
                                <Link
                                    to={`/delivery/${selectedProject?.id}`}
                                    className="flex flex-col items-center p-4 bg-gray-700 hover:bg-gray-600 rounded-lg"
                                >
                                    <span className="text-2xl mb-2">🚀</span>
                                    <span className="text-white text-sm">Delivery</span>
                                </Link>
                            </div>
                        </div>

                        {/* Project Details */}
                        <div className="bg-gray-800 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Project Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-gray-400 text-sm">Services</p>
                                    <p className="text-white">
                                        {projectDetails.servicesNeeded?.join(', ') || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">Project Type</p>
                                    <p className="text-white">
                                        {projectDetails.aiAssessment?.projectType || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">Complexity</p>
                                    <p className="text-white capitalize">
                                        {projectDetails.aiAssessment?.complexity || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">Estimated Timeline</p>
                                    <p className="text-white">
                                        {projectDetails.aiAssessment?.estimatedDays || 'N/A'} days
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">Total Price</p>
                                    <p className="text-green-400 font-semibold">
                                        {formatCurrency(projectDetails.aiAssessment?.suggestedPrice)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">SaaS Tier</p>
                                    <p className="text-white capitalize">
                                        {projectDetails.saasTier || 'None'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="bg-gray-800 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Timeline</h3>
                            <div className="space-y-3">
                                {projectDetails.proposalSentAt && (
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-400 w-32">Proposal:</span>
                                        <span className="text-white">{formatDate(projectDetails.proposalSentAt)}</span>
                                    </div>
                                )}
                                {projectDetails.proposalAcceptedAt && (
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-400 w-32">Contract:</span>
                                        <span className="text-white">{formatDate(projectDetails.proposalAcceptedAt)}</span>
                                    </div>
                                )}
                                {projectDetails.paymentConfirmedAt && (
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-400 w-32">Payment:</span>
                                        <span className="text-white">{formatDate(projectDetails.paymentConfirmedAt)}</span>
                                    </div>
                                )}
                                {projectDetails.discoveryCompletedAt && (
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-400 w-32">Discovery:</span>
                                        <span className="text-white">{formatDate(projectDetails.discoveryCompletedAt)}</span>
                                    </div>
                                )}
                                {projectDetails.deliveredAt && (
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-400 w-32">Delivered:</span>
                                        <span className="text-white">{formatDate(projectDetails.deliveredAt)}</span>
                                    </div>
                                )}
                                {!projectDetails.proposalSentAt && !projectDetails.deliveredAt && (
                                    <p className="text-gray-400">No activity recorded yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Bug Reports */}
                        {bugReports.length > 0 && (
                            <div className="bg-gray-800 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Your Bug Reports</h3>
                                <div className="space-y-3">
                                    {bugReports.map(bug => (
                                        <div key={bug.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                                            <div>
                                                <p className="text-white">{bug.title}</p>
                                                <p className="text-gray-400 text-sm">{formatDate(bug.createdAt)}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs ${bug.status === 'fixed' ? 'bg-green-500/20 text-green-400' :
                                                bug.status === 'analyzed' ? 'bg-blue-500/20 text-blue-400' :
                                                    'bg-yellow-500/20 text-yellow-400'
                                                }`}>
                                                {bug.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-gray-800 rounded-lg p-8 text-center">
                        <p className="text-gray-400">No project selected</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientPortal;