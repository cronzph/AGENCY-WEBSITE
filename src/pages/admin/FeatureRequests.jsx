import { useState, useEffect } from 'react';
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

const FeatureRequests = () => {
    const [projects, setProjects] = useState({});
    const [allRequests, setAllRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [filterProject, setFilterProject] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');

    // Fetch all data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch all projects for reference
                const projectsSnap = await getDocs(collection(db, 'projects'));
                const projectsData = {};
                projectsSnap.docs.forEach(doc => {
                    projectsData[doc.id] = doc.data();
                });
                setProjects(projectsData);

                // Fetch all feature requests from all projects
                const requests = [];

                for (const projectDoc of projectsSnap.docs) {
                    const projectData = projectsData[projectDoc.id];

                    const requestsQuery = query(
                        collection(db, 'projects', projectDoc.id, 'featureRequests'),
                        orderBy('createdAt', 'desc')
                    );

                    const requestsSnap = await getDocs(requestsQuery);

                    requestsSnap.docs.forEach(reqDoc => {
                        requests.push({
                            id: reqDoc.id,
                            projectId: projectDoc.id,
                            ...reqDoc.data(),
                            projectName: projectData?.businessName || 'Unknown',
                            clientName: projectData?.clientName || projectData?.name || 'Unknown',
                        });
                    });
                }

                setAllRequests(requests);
            } catch (error) {
                console.error('Error fetching feature requests:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Filter requests
    const filteredRequests = allRequests.filter(req => {
        if (filterProject !== 'all' && req.projectId !== filterProject) return false;
        if (filterStatus !== 'all' && req.status !== filterStatus) return false;
        if (filterPriority !== 'all' && req.priority !== filterPriority) return false;
        return true;
    });

    // Get stats
    const getStats = () => {
        return {
            total: allRequests.length,
            submitted: allRequests.filter(r => r.status === 'submitted').length,
            reviewing: allRequests.filter(r => r.status === 'reviewing').length,
            planned: allRequests.filter(r => r.status === 'planned').length,
            inProgress: allRequests.filter(r => r.status === 'in-progress').length,
            completed: allRequests.filter(r => r.status === 'completed').length,
            declined: allRequests.filter(r => r.status === 'declined').length,
        };
    };

    const stats = getStats();

    // Handle status change
    const handleStatusChange = async (request, newStatus) => {
        try {
            await updateDoc(doc(db, 'projects', request.projectId, 'featureRequests', request.id), {
                status: newStatus
            });

            setAllRequests(prev => prev.map(r =>
                r.id === request.id ? { ...r, status: newStatus } : r
            ));

            if (selectedRequest?.id === request.id) {
                setSelectedRequest(prev => ({ ...prev, status: newStatus }));
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    // Handle notes update
    const handleNotesUpdate = async (requestId, notes) => {
        try {
            const request = allRequests.find(r => r.id === requestId);
            if (!request) return;

            await updateDoc(doc(db, 'projects', request.projectId, 'featureRequests', requestId), {
                adminNotes: notes
            });

            setAllRequests(prev => prev.map(r =>
                r.id === requestId ? { ...r, adminNotes: notes } : r
            ));

            if (selectedRequest?.id === requestId) {
                setSelectedRequest(prev => ({ ...prev, adminNotes: notes }));
            }
        } catch (error) {
            console.error('Error updating notes:', error);
        }
    };

    // Copy feature request link
    const copyFeatureLink = (projectId) => {
        const link = `${window.location.origin}/feature-request/${projectId}`;
        navigator.clipboard.writeText(link);
    };

    // Get status badge color
    const getStatusBadge = (status) => {
        const colors = {
            submitted: 'bg-gray-500',
            reviewing: 'bg-yellow-500',
            planned: 'bg-blue-500',
            'in-progress': 'bg-purple-500',
            completed: 'bg-green-500',
            declined: 'bg-red-500',
        };
        return colors[status] || 'bg-gray-500';
    };

    // Get priority badge color
    const getPriorityBadge = (priority) => {
        const colors = {
            'nice-to-have': 'bg-gray-500',
            important: 'bg-yellow-500',
            critical: 'bg-red-500',
        };
        return colors[priority] || 'bg-gray-500';
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

    return (
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Feature Requests</h1>
                <p className="text-gray-400 mt-1">Manage client feature requests across all projects</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-xs">Total</p>
                    <p className="text-xl font-bold text-white">{stats.total}</p>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-xs">Submitted</p>
                    <p className="text-xl font-bold text-gray-300">{stats.submitted}</p>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-xs">Reviewing</p>
                    <p className="text-xl font-bold text-yellow-400">{stats.reviewing}</p>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-xs">Planned</p>
                    <p className="text-xl font-bold text-blue-400">{stats.planned}</p>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-xs">In Progress</p>
                    <p className="text-xl font-bold text-purple-400">{stats.inProgress}</p>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-xs">Completed</p>
                    <p className="text-xl font-bold text-green-400">{stats.completed}</p>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-xs">Declined</p>
                    <p className="text-xl font-bold text-red-400">{stats.declined}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
                <select
                    value={filterProject}
                    onChange={(e) => setFilterProject(e.target.value)}
                    className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">All Projects</option>
                    {Object.entries(projects).map(([id, project]) => (
                        <option key={id} value={id}>{project.businessName || 'Unknown'}</option>
                    ))}
                </select>

                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">All Status</option>
                    <option value="submitted">Submitted</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="planned">Planned</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="declined">Declined</option>
                </select>

                <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">All Priority</option>
                    <option value="nice-to-have">Nice to Have</option>
                    <option value="important">Important</option>
                    <option value="critical">Critical</option>
                </select>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Request List */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-gray-700">
                            <h2 className="text-lg font-semibold text-white">Requests ({filteredRequests.length})</h2>
                        </div>

                        <div className="divide-y divide-gray-700 max-h-[600px] overflow-y-auto">
                            {filteredRequests.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    No feature requests found
                                </div>
                            ) : (
                                filteredRequests.map(request => (
                                    <div
                                        key={request.id}
                                        onClick={() => setSelectedRequest(request)}
                                        className={`p-4 cursor-pointer hover:bg-gray-700/30 transition-colors ${selectedRequest?.id === request.id ? 'bg-gray-700/50 border-l-2 border-blue-500' : ''
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="text-white font-medium truncate flex-1">{request.title}</h3>
                                        </div>

                                        <div className="text-sm text-gray-400 mb-2">
                                            {request.projectName}
                                        </div>

                                        <div className="flex items-center gap-2 text-xs">
                                            <span className={`px-2 py-0.5 rounded text-white ${getPriorityBadge(request.priority)}`}>
                                                {request.priority}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-white ${getStatusBadge(request.status)}`}>
                                                {request.status}
                                            </span>
                                        </div>

                                        <p className="text-gray-500 text-xs mt-2">{formatDate(request.createdAt)}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Request Detail Panel */}
                <div className="lg:col-span-2">
                    {selectedRequest ? (
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-2">{selectedRequest.title}</h2>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded text-xs text-white ${getPriorityBadge(selectedRequest.priority)}`}>
                                            {selectedRequest.priority}
                                        </span>
                                        <span className={`px-2 py-1 rounded text-xs text-white ${getStatusBadge(selectedRequest.status)}`}>
                                            {selectedRequest.status}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => copyFeatureLink(selectedRequest.projectId)}
                                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Copy Link
                                </button>
                            </div>

                            {/* Project Info */}
                            <div className="bg-gray-900/50 rounded-lg p-3 mb-4">
                                <p className="text-gray-400 text-sm">
                                    <span className="text-white font-medium">{selectedRequest.projectName}</span>
                                    {' • '}
                                    <span className="text-gray-500">{selectedRequest.clientName}</span>
                                </p>
                            </div>

                            {/* Description */}
                            <div className="mb-4">
                                <h3 className="text-gray-400 text-sm mb-1">Description</h3>
                                <p className="text-white">{selectedRequest.description}</p>
                            </div>

                            {/* Use Case */}
                            {selectedRequest.useCase && (
                                <div className="mb-4">
                                    <h3 className="text-gray-400 text-sm mb-1">Why is this needed?</h3>
                                    <p className="text-white">{selectedRequest.useCase}</p>
                                </div>
                            )}

                            {/* Screenshot */}
                            {selectedRequest.screenshot && (
                                <div className="mb-4">
                                    <h3 className="text-gray-400 text-sm mb-2">Screenshot / Mockup</h3>
                                    <img
                                        src={selectedRequest.screenshot}
                                        alt="Screenshot"
                                        className="max-w-full h-auto rounded-lg border border-gray-600"
                                    />
                                </div>
                            )}

                            {/* Status Controls */}
                            <div className="mb-4">
                                <label className="block text-gray-400 text-sm mb-2">Change Status</label>
                                <div className="flex flex-wrap gap-2">
                                    {['submitted', 'reviewing', 'planned', 'in-progress', 'completed', 'declined'].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => handleStatusChange(selectedRequest, status)}
                                            className={`px-3 py-1 rounded text-sm transition-colors ${selectedRequest.status === status
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                }`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Admin Notes */}
                            <div className="mb-4">
                                <label className="block text-gray-400 text-sm mb-2">Admin Notes</label>
                                <textarea
                                    value={selectedRequest.adminNotes || ''}
                                    onChange={(e) => handleNotesUpdate(selectedRequest.id, e.target.value)}
                                    placeholder="Add notes about this feature request..."
                                    rows={3}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                            </div>

                            <div className="text-gray-500 text-sm">
                                Submitted: {formatDate(selectedRequest.createdAt)}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
                            <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <p className="text-gray-400">Select a feature request to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FeatureRequests;
