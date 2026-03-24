import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '../../components/shared/Toast';

const Portfolio = () => {
    const [activeTab, setActiveTab] = useState('portfolio');
    const [portfolioItems, setPortfolioItems] = useState([]);
    const [testimonials, setTestimonials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [filterType, setFilterType] = useState('all');
    const { showToast } = useToast();

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        projectType: 'Website',
        clientName: '',
        techStack: '',
        liveUrl: '',
        thumbnail: '',
        featured: false
    });

    const projectTypes = [
        'Website', 'POS', 'Inventory', 'Booking', 'Payroll', 'Dashboard', 'Automation', 'Other'
    ];

    // Fetch portfolio items
    useEffect(() => {
        const portfolioQuery = query(collection(db, 'portfolio'));
        const unsubscribePortfolio = onSnapshot(portfolioQuery, (snapshot) => {
            setPortfolioItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => {
            console.error('Portfolio fetch error:', err);
        });

        // Fetch testimonials from ratings collection
        const ratingsQuery = query(collection(db, 'ratings'));
        const unsubscribeRatings = onSnapshot(ratingsQuery, (snapshot) => {
            setTestimonials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, (err) => {
            console.error('Ratings fetch error:', err);
            setLoading(false); // always stop loading even on error
        });

        return () => {
            unsubscribePortfolio();
            unsubscribeRatings();
        };
    }, []);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, thumbnail: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingItem) {
                await updateDoc(doc(db, 'portfolio', editingItem.id), {
                    ...formData,
                    updatedAt: serverTimestamp()
                });
                showToast('Portfolio item updated successfully', 'success');
            } else {
                await addDoc(collection(db, 'portfolio'), {
                    ...formData,
                    createdAt: serverTimestamp()
                });
                showToast('Portfolio item created successfully', 'success');
            }
            setShowModal(false);
            setEditingItem(null);
            resetForm();
        } catch (err) {
            console.error('Error saving portfolio item:', err);
            showToast('Failed to save portfolio item', 'error');
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            title: item.title || '',
            description: item.description || '',
            projectType: item.projectType || 'Website',
            clientName: item.clientName || '',
            techStack: item.techStack || '',
            liveUrl: item.liveUrl || '',
            thumbnail: item.thumbnail || '',
            featured: item.featured || false
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this portfolio item?')) {
            try {
                await deleteDoc(doc(db, 'portfolio', id));
                showToast('Portfolio item deleted', 'success');
            } catch (err) {
                console.error('Error deleting portfolio item:', err);
                showToast('Failed to delete portfolio item', 'error');
            }
        }
    };

    const handleToggleFeatured = async (item) => {
        try {
            await updateDoc(doc(db, 'portfolio', item.id), {
                featured: !item.featured
            });
            showToast(`Item ${item.featured ? 'removed from' : 'added to'} featured`, 'success');
        } catch (err) {
            console.error('Error toggling featured:', err);
            showToast('Failed to update featured status', 'error');
        }
    };

    const handleToggleShowOnLanding = async (testimonial) => {
        try {
            await updateDoc(doc(db, 'ratings', testimonial.id), {
                showOnLanding: !testimonial.showOnLanding
            });
            showToast(`Testimonial ${testimonial.showOnLanding ? 'hidden from' : 'shown on'} landing page`, 'success');
        } catch (err) {
            console.error('Error toggling showOnLanding:', err);
            showToast('Failed to update testimonial visibility', 'error');
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            projectType: 'Website',
            clientName: '',
            techStack: '',
            liveUrl: '',
            thumbnail: '',
            featured: false
        });
    };

    const openAddModal = () => {
        resetForm();
        setEditingItem(null);
        setShowModal(true);
    };

    const filteredPortfolio = filterType === 'all'
        ? portfolioItems
        : portfolioItems.filter(item => item.projectType === filterType);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Loading...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Portfolio & Testimonials</h1>
                    <p className="text-gray-400">Manage your portfolio items and client testimonials</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-700 pb-4">
                <button
                    onClick={() => setActiveTab('portfolio')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'portfolio'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                >
                    Portfolio
                </button>
                <button
                    onClick={() => setActiveTab('testimonials')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'testimonials'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                >
                    Testimonials
                </button>
            </div>

            {/* Portfolio Tab */}
            {activeTab === 'portfolio' && (
                <div className="space-y-6">
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-between">
                        <div className="flex gap-2 flex-wrap">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="bg-gray-800 border border-gray-700 text-white px-3 py-2 rounded-lg"
                            >
                                <option value="all">All Types</option>
                                {projectTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={openAddModal}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                        >
                            + Add Portfolio Item
                        </button>
                    </div>

                    {/* Portfolio Grid */}
                    {filteredPortfolio.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            No portfolio items yet. Click "Add Portfolio Item" to create one.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredPortfolio.map(item => (
                                <div key={item.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-blue-500/50 transition-colors">
                                    {item.thumbnail && (
                                        <div className="h-40 overflow-hidden">
                                            <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded-full">
                                                {item.projectType}
                                            </span>
                                            {item.featured && (
                                                <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded-full">
                                                    Featured
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-semibold text-white mb-1">{item.title}</h3>
                                        <p className="text-gray-400 text-sm mb-2 line-clamp-2">{item.description}</p>
                                        {item.techStack && (
                                            <p className="text-gray-500 text-xs mb-2">Tech: {item.techStack}</p>
                                        )}
                                        {item.clientName && (
                                            <p className="text-gray-500 text-xs mb-3">Client: {item.clientName}</p>
                                        )}
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={() => handleToggleFeatured(item)}
                                                className={`px-3 py-1 text-xs rounded-lg transition-colors ${item.featured
                                                        ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                                                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                                    }`}
                                            >
                                                {item.featured ? 'Unfeature' : 'Feature'}
                                            </button>
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="px-3 py-1 bg-gray-700 text-gray-300 text-xs rounded-lg hover:bg-gray-600 transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="px-3 py-1 bg-red-600/20 text-red-400 text-xs rounded-lg hover:bg-red-600/30 transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Testimonials Tab */}
            {activeTab === 'testimonials' && (
                <div className="space-y-6">
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-4">
                        <p className="text-gray-400 text-sm">
                            These are client ratings from the ratings collection. Toggle "Show on Landing" to display them on the public website.
                        </p>
                    </div>

                    {testimonials.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            No testimonials yet. Client ratings will appear here automatically.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {testimonials.map(t => (
                                <div key={t.id} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex gap-1 mb-2">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <span key={s} className="text-lg">{s <= t.rating ? '⭐' : '☆'}</span>
                                                ))}
                                            </div>
                                            <p className="text-gray-300 mb-2 italic">"{t.feedback}"</p>
                                            <div>
                                                <p className="text-white font-medium">{t.clientName}</p>
                                                {t.businessName && (
                                                    <p className="text-gray-500 text-sm">{t.businessName}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={t.showOnLanding || false}
                                                    onChange={() => handleToggleShowOnLanding(t)}
                                                    className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-600"
                                                />
                                                <span className="text-gray-300 text-sm">Show on Landing</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-white">
                                    {editingItem ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
                                </h2>
                                <button
                                    onClick={() => { setShowModal(false); setEditingItem(null); }}
                                    className="text-gray-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Title *</label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg"
                                        placeholder="Project name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Description *</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        required
                                        rows={3}
                                        className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg"
                                        placeholder="Short description of the project"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-gray-400 text-sm mb-2">Project Type *</label>
                                        <select
                                            name="projectType"
                                            value={formData.projectType}
                                            onChange={handleInputChange}
                                            className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg"
                                        >
                                            {projectTypes.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-gray-400 text-sm mb-2">Client Name</label>
                                        <input
                                            type="text"
                                            name="clientName"
                                            value={formData.clientName}
                                            onChange={handleInputChange}
                                            className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg"
                                            placeholder="Optional"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Tech Stack</label>
                                    <input
                                        type="text"
                                        name="techStack"
                                        value={formData.techStack}
                                        onChange={handleInputChange}
                                        className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg"
                                        placeholder="e.g., React, Node.js, Firebase"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Live URL</label>
                                    <input
                                        type="url"
                                        name="liveUrl"
                                        value={formData.liveUrl}
                                        onChange={handleInputChange}
                                        className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg"
                                        placeholder="https://example.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Thumbnail Image</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded-lg"
                                    />
                                    {formData.thumbnail && (
                                        <div className="mt-2">
                                            <img src={formData.thumbnail} alt="Preview" className="h-32 object-cover rounded-lg" />
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, thumbnail: '' }))}
                                                className="text-red-400 text-sm mt-1"
                                            >
                                                Remove image
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        name="featured"
                                        id="featured"
                                        checked={formData.featured}
                                        onChange={handleInputChange}
                                        className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-600"
                                    />
                                    <label htmlFor="featured" className="text-gray-300">
                                        Show on landing page (Featured)
                                    </label>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                                    >
                                        {editingItem ? 'Update Item' : 'Create Item'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowModal(false); setEditingItem(null); }}
                                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Portfolio;