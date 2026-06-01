import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/config';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, doc, setDoc, deleteDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { useToast } from '../../components/shared/Toast';
import { staticTemplates } from '../../utils/templateData';
import ImagePreviewModal from '../../components/shared/ImagePreviewModal';

const emptyTemplate = {
  name: '', category: '', tagline: '', description: '', image: '',
  techStack: [], setupTime: '', price: '', priceNote: 'One-time setup fee',
  color: '#3b82f6', demoUrl: '', demoCredentials: null,
  features: [], includes: [], idealFor: [],
  setupSteps: [
    { step: 1, title: '', desc: '' },
    { step: 2, title: '', desc: '' },
    { step: 3, title: '', desc: '' },
  ],
  sortOrder: 0, active: true, status: 'available',
};

const TemplateManager = () => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // template object or null
  const [form, setForm] = useState({ ...emptyTemplate });
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Image upload state
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Temp inputs for array fields
  const [newTech, setNewTech] = useState('');
  const [newFeature, setNewFeature] = useState('');
  const [newInclude, setNewInclude] = useState('');
  const [newIdealFor, setNewIdealFor] = useState('');
  const [hasDemoCredentials, setHasDemoCredentials] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'templates'), orderBy('sortOrder', 'asc'));
      const snap = await getDocs(q);
      setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      showToast('Failed to load templates', 'error');
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const openNew = () => {
    setForm({ ...emptyTemplate, sortOrder: templates.length });
    setHasDemoCredentials(false);
    setEditing('new');
  };

  const openEdit = (t) => {
    setForm({ ...emptyTemplate, ...t });
    setHasDemoCredentials(!!t.demoCredentials);
    setEditing(t);
  };

  const closeEditor = () => { setEditing(null); };

  const generateId = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleSave = async () => {
    if (!form.name.trim() || !form.category.trim()) {
      showToast('Name and Category are required', 'error'); return;
    }
    setSaving(true);
    try {
      const id = editing === 'new' ? generateId(form.name) : editing.id;
      const data = { ...form };
      delete data.id;
      if (!hasDemoCredentials) data.demoCredentials = null;
      if (!data.demoUrl) data.demoUrl = null;

      await setDoc(doc(db, 'templates', id), data);
      showToast(editing === 'new' ? 'Template created!' : 'Template updated!', 'success');
      closeEditor();
      fetchAll();
    } catch (err) {
      console.error(err);
      showToast('Save failed', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'templates', deleteId));
      showToast('Template deleted', 'success');
      setDeleteId(null);
      fetchAll();
    } catch (err) {
      console.error(err);
      showToast('Delete failed', 'error');
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      for (const t of staticTemplates) {
        const { id, image, ...data } = t;
        // Use the static image path as-is for local dev; admin can update URLs later
        await setDoc(doc(db, 'templates', id), { ...data, image: image || '' });
      }
      showToast(`Seeded ${staticTemplates.length} templates!`, 'success');
      fetchAll();
    } catch (err) {
      console.error(err);
      showToast('Seed failed', 'error');
    }
    setSeeding(false);
  };

  const addToArray = (field, value, setter) => {
    if (value.trim() && !form[field].includes(value.trim())) {
      setForm(p => ({ ...p, [field]: [...p[field], value.trim()] }));
    }
    setter('');
  };

  const removeFromArray = (field, idx) => {
    setForm(p => ({ ...p, [field]: p[field].filter((_, i) => i !== idx) }));
  };

  const updateSetupStep = (idx, key, val) => {
    setForm(p => ({
      ...p,
      setupSteps: p.setupSteps.map((s, i) => i === idx ? { ...s, [key]: val } : s)
    }));
  };

  const handleImageUpload = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error'); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB', 'error'); return;
    }
    const storage = getStorage();
    const ext = file.name.split('.').pop();
    const fileName = `templates/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const storageRef = ref(storage, fileName);
    const uploadTask = uploadBytesResumable(storageRef, file);

    setImageUploading(true);
    setImageUploadProgress(0);

    uploadTask.on('state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setImageUploadProgress(pct);
      },
      (err) => {
        console.error(err);
        showToast('Upload failed: ' + err.message, 'error');
        setImageUploading(false);
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        setForm(p => ({ ...p, image: url }));
        setImageUploading(false);
        setImageUploadProgress(0);
        showToast('Image uploaded!', 'success');
      }
    );
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  };

  // ─── RENDER ───
  if (editing) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {editing === 'new' ? '➕ New Template' : `✏️ Edit: ${editing.name}`}
          </h2>
          <button onClick={closeEditor} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">Cancel</button>
        </div>

        <div className="space-y-6 bg-gray-800 border border-gray-700 rounded-xl p-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white" placeholder="E-Commerce Store" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Category *</label>
              <input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white" placeholder="E-commerce" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">Tagline</label>
              <input value={form.tagline} onChange={e => setForm(p => ({ ...p, tagline: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white" placeholder="Full-featured online store" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white resize-none" />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Preview Image</label>

            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => !imageUploading && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer
                ${imageUploading ? 'border-blue-500 bg-blue-500/5 cursor-not-allowed' : 'border-gray-600 hover:border-blue-500 hover:bg-blue-500/5 bg-gray-900/50'}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleImageUpload(e.target.files[0])}
              />

              {form.image && !imageUploading ? (
                /* Preview with overlay */
                <div className="relative rounded-xl overflow-hidden">
                  <img
                    src={form.image}
                    alt="Preview"
                    className="w-full h-48 object-cover"
                    onError={e => e.target.style.display = 'none'}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span className="text-white text-sm font-medium">Click to replace</span>
                  </div>
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setForm(p => ({ ...p, image: '' })); }}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg transition-colors"
                  >×</button>
                  {/* View full button */}
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setPreviewImage({ url: form.image, alt: form.name }); }}
                    className="absolute top-2 left-2 px-2 py-1 bg-black/60 hover:bg-black/80 rounded text-white text-xs font-medium transition-colors"
                  >🔍 View</button>
                </div>
              ) : imageUploading ? (
                /* Upload progress */
                <div className="flex flex-col items-center justify-center py-10 px-4">
                  <div className="w-12 h-12 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin mb-4" />
                  <p className="text-blue-400 font-medium text-sm mb-3">Uploading image...</p>
                  <div className="w-full max-w-xs bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${imageUploadProgress}%` }}
                    />
                  </div>
                  <p className="text-gray-400 text-xs mt-2">{imageUploadProgress}%</p>
                </div>
              ) : (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-10 px-4">
                  <div className="w-14 h-14 bg-gray-700 rounded-xl flex items-center justify-center mb-3">
                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-300 font-medium text-sm mb-1">Click to upload or drag & drop</p>
                  <p className="text-gray-500 text-xs">PNG, JPG, WebP — max 5MB</p>
                </div>
              )}
            </div>

            {/* URL fallback */}
            <div className="mt-2">
              <details className="group">
                <summary className="text-xs text-gray-500 hover:text-gray-400 cursor-pointer select-none list-none flex items-center gap-1">
                  <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Or paste an image URL instead
                </summary>
                <input
                  value={form.image}
                  onChange={e => setForm(p => ({ ...p, image: e.target.value }))}
                  className="mt-2 w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm"
                  placeholder="https://example.com/image.png"
                />
              </details>
            </div>
          </div>

          {/* Pricing & Config */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Price</label>
              <input value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white" placeholder="₱8,000 – ₱15,000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Price Note</label>
              <input value={form.priceNote} onChange={e => setForm(p => ({ ...p, priceNote: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Setup Time</label>
              <input value={form.setupTime} onChange={e => setForm(p => ({ ...p, setupTime: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white" placeholder="1–3 days" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Theme Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer border-0" />
                <input value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                  className="flex-1 px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white font-mono text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Sort Order</label>
              <input type="number" value={form.sortOrder} onChange={e => setForm(p => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white" />
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))}
                  className="w-5 h-5 rounded" />
                <span className="text-gray-300 font-medium">Active (visible on site)</span>
              </label>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Availability Status</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, status: 'available' }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${form.status !== 'coming'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                  >
                    ✅ Available
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(p => ({ ...p, status: 'coming' }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${form.status === 'coming'
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                  >
                    🚧 Coming Soon
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Demo URL & Credentials */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Demo URL</label>
              <input value={form.demoUrl || ''} onChange={e => setForm(p => ({ ...p, demoUrl: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white" placeholder="https://demo.example.com" />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={hasDemoCredentials} onChange={e => {
                setHasDemoCredentials(e.target.checked);
                if (e.target.checked && !form.demoCredentials) setForm(p => ({ ...p, demoCredentials: { email: '', password: '' } }));
              }} className="w-5 h-5 rounded" />
              <span className="text-gray-300 text-sm">Has Demo Credentials</span>
            </label>
            {hasDemoCredentials && (
              <div className="grid grid-cols-2 gap-4 pl-8">
                <input value={form.demoCredentials?.email || ''} onChange={e => setForm(p => ({ ...p, demoCredentials: { ...p.demoCredentials, email: e.target.value } }))}
                  className="px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white" placeholder="admin@demo.com" />
                <input value={form.demoCredentials?.password || ''} onChange={e => setForm(p => ({ ...p, demoCredentials: { ...p.demoCredentials, password: e.target.value } }))}
                  className="px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-lg text-white" placeholder="demo1234" />
              </div>
            )}
          </div>

          {/* Tech Stack */}
          <ArrayField label="Tech Stack" items={form.techStack} value={newTech} setValue={setNewTech}
            onAdd={() => addToArray('techStack', newTech, setNewTech)} onRemove={(i) => removeFromArray('techStack', i)} placeholder="React" />

          {/* Features */}
          <ArrayField label="Features" items={form.features} value={newFeature} setValue={setNewFeature}
            onAdd={() => addToArray('features', newFeature, setNewFeature)} onRemove={(i) => removeFromArray('features', i)} placeholder="Shopping cart & checkout" />

          {/* Includes */}
          <ArrayField label="What's Included" items={form.includes} value={newInclude} setValue={setNewInclude}
            onAdd={() => addToArray('includes', newInclude, setNewInclude)} onRemove={(i) => removeFromArray('includes', i)} placeholder="Admin Dashboard" />

          {/* Ideal For */}
          <ArrayField label="Ideal For" items={form.idealFor} value={newIdealFor} setValue={setNewIdealFor}
            onAdd={() => addToArray('idealFor', newIdealFor, setNewIdealFor)} onRemove={(i) => removeFromArray('idealFor', i)} placeholder="Online retail stores" />

          {/* Setup Steps */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Setup Steps</label>
            <div className="space-y-3">
              {form.setupSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0 mt-1">{step.step}</div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input value={step.title} onChange={e => updateSetupStep(idx, 'title', e.target.value)}
                      className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm" placeholder="Title" />
                    <input value={step.desc} onChange={e => updateSetupStep(idx, 'desc', e.target.value)}
                      className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm" placeholder="Description" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold disabled:opacity-50 transition-colors">
              {saving ? 'Saving...' : editing === 'new' ? 'Create Template' : 'Save Changes'}
            </button>
            <button onClick={closeEditor} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium">Cancel</button>
          </div>
        </div>

        <ImagePreviewModal isOpen={!!previewImage} imageUrl={previewImage?.url} altText={previewImage?.alt} onClose={() => setPreviewImage(null)} />
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Template Manager</h1>
          <p className="text-gray-400 text-sm mt-1">Manage templates visible on the public Templates page</p>
        </div>
        <div className="flex items-center gap-3">
          {templates.length === 0 && (
            <button onClick={handleSeed} disabled={seeding}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2">
              {seeding ? '⏳ Seeding...' : '🌱 Seed Default Templates'}
            </button>
          )}
          <button onClick={openNew}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Template
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-4 animate-pulse">
              <div className="aspect-video bg-gray-700 rounded-lg mb-4" />
              <div className="h-5 bg-gray-700 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20 bg-gray-800/50 border border-gray-700 rounded-xl">
          <p className="text-4xl mb-4">📋</p>
          <p className="text-gray-300 text-lg font-medium mb-2">No templates yet</p>
          <p className="text-gray-500 text-sm mb-6">Click "Seed Default Templates" to populate from built-in data, or create a new one.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={handleSeed} disabled={seeding}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium disabled:opacity-50">
              {seeding ? 'Seeding...' : '🌱 Seed Defaults'}
            </button>
            <button onClick={openNew} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium">
              ➕ Create New
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map(t => (
            <div key={t.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-colors group">
              {/* Accent */}
              <div className="h-1" style={{ background: t.color }} />

              {/* Image */}
              <div className="relative aspect-video bg-gray-700 overflow-hidden cursor-pointer"
                onClick={() => t.image && setPreviewImage({ url: t.image, alt: t.name, color: t.color })}>
                {t.image ? (
                  <img src={t.image} alt={t.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">No image</div>
                )}
                {!t.active && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="px-3 py-1 bg-red-500/80 text-white text-xs font-bold rounded-full">INACTIVE</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-white">{t.name}</h3>
                    <p className="text-gray-400 text-sm">{t.tagline}</p>
                  </div>
                  <span className="px-2 py-1 rounded text-xs font-bold" style={{ background: `${t.color}20`, color: t.color }}>{t.category}</span>
                </div>
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="font-semibold" style={{ color: t.color }}>{t.price}</span>
                  <span className="text-gray-500">⚡ {t.setupTime}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {t.techStack?.map(tech => (
                    <span key={tech} className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">{tech}</span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(t)}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
                    ✏️ Edit
                  </button>
                  <button onClick={() => setDeleteId(t.id)}
                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-sm font-medium transition-colors">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative bg-gray-800 rounded-xl p-6 max-w-sm w-full border border-gray-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-2">Delete Template?</h3>
            <p className="text-gray-400 text-sm mb-6">This will permanently remove this template from the site.</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium">Delete</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <ImagePreviewModal isOpen={!!previewImage} imageUrl={previewImage?.url} altText={previewImage?.alt} accentColor={previewImage?.color} onClose={() => setPreviewImage(null)} />
    </div>
  );
};

// ─── Reusable Array Field Component ───
const ArrayField = ({ label, items, value, setValue, onAdd, onRemove, placeholder }) => (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
    <div className="flex gap-2 mb-2">
      <input value={value} onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
        className="flex-1 px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm" placeholder={placeholder} />
      <button type="button" onClick={onAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium">Add</button>
    </div>
    <div className="flex flex-wrap gap-2">
      {items.map((item, idx) => (
        <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-200">
          {item}
          <button onClick={() => onRemove(idx)} className="text-gray-400 hover:text-red-400 ml-1">×</button>
        </span>
      ))}
    </div>
  </div>
);

export default TemplateManager;
