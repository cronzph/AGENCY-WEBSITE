import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, query, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { analyzeBug } from '../../ai/bugRouter';
import { useToast } from '../../components/shared/Toast';

const BugReports = () => {
    const { showToast } = useToast();
    const [bugReports, setBugReports] = useState([]);
    const [projects, setProjects] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterSeverity, setFilterSeverity] = useState('all');
    const [filterProject, setFilterProject] = useState('all');
    const [selectedBug, setSelectedBug] = useState(null);
    const [isReanalyzing, setIsReanalyzing] = useState(null);

    useEffect(() => {
        const fetchBugReports = async () => {
            try {
                // Fetch all bug reports from all projects
                const projectsQuery = query(collection(db, 'projects'));
                const projectsSnapshot = await getDocs(projectsQuery);

                const projectsData = {};
                const allBugs = [];

                for (const projectDoc of projectsSnapshot.docs) {
                    const projectData = projectDoc.data();
                    projectsData[projectDoc.id] = projectData;

                    // Get bug reports subcollection
                    const bugsQuery = query(
                        collection(db, 'projects', projectDoc.id, 'bugReports')
                    );
                    const bugsSnapshot = await getDocs(bugsQuery);

                    bugsSnapshot.docs.forEach(bugDoc => {
                        allBugs.push({
                            id: bugDoc.id,
                            projectId: projectDoc.id,
                            ...bugDoc.data(),
                            projectName: projectData.businessName,
                            clientName: projectData.clientName,
                        });
                    });
                }

                setProjects(projectsData);
                setBugReports(allBugs);
            } catch (err) {
                console.error('Error fetching bug reports:', err);
                showToast('Failed to load bug reports', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchBugReports();
    }, []);

    const handleStatusChange = async (bug, newStatus) => {
        try {
            await updateDoc(doc(db, 'projects', bug.projectId, 'bugReports', bug.id), {
                status: newStatus,
                statusChangedAt: serverTimestamp(),
            });

            setBugReports(prev => prev.map(b =>
                b.id === bug.id ? { ...b, status: newStatus } : b
            ));

            if (selectedBug?.id === bug.id) {
                setSelectedBug(prev => ({ ...prev, status: newStatus }));
            }

            showToast(`Bug status updated to ${newStatus}`, 'success');
        } catch (err) {
            console.error('Error updating status:', err);
            showToast('Failed to update status', 'error');
        }
    };

    const handleReanalyze = async (bug) => {
        setIsReanalyzing(bug.id);
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

            await updateDoc(doc(db, 'projects', bug.projectId, 'bugReports', bug.id), {
                aiAnalysis: analysis,
                status: 'analyzed',
                analyzedAt: serverTimestamp(),
            });

            setBugReports(prev => prev.map(b =>
                b.id === bug.id ? { ...b, aiAnalysis: analysis, status: 'analyzed' } : b
            ));

            if (selectedBug?.id === bug.id) {
                setSelectedBug(prev => ({ ...prev, aiAnalysis: analysis, status: 'analyzed' }));
            }

            showToast('Bug re-analyzed successfully', 'success');
        } catch (err) {
            console.error('Error re-analyzing:', err);
            showToast(`Re-analysis failed: ${err.message}`, 'error');
        } finally {
            setIsReanalyzing(null);
        }
    };

    const filteredBugs = bugReports.filter(bug => {
        if (filterStatus !== 'all' && bug.status !== filterStatus) return false;
        if (filterSeverity !== 'all' && bug.aiAnalysis?.severity !== filterSeverity) return false;
        if (filterProject !== 'all' && bug.projectId !== filterProject) return false;
        return true;
    });

    const getSeverityBadge = (severity) => {
        const colors = {
            minor: 'bg-gray-500',
            medium: 'bg-yellow-500',
            major: 'bg-orange-500',
            critical: 'bg-red-500',
        };
        return colors[severity] || 'bg-gray-500';
    };

    const getBugTypeBadge = (bugType) => {
        const colors = {
            code: 'bg-blue-500',
            ui: 'bg-purple-500',
            unclear: 'bg-gray-500',
        };
        return colors[bugType] || 'bg-gray-500';
    };

    const getStatusBadge = (status) => {
        const colors = {
            submitted: 'bg-yellow-500',
            analyzing: 'bg-blue-500',
            analyzed: 'bg-green-500',
            fixed: 'bg-purple-500',
            closed: 'bg-gray-500',
        };
        return colors[status] || 'bg-gray-500';
    };

    const getPricingCategory = (category) => {
        const prices = {
            minor: 'FREE',
            medium: '₱1,000 - ₱2,500',
            major: '₱2,500 - ₱5,000',
            critical: '₱5,000+',
        };
        return prices[category] || 'TBD';
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Bug Reports</h1>
                        <p className="text-gray-400">{bugReports.length} total reports</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-gray-800 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Status</label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                            >
                                <option value="all">All Status</option>
                                <option value="submitted">Submitted</option>
                                <option value="analyzing">Analyzing</option>
                                <option value="analyzed">Analyzed</option>
                                <option value="fixed">Fixed</option>
                                <option value="closed">Closed</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Severity</label>
                            <select
                                value={filterSeverity}
                                onChange={(e) => setFilterSeverity(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                            >
                                <option value="all">All Severity</option>
                                <option value="minor">Minor</option>
                                <option value="medium">Medium</option>
                                <option value="major">Major</option>
                                <option value="critical">Critical</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Project</label>
                            <select
                                value={filterProject}
                                onChange={(e) => setFilterProject(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                            >
                                <option value="all">All Projects</option>
                                {Object.entries(projects).map(([id, p]) => (
                                    <option key={id} value={id}>{p.businessName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => { setFilterStatus('all'); setFilterSeverity('all'); setFilterProject('all'); }}
                                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bug List */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bug Cards */}
                    <div className="space-y-4">
                        {filteredBugs.length === 0 ? (
                            <div className="bg-gray-800 rounded-lg p-8 text-center">
                                <p className="text-gray-400">No bug reports found</p>
                            </div>
                        ) : (
                            filteredBugs.map((bug) => (
                                <div
                                    key={bug.id}
                                    onClick={() => setSelectedBug(bug)}
                                    className={`bg-gray-800 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors ${selectedBug?.id === bug.id ? 'border-2 border-blue-500' : 'border border-gray-700'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="text-white font-medium truncate flex-1">{bug.title}</h3>
                                        <span className={`px-2 py-0.5 rounded text-xs text-white ml-2 ${getStatusBadge(bug.status)}`}>
                                            {bug.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                                        <span>{bug.projectName}</span>
                                        <span>•</span>
                                        <span>{bug.clientName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
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
                                </div>
                            ))
                        )}
                    </div>

                    {/* Bug Detail */}
                    <div className="bg-gray-800 rounded-lg p-6 h-fit sticky top-6">
                        {selectedBug ? (
                            <div>
                                <div className="flex items-start justify-between mb-4">
                                    <h2 className="text-xl font-bold text-white">{selectedBug.title}</h2>
                                    <Link
                                        to={`/admin/projects/${selectedBug.projectId}`}
                                        className="text-blue-400 hover:text-blue-300 text-sm"
                                    >
                                        View Project →
                                    </Link>
                                </div>

                                {/* Status Buttons */}
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {['submitted', 'analyzing', 'analyzed', 'fixed', 'closed'].map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => handleStatusChange(selectedBug, status)}
                                            className={`px-3 py-1 rounded text-sm ${selectedBug.status === status
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                }`}
                                        >
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </button>
                                    ))}
                                </div>

                                {/* Bug Details */}
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-gray-400 text-sm mb-1">Description</h3>
                                        <p className="text-white">{selectedBug.description}</p>
                                    </div>

                                    <div>
                                        <h3 className="text-gray-400 text-sm mb-1">Expected Behavior</h3>
                                        <p className="text-white">{selectedBug.expectedBehavior}</p>
                                    </div>

                                    {selectedBug.stepsToReproduce?.length > 0 && (
                                        <div>
                                            <h3 className="text-gray-400 text-sm mb-1">Steps to Reproduce</h3>
                                            <ol className="list-decimal list-inside text-white space-y-1">
                                                {selectedBug.stepsToReproduce.map((step, i) => (
                                                    <li key={i}>{step}</li>
                                                ))}
                                            </ol>
                                        </div>
                                    )}

                                    {selectedBug.pageUrl && (
                                        <div>
                                            <h3 className="text-gray-400 text-sm mb-1">Page/URL</h3>
                                            <p className="text-white">{selectedBug.pageUrl}</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h3 className="text-gray-400 text-sm mb-1">Device</h3>
                                            <p className="text-white">{selectedBug.device || 'Not specified'}</p>
                                        </div>
                                        <div>
                                            <h3 className="text-gray-400 text-sm mb-1">Browser</h3>
                                            <p className="text-white">{selectedBug.browser || 'Not specified'}</p>
                                        </div>
                                    </div>

                                    {/* Screenshot */}
                                    {selectedBug.screenshot && (
                                        <div>
                                            <h3 className="text-gray-400 text-sm mb-1">Screenshot</h3>
                                            <img
                                                src={selectedBug.screenshot}
                                                alt="Bug screenshot"
                                                className="rounded-lg max-h-60"
                                            />
                                        </div>
                                    )}

                                    {/* AI Analysis */}
                                    {selectedBug.aiAnalysis && (
                                        <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-semibold text-white">AI Analysis</h3>
                                                <button
                                                    onClick={() => handleReanalyze(selectedBug)}
                                                    disabled={isReanalyzing === selectedBug.id}
                                                    className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
                                                >
                                                    {isReanalyzing === selectedBug.id ? 'Analyzing...' : 'Re-analyze'}
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <span className="text-gray-400">Severity:</span>
                                                    <span className={`ml-2 px-2 py-0.5 rounded text-white ${getSeverityBadge(selectedBug.aiAnalysis.severity)}`}>
                                                        {selectedBug.aiAnalysis.severity}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400">Type:</span>
                                                    <span className={`ml-2 px-2 py-0.5 rounded text-white ${getBugTypeBadge(selectedBug.aiAnalysis.bugType)}`}>
                                                        {selectedBug.aiAnalysis.bugType}
                                                    </span>
                                                </div>
                                            </div>

                                            {selectedBug.aiAnalysis.rootCause && (
                                                <div>
                                                    <h4 className="text-gray-400 text-sm">Root Cause:</h4>
                                                    <p className="text-white text-sm">{selectedBug.aiAnalysis.rootCause}</p>
                                                </div>
                                            )}

                                            {selectedBug.aiAnalysis.suggestedFix && (
                                                <div>
                                                    <h4 className="text-gray-400 text-sm">Suggested Fix:</h4>
                                                    <pre className="text-white text-sm bg-gray-800 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                                                        {selectedBug.aiAnalysis.suggestedFix}
                                                    </pre>
                                                </div>
                                            )}

                                            {selectedBug.aiAnalysis.affectedFiles?.length > 0 && (
                                                <div>
                                                    <h4 className="text-gray-400 text-sm">Affected Files:</h4>
                                                    <div className="flex flex-wrap gap-1">
                                                        {selectedBug.aiAnalysis.affectedFiles.map((file, i) => (
                                                            <span key={i} className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                                                                {file}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <span className="text-gray-400">Est. Time:</span>
                                                    <span className="ml-2 text-white">{selectedBug.aiAnalysis.estimatedTime || 'TBD'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400">Pricing:</span>
                                                    <span className="ml-2 text-green-400">
                                                        {getPricingCategory(selectedBug.aiAnalysis.pricingCategory)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-400 py-8">
                                Select a bug report to view details
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BugReports;