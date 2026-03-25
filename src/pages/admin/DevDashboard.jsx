import { useState, useEffect } from 'react';
import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    updateDoc,
    doc,
    setDoc,
    serverTimestamp,
    query,
    deleteDoc
} from 'firebase/firestore';
import { db } from '../../firebase/config';

// Default models per provider
const DEFAULT_MODELS = {
    groq: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    openrouter: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-70b'],
    cerebras: ['llama3.1-70b', 'llama3.1-8b'],
};

const PROVIDER_ENDPOINTS = {
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    cerebras: 'https://api.cerebras.ai/v1/chat/completions',
};

const DevDashboard = () => {
    const [projects, setProjects] = useState([]);
    const [allBugs, setAllBugs] = useState([]);
    const [errorLogs, setErrorLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [apiStatuses, setApiStatuses] = useState({
        groq: { status: 'unknown', responseTime: null, lastChecked: null, errorMessage: null },
        openrouter: { status: 'unknown', responseTime: null, lastChecked: null, errorMessage: null },
        cerebras: { status: 'unknown', responseTime: null, lastChecked: null, errorMessage: null },
    });
    const [checkingApis, setCheckingApis] = useState(false);
    const [lastSynced, setLastSynced] = useState(null);
    const [apiErrorModal, setApiErrorModal] = useState(null);
    const [apiKeys, setApiKeys] = useState([]);
    const [showAddKeyModal, setShowAddKeyModal] = useState(false);
    const [newApiKey, setNewApiKey] = useState({ name: '', email: '', provider: 'groq', model: '', apiKey: '' });
    const [showKeyValue, setShowKeyValue] = useState(false);
    const [providerModels, setProviderModels] = useState(DEFAULT_MODELS);
    const [editingKey, setEditingKey] = useState(null);
    const [showEditKeyModal, setShowEditKeyModal] = useState(false);
    const [editShowKeyValue, setEditShowKeyValue] = useState(false);
    const [showModelsModal, setShowModelsModal] = useState(false);
    const [editingModels, setEditingModels] = useState({ provider: 'groq', models: [], newModel: '' });
    const [selectedKeyPerProvider, setSelectedKeyPerProvider] = useState({});
    const [sortBy, setSortBy] = useState('healthScore');
    const [showLogModal, setShowLogModal] = useState(false);
    const [newLog, setNewLog] = useState({ message: '', source: 'Runtime', severity: 'info' });

    // Fetch all data on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch projects
                const projectsSnap = await getDocs(collection(db, 'projects'));
                const projectsData = projectsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setProjects(projectsData);

                // Fetch all bugs from subcollections
                const bugs = [];
                for (const projectDoc of projectsSnap.docs) {
                    const projectData = projectDoc.data();
                    const bugsQuery = query(
                        collection(db, 'projects', projectDoc.id, 'bugReports')
                    );
                    const bugsSnap = await getDocs(bugsQuery);
                    bugsSnap.docs.forEach(bugDoc => {
                        bugs.push({
                            id: bugDoc.id,
                            projectId: projectDoc.id,
                            ...bugDoc.data(),
                            projectName: projectData.businessName || 'Unknown',
                            clientName: projectData.clientName || projectData.name || 'Unknown'
                        });
                    });
                }
                setAllBugs(bugs);

                // Fetch error logs
                const logsQuery = query(
                    collection(db, 'errorLogs')
                );
                const logsSnap = await getDocs(logsQuery);
                const logsData = logsSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setErrorLogs(logsData);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Fetch API keys, provider models, and setup auto-sync
    useEffect(() => {
        const fetchApiData = async () => {
            try {
                const keysSnap = await getDocs(collection(db, 'apiKeys'));
                const keysData = keysSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setApiKeys(keysData);

                // Fetch saved selection from Firestore and auto-select first key per provider
                const selectionDoc = await getDoc(doc(db, 'adminSettings', 'apiKeySelection'));
                const savedSelection = selectionDoc.exists() ? selectionDoc.data() : {};
                const autoSelected = { ...savedSelection };
                ['groq', 'openrouter', 'cerebras'].forEach(provider => {
                    if (!autoSelected[provider]) {
                        const first = keysData.find(k => k.provider === provider);
                        if (first) autoSelected[provider] = first.id;
                    } else {
                        // Validate saved ID still exists (key may have been deleted)
                        const stillExists = keysData.find(k => k.id === autoSelected[provider]);
                        if (!stillExists) delete autoSelected[provider];
                    }
                });
                setSelectedKeyPerProvider(autoSelected);

                // Fetch saved provider models
                const modelsSnap = await getDocs(collection(db, 'providerModels'));
                if (modelsSnap.docs.length > 0) {
                    const savedModels = { ...DEFAULT_MODELS };
                    modelsSnap.docs.forEach(d => {
                        savedModels[d.id] = d.data().models || DEFAULT_MODELS[d.id] || [];
                    });
                    setProviderModels(savedModels);
                }

                // Call with fresh keysData directly — bypasses stale closure
                await checkAllApis(keysData);
            } catch (error) {
                console.error('Error fetching API data:', error);
            }
        };

        fetchApiData();

        const interval = setInterval(() => {
            checkAllApis();
        }, 300000);

        return () => clearInterval(interval);
    }, []);

    // Save API key selection to Firestore
    const saveSelection = async (updated) => {
        try {
            await setDoc(doc(db, 'adminSettings', 'apiKeySelection'), updated);
        } catch (e) {
            console.error('Failed to save API key selection:', e);
        }
    };

    // Calculate project health scores
    const getProjectHealth = (projectId) => {
        const projectBugs = allBugs.filter(b => b.projectId === projectId);
        const severityCounts = { critical: 0, major: 0, medium: 0, minor: 0 };

        projectBugs.forEach(bug => {
            const severity = bug.aiAnalysis?.severity?.toLowerCase();
            if (severity === 'critical') severityCounts.critical++;
            else if (severity === 'major') severityCounts.major++;
            else if (severity === 'medium') severityCounts.medium++;
            else if (severity === 'minor') severityCounts.minor++;
        });

        // Health score formula: 100 - critical×30 - major×15 - medium×5 - minor×1
        const score = Math.max(0, Math.min(100, 100 -
            severityCounts.critical * 30 -
            severityCounts.major * 15 -
            severityCounts.medium * 5 -
            severityCounts.minor * 1
        ));

        return {
            score,
            critical: severityCounts.critical,
            major: severityCounts.major,
            medium: severityCounts.medium,
            minor: severityCounts.minor,
            total: projectBugs.length
        };
    };

    // Get projects with health data
    const projectsWithHealth = projects.map(project => {
        const health = getProjectHealth(project.id);
        return {
            ...project,
            ...health
        };
    }).sort((a, b) => {
        if (sortBy === 'healthScore') return a.score - b.score;
        if (sortBy === 'bugs') return b.total - a.total;
        if (sortBy === 'critical') return b.critical - a.critical;
        return 0;
    });

    // System health stats
    const getSystemStats = () => {
        const openBugs = allBugs.filter(b => b.status !== 'resolved' && b.status !== 'closed');
        const criticalBugs = allBugs.filter(b =>
            b.aiAnalysis?.severity?.toLowerCase() === 'critical' &&
            b.status !== 'resolved' && b.status !== 'closed'
        );

        return {
            totalProjects: projects.length,
            openBugs: openBugs.length,
            criticalBugs: criticalBugs.length
        };
    };

    const systemStats = getSystemStats();

    // API Health Check — accepts model to test with
    const checkApiHealth = async (apiName, endpoint, apiKey, model) => {
        const startTime = Date.now();
        const testModel = model || (providerModels[apiName]?.[0]) || 'llama-3.3-70b-versatile';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
                },
                body: JSON.stringify({
                    model: testModel,
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'hi' }]
                })
            });

            const responseTime = Date.now() - startTime;
            let errorMessage = null;

            if (!response.ok) {
                try {
                    const errorData = await response.text();
                    errorMessage = `HTTP ${response.status}: ${errorData || response.statusText}`;
                } catch (e) {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
            }

            return {
                status: response.ok ? 'online' : 'error',
                responseTime,
                lastChecked: new Date(),
                errorMessage,
                model: testModel,
            };
        } catch (error) {
            return {
                status: 'offline',
                responseTime: Date.now() - startTime,
                lastChecked: new Date(),
                errorMessage: error.message,
                model: testModel,
            };
        }
    };

    const checkAllApis = async (keys) => {
        setCheckingApis(true);

        // Use passed-in keys (for initial load) or fall back to state
        const effectiveKeys = keys ?? apiKeys;

        const envKeys = {
            groq: import.meta.env.VITE_GROQ_API_KEY,
            openrouter: import.meta.env.VITE_OPENROUTER_API_KEY,
            cerebras: import.meta.env.VITE_CEREBRAS_API_KEY,
        };

        // Build key map: prefer selected key per provider, then first Firestore key, then env var
        const getEffectiveKey = (provider, envKey) => {
            const selectedId = selectedKeyPerProvider[provider];
            if (selectedId) {
                const found = effectiveKeys.find(k => k.id === selectedId);
                if (found) return { key: found.apiKey, model: found.model };
            }
            const providerKeys = effectiveKeys.filter(k => k.provider === provider);
            if (providerKeys.length > 0) return { key: providerKeys[0].apiKey, model: providerKeys[0].model };
            return { key: envKey, model: null };
        };

        const groq = getEffectiveKey('groq', envKeys.groq);
        const openrouter = getEffectiveKey('openrouter', envKeys.openrouter);
        const cerebras = getEffectiveKey('cerebras', envKeys.cerebras);

        const results = await Promise.all([
            checkApiHealth('groq', PROVIDER_ENDPOINTS.groq, groq.key, groq.model),
            checkApiHealth('openrouter', PROVIDER_ENDPOINTS.openrouter, openrouter.key, openrouter.model),
            checkApiHealth('cerebras', PROVIDER_ENDPOINTS.cerebras, cerebras.key, cerebras.model)
        ]);

        setApiStatuses({
            groq: results[0],
            openrouter: results[1],
            cerebras: results[2]
        });

        setLastSynced(new Date());
        setCheckingApis(false);
    };

    // Add new API key
    const addApiKey = async () => {
        if (!newApiKey.name.trim() || !newApiKey.apiKey.trim()) return;
        try {
            const selectedModel = newApiKey.model || (providerModels[newApiKey.provider]?.[0]) || '';
            await addDoc(collection(db, 'apiKeys'), {
                ...newApiKey,
                model: selectedModel,
                createdAt: new Date()
            });
            const keysSnap = await getDocs(collection(db, 'apiKeys'));
            setApiKeys(keysSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setShowAddKeyModal(false);
            setShowKeyValue(false);
            setNewApiKey({ name: '', email: '', provider: 'groq', model: '', apiKey: '' });
        } catch (error) {
            console.error('Error adding API key:', error);
        }
    };

    // Delete API key
    const deleteApiKey = async (keyId) => {
        try {
            await deleteDoc(doc(db, 'apiKeys', keyId));
            setApiKeys(prev => prev.filter(k => k.id !== keyId));
        } catch (error) {
            console.error('Error deleting API key:', error);
        }
    };

    // Update API key
    const updateApiKey = async () => {
        if (!editingKey?.name?.trim() || !editingKey?.apiKey?.trim()) return;
        try {
            const keyRef = doc(db, 'apiKeys', editingKey.id);
            await updateDoc(keyRef, {
                name: editingKey.name,
                email: editingKey.email || '',
                provider: editingKey.provider,
                model: editingKey.model || (providerModels[editingKey.provider]?.[0]) || '',
                apiKey: editingKey.apiKey,
            });
            setApiKeys(prev => prev.map(k => k.id === editingKey.id ? { ...k, ...editingKey } : k));
            setShowEditKeyModal(false);
            setEditingKey(null);
            setEditShowKeyValue(false);
        } catch (error) {
            console.error('Error updating API key:', error);
        }
    };

    // Save provider models to Firestore
    const saveProviderModels = async (provider, models) => {
        try {
            const { setDoc } = await import('firebase/firestore');
            await setDoc(doc(db, 'providerModels', provider), { models });
            setProviderModels(prev => ({ ...prev, [provider]: models }));
        } catch (error) {
            console.error('Error saving models:', error);
        }
    };

    // Check single API (for retry)
    const checkSingleApi = async (apiName, overrideKeys) => {
        const effectiveKeys = overrideKeys ?? apiKeys;

        const envKeys = {
            groq: import.meta.env.VITE_GROQ_API_KEY,
            openrouter: import.meta.env.VITE_OPENROUTER_API_KEY,
            cerebras: import.meta.env.VITE_CEREBRAS_API_KEY,
        };
        const selectedId = selectedKeyPerProvider[apiName];
        let key = envKeys[apiName];
        let model = null;
        if (selectedId) {
            const found = effectiveKeys.find(k => k.id === selectedId);
            if (found) { key = found.apiKey; model = found.model; }
        } else {
            const providerKeys = effectiveKeys.filter(k => k.provider === apiName);
            if (providerKeys.length > 0) { key = providerKeys[0].apiKey; model = providerKeys[0].model; }
        }
        const result = await checkApiHealth(apiName, PROVIDER_ENDPOINTS[apiName], key, model);
        setApiStatuses(prev => ({ ...prev, [apiName]: result }));
    };

    // Mark error as resolved
    const markErrorResolved = async (logId) => {
        try {
            const logDoc = doc(db, 'errorLogs', logId);
            await updateDoc(logDoc, {
                resolved: true,
                resolvedAt: serverTimestamp()
            });

            setErrorLogs(prev => prev.map(log =>
                log.id === logId ? { ...log, resolved: true, resolvedAt: new Date() } : log
            ));
        } catch (error) {
            console.error('Error resolving log:', error);
        }
    };

    // Add new error log
    const addErrorLog = async () => {
        if (!newLog.message.trim()) return;

        try {
            const docRef = await addDoc(collection(db, 'errorLogs'), {
                message: newLog.message,
                source: newLog.source,
                severity: newLog.severity,
                projectId: null,
                resolved: false,
                createdAt: serverTimestamp()
            });

            setErrorLogs(prev => [{
                id: docRef.id,
                ...newLog,
                projectId: null,
                resolved: false,
                createdAt: new Date()
            }, ...prev]);

            setNewLog({ message: '', source: 'Runtime', severity: 'info' });
            setShowLogModal(false);
        } catch (error) {
            console.error('Error adding log:', error);
        }
    };

    // Get health color
    const getHealthColor = (score) => {
        if (score >= 80) return 'text-green-400';
        if (score >= 50) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getHealthBg = (score) => {
        if (score >= 80) return 'bg-green-900/20 border-green-700';
        if (score >= 50) return 'bg-yellow-900/20 border-yellow-700';
        return 'bg-red-900/20 border-red-700';
    };

    // Get API status color
    const getApiStatusColor = (status) => {
        if (status === 'online') return 'text-green-400 bg-green-400/20';
        if (status === 'error') return 'text-yellow-400 bg-yellow-400/20';
        if (status === 'offline') return 'text-red-400 bg-red-400/20';
        return 'text-gray-400 bg-gray-400/20';
    };

    // Format time ago
    const timeAgo = (date) => {
        if (!date) return 'N/A';
        const now = new Date();
        const then = date.toDate ? date.toDate() : new Date(date);
        const diff = Math.floor((now - then) / 1000);

        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
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
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Developer Dashboard</h1>
                    <p className="text-gray-400 mt-1">System health and API monitoring</p>
                </div>
                <button
                    onClick={() => setShowLogModal(true)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Log Error
                </button>
            </div>

            {/* System Health Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                    <p className="text-gray-400 text-sm mb-1">Total Projects</p>
                    <p className="text-2xl font-bold text-white">{systemStats.totalProjects}</p>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                    <p className="text-gray-400 text-sm mb-1">Open Bugs</p>
                    <p className="text-2xl font-bold text-yellow-400">{systemStats.openBugs}</p>
                </div>

                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                    <p className="text-gray-400 text-sm mb-1">Critical Bugs</p>
                    <p className="text-2xl font-bold text-red-400">{systemStats.criticalBugs}</p>
                </div>

                <div className={`bg-gray-800 border rounded-xl p-5 ${Object.values(apiStatuses).every(s => s.status === 'online') ? 'border-green-700' :
                    Object.values(apiStatuses).some(s => s.status === 'offline') ? 'border-red-700' :
                        'border-gray-700'
                    }`}>
                    <p className="text-gray-400 text-sm mb-1">API Health</p>
                    <p className={`text-2xl font-bold ${Object.values(apiStatuses).every(s => s.status === 'online') ? 'text-green-400' :
                        Object.values(apiStatuses).some(s => s.status === 'offline') ? 'text-red-400' :
                            'text-yellow-400'
                        }`}>
                        {Object.values(apiStatuses).filter(s => s.status === 'online').length}/3 Online
                    </p>
                </div>
            </div>

            {/* API Status Monitor */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-8">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-white">API Status</h2>
                        {lastSynced && (
                            <p className="text-xs text-gray-400 mt-1">Last synced: {timeAgo(lastSynced)} • Auto-sync every 5 min</p>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={checkAllApis}
                            disabled={checkingApis}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            {checkingApis ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Checking...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Check All
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => setShowAddKeyModal(true)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Key
                        </button>
                        <button
                            onClick={() => {
                                setEditingModels({ provider: 'groq', models: [...(providerModels.groq || [])], newModel: '' });
                                setShowModelsModal(true);
                            }}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Models
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(apiStatuses).map(([api, data]) => {
                        const providerKeys = apiKeys.filter(k => k.provider === api);
                        return (
                            <div
                                key={api}
                                className={`bg-gray-700/30 rounded-lg p-4 transition-colors ${data.errorMessage ? 'ring-2 ring-yellow-500/50' : ''}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-white font-medium capitalize">{api}</span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getApiStatusColor(data.status)}`}>
                                        {data.status}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-400 space-y-1">
                                    {data.model && <p className="text-gray-500 text-xs">Model: <span className="text-gray-300">{data.model}</span></p>}
                                    <p>Response: {data.responseTime ? `${data.responseTime}ms` : 'N/A'}</p>
                                    <p>Last checked: {data.lastChecked ? timeAgo(data.lastChecked) : 'Never'}</p>
                                    {data.errorMessage && (
                                        <button
                                            onClick={() => setApiErrorModal({ api, ...data })}
                                            className="text-yellow-400 mt-1 text-xs truncate block w-full text-left hover:text-yellow-300"
                                        >
                                            ⚠️ {data.errorMessage.substring(0, 80)}...
                                        </button>
                                    )}
                                </div>
                                {/* Key selector */}
                                {providerKeys.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-600">
                                        <select
                                            value={selectedKeyPerProvider[api] || ''}
                                            onChange={(e) => {
                                                const updated = { ...selectedKeyPerProvider, [api]: e.target.value };
                                                setSelectedKeyPerProvider(updated);
                                                saveSelection(updated);
                                            }}
                                            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-white"
                                        >
                                            <option value="">Default (env var)</option>
                                            {providerKeys.map(k => (
                                                <option key={k.id} value={k.id}>{k.name}{k.model ? ` (${k.model})` : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <button
                                    onClick={() => checkSingleApi(api)}
                                    className="mt-2 w-full px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs transition-colors"
                                >
                                    Retry
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* API Error Details Modal */}
            {apiErrorModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-lg w-full">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-xl font-semibold text-white capitalize">{apiErrorModal.api} API Error</h3>
                                {apiErrorModal.model && <p className="text-gray-400 text-xs mt-1">Model: {apiErrorModal.model}</p>}
                            </div>
                            <button onClick={() => setApiErrorModal(null)} className="text-gray-400 hover:text-white">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="bg-gray-900 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
                            <p className="text-yellow-400 text-sm font-mono whitespace-pre-wrap break-all">{apiErrorModal.errorMessage}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                            <div className="bg-gray-700/50 rounded p-2">
                                <span className="text-gray-400">Status:</span>
                                <span className={`ml-2 font-medium ${apiErrorModal.status === 'error' ? 'text-yellow-400' : 'text-red-400'}`}>{apiErrorModal.status}</span>
                            </div>
                            <div className="bg-gray-700/50 rounded p-2">
                                <span className="text-gray-400">Response:</span>
                                <span className="ml-2 text-white">{apiErrorModal.responseTime}ms</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    const api = apiErrorModal.api;
                                    setApiErrorModal(null);
                                    checkSingleApi(api);
                                }}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                            >
                                Retry {apiErrorModal.api}
                            </button>
                            <button
                                onClick={() => setApiErrorModal(null)}
                                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add API Key Modal */}
            {showAddKeyModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-white">Add API Key</h3>
                            <button onClick={() => { setShowAddKeyModal(false); setShowKeyValue(false); }} className="text-gray-400 hover:text-white">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Provider</label>
                                <select
                                    value={newApiKey.provider}
                                    onChange={(e) => setNewApiKey({ ...newApiKey, provider: e.target.value, model: '' })}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="groq">Groq</option>
                                    <option value="openrouter">OpenRouter</option>
                                    <option value="cerebras">Cerebras</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Model</label>
                                <select
                                    value={newApiKey.model}
                                    onChange={(e) => setNewApiKey({ ...newApiKey, model: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Default ({(providerModels[newApiKey.provider] || [])[0] || 'auto'})</option>
                                    {(providerModels[newApiKey.provider] || []).map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={newApiKey.name}
                                    onChange={(e) => setNewApiKey({ ...newApiKey, name: e.target.value })}
                                    placeholder="My Groq Key"
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Email (optional)</label>
                                <input
                                    type="email"
                                    value={newApiKey.email}
                                    onChange={(e) => setNewApiKey({ ...newApiKey, email: e.target.value })}
                                    placeholder="user@example.com"
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">API Key</label>
                                <div className="relative">
                                    <input
                                        type={showKeyValue ? 'text' : 'password'}
                                        value={newApiKey.apiKey}
                                        onChange={(e) => setNewApiKey({ ...newApiKey, apiKey: e.target.value })}
                                        placeholder="sk-..."
                                        className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKeyValue(!showKeyValue)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                    >
                                        {showKeyValue ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={addApiKey}
                                disabled={!newApiKey.name.trim() || !newApiKey.apiKey.trim()}
                                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                            >
                                Add Key
                            </button>
                            <button
                                onClick={() => { setShowAddKeyModal(false); setShowKeyValue(false); }}
                                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit API Key Modal */}
            {showEditKeyModal && editingKey && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-white">Edit API Key</h3>
                            <button onClick={() => { setShowEditKeyModal(false); setEditShowKeyValue(false); }} className="text-gray-400 hover:text-white">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Provider</label>
                                <select
                                    value={editingKey.provider}
                                    onChange={(e) => setEditingKey({ ...editingKey, provider: e.target.value, model: '' })}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="groq">Groq</option>
                                    <option value="openrouter">OpenRouter</option>
                                    <option value="cerebras">Cerebras</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Model</label>
                                <select
                                    value={editingKey.model || ''}
                                    onChange={(e) => setEditingKey({ ...editingKey, model: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Default ({(providerModels[editingKey.provider] || [])[0] || 'auto'})</option>
                                    {(providerModels[editingKey.provider] || []).map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={editingKey.name}
                                    onChange={(e) => setEditingKey({ ...editingKey, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Email (optional)</label>
                                <input
                                    type="email"
                                    value={editingKey.email || ''}
                                    onChange={(e) => setEditingKey({ ...editingKey, email: e.target.value })}
                                    placeholder="user@example.com"
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">API Key</label>
                                <div className="relative">
                                    <input
                                        type={editShowKeyValue ? 'text' : 'password'}
                                        value={editingKey.apiKey}
                                        onChange={(e) => setEditingKey({ ...editingKey, apiKey: e.target.value })}
                                        placeholder="sk-..."
                                        className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setEditShowKeyValue(!editShowKeyValue)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                    >
                                        {editShowKeyValue ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={updateApiKey}
                                disabled={!editingKey.name?.trim() || !editingKey.apiKey?.trim()}
                                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                            >
                                Save Changes
                            </button>
                            <button
                                onClick={() => { setShowEditKeyModal(false); setEditShowKeyValue(false); }}
                                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Models Modal */}
            {showModelsModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-white">Manage Models</h3>
                            <button onClick={() => setShowModelsModal(false)} className="text-gray-400 hover:text-white">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-300 mb-1">Provider</label>
                            <select
                                value={editingModels.provider}
                                onChange={(e) => {
                                    const p = e.target.value;
                                    setEditingModels({ provider: p, models: [...(providerModels[p] || [])], newModel: '' });
                                }}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                            >
                                <option value="groq">Groq</option>
                                <option value="openrouter">OpenRouter</option>
                                <option value="cerebras">Cerebras</option>
                            </select>
                        </div>
                        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                            {editingModels.models.map((m, i) => (
                                <div key={i} className="flex items-center justify-between bg-gray-700/50 rounded-lg px-3 py-2">
                                    <span className="text-white text-sm font-mono">{m}</span>
                                    <button
                                        onClick={() => setEditingModels(prev => ({ ...prev, models: prev.models.filter((_, idx) => idx !== i) }))}
                                        className="text-red-400 hover:text-red-300 text-xs"
                                    >✕</button>
                                </div>
                            ))}
                            {editingModels.models.length === 0 && <p className="text-gray-500 text-sm text-center py-2">No models</p>}
                        </div>
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={editingModels.newModel}
                                onChange={(e) => setEditingModels(prev => ({ ...prev, newModel: e.target.value }))}
                                placeholder="model-name"
                                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && editingModels.newModel.trim()) {
                                        setEditingModels(prev => ({ ...prev, models: [...prev.models, prev.newModel.trim()], newModel: '' }));
                                    }
                                }}
                            />
                            <button
                                onClick={() => {
                                    if (editingModels.newModel.trim()) {
                                        setEditingModels(prev => ({ ...prev, models: [...prev.models, prev.newModel.trim()], newModel: '' }));
                                    }
                                }}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm"
                            >Add</button>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={async () => {
                                    await saveProviderModels(editingModels.provider, editingModels.models);
                                    setShowModelsModal(false);
                                }}
                                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
                            >Save</button>
                            <button
                                onClick={() => {
                                    setEditingModels(prev => ({ ...prev, models: [...(DEFAULT_MODELS[editingModels.provider] || [])] }));
                                }}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors text-sm"
                            >Reset Defaults</button>
                        </div>
                    </div>
                </div>
            )}

            {/* API Keys List */}
            {apiKeys.length > 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-8">
                    <h2 className="text-lg font-semibold text-white mb-4">Saved API Keys ({apiKeys.length})</h2>
                    <div className="space-y-2">
                        {apiKeys.map(key => (
                            <div key={key.id} className="flex items-center justify-between bg-gray-700/30 rounded-lg p-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-white font-medium">{key.name}</p>
                                        <span className="px-2 py-0.5 text-xs rounded bg-blue-500/20 text-blue-400 capitalize">{key.provider}</span>
                                    </div>
                                    <p className="text-sm text-gray-400 truncate">
                                        {key.model && <span className="text-gray-500">Model: {key.model} </span>}
                                        {key.email && <span>• {key.email}</span>}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingKey({ ...key });
                                        setShowEditKeyModal(true);
                                        setEditShowKeyValue(false);
                                    }}
                                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg transition-colors ml-1 flex-shrink-0"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => deleteApiKey(key.id)}
                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors ml-2 flex-shrink-0"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Per-Project Health Table */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Project Health</h2>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                    >
                        <option value="healthScore">Sort by Health Score</option>
                        <option value="bugs">Sort by Bug Count</option>
                        <option value="critical">Sort by Critical Bugs</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Project</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Client</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Bugs</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Critical</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Health</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {projectsWithHealth.map(project => (
                                <tr key={project.id} className="hover:bg-gray-700/30">
                                    <td className="px-4 py-3 text-white font-medium">
                                        {project.businessName || 'Unknown'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-300">
                                        {project.clientName || project.name || 'Unknown'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-xs ${project.status === 'delivered' ? 'bg-green-600/20 text-green-400' :
                                            project.status === 'in_progress' ? 'bg-blue-600/20 text-blue-400' :
                                                'bg-gray-600/20 text-gray-400'
                                            }`}>
                                            {project.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-300">{project.total}</td>
                                    <td className="px-4 py-3">
                                        <span className={`font-medium ${project.critical > 0 ? 'text-red-400' : 'text-gray-300'}`}>
                                            {project.critical}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`font-bold ${getHealthColor(project.score)}`}>
                                            {project.score}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Error Log Feed */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mb-8">
                <h2 className="text-lg font-semibold text-white mb-4">Error Logs</h2>

                {errorLogs.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No error logs</p>
                ) : (
                    <div className="space-y-3">
                        {errorLogs.slice(0, 20).map(log => (
                            <div
                                key={log.id}
                                className={`p-4 rounded-lg border ${log.resolved ? 'border-gray-700 bg-gray-700/20' :
                                    log.severity === 'critical' ? 'border-red-700 bg-red-900/20' :
                                        log.severity === 'error' ? 'border-red-600 bg-red-900/10' :
                                            log.severity === 'warning' ? 'border-yellow-700 bg-yellow-900/20' :
                                                'border-gray-700 bg-gray-700/30'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded text-xs ${log.severity === 'critical' ? 'bg-red-600 text-white' :
                                                log.severity === 'error' ? 'bg-red-500 text-white' :
                                                    log.severity === 'warning' ? 'bg-yellow-500 text-white' :
                                                        'bg-blue-500 text-white'
                                                }`}>
                                                {log.severity}
                                            </span>
                                            <span className="text-gray-500 text-xs">{log.source}</span>
                                            <span className="text-gray-500 text-xs">•</span>
                                            <span className="text-gray-500 text-xs">{timeAgo(log.createdAt)}</span>
                                        </div>
                                        <p className={`text-white ${log.resolved ? 'line-through text-gray-500' : ''}`}>
                                            {log.message}
                                        </p>
                                    </div>
                                    {!log.resolved && (
                                        <button
                                            onClick={() => markErrorResolved(log.id)}
                                            className="ml-4 px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-xs"
                                        >
                                            Resolve
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Bug Activity */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <h2 className="text-lg font-semibold text-white mb-4">Recent Bug Activity</h2>

                {allBugs.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No bug reports</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-700/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Title</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Project</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Severity</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {allBugs.slice(0, 10).map(bug => (
                                    <tr key={bug.id} className="hover:bg-gray-700/30">
                                        <td className="px-4 py-3 text-white truncate max-w-xs">{bug.title}</td>
                                        <td className="px-4 py-3 text-gray-300">{bug.projectName}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs ${bug.aiAnalysis?.severity === 'Critical' ? 'bg-red-600 text-white' :
                                                bug.aiAnalysis?.severity === 'Major' ? 'bg-orange-500 text-white' :
                                                    bug.aiAnalysis?.severity === 'Medium' ? 'bg-yellow-500 text-white' :
                                                        'bg-gray-500 text-white'
                                                }`}>
                                                {bug.aiAnalysis?.severity || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs ${bug.status === 'resolved' || bug.status === 'closed' ? 'bg-green-600/20 text-green-400' :
                                                bug.status === 'open' ? 'bg-red-600/20 text-red-400' :
                                                    'bg-blue-600/20 text-blue-400'
                                                }`}>
                                                {bug.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">{timeAgo(bug.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Log Error Modal */}
            {showLogModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold text-white mb-4">Log Error</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Message</label>
                                <textarea
                                    value={newLog.message}
                                    onChange={(e) => setNewLog(prev => ({ ...prev, message: e.target.value }))}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                                    rows={3}
                                    placeholder="Error message..."
                                />
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Source</label>
                                <select
                                    value={newLog.source}
                                    onChange={(e) => setNewLog(prev => ({ ...prev, source: e.target.value }))}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="Runtime">Runtime</option>
                                    <option value="API">API</option>
                                    <option value="Build">Build</option>
                                    <option value="Deploy">Deploy</option>
                                    <option value="Database">Database</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Severity</label>
                                <select
                                    value={newLog.severity}
                                    onChange={(e) => setNewLog(prev => ({ ...prev, severity: e.target.value }))}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="info">Info</option>
                                    <option value="warning">Warning</option>
                                    <option value="error">Error</option>
                                    <option value="critical">Critical</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowLogModal(false)}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={addErrorLog}
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg"
                            >
                                Log Error
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DevDashboard;
