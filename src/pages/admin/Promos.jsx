import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, doc, setDoc, deleteDoc, getDocs, query, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../../components/shared/Toast';
import ConfirmModal from '../../components/shared/ConfirmModal';

const generatePromoCode = (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

const Promos = () => {
    const { showToast } = useToast();
    const [promos, setPromos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [templates, setTemplates] = useState([]);

    const emptyForm = {
        code: '',
        title: '',
        description: '',
        discountType: 'percentage',
        discountValue: '',
        maxSlots: '',
        usedSlots: 0,
        applicableTemplates: [],
        active: true,
        startDate: '',
        endDate: '',
        bannerText: '',
        badgeText: '',
    };

    const [form, setForm] = useState({ ...emptyForm });

    const fetchPromos = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'promos'), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            setPromos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error(err);
            showToast('Failed to load promos', 'error');
        }
        setLoading(false);
    };

    const fetchTemplates = async () => {
        try {
            const q = query(collection(db, 'templates'), orderBy('sortOrder', 'asc'));
            const snap = await getDocs(q);
            if (!snap.empty) {
                setTemplates(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
            }
        } catch (err) {
            console.error('Error fetching templates:', err);
        }
    };

    useEffect(() => {
        fetchPromos();
        fetchTemplates();
    }, []);

    const openNew = () => {
        setForm({ ...emptyForm, code: generatePromoCode() });
        setEditing('new');
    };

    const openEdit = (promo) => {
        setForm({
            ...emptyForm,
            ...promo,
            startDate: promo.startDate || '',
            endDate: promo.endDate || '',
            maxSlots: promo.maxSlots?.toString() || '',
            discountValue: promo.discountValue?.toString() || '',
        });
        setEditing(promo);
    };

    const closeEditor = () => {
        setEditing(null);
        setForm({ ...emptyForm });
    };

    const handleGenerateCode = () => {
        setForm(prev => ({ ...prev, code: generatePromoCode() }));
    };

    const handleSave = async () => {
        if (!form.code.trim() || !form.title.trim()) {
            showToast('Code and Title are required', 'error');
            return;
        }
        if (!form.discountValue || Number(form.discountValue) <= 0) {
            showToast('Discount value must be greater than 0', 'error');
            return;
        }
        if (form.discountType === 'percentage' && Number(form.discountValue) > 100) {
            showToast('Percentage discount cannot exceed 100%', 'error');
            return;
        }

        setSaving(true);
        try {
            const id = editing === 'new' ? form.code.toUpperCase().replace(/[^A-Z0-9]/g, '') : editing.id;
            const data = {
                ...form,
                code: form.code.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                discountValue: Number(form.discountValue),
                maxSlots: form.maxSlots ? Number(form.maxSlots) : null,
                usedSlots: form.usedSlots || 0,
            };
            delete data.id;

            if (editing === 'new') {
                data.createdAt = serverTimestamp();
            }
            data.updatedAt = serverTimestamp();

            await setDoc(doc(db, 'promos', id), data);
            showToast(editing === 'new' ? 'Promo created!' : 'Promo updated!', 'success');
            closeEditor();
            fetchPromos();
        } catch (err) {
            console.error(err);
            showToast('Failed to save promo', 'error');
        }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteDoc(doc(db, 'promos', deleteId));
            showToast('Promo deleted', 'success');
            setDeleteId(null);
            fetchPromos();
        } catch (err) {
            console.error(err);
            showToast('Failed to delete promo', 'error');
        }
    };

    const handleToggleActive = async (promo) => {
        try {
            await updateDoc(doc(db, 'promos', promo.id), { active: !promo.active, updatedAt: serverTimestamp() });
            showToast(`Promo ${promo.active ? 'deactivated' : 'activated'}`, 'success');
            fetchPromos();
        } catch (err) {
            console.error(err);
            showToast('Failed to update promo', 'error');
        }
    };

    const handleTemplateToggle = (templateId) => {
        setForm(prev => {
            const current = prev.applicableTemplates || [];
            if (current.includes(templateId)) {
                return { ...prev, applicableTemplates: current.filter(id => id !== templateId) };
            }
            return { ...prev, applicableTemplates: [...current, templateId] };
        });
    };

    const getStatusBadge = (promo) => {
        if (!promo.active) return { text: 'Inactive', color: 'bg-gray-600 text-gray-300' };
        if (promo.maxSlots && promo.usedSlots >= promo.maxSlots) return { text: 'Fully Claimed', color: 'bg-red-600/20 text-red-400' };
        if (promo.endDate && new Date(promo.endDate) < new Date()) return { text: 'Expired', color: 'bg-yellow-600/20 text-yellow-400' };
        return { text: 'Active', color: 'bg-green-600/20 text-green-400' };
    };

    // Editor View
    if (editing) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">
                        {editing === 'new' ? '✨ Create New Promo' : '✏️ Edit Promo'}
                    </h2>
                    <button onClick={closeEditor} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                        ← Back
                    </button>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
                    {/* Promo Code */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Promo Code *</label>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={form.code}
                                onChange={(e) => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white font-mono text-lg tracking-wider focus:border-blue-500 focus:outline-none"
                                placeholder="PROMO2024"
                            />
                            <button
                                onClick={handleGenerateCode}
                                className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors"
                            >
                                🎲 Generate
                            </button>
                        </div>
                    </div>

                    {/* Title & Description */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                                placeholder="e.g. Launch Day Sale"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                            <input
                                type="text"
                                value={form.description}
                                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                                placeholder="e.g. Get 30% off on all templates!"
                            />
                        </div>
                    </div>

                    {/* Discount Type & Value */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Discount Type *</label>
                            <select
                                value={form.discountType}
                                onChange={(e) => setForm(prev => ({ ...prev, discountType: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                            >
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed Amount (₱)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Discount Value * {form.discountType === 'percentage' ? '(%)' : '(₱)'}
                            </label>
                            <input
                                type="number"
                                value={form.discountValue}
                                onChange={(e) => setForm(prev => ({ ...prev, discountValue: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                                placeholder={form.discountType === 'percentage' ? 'e.g. 30' : 'e.g. 2000'}
                                min="0"
                                max={form.discountType === 'percentage' ? '100' : undefined}
                            />
                        </div>
                    </div>

                    {/* Slots */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Max Slots (leave empty for unlimited)</label>
                            <input
                                type="number"
                                value={form.maxSlots}
                                onChange={(e) => setForm(prev => ({ ...prev, maxSlots: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                                placeholder="e.g. 10"
                                min="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Used Slots</label>
                            <input
                                type="number"
                                value={form.usedSlots}
                                onChange={(e) => setForm(prev => ({ ...prev, usedSlots: Number(e.target.value) }))}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                                placeholder="0"
                                min="0"
                            />
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Start Date (optional)</label>
                            <input
                                type="date"
                                value={form.startDate}
                                onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">End Date (optional)</label>
                            <input
                                type="date"
                                value={form.endDate}
                                onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Display Settings */}
                    <div className="border-t border-gray-800 pt-6">
                        <h3 className="text-lg font-semibold text-white mb-4">🎨 Display Settings (Public Page)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Banner Text</label>
                                <input
                                    type="text"
                                    value={form.bannerText}
                                    onChange={(e) => setForm(prev => ({ ...prev, bannerText: e.target.value }))}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                                    placeholder="e.g. 🔥 30% OFF - Limited 10 Slots Only!"
                                />
                                <p className="text-xs text-gray-500 mt-1">Shown as a banner on the templates page</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Badge Text</label>
                                <input
                                    type="text"
                                    value={form.badgeText}
                                    onChange={(e) => setForm(prev => ({ ...prev, badgeText: e.target.value }))}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-blue-500 focus:outline-none"
                                    placeholder="e.g. 30% OFF"
                                />
                                <p className="text-xs text-gray-500 mt-1">Shown as a badge on template cards</p>
                            </div>
                        </div>
                    </div>

                    {/* Applicable Templates */}
                    <div className="border-t border-gray-800 pt-6">
                        <h3 className="text-lg font-semibold text-white mb-2">📋 Applicable Templates</h3>
                        <p className="text-sm text-gray-400 mb-4">Leave all unchecked to apply to ALL templates</p>
                        {templates.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {templates.map(t => (
                                    <label
                                        key={t.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${(form.applicableTemplates || []).includes(t.id)
                                            ? 'bg-blue-600/10 border-blue-500/50 text-white'
                                            : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={(form.applicableTemplates || []).includes(t.id)}
                                            onChange={() => handleTemplateToggle(t.id)}
                                            className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700"
                                        />
                                        <span className="font-medium">{t.name}</span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">No templates found in Firestore. Promos will apply to all templates by default.</p>
                        )}
                    </div>

                    {/* Active Toggle */}
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.active}
                                onChange={(e) => setForm(prev => ({ ...prev, active: e.target.checked }))}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                        <span className="text-gray-300 font-medium">Active</span>
                    </div>

                    {/* Preview */}
                    {form.bannerText && (
                        <div className="border-t border-gray-800 pt-6">
                            <h3 className="text-lg font-semibold text-white mb-3">👁️ Preview</h3>
                            <div className="bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 rounded-xl p-4 text-center">
                                <p className="text-white font-bold text-lg">{form.bannerText}</p>
                                {form.maxSlots && (
                                    <p className="text-white/80 text-sm mt-1">
                                        {Number(form.maxSlots) - (form.usedSlots || 0)} slots remaining out of {form.maxSlots}
                                    </p>
                                )}
                            </div>
                            {form.badgeText && (
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="text-sm text-gray-400">Badge preview:</span>
                                    <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold animate-pulse">
                                        🔥 {form.badgeText}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Save Button */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors"
                        >
                            {saving ? 'Saving...' : editing === 'new' ? '✨ Create Promo' : '💾 Save Changes'}
                        </button>
                        <button
                            onClick={closeEditor}
                            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // List View
    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">🎟️ Promo Codes</h2>
                    <p className="text-gray-400 text-sm mt-1">Generate and manage promotional offers for your templates</p>
                </div>
                <button
                    onClick={openNew}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Promo
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Total Promos</p>
                    <p className="text-2xl font-bold text-white">{promos.length}</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Active Promos</p>
                    <p className="text-2xl font-bold text-green-400">{promos.filter(p => p.active).length}</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Total Slots Used</p>
                    <p className="text-2xl font-bold text-blue-400">{promos.reduce((sum, p) => sum + (p.usedSlots || 0), 0)}</p>
                </div>
            </div>

            {/* Loading */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : promos.length === 0 ? (
                <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-2xl">
                    <div className="text-6xl mb-4">🎟️</div>
                    <h3 className="text-xl font-bold text-white mb-2">No Promos Yet</h3>
                    <p className="text-gray-400 mb-6">Create your first promo code to attract more customers!</p>
                    <button
                        onClick={openNew}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors"
                    >
                        Create First Promo
                    </button>
                </div>
            ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-800">
                                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Code</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Title</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Discount</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Slots</th>
                                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="text-right px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {promos.map((promo) => {
                                    const status = getStatusBadge(promo);
                                    return (
                                        <tr key={promo.id} className="hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                                                    {promo.code}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-white font-medium">{promo.title}</p>
                                                    {promo.description && (
                                                        <p className="text-gray-500 text-xs mt-0.5">{promo.description}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-white font-bold">
                                                    {promo.discountType === 'percentage'
                                                        ? `${promo.discountValue}%`
                                                        : `₱${promo.discountValue?.toLocaleString()}`}
                                                </span>
                                                <span className="text-gray-500 text-xs ml-1">
                                                    {promo.discountType === 'percentage' ? 'off' : 'discount'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {promo.maxSlots ? (
                                                    <div>
                                                        <span className="text-white font-medium">{promo.usedSlots || 0}</span>
                                                        <span className="text-gray-500">/{promo.maxSlots}</span>
                                                        <div className="w-20 h-1.5 bg-gray-700 rounded-full mt-1">
                                                            <div
                                                                className="h-full bg-blue-500 rounded-full"
                                                                style={{ width: `${Math.min(((promo.usedSlots || 0) / promo.maxSlots) * 100, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-500 text-sm">Unlimited</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${status.color}`}>
                                                    {status.text}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleToggleActive(promo)}
                                                        className={`p-2 rounded-lg transition-colors ${promo.active ? 'text-yellow-400 hover:bg-yellow-500/10' : 'text-green-400 hover:bg-green-500/10'}`}
                                                        title={promo.active ? 'Deactivate' : 'Activate'}
                                                    >
                                                        {promo.active ? (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => openEdit(promo)}
                                                        className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteId(promo.id)}
                                                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={!!deleteId}
                title="Delete Promo?"
                message="This action cannot be undone. The promo code will be permanently removed."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setDeleteId(null)}
            />
        </div>
    );
};

export default Promos;