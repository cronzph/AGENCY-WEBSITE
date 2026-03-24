import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { analyzeDiscovery } from '../../ai/discovery';
import { useToast } from '../../components/shared/Toast';

const DiscoveryView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [project, setProject] = useState(null);
    const [discoveryData, setDiscoveryData] = useState(null);
    const [framework, setFramework] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [activeTab, setActiveTab] = useState('discovery');

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const projectDoc = await getDoc(doc(db, 'projects', id));
                if (!projectDoc.exists()) {
                    showToast('Project not found', 'error');
                    navigate('/admin/projects');
                    return;
                }

                const data = projectDoc.data();
                setProject(data);
                setDiscoveryData(data.discovery || null);
                setFramework(data.buildFramework || null);
            } catch (err) {
                console.error('Error fetching project:', err);
                showToast('Failed to load project', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProject();
    }, [id]);

    const handleRegenerateAnalysis = async () => {
        if (!discoveryData) {
            showToast('No discovery data to analyze', 'error');
            return;
        }

        setIsAnalyzing(true);
        try {
            const result = await analyzeDiscovery(discoveryData, project);
            setFramework(result);

            // Save to Firestore
            await updateDoc(doc(db, 'projects', id), {
                buildFramework: result,
                frameworkGeneratedAt: serverTimestamp(),
            });

            showToast('Analysis generated successfully', 'success');
        } catch (err) {
            console.error('Error generating analysis:', err);
            showToast(`Failed to generate analysis: ${err.message}`, 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleApproveFramework = async () => {
        setIsApproving(true);
        try {
            await updateDoc(doc(db, 'projects', id), {
                status: 'planning',
                frameworkApprovedAt: serverTimestamp(),
            });

            showToast('Framework approved! Project moved to Planning.', 'success');
            navigate('/admin/projects');
        } catch (err) {
            console.error('Error approving framework:', err);
            showToast('Failed to approve framework', 'error');
        } finally {
            setIsApproving(false);
        }
    };

    const handleCopyPrompt = (prompt) => {
        navigator.clipboard.writeText(prompt);
        showToast('Prompt copied to clipboard', 'success');
    };

    const [checklist, setChecklist] = useState({
        userManual: false,
        adminGuide: false,
        apiDocs: false,
        hostingCredentials: false,
        domainCredentials: false,
        firebaseCredentials: false,
        apiKeys: false,
        videoWalkthrough: false,
        liveDemo: false,
        userTraining: false,
        warrantyPeriod: false,
        sassReminder: false,
        perIssuePricing: false,
    });

    const handleChecklistChange = (item) => {
        setChecklist(prev => ({ ...prev, [item]: !prev[item] }));
    };

    const checklistComplete = Object.values(checklist).every(v => v);

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
                        <Link to="/admin/projects" className="text-blue-400 hover:text-blue-300 mb-2 inline-block">
                            ← Back to Projects
                        </Link>
                        <h1 className="text-3xl font-bold text-white">
                            Discovery Results: {project?.businessName}
                        </h1>
                        <p className="text-gray-400">{project?.clientName}</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleRegenerateAnalysis}
                            disabled={isAnalyzing || !discoveryData}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg disabled:opacity-50"
                        >
                            {isAnalyzing ? 'Analyzing...' : 'Regenerate Analysis'}
                        </button>
                        <button
                            onClick={handleApproveFramework}
                            disabled={isApproving || !framework}
                            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg disabled:opacity-50"
                        >
                            {isApproving ? 'Approving...' : 'Approve Framework'}
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-gray-700">
                    {['discovery', 'features', 'schema', 'roles', 'phases', 'prompts', 'checklist'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 -mb-px border-b-2 transition-colors ${activeTab === tab
                                    ? 'border-blue-500 text-blue-400'
                                    : 'border-transparent text-gray-400 hover:text-white'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1).replace(/([A-Z])/g, ' $1')}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'discovery' && discoveryData && (
                    <div className="bg-gray-800 rounded-lg p-6 space-y-8">
                        {/* Step 1 - Business Process */}
                        <div>
                            <h2 className="text-xl font-bold text-white mb-4">Business Process</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-700/50 rounded-lg p-4">
                                    <h3 className="text-gray-400 text-sm mb-2">Current Process</h3>
                                    <p className="text-white">{discoveryData.currentProcess || 'Not specified'}</p>
                                </div>
                                <div className="bg-gray-700/50 rounded-lg p-4">
                                    <h3 className="text-gray-400 text-sm mb-2">Tools Used</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {discoveryData.toolsUsed?.map((tool, i) => (
                                            <span key={i} className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-sm">{tool}</span>
                                        )) || <span className="text-gray-500">None</span>}
                                    </div>
                                </div>
                                <div className="bg-gray-700/50 rounded-lg p-4 md:col-span-2">
                                    <h3 className="text-gray-400 text-sm mb-2">Pain Points</h3>
                                    <p className="text-white">{discoveryData.painPoints || 'Not specified'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Step 2 - Workflow Details */}
                        <div>
                            <h2 className="text-xl font-bold text-white mb-4">Workflow Details</h2>
                            <div className="space-y-4">
                                <div className="bg-gray-700/50 rounded-lg p-4">
                                    <h3 className="text-gray-400 text-sm mb-2">Core Workflow Steps</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {discoveryData.workflowSteps?.filter(s => s).map((step, i) => (
                                            <div key={i} className="flex items-center">
                                                <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded">{step}</span>
                                                {i < discoveryData.workflowSteps.filter(s => s).length - 1 && (
                                                    <span className="text-gray-500 mx-2">→</span>
                                                )}
                                            </div>
                                        )) || <span className="text-gray-500">None specified</span>}
                                    </div>
                                </div>
                                <div className="bg-gray-700/50 rounded-lg p-4">
                                    <h3 className="text-gray-400 text-sm mb-2">Roles & Tasks</h3>
                                    <div className="space-y-2">
                                        {discoveryData.roles?.filter(r => r.role).map((role, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <span className="text-blue-400 font-medium">{role.role}:</span>
                                                <span className="text-white">{role.task}</span>
                                            </div>
                                        )) || <span className="text-gray-500">None specified</span>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-gray-700/50 rounded-lg p-4">
                                        <h3 className="text-gray-400 text-sm mb-2">Approval Flow</h3>
                                        <p className="text-white">
                                            {discoveryData.approvalFlowNeeded === 'yes'
                                                ? discoveryData.approvalFlowDescription || 'Yes, needed'
                                                : 'No'}
                                        </p>
                                    </div>
                                    <div className="bg-gray-700/50 rounded-lg p-4">
                                        <h3 className="text-gray-400 text-sm mb-2">Emergency Handling</h3>
                                        <p className="text-white">{discoveryData.emergencyHandling || 'Not specified'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 3 - Technical Requirements */}
                        <div>
                            <h2 className="text-xl font-bold text-white mb-4">Technical Requirements</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-700/50 rounded-lg p-4">
                                    <h3 className="text-gray-400 text-sm mb-2">User Roles</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {discoveryData.userRoles?.map((role, i) => (
                                            <span key={i} className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm">{role}</span>
                                        )) || <span className="text-gray-500">None</span>}
                                    </div>
                                </div>
                                <div className="bg-gray-700/50 rounded-lg p-4">
                                    <h3 className="text-gray-400 text-sm mb-2">Device Preferences</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {discoveryData.devicePreferences?.map((device, i) => (
                                            <span key={i} className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-sm">{device}</span>
                                        )) || <span className="text-gray-500">None</span>}
                                    </div>
                                </div>
                                <div className="bg-gray-700/50 rounded-lg p-4">
                                    <h3 className="text-gray-400 text-sm mb-2">Internet Availability</h3>
                                    <p className="text-white">{discoveryData.internetAvailability || 'Not specified'}</p>
                                </div>
                                <div className="bg-gray-700/50 rounded-lg p-4">
                                    <h3 className="text-gray-400 text-sm mb-2">Data Volume</h3>
                                    <p className="text-white">{discoveryData.dataVolume || 'Not specified'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Step 4 - Feature Priorities */}
                        <div>
                            <h2 className="text-xl font-bold text-white mb-4">Feature Priorities</h2>
                            <div className="space-y-3">
                                {Object.entries(discoveryData.featurePriorities || {}).map(([feature, priority]) => (
                                    <div key={feature} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                                        <span className="text-white">{feature}</span>
                                        <span className={`px-3 py-1 rounded text-sm ${priority === 'Must Have' ? 'bg-red-500/20 text-red-400' :
                                                priority === 'Nice to Have' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-gray-500/20 text-gray-400'
                                            }`}>{priority}</span>
                                    </div>
                                ))}
                                {discoveryData.additionalFeatures && (
                                    <div className="bg-gray-700/50 rounded-lg p-4 mt-4">
                                        <h3 className="text-gray-400 text-sm mb-2">Additional Features</h3>
                                        <p className="text-white">{discoveryData.additionalFeatures}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Features Tab */}
                {activeTab === 'features' && framework && (
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-bold text-white mb-6">Feature List</h2>

                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-red-400 mb-3">Must Have</h3>
                            <div className="space-y-3">
                                {framework.features?.mustHave?.map((feature, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                                        <div>
                                            <p className="text-white font-medium">{feature.name}</p>
                                            <p className="text-gray-400 text-sm">{feature.description}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded text-sm ${feature.complexity === 'low' ? 'bg-green-500/20 text-green-400' :
                                                feature.complexity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'
                                            }`}>{feature.complexity}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-yellow-400 mb-3">Nice to Have</h3>
                            <div className="space-y-3">
                                {framework.features?.niceToHave?.map((feature, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                                        <div>
                                            <p className="text-white font-medium">{feature.name}</p>
                                            <p className="text-gray-400 text-sm">{feature.description}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded text-sm ${feature.complexity === 'low' ? 'bg-green-500/20 text-green-400' :
                                                feature.complexity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'
                                            }`}>{feature.complexity}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Schema Tab */}
                {activeTab === 'schema' && framework && (
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-bold text-white mb-6">Firestore Schema</h2>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-gray-400 border-b border-gray-700">
                                        <th className="pb-3">Collection</th>
                                        <th className="pb-3">Fields</th>
                                        <th className="pb-3">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {framework.firestoreSchema?.map((schema, i) => (
                                        <tr key={i} className="border-b border-gray-700/50">
                                            <td className="py-4 text-blue-400 font-mono">{schema.collection}</td>
                                            <td className="py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {schema.fields?.map((field, j) => (
                                                        <span key={j} className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-sm">{field}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="py-4 text-gray-300">{schema.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Roles Tab */}
                {activeTab === 'roles' && framework && (
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-bold text-white mb-6">User Roles & Permissions</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {framework.userRoles?.map((role, i) => (
                                <div key={i} className="bg-gray-700/50 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-white mb-2">{role.role}</h3>
                                    <p className="text-gray-400 text-sm mb-3">{role.description}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {role.permissions?.map((perm, j) => (
                                            <span key={j} className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm">{perm}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Phases Tab */}
                {activeTab === 'phases' && framework && (
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-bold text-white mb-6">Build Phases</h2>

                        <div className="space-y-4">
                            {framework.buildPhases?.map((phase, i) => (
                                <div key={i} className="bg-gray-700/50 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-lg font-semibold text-white">Phase {phase.phase}: {phase.name}</h3>
                                        <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded text-sm">{phase.estimatedDays} days</span>
                                    </div>
                                    <ul className="space-y-2">
                                        {phase.tasks?.map((task, j) => (
                                            <li key={j} className="flex items-center gap-2 text-gray-300">
                                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                                {task}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Prompts Tab */}
                {activeTab === 'prompts' && framework && (
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-bold text-white mb-6">Kilo Code Prompts</h2>

                        <div className="space-y-4">
                            {framework.kiloCodePrompts?.map((prompt, i) => (
                                <div key={i} className="bg-gray-700/50 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-semibold text-white">
                                            Phase {prompt.phase} - Step {prompt.step}: {prompt.title}
                                        </h3>
                                        <button
                                            onClick={() => handleCopyPrompt(prompt.prompt)}
                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <pre className="bg-gray-900 p-4 rounded-lg text-gray-300 text-sm overflow-x-auto whitespace-pre-wrap">
                                        {prompt.prompt}
                                    </pre>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Checklist Tab */}
                {activeTab === 'checklist' && (
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-bold text-white mb-6">Handover Checklist</h2>

                        <div className="space-y-6">
                            {/* Documentation */}
                            <div>
                                <h3 className="text-lg font-semibold text-blue-400 mb-3">Documentation</h3>
                                <div className="space-y-2">
                                    {[
                                        { key: 'userManual', label: 'User Manual' },
                                        { key: 'adminGuide', label: 'Admin Guide' },
                                        { key: 'apiDocs', label: 'API Documentation' },
                                    ].map(item => (
                                        <label key={item.key} className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700">
                                            <input
                                                type="checkbox"
                                                checked={checklist[item.key]}
                                                onChange={() => handleChecklistChange(item.key)}
                                                className="w-5 h-5 text-blue-500 rounded"
                                            />
                                            <span className="text-white">{item.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Credentials */}
                            <div>
                                <h3 className="text-lg font-semibold text-green-400 mb-3">Credentials</h3>
                                <div className="space-y-2">
                                    {[
                                        { key: 'hostingCredentials', label: 'Hosting Account' },
                                        { key: 'domainCredentials', label: 'Domain Registrar' },
                                        { key: 'firebaseCredentials', label: 'Firebase Console Access' },
                                        { key: 'apiKeys', label: 'API Keys & Secrets' },
                                    ].map(item => (
                                        <label key={item.key} className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700">
                                            <input
                                                type="checkbox"
                                                checked={checklist[item.key]}
                                                onChange={() => handleChecklistChange(item.key)}
                                                className="w-5 h-5 text-blue-500 rounded"
                                            />
                                            <span className="text-white">{item.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Training */}
                            <div>
                                <h3 className="text-lg font-semibold text-yellow-400 mb-3">Training</h3>
                                <div className="space-y-2">
                                    {[
                                        { key: 'videoWalkthrough', label: 'Video Walkthrough' },
                                        { key: 'liveDemo', label: 'Live Demo Session' },
                                        { key: 'userTraining', label: 'User Training' },
                                    ].map(item => (
                                        <label key={item.key} className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700">
                                            <input
                                                type="checkbox"
                                                checked={checklist[item.key]}
                                                onChange={() => handleChecklistChange(item.key)}
                                                className="w-5 h-5 text-blue-500 rounded"
                                            />
                                            <span className="text-white">{item.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Support Terms */}
                            <div>
                                <h3 className="text-lg font-semibold text-purple-400 mb-3">Support Terms</h3>
                                <div className="space-y-2">
                                    {[
                                        { key: 'warrantyPeriod', label: 'Warranty Period (30 days)' },
                                        { key: 'sassReminder', label: 'SaaS Tier Reminder Sent' },
                                        { key: 'perIssuePricing', label: 'Per-Issue Pricing Explained' },
                                    ].map(item => (
                                        <label key={item.key} className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700">
                                            <input
                                                type="checkbox"
                                                checked={checklist[item.key]}
                                                onChange={() => handleChecklistChange(item.key)}
                                                className="w-5 h-5 text-blue-500 rounded"
                                            />
                                            <span className="text-white">{item.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* No Discovery Data */}
                {!discoveryData && (
                    <div className="bg-gray-800 rounded-lg p-8 text-center">
                        <div className="text-4xl mb-4">📋</div>
                        <h2 className="text-xl font-bold text-white mb-2">No Discovery Data</h2>
                        <p className="text-gray-400 mb-4">
                            This project doesn't have discovery data yet. Send the discovery form to the client.
                        </p>
                        <Link
                            to="/admin/projects"
                            className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                        >
                            Back to Projects
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DiscoveryView;