import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';

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

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('clientPortal');
        navigate('/portal/login');
    };

    // Statuses where delete/edit is blocked (once proposal is sent, no more edits)
    const LOCKED_STATUSES = ['proposal_sent', 'proposal_accepted', 'awaiting_payment', 'payment_submitted', 'payment_confirmed', 'in_progress', 'discovery_completed', 'planning', 'building', 'for_review', 'delivered', 'completed'];
    const canDeleteOrEdit = projectDetails && !LOCKED_STATUSES.includes(projectDetails.status);

    const handleDeleteInquiry = async () => {
        if (!selectedProject?.id || !canDeleteOrEdit) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, 'projects', selectedProject.id));
            // Refresh portal data
            const stored = localStorage.getItem('clientPortal');
            if (stored) {
                const data = JSON.parse(stored);
                const remaining = data.projects.filter(p => p.id !== selectedProject.id);
                data.projects = remaining;
                localStorage.setItem('clientPortal', JSON.stringify(data));
                if (remaining.length > 0) {
                    setProjects(remaining);
                    setSelectedProject(remaining[0]);
                    setProjectDetails(null);
                } else {
                    localStorage.removeItem('clientPortal');
                    navigate('/portal/login');
                }
            }
        } catch (err) {
            console.error('Delete error:', err);
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const isStudentClient = projectDetails?.clientType === 'student';

    // Status step mapping — Discovery BEFORE Interview for business clients
    // Each status maps to the step it has REACHED (completed or currently at)
    const getStatusStep = (status) => {
        if (isStudentClient) {
            const steps = {
                inquiry: 0, assessed: 0,
                interview_scheduled: 1, interview_done: 2,
                proposal_sent: 3, proposal_accepted: 4,
                awaiting_payment: 5, payment_submitted: 5, payment_confirmed: 5,
                in_progress: 6, planning: 6, building: 6,
                for_review: 7, delivered: 8, completed: 8,
            };
            return steps[status] ?? 0;
        } else {
            const steps = {
                inquiry: 0, assessed: 1,
                discovery_completed: 2,
                interview_scheduled: 2, interview_done: 3,
                proposal_sent: 4, proposal_accepted: 5,
                awaiting_payment: 6, payment_submitted: 6, payment_confirmed: 6,
                in_progress: 7, planning: 7, building: 7,
                for_review: 8, delivered: 9, completed: 9,
            };
            return steps[status] ?? 0;
        }
    };

    // Phase labels — Discovery before Interview for business clients
    const statusPhases = isStudentClient
        ? ['Inquiry', 'Waiting for Interview', 'Interview Done', 'Proposal', 'Contract', 'Payment', 'In Progress', 'Review', 'Delivered']
        : ['Inquiry', 'Discovery', 'Waiting for Interview', 'Interview Done', 'Proposal', 'Contract', 'Payment', 'In Progress', 'Review', 'Delivered'];

    const getCurrentPhase = (status) => {
        const step = getStatusStep(status);
        return statusPhases[Math.min(step, statusPhases.length - 1)];
    };

    // Descriptive status label for the badge
    const getStatusLabel = (status) => {
        const labels = {
            inquiry: 'Inquiry Submitted',
            assessed: isStudentClient ? 'Waiting for Interview' : 'Waiting for Discovery',
            discovery_completed: 'Waiting for Interview',
            interview_scheduled: 'Interview Scheduled',
            interview_done: 'Waiting for Proposal',
            proposal_sent: 'Proposal Ready',
            proposal_accepted: 'Contract Signed',
            awaiting_payment: 'Awaiting Payment',
            payment_submitted: 'Payment Under Review',
            payment_confirmed: 'Payment Confirmed',
            in_progress: 'In Progress',
            planning: 'In Progress — Planning',
            building: 'In Progress — Building',
            for_review: 'For Review',
            delivered: 'Delivered',
            completed: 'Completed',
        };
        return labels[status] || 'Processing';
    };

    // Check if proposal is being prepared (assessed/interview done but no proposalData yet)
    const isProposalBeingPrepared = () => {
        const status = projectDetails?.status;
        const hasProposalData = !!projectDetails?.proposalData;
        return (status === 'assessed' || status === 'interview_done') && !hasProposalData;
    };

    const getActionsForStatus = (status) => {
        const actions = {
            // Business clients: Discovery is first action after assessed
            assessed: isStudentClient ? [] : [{ label: 'Fill Discovery Form', link: `/discovery/${selectedProject?.id}`, icon: '📋' }],
            discovery_completed: [{ label: 'View Discovery', link: `/discovery/${selectedProject?.id}`, icon: '✅' }],
            interview_scheduled: [{ label: 'View Interview Details', link: `/interview/${selectedProject?.id}`, icon: '🎤' }],
            interview_done: [{ label: 'Interview Results', link: `/interview/${selectedProject?.id}`, icon: '📋' }],
            proposal_sent: [{ label: 'View Proposal', link: `/proposal/${selectedProject?.id}`, icon: '📄' }],
            proposal_accepted: [{ label: 'View Contract', link: `/contract/${selectedProject?.id}`, icon: '📝' }],
            awaiting_payment: [{ label: 'Make Payment', link: `/payment/${selectedProject?.id}`, icon: '💳' }],
            payment_submitted: [{ label: 'View Payment', link: `/payment/${selectedProject?.id}`, icon: '💳' }],
            in_progress: [],
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
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-gray-400 text-sm">Loading your project...</div>
                </div>
            </div>
        );
    }

    const currentPhase = projectDetails ? getCurrentPhase(projectDetails.status) : 'Inquiry';
    const progress = projectDetails ? (getStatusStep(projectDetails.status) / (statusPhases.length - 1)) * 100 : 0;
    const actions = projectDetails ? getActionsForStatus(projectDetails.status) : [];

    // Build documents list based on client type and status
    const isDelivered = projectDetails && ['delivered', 'completed'].includes(projectDetails.status);

    const getDocuments = () => {
        const docs = [];

        docs.push({ label: 'Proposal', icon: '📄', link: `/proposal/${selectedProject?.id}` });
        docs.push({ label: 'Contract', icon: '📝', link: `/contract/${selectedProject?.id}` });
        docs.push({ label: 'Payment', icon: '💳', link: `/payment/${selectedProject?.id}` });

        // Interview Results for all clients
        docs.push({ label: 'Interview', icon: '🎤', link: `/interview/${selectedProject?.id}` });

        // Discovery only for business clients
        if (!isStudentClient) {
            docs.push({ label: 'Discovery', icon: '📋', link: `/discovery/${selectedProject?.id}` });
        }

        // Only show Report Bug and Delivery when project is delivered/completed
        if (isDelivered) {
            docs.push({ label: 'Report Bug', icon: '🐛', link: `/bug-report/${selectedProject?.id}` });
            docs.push({ label: 'Delivery', icon: '🚀', link: `/delivery/${selectedProject?.id}` });
        }

        return docs;
    };

    return (
        <div className="min-h-screen bg-gray-900">
            {/* Header — responsive */}
            <header className="bg-gray-800 border-b border-gray-700">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                            <h1 className="text-xl sm:text-2xl font-bold text-white shrink-0">
                                Cronz<span className="text-blue-400">PH</span>
                            </h1>
                            {clientData && (
                                <span className="text-gray-400 text-xs sm:text-sm truncate hidden sm:block">| {clientData.email}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                            <Link
                                to="/inquiry"
                                className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors text-xs sm:text-sm"
                            >
                                <span className="hidden sm:inline">+ New Project</span>
                                <span className="sm:hidden">+ New</span>
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-xs sm:text-sm"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                    {/* Mobile email display */}
                    {clientData && (
                        <p className="text-gray-500 text-xs mt-1 truncate sm:hidden">{clientData.email}</p>
                    )}
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                {/* Project Selector */}
                {projects.length > 1 && (
                    <div className="mb-4 sm:mb-6">
                        <label className="block text-sm text-gray-400 mb-2">Select Project</label>
                        <select
                            value={selectedProject?.id}
                            onChange={(e) => setSelectedProject(projects.find(p => p.id === e.target.value))}
                            className="w-full md:w-auto px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        >
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {projectDetails ? (
                    <div className="space-y-4 sm:space-y-6">
                        {/* Project Name */}
                        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700/50">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
                                        {projectDetails.businessName || projectDetails.clientName}
                                    </h2>
                                    <p className="text-gray-400 text-sm">{projectDetails.clientName}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {isStudentClient && (
                                        <span className="inline-block px-2.5 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                            🎓 Student
                                        </span>
                                    )}
                                    <span className={`inline-block px-3 py-1 rounded-full text-sm ${projectDetails.status === 'delivered' || projectDetails.status === 'completed'
                                        ? 'bg-green-500/20 text-green-400'
                                        : ['in_progress', 'planning', 'building'].includes(projectDetails.status)
                                            ? 'bg-yellow-500/20 text-yellow-400'
                                            : 'bg-blue-500/20 text-blue-400'
                                        }`}>
                                        {getStatusLabel(projectDetails.status)}
                                    </span>
                                    {/* Edit button — only allowed before payment */}
                                    {canDeleteOrEdit && (
                                        <Link
                                            to={`/inquiry?edit=${selectedProject?.id}`}
                                            className="px-3 py-1 rounded-lg text-xs bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 hover:bg-yellow-600/30 transition-colors"
                                        >
                                            ✏️ Edit
                                        </Link>
                                    )}
                                    {/* Delete button */}
                                    {canDeleteOrEdit && (
                                        <button
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="px-3 py-1 rounded-lg text-xs bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30 transition-colors"
                                        >
                                            🗑️ Delete
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Delete Confirmation */}
                            {showDeleteConfirm && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
                                    <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full border border-red-500/30">
                                        <h3 className="text-white font-semibold text-lg mb-2">Delete Inquiry?</h3>
                                        <p className="text-gray-400 text-sm mb-6">This will permanently delete your inquiry for <span className="text-white font-medium">{projectDetails.businessName || projectDetails.clientName}</span>. This cannot be undone.</p>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setShowDeleteConfirm(false)}
                                                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleDeleteInquiry}
                                                disabled={isDeleting}
                                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                                            >
                                                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Proposal Being Prepared Notice */}
                        {isProposalBeingPrepared() && (
                            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-4 sm:p-6 border border-blue-500/20">
                                <div className="flex items-start gap-3 sm:gap-4">
                                    <div className="relative shrink-0">
                                        <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
                                        <div className="relative w-10 h-10 sm:w-12 sm:h-12 bg-blue-500/10 rounded-full flex items-center justify-center border-2 border-blue-500/30">
                                            <span className="text-xl sm:text-2xl">📝</span>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-semibold text-sm sm:text-base mb-1">Proposal is Being Prepared</h3>
                                        <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                                            Our team is reviewing your project and preparing a customized proposal. You'll be notified once it's ready for your review.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Status Tracker — horizontal scroll on mobile */}
                        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700/50">
                            <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Project Progress</h3>
                            <div className="relative">
                                <div className="h-2 bg-gray-700 rounded-full">
                                    <div
                                        className="h-2 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                {/* Phase labels — scrollable on mobile */}
                                <div className="overflow-x-auto -mx-1 px-1 pb-1 mt-3 scrollbar-hide">
                                    <div className="flex gap-0" style={{ minWidth: `${statusPhases.length * 60}px` }}>
                                        {statusPhases.map((phase, idx) => {
                                            const isActive = idx <= getStatusStep(projectDetails.status);
                                            const isCurrent = idx === getStatusStep(projectDetails.status);
                                            return (
                                                <div
                                                    key={phase}
                                                    className="flex-1 flex flex-col items-center"
                                                >
                                                    <div className={`w-3 h-3 rounded-full mb-1 transition-colors ${isCurrent ? 'bg-blue-400 ring-2 ring-blue-400/30' :
                                                        isActive ? 'bg-blue-500' : 'bg-gray-600'
                                                        }`}></div>
                                                    <span className={`text-[10px] sm:text-xs text-center leading-tight ${isCurrent ? 'text-blue-400 font-medium' :
                                                        isActive ? 'text-blue-400/70' : 'text-gray-500'
                                                        }`}>
                                                        {phase}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        {actions.length > 0 && (
                            <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700/50">
                                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Quick Actions</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {actions.map((action, idx) => (
                                        <Link
                                            key={idx}
                                            to={action.link}
                                            className="flex items-center gap-3 p-3 sm:p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors border border-gray-600/30 hover:border-gray-500/50"
                                        >
                                            <span className="text-xl sm:text-2xl">{action.icon}</span>
                                            <span className="text-white font-medium text-sm sm:text-base">{action.label}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Documents Hub — responsive grid */}
                        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700/50">
                            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Documents</h3>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2 sm:gap-3">
                                {getDocuments().map((docItem, idx) => (
                                    <Link
                                        key={idx}
                                        to={docItem.link}
                                        className="flex flex-col items-center p-3 sm:p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors border border-gray-600/30 hover:border-gray-500/50"
                                    >
                                        <span className="text-xl sm:text-2xl mb-1 sm:mb-2">{docItem.icon}</span>
                                        <span className="text-white text-[11px] sm:text-sm text-center leading-tight">{docItem.label}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Project Details — responsive grid */}
                        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700/50">
                            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Project Details</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <p className="text-gray-400 text-xs sm:text-sm">Services</p>
                                    <p className="text-white text-sm sm:text-base">
                                        {projectDetails.servicesNeeded?.join(', ') || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs sm:text-sm">Project Type</p>
                                    <p className="text-white text-sm sm:text-base">
                                        {projectDetails.aiAssessment?.projectType || projectDetails.studentProjectType || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs sm:text-sm">Complexity</p>
                                    <p className="text-white capitalize text-sm sm:text-base">
                                        {projectDetails.aiAssessment?.complexity || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs sm:text-sm">Estimated Timeline</p>
                                    <p className="text-white text-sm sm:text-base">
                                        {projectDetails.aiAssessment?.estimatedDays || 'N/A'} days
                                    </p>
                                </div>
                                {/* Only show price after proposal has been sent */}
                                {projectDetails.proposalData && (
                                    <div>
                                        <p className="text-gray-400 text-xs sm:text-sm">Total Price</p>
                                        <p className="text-green-400 font-semibold text-sm sm:text-base">
                                            {formatCurrency(projectDetails.proposalData?.totalPrice || projectDetails.aiAssessment?.suggestedPrice)}
                                        </p>
                                    </div>
                                )}
                                {!isStudentClient && (
                                    <div>
                                        <p className="text-gray-400 text-xs sm:text-sm">SaaS Tier</p>
                                        <p className="text-white capitalize text-sm sm:text-base">
                                            {projectDetails.saasTier || 'None'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700/50">
                            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Timeline</h3>
                            <div className="space-y-2 sm:space-y-3">
                                {projectDetails.interview?.completedAt && (
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <span className="text-gray-400 w-24 sm:w-32 text-xs sm:text-sm shrink-0">Interview:</span>
                                        <span className="text-white text-xs sm:text-sm">{formatDate(projectDetails.interview.completedAt)}</span>
                                    </div>
                                )}
                                {projectDetails.proposalSentAt && (
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <span className="text-gray-400 w-24 sm:w-32 text-xs sm:text-sm shrink-0">Proposal:</span>
                                        <span className="text-white text-xs sm:text-sm">{formatDate(projectDetails.proposalSentAt)}</span>
                                    </div>
                                )}
                                {projectDetails.proposalAcceptedAt && (
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <span className="text-gray-400 w-24 sm:w-32 text-xs sm:text-sm shrink-0">Contract:</span>
                                        <span className="text-white text-xs sm:text-sm">{formatDate(projectDetails.proposalAcceptedAt)}</span>
                                    </div>
                                )}
                                {projectDetails.paymentConfirmedAt && (
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <span className="text-gray-400 w-24 sm:w-32 text-xs sm:text-sm shrink-0">Payment:</span>
                                        <span className="text-white text-xs sm:text-sm">{formatDate(projectDetails.paymentConfirmedAt)}</span>
                                    </div>
                                )}
                                {!isStudentClient && projectDetails.discoveryCompletedAt && (
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <span className="text-gray-400 w-24 sm:w-32 text-xs sm:text-sm shrink-0">Discovery:</span>
                                        <span className="text-white text-xs sm:text-sm">{formatDate(projectDetails.discoveryCompletedAt)}</span>
                                    </div>
                                )}
                                {projectDetails.deliveredAt && (
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <span className="text-gray-400 w-24 sm:w-32 text-xs sm:text-sm shrink-0">Delivered:</span>
                                        <span className="text-white text-xs sm:text-sm">{formatDate(projectDetails.deliveredAt)}</span>
                                    </div>
                                )}
                                {!projectDetails.proposalSentAt && !projectDetails.deliveredAt && !projectDetails.interview?.completedAt && (
                                    <p className="text-gray-400 text-sm">No activity recorded yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Bug Reports */}
                        {bugReports.length > 0 && (
                            <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700/50">
                                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Your Bug Reports</h3>
                                <div className="space-y-2 sm:space-y-3">
                                    {bugReports.map(bug => (
                                        <div key={bug.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg border border-gray-600/30">
                                            <div className="min-w-0">
                                                <p className="text-white text-sm truncate">{bug.title}</p>
                                                <p className="text-gray-400 text-xs">{formatDate(bug.createdAt)}</p>
                                            </div>
                                            <span className={`shrink-0 ml-2 px-2 py-1 rounded text-xs ${bug.status === 'fixed' ? 'bg-green-500/20 text-green-400' :
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
                    <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700/50">
                        <p className="text-gray-400">No project selected</p>
                    </div>
                )}
            </div>

            {/* CSS for hiding scrollbar */}
            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default ClientPortal;