import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

const InterviewResults = () => {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const docRef = doc(db, 'projects', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setProject({ id: docSnap.id, ...docSnap.data() });
                } else {
                    setError('Project not found');
                }
            } catch (err) {
                console.error('Error fetching project:', err);
                setError('Failed to load interview results');
            } finally {
                setLoading(false);
            }
        };

        fetchProject();
    }, [id]);

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-PH', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-lg p-8 max-w-md text-center">
                    <div className="text-4xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-white mb-4">Error</h2>
                    <p className="text-gray-300 mb-6">{error}</p>
                    <Link to="/portal" className="text-blue-400 hover:text-blue-300">← Back to Portal</Link>
                </div>
            </div>
        );
    }

    const interview = project?.interview || {};
    const isCompleted = interview.status === 'completed';
    const isScheduled = interview.status === 'scheduled' || project?.status === 'interview_scheduled';

    // If no interview data at all
    if (!interview.status && project?.status !== 'interview_scheduled' && project?.status !== 'interview_done') {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-2xl p-10 max-w-lg text-center shadow-2xl border border-gray-700">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
                        <div className="relative w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center border-2 border-purple-500/30">
                            <span className="text-4xl">🎤</span>
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Interview Pending</h2>
                    <p className="text-gray-300 mb-6 leading-relaxed">
                        An interview will be scheduled soon to better understand your project requirements. We'll reach out to you shortly.
                    </p>
                    <div className="bg-gray-700/50 rounded-lg p-4 text-left space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="text-green-400">✓</span>
                            <span className="text-gray-300 text-sm">Inquiry submitted</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-green-400">✓</span>
                            <span className="text-gray-300 text-sm">Project assessed</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-purple-400 text-sm font-medium">Awaiting interview scheduling...</span>
                        </div>
                    </div>
                    <div className="mt-6">
                        <Link to="/portal" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm">
                            ← Back to Portal
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const isClientLoggedIn = !!localStorage.getItem('clientPortal');

    return (
        <div className="min-h-screen bg-gray-900 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Back to Portal */}
                {isClientLoggedIn && (
                    <div className="mb-6">
                        <Link to="/portal" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm">
                            ← Back to Portal
                        </Link>
                    </div>
                )}
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Interview Results</h1>
                    <p className="text-gray-400">
                        {project?.businessName || project?.clientName || 'Your Project'}
                    </p>
                </div>

                {/* Interview Status Card */}
                <div className="bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-700">
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isCompleted ? 'bg-green-500/20 border-2 border-green-500/30' : 'bg-yellow-500/20 border-2 border-yellow-500/30'}`}>
                            <span className="text-2xl">{isCompleted ? '✅' : '📅'}</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-white">
                                {isCompleted ? 'Interview Completed' : 'Interview Scheduled'}
                            </h2>
                            <p className="text-gray-400 text-sm">
                                {isCompleted
                                    ? `Completed on ${formatDate(interview.completedAt)}`
                                    : isScheduled
                                        ? `Scheduled for ${formatDate(interview.scheduledDate) || 'TBD'}`
                                        : 'Date to be confirmed'
                                }
                            </p>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="bg-gray-700/50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                            <span className={`text-sm font-medium ${isCompleted ? 'text-green-400' : 'text-yellow-400'}`}>
                                {isCompleted ? 'Ready for proposal preparation' : 'Interview in progress'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Interview Notes */}
                {interview.notes && (
                    <div className="bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-700">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <span>📋</span> Interview Notes
                        </h3>
                        <div className="bg-gray-700/50 rounded-lg p-4">
                            <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{interview.notes}</p>
                        </div>
                    </div>
                )}

                {/* Key Findings */}
                {interview.findings && interview.findings.length > 0 && (
                    <div className="bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-700">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <span>🔍</span> Key Findings
                        </h3>
                        <ul className="space-y-2">
                            {interview.findings.map((finding, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-gray-300">
                                    <span className="text-blue-400 mt-0.5">•</span>
                                    <span>{finding}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Next Steps */}
                <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span>🚀</span> Next Steps
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <span className={isCompleted ? 'text-green-400' : 'text-gray-500'}>
                                {isCompleted ? '✓' : '○'}
                            </span>
                            <span className={isCompleted ? 'text-gray-300' : 'text-gray-500'}>Interview completed</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={project?.proposalData ? 'text-green-400' : 'text-gray-500'}>
                                {project?.proposalData ? '✓' : '○'}
                            </span>
                            <span className={project?.proposalData ? 'text-gray-300' : 'text-gray-500'}>Proposal preparation</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-gray-500">○</span>
                            <span className="text-gray-500">Contract signing</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-gray-500">○</span>
                            <span className="text-gray-500">Payment & project kickoff</span>
                        </div>
                    </div>
                </div>

                {/* Back to Portal */}
                <div className="text-center mt-8">
                    <Link to="/portal" className="text-blue-400 hover:text-blue-300 transition-colors">
                        ← Back to Client Portal
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default InterviewResults;
