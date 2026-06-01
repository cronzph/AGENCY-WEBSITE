import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '../../components/shared/Toast';

const PreInquiries = () => {
    const { showToast } = useToast();
    const [preInquiries, setPreInquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all | notified | pending
    const [search, setSearch] = useState('');
    const [templateFilter, setTemplateFilter] = useState('all');
    const [deleteId, setDeleteId] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'preInquiries'), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            setPreInquiries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error(err);
            showToast('Failed to load pre-inquiries', 'error');
        }
        setLoading(false);
    };

    useEffect(() => { fetchAll(); }, []);

    const handleToggleNotified = async (item) => {
        try {
            await updateDoc(doc(db, 'preInquiries', item.id), { notified: !item.notified });
            setPreInquiries(prev => prev.map(p => p.id === item.id ? { ...p, notified: !p.notified } : p));
            showToast(item.notified ? 'Marked as pending' : 'Marked as notified', 'success');
        } catch (err) {
            console.error(err);
            showToast('Update failed', 'error');
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            await deleteDoc(doc(db, 'preInquiries', deleteId));
            setPreInquiries(prev => prev.filter(p => p.id !== deleteId));
            showToast('Deleted', 'success');
            setDeleteId(null);
        } catch (err) {
            console.error(err);
            showToast('Delete failed', 'error');
        }
        setDeleting(false);
    };

    const formatDate = (ts) => {
        if (!ts) return '—';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Unique template names for filter
    const templateNames = [...new Set(preInquiries.map(p => p.templateName).filter(Boolean))];

    const filtered = preInquiries.filter(p => {
        if (filter === 'notified' && !p.notified) return false;
        if (filter === 'pending' && p.notified) return false;
        if (templateFilter !== 'all' && p.templateName !== templateFilter) return false;
        if (search) {
            const s = search.toLowerCase();
            return (
                p.fullName?.toLowerCase().includes(s) ||
                p.email?.toLowerCase().includes(s) ||
                p.phone?.includes(s) ||
                p.templateName?.toLowerCase().includes(s)
            );
        }
        return true;
    });

    const stats = {
        total: preInquiries.length,
        notified: preInquiries.filter(p => p.notified).length,
        pending: preInquiries.filter(p => !p.notified).length,
    };

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Pre-Inquiries</h1>
                    <p className="text-gray-400 text-sm mt-1">People who registered interest in coming soon templates</p>
                </div>
                <button
                    onClick={fetchAll}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-white">{stats.total}</p>
                    <p className="text-gray-400 text-sm mt-1">Total</p>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-amber-400">{stats.pending}</p>
                    <p className="text-gray-400 text-sm mt-1">Pending</p>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-green-400">{stats.notified}</p>
                    <p className="text-gray-400 text-sm mt-1">Notified</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                {/* Search */}
                <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name, email, phone..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Status filter */}
                <div className="flex gap-2">
                    {[
                        { key: 'all', label: 'All' },
                        { key: 'pending', label: '⏳ Pending' },
                        { key: 'notified', label: '✅ Notified' },
                    ].map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${filter === f.key
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Template filter */}
                {templateNames.length > 1 && (
                    <select
                        value={templateFilter}
                        onChange={e => setTemplateFilter(e.target.value)}
                        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All Templates</option>
                        {templateNames.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Table / List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-4 animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gray-700 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-700 rounded w-1/3" />
                                    <div className="h-3 bg-gray-700 rounded w-1/2" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 bg-gray-800/50 border border-gray-700 rounded-xl">
                    <p className="text-4xl mb-4">🔔</p>
                    <p className="text-gray-300 text-lg font-medium mb-2">
                        {preInquiries.length === 0 ? 'No pre-inquiries yet' : 'No results found'}
                    </p>
                    <p className="text-gray-500 text-sm">
                        {preInquiries.length === 0
                            ? 'When customers register interest in coming soon templates, they\'ll appear here.'
                            : 'Try adjusting your search or filters.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(item => (
                        <div
                            key={item.id}
                            className={`bg-gray-800 border rounded-xl p-4 transition-colors ${item.notified ? 'border-green-500/20 bg-green-500/5' : 'border-gray-700 hover:border-gray-600'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                {/* Avatar */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${item.notified ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                                    }`}>
                                    {item.fullName?.charAt(0)?.toUpperCase() || '?'}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 flex-wrap">
                                        <div>
                                            <p className="font-semibold text-white">{item.fullName}</p>
                                            <p className="text-gray-400 text-sm">{item.email}</p>
                                            {item.phone && <p className="text-gray-500 text-xs mt-0.5">{item.phone}</p>}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {item.notified ? (
                                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/20">
                                                    ✅ Notified
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                                    ⏳ Pending
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                                        <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300 font-medium">
                                            🚧 {item.templateName || item.templateId}
                                        </span>
                                        <span className="text-gray-500 text-xs">{formatDate(item.createdAt)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700/50">
                                <button
                                    onClick={() => handleToggleNotified(item)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${item.notified
                                            ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                            : 'bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/20'
                                        }`}
                                >
                                    {item.notified ? '↩ Mark as Pending' : '✅ Mark as Notified'}
                                </button>
                                <a
                                    href={`mailto:${item.email}?subject=Great news! ${item.templateName} is now available&body=Hi ${item.fullName},%0A%0AGreat news! The ${item.templateName} template you registered interest in is now available.%0A%0ACheck it out here: ${window.location.origin}/templates%0A%0ABest regards,%0ACronzPH Team`}
                                    className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    Email
                                </a>
                                <button
                                    onClick={() => setDeleteId(item.id)}
                                    className="px-3 py-2 bg-red-600/10 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative bg-gray-800 rounded-xl p-6 max-w-sm w-full border border-gray-700" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-white mb-2">Delete Pre-Inquiry?</h3>
                        <p className="text-gray-400 text-sm mb-6">This will permanently remove this entry.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium disabled:opacity-50"
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                            <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PreInquiries;
