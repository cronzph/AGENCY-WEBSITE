import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    collection,
    query,
    getDocs,
    updateDoc,
    doc,
    serverTimestamp,
    orderBy
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { analyzeBug } from '../../ai/bugRouter';
import { useToast } from '../../components/shared/Toast';

const ProjectBugs = () => {
    const { id: projectId } = useParams();
    const { showToast } = useToast();

    const [project, setProject] = useState(null);
    const [bugs, setBugs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBug, setSelectedBug] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterSeverity, setFilterSeverity] = useState('all');
    const [reanalyzing, setReanalyzing] = useState(null);

    // Fetch project and bugs
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch project
                const projectDoc = await getDocs(query(collection(db, 'projects')));
                const projectData = projectDoc.docs.find(d => d.id === projectId);

                if (!projectData) {
                    showToast('Project not found', 'error');
                    setLoading(false);
                    return;
                }

                setProject({ id: projectData.id, ...projectData.data() });

                // Fetch bugs from subcollection
                const bugsQuery = query(
                    collection(db, 'projects', projectId, 'bugReports'),
                    orderBy('createdAt', 'desc')
                );
                const bugsSnapshot = await getDocs(bugsQuery);

                const bugsData = bugsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setBugs(bugsData);
            } catch (error) {
                console.error('Error fetching bugs:', error);
                showToast('Failed to load bugs', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [projectId]);

    // Filter bugs
    const filteredBugs = bugs.filter(bug => {
        if (filterStatus !== 'all' && bug.status !== filterStatus) return false;
        if (filterSeverity !== 'all' && bug.aiAnalysis?.severity !== filterSeverity) return false;
        return true;
    });

    // Get stats
    const getStats = () => {
        return {
            total: bugs.length,
            open: bugs.filter(b => b.status === 'open').length,
            critical: bugs.filter(b => b.aiAnalysis?.severity === 'Critical').length,
            fixed: bugs.filter(b => b.status === 'fixed' || b.status === 'closed').length,
        };
    };

    const stats = getStats();

    // Handle status change
    const handleStatusChange = async (bug, newStatus) => {
        try {
            await updateDoc(doc(db, 'projects', projectId, 'bugReports', bug.id), {
                status: newStatus
            });

            setBugs(prev => prev.map(b =>
                b.id === bug.id ? { ...b, status: newStatus } : b
            ));

            if (selectedBug?.id === bug.id) {
                setSelectedBug(prev => ({ ...prev, status: newStatus }));
            }

            showToast(`Bug status updated to ${newStatus}`, 'success');
        } catch (error) {
            console.error('Error updating status:', error);
            showToast('Failed to update status', 'error');
        }
    };

    // Handle re-analyze
    const handleReanalyze = async (bug) => {
        setReanalyzing(bug.id);
        try {
            const analysis = await analyzeBug({
                title: bug.title,
                description: bug.description,
                expectedBehavior: bug.expectedBehavior,
                stepsToReproduce: bug.stepsToReproduce,
                bugTypeHint: bug.bugTypeHint,
                pageUrl: bug.pageUrl,
                device: bug.device,
                browser: bug.browser,
            });

            await updateDoc(doc(db, 'projects', projectId, 'bugReports', bug.id), {
                aiAnalysis: analysis,
                status: 'analyzed'
            });

            setBugs(prev => prev.map(b =>
                b.id === bug.id ? { ...b, aiAnalysis: analysis, status: 'analyzed' } : b
            ));

            if (selectedBug?.id === bug.id) {
                setSelectedBug(prev => ({ ...prev, aiAnalysis: analysis, status: 'analyzed' }));
            }

            showToast('Bug re-analyzed successfully', 'success');
        } catch (error) {
            console.error('Error analyzing bug:', error);
            showToast('Failed to analyze bug', 'error');
        } finally {
            setReanalyzing(null);
        }
    };

    // Copy bug report link
    const copyBugLink = () => {
        const link = `${window.location.origin}/bug-report/${projectId}`;
        navigator.clipboard.writeText(link);
        showToast('Bug report link copied!', 'success');
    };

    // Get status badge color
    const getStatusBadge = (status) => {
        const colors = {
            submitted: 'bg-gray-500',
            open: 'bg-red-500',
            analyzing: 'bg-yellow-500',
            analyzed: 'bg-blue-500',
            fixed: 'bg-green-500',
            closed: 'bg-green-700',
        };
        return colors[status] || 'bg-gray-500';
    };

    // Get severity badge color
    const getSeverityBadge = (severity) => {
        const colors = {
            Critical: 'bg-red-600',
            Major: 'bg-orange-500',
            Medium: 'bg-yellow-500',
            Minor: 'bg-gray-500',
        };
        return colors[severity] || 'bg-gray-500';
    };

    // Get bug type badge color
    const getBugTypeBadge = (bugType) => {
        const colors = {
            code: 'bg-purple-500',
            ui: 'bg-pink-500',
            unclear: 'bg-gray-500',
        };
        return colors[bugType] || 'bg-gray-500';
    };

    // Format date
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="p-6">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
                    <p className="text-white text-xl">Project not found</p>
                    <Link to="/admin/projects" className="text-blue-400 hover:underline mt-2 inline-block">
                        Back to Projects
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                    <Link to="/admin/projects" className="hover:text-white">Projects</Link>
                    <span>/</span>
                    <span className="text-white">{project.businessName || 'Project'}</span>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">{project.businessName || 'Project'} Bugs</h1>
                        <p className="text-gray-400 mt-1">
                            {project.clientName || project.name || 'Client'} •
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${project.status === 'delivered' ? 'bg-green-600/20 text-green-400' :
                                    project.status === 'in_progress' ? 'bg-blue-600/20 text-blue-400' :
                                        'bg-gray-600/20 text-gray-400'
                                }`}>
                                {project.status}
                            </span>
                        </p>
                    </div>

                    <button
                        onClick={copyBugLink}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Bug Report Link
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Total Bugs</p>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Open</p>
                    <p className="text-2xl font-bold text-red-400">{stats.open}</p>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Critical</p>
                    <p className="text-2xl font-bold text-orange-400">{stats.critical}</p>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Fixed/Closed</p>
                    <p className="text-2xl font-bold text-green-400">{stats.fixed}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">All Status</option>
                    <option value="submitted">Submitted</option>
                    <option value="open">Open</option>
                    <option value="analyzing">Analyzing</option>
                    <option value="analyzed">Analyzed</option>
                    <option value="fixed">Fixed</option>
                    <option value="closed">Closed</option>
                </select>

                <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">All Severity</option>
                    <option value="Critical">Critical</option>
                    <option value="Major">Major</option>
                    <option value="Medium">Medium</option>
                    <option value="Minor">Minor</option>
                </select>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bug List */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-gray-700">
                            <h2 className="text-lg font-semibold text-white">Bug Reports ({filteredBugs.length})</h2>
                        </div>

                        <div className="divide-y divide-gray-700 max-h-[600px] overflow-y-auto">
                            {filteredBugs.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    No bugs found
                                </div>
                            ) : (
                                filteredBugs.map(bug => (
                                    <div
                                        key={bug.id}
                                        onClick={() => setSelectedBug(bug)}
                                        className={`p-4 cursor-pointer hover:bg-gray-700/30 transition-colors ${selectedBug?.id === bug.id ? 'bg-gray-700/50 border-l-2 border-blue-500' : ''
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="text-white font-medium truncate flex-1">{bug.title}</h3>
                                            <span className={`ml-2 px-2 py-0.5 rounded text-xs text-white ${getStatusBadge(bug.status)}`}>
                                                {bug.status}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm">
                                            {bug.aiAnalysis?.severity && (
                                                <span className={`px-2 py-0.5 rounded text-xs text-white ${getSeverityBadge(bug.aiAnalysis.severity)}`}>
                                                    {bug.aiAnalysis.severity}
                                                </span>
                                            )}
                                            {bug.aiAnalysis?.bugType && (
                                                <span className={`px-2 py-0.5 rounded text-xs text-white ${getBugTypeBadge(bug.aiAnalysis.bugType)}`}>
                                                    {bug.aiAnalysis.bugType}
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-gray-500 text-xs mt-2">{formatDate(bug.createdAt)}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Bug Detail Panel */}
                <div className="lg:col-span-2">
                    {selectedBug ? (
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-2">{selectedBug.title}</h2>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded text-xs text-white ${getStatusBadge(selectedBug.status)}`}>
                                            {selectedBug.status}
                                        </span>
                                        {selectedBug.aiAnalysis?.severity && (
                                            <span className={`px-2 py-1 rounded text-xs text-white ${getSeverityBadge(selectedBug.aiAnalysis.severity)}`}>
                                                {selectedBug.aiAnalysis.severity}
                                            </span>
                                        )}
                                        {selectedBug.aiAnalysis?.bugType && (
                                            <span className={`px-2 py-1 rounded text-xs text-white ${getBugTypeBadge(selectedBug.aiAnalysis.bugType)}`}>
                                                {selectedBug.aiAnalysis.bugType}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleReanalyze(selectedBug)}
                                        disabled={reanalyzing === selectedBug.id}
                                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2"
                                    >
                                        {reanalyzing === selectedBug.id ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Analyzing...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Re-analyze
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Status Controls */}
                            <div className="mb-6">
                                <label className="block text-gray-400 text-sm mb-2">Change Status</label>
                                <div className="flex flex-wrap gap-2">
                                    {['submitted', 'open', 'analyzing', 'analyzed', 'fixed', 'closed'].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => handleStatusChange(selectedBug, status)}
                                            className={`px-3 py-1 rounded text-sm transition-colors ${selectedBug.status === status
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                }`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Bug Details */}
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-gray-400 text-sm mb-1">Description</h3>
                                    <p className="text-white">{selectedBug.description || 'No description provided'}</p>
                                </div>

                                {selectedBug.expectedBehavior && (
                                    <div>
                                        <h3 className="text-gray-400 text-sm mb-1">Expected Behavior</h3>
                                        <p className="text-white">{selectedBug.expectedBehavior}</p>
                                    </div>
                                )}

                                {selectedBug.stepsToReproduce && (
                                    <div>
                                        <h3 className="text-gray-400 text-sm mb-1">Steps to Reproduce</h3>
                                        <p className="text-white whitespace-pre-wrap">{selectedBug.stepsToReproduce}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    {selectedBug.device && (
                                        <div>
                                            <h3 className="text-gray-400 text-sm mb-1">Device</h3>
                                            <p className="text-white">{selectedBug.device}</p>
                                        </div>
                                    )}
                                    {selectedBug.browser && (
                                        <div>
                                            <h3 className="text-gray-400 text-sm mb-1">Browser</h3>
                                            <p className="text-white">{selectedBug.browser}</p>
                                        </div>
                                    )}
                                    {selectedBug.pageUrl && (
                                        <div className="col-span-2">
                                            <h3 className="text-gray-400 text-sm mb-1">Page URL</h3>
                                            <a
                                                href={selectedBug.pageUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-400 hover:underline"
                                            >
                                                {selectedBug.pageUrl}
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {/* AI Analysis */}
                                {selectedBug.aiAnalysis && (
                                    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                                        <h3 className="text-lg font-semibold text-white mb-3">AI Analysis</h3>
                                        <div className="space-y-3">
                                            {selectedBug.aiAnalysis.summary && (
                                                <div>
                                                    <h4 className="text-gray-400 text-sm">Summary</h4>
                                                    <p className="text-white">{selectedBug.aiAnalysis.summary}</p>
                                                </div>
                                            )}
                                            {selectedBug.aiAnalysis.rootCause && (
                                                <div>
                                                    <h4 className="text-gray-400 text-sm">Root Cause</h4>
                                                    <p className="text-white">{selectedBug.aiAnalysis.rootCause}</p>
                                                </div>
                                            )}
                                            {selectedBug.aiAnalysis.suggestedFix && (
                                                <div>
                                                    <h4 className="text-gray-400 text-sm">Suggested Fix</h4>
                                                    <p className="text-white">{selectedBug.aiAnalysis.suggestedFix}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="text-gray-500 text-sm">
                                    Submitted: {formatDate(selectedBug.createdAt)}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
                            <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <p className="text-gray-400">Select a bug to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectBugs;
