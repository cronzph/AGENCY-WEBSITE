import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getAgencyName } from '../../utils/settings';

const Delivery = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [agencyName, setAgencyName] = useState('CronzPH');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const name = await getAgencyName();
        setAgencyName(name);

        const projectRef = doc(db, 'projects', id);
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists()) {
          setLoading(false);
          return;
        }

        const projectData = { id: projectSnap.id, ...projectSnap.data() };
        
        // Check if already rated
        if (projectData.clientRating) {
          setRating(projectData.clientRating);
          setFeedback(projectData.clientFeedback || '');
          setSubmitted(true);
        }

        setProject(projectData);
      } catch (err) {
        console.error('Error fetching project:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Hide confetti after animation
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmitRating = async () => {
    if (rating === 0) return;

    try {
      // Save rating to project
      await updateDoc(doc(db, 'projects', id), {
        clientRating: rating,
        clientFeedback: feedback,
        ratingSubmittedAt: serverTimestamp(),
      });

      // Also save to ratings collection
      await addDoc(collection(db, 'ratings'), {
        projectId: id,
        clientName: project?.clientName,
        businessName: project?.businessName,
        rating,
        feedback,
        createdAt: serverTimestamp(),
      });

      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting rating:', err);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Project not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-20px',
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <span className="text-2xl">
                {['🎉', '🎊', '⭐', '🌟', '✨'][Math.floor(Math.random() * 5)]}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Project Delivered! 🎉</h1>
          <p className="text-gray-400">Your project has been successfully delivered</p>
        </div>

        {/* Project Summary Card */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Project Summary</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Client</p>
              <p className="text-white font-medium">{project.clientName}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Business</p>
              <p className="text-white font-medium">{project.businessName}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Services</p>
              <p className="text-white">{project.servicesNeeded?.join(', ') || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Project Value</p>
              <p className="text-green-400 font-semibold">
                {formatCurrency(project.aiAssessment?.suggestedPrice)}
              </p>
            </div>
          </div>
        </div>

        {/* Live Project Link */}
        {project.liveUrl && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Your Live Project</h2>
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-lg font-semibold transition-all hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Live Project
            </a>
          </div>
        )}

        {/* Rating Section */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Rate Your Experience</h2>
          <p className="text-gray-400 mb-6">How was your experience working with {agencyName}?</p>

          {/* Stars */}
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => !submitted && setRating(star)}
                onMouseEnter={() => !submitted && setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                disabled={submitted}
                className={`text-4xl transition-transform ${!submitted ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
              >
                {(hoverRating || rating) >= star ? '⭐' : '☆'}
              </button>
            ))}
          </div>

          {/* Rating Labels */}
          <div className="text-center mb-6">
            {rating > 0 && (
              <span className={`text-lg font-medium ${
                rating <= 2 ? 'text-red-400' : rating <= 3 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {rating === 1 ? 'Poor' : 
                 rating === 2 ? 'Fair' : 
                 rating === 3 ? 'Good' : 
                 rating === 4 ? 'Very Good' : 'Excellent!'}
              </span>
            )}
          </div>

          {/* Feedback Textarea */}
          <div className="mb-6">
            <label className="block text-gray-400 text-sm mb-2">
              Share your feedback (optional)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={submitted}
              rows={3}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="Tell us about your experience..."
            />
          </div>

          {/* Submit Button */}
          {!submitted ? (
            <button
              onClick={handleSubmitRating}
              disabled={rating === 0}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Rating
            </button>
          ) : (
            <div className="text-center text-green-400 py-3">
              ✓ Thank you for your feedback!
            </div>
          )}
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link to="/" className="text-blue-400 hover:text-blue-300">
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* Add confetti animation styles */}
      <style>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Delivery;
