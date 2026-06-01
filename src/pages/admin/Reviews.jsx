import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { useToast } from '../../components/shared/Toast';
import ConfirmModal from '../../components/shared/ConfirmModal';

const Reviews = () => {
    const { showToast } = useToast();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all'); // all, pending, approved
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const reviewsQuery = query(collection(db, 'templateReviews'), orderBy('createdAt', 'desc'));
            const snap = await getDocs(reviewsQuery);
            setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            console.error('Error fetching reviews:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const handleApprove = async (reviewId) => {
        try {
            await updateDoc(doc(db, 'templateReviews', reviewId), { approved: true });
            setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, approved: true } : r));
            showToast('Review approved and now visible publicly', 'success');
        } catch (err) {
            console.error('Error approving review:', err);
            showToast('Failed to approve review', 'error');
        }
    };

    const handleReject = async (reviewId) => {
        try {
            await updateDoc(doc(db, 'templateReviews', reviewId), { approved: false });
            setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, approved: false } : r));
            showToast('Review rejected', 'info');
        } catch (err) {
            console.error('Error rejecting review:', err);
            showToast('Failed to reject review', 'error');
        }
    };

    const handleDelete = async (reviewId) => {
        try {
            await deleteDoc(doc(db, 'templateReviews', reviewId));
            setReviews(prev => prev.filter(r => r.id !== reviewId));
            setDeleteConfirm(null);
            showToast('Review deleted', 'success');
        } catch (err) {
            console.error('Error deleting review:', err);
            showToast('Failed to delete review', 'error');
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const filteredReviews = reviews.filter(r => {
        if (filterStatus === 'pending') return !r.approved;
        if (filterStatus === 'approved') return r.approved;
        return true;
    });

    const pendingCount = reviews.filter(r => !r.approved).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Template Reviews</h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Manage client reviews for templates. Reviews must be approved before appearing publicly.
                    </p>
                </div>
                {pendingCount > 0 && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                        {pendingCount} pending review{pendingCount !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
                {[
                    { value: 'all', label: `All (${reviews.length})` },
                    { value: 'pending', label: `Pending (${pendingCount})` },
                    { value: 'approved', label: `Approved (${reviews.filter(r => r.approved).length})` },
                ].map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setFilterStatus(tab.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterStatus === tab.value
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Reviews List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : filteredReviews.length === 0 ? (
                <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
                    <p className="text-gray-400">No reviews found.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredReviews.map((review) => (
                        <div key={review.id} className={`bg-gray-800 rounded-lg p-5 border ${review.approved ? 'border-green-500/30' : 'border-yellow-500/30'}`}>
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                {/* Review Content */}
                                <div className="flex-1 min-w-0">
                                    {/* Stars */}
                                    <div className="flex items-center gap-1 mb-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <svg key={star} className={`w-5 h-5 ${star <= review.rating ? 'text-yellow-400' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                        <span className="text-gray-400 text-sm ml-2">{review.rating}/5</span>
                                    </div>
                                    {/* Comment */}
                                    <p className="text-white text-sm mb-2">"{review.comment}"</p>
                                    {/* Meta */}
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                                        <span>👤 {review.clientName}</span>
                                        <span>📧 {review.email}</span>
                                        {review.templateName && <span>📦 {review.templateName}</span>}
                                        <span>📅 {formatDate(review.createdAt)}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Status Badge */}
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${review.approved
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                        {review.approved ? '✓ Approved' : '⏳ Pending'}
                                    </span>

                                    {!review.approved && (
                                        <button
                                            onClick={() => handleApprove(review.id)}
                                            className="px-3 py-1.5 bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-green-600/30 rounded-lg text-xs font-medium transition-colors"
                                        >
                                            Approve
                                        </button>
                                    )}
                                    {review.approved && (
                                        <button
                                            onClick={() => handleReject(review.id)}
                                            className="px-3 py-1.5 bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 hover:bg-yellow-600/30 rounded-lg text-xs font-medium transition-colors"
                                        >
                                            Hide
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setDeleteConfirm(review)}
                                        className="px-3 py-1.5 bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30 rounded-lg text-xs font-medium transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <ConfirmModal
                    isOpen={true}
                    onClose={() => setDeleteConfirm(null)}
                    onConfirm={() => handleDelete(deleteConfirm.id)}
                    title="Delete Review"
                    message={`Are you sure you want to permanently delete this review from "${deleteConfirm.clientName}"?`}
                    confirmText="Delete"
                    variant="danger"
                />
            )}
        </div>
    );
};

export default Reviews;
