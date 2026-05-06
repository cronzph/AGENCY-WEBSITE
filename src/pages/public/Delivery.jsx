import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getAgencyName } from '../../utils/settings';
import { evaluateTestimonial } from '../../ai/testimonial';

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
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [testimonialResult, setTestimonialResult] = useState(null);
  const [upgradeRequest, setUpgradeRequest] = useState('');
  const [upgradeSubmitted, setUpgradeSubmitted] = useState(false);
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);

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
          // Check if testimonial was approved
          if (projectData.testimonialApproved) {
            setTestimonialResult({ approved: true, reason: 'Previously approved' });
          }
        }

        // Check if upgrade was already requested
        if (projectData.upgradeRequested) {
          setUpgradeSubmitted(true);
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
    if (!feedback.trim()) {
      alert('Please write a testimonial/feedback before submitting.');
      return;
    }

    setIsEvaluating(true);

    try {
      // Evaluate testimonial with AI
      const evaluation = await evaluateTestimonial({
        feedback,
        rating,
        clientName: project?.clientName,
        businessName: project?.businessName,
      });

      setTestimonialResult(evaluation);

      // Save rating to project
      await updateDoc(doc(db, 'projects', id), {
        clientRating: rating,
        clientFeedback: feedback,
        ratingSubmittedAt: serverTimestamp(),
        testimonialApproved: evaluation.approved,
        testimonialScore: evaluation.score,
        testimonialReason: evaluation.reason,
      });

      // Save to ratings collection
      const ratingDoc = {
        projectId: id,
        clientName: project?.clientName,
        businessName: project?.businessName,
        rating,
        feedback,
        displayText: evaluation.displayText || feedback,
        approved: evaluation.approved,
        score: evaluation.score,
        reason: evaluation.reason,
        showOnLanding: evaluation.approved, // Auto-show if AI approves
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'ratings'), ratingDoc);

      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting rating:', err);
      alert('Failed to submit. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSubmitUpgrade = async () => {
    if (!upgradeRequest.trim()) {
      alert('Please describe what upgrade you need.');
      return;
    }

    setIsSubmittingUpgrade(true);

    try {
      // Save upgrade request
      await addDoc(collection(db, 'upgradeRequests'), {
        projectId: id,
        clientName: project?.clientName,
        businessName: project?.businessName,
        email: project?.email,
        description: upgradeRequest,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // Mark project as having an upgrade request
      await updateDoc(doc(db, 'projects', id), {
        upgradeRequested: true,
        upgradeRequestedAt: serverTimestamp(),
      });

      setUpgradeSubmitted(true);
    } catch (err) {
      console.error('Error submitting upgrade request:', err);
      alert('Failed to submit upgrade request. Please try again.');
    } finally {
      setIsSubmittingUpgrade(false);
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

  // Determine if upgrade request is unlocked (needs good testimonial)
  const isUpgradeUnlocked = submitted && (testimonialResult?.approved || project?.testimonialApproved);

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
                {formatCurrency(project.proposalData?.investmentSummary?.totalCost || project.aiAssessment?.suggestedPrice)}
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

        {/* Testimonial / Rating Section */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-2">Share Your Experience</h2>
          <p className="text-gray-400 mb-4 text-sm">
            Your testimonial helps us improve and may be featured on our website!
          </p>

          {/* Info Banner */}
          {!submitted && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-6">
              <p className="text-blue-300 text-xs flex items-start gap-2">
                <span className="shrink-0">💡</span>
                <span>
                  Write a detailed, positive testimonial to unlock the <strong>System Upgrade Request</strong> feature.
                  Our AI will evaluate your feedback — if it's genuine and positive (4+ stars),
                  it will be automatically featured on our landing page!
                </span>
              </p>
            </div>
          )}

          {/* Stars */}
          <div className="flex justify-center gap-2 mb-4">
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
              <span className={`text-lg font-medium ${rating <= 2 ? 'text-red-400' : rating <= 3 ? 'text-yellow-400' : 'text-green-400'
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
              Your Testimonial <span className="text-red-500">*</span>
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={submitted}
              rows={4}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="Tell us about your experience working with CronzPH. What did you like? How was the communication? Would you recommend us?"
            />
            {!submitted && (
              <p className="text-gray-500 text-xs mt-1">
                Tip: Be specific about what you liked — mention the project, communication, quality, etc.
              </p>
            )}
          </div>

          {/* Submit Button */}
          {!submitted ? (
            <button
              onClick={handleSubmitRating}
              disabled={rating === 0 || !feedback.trim() || isEvaluating}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isEvaluating ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Evaluating your testimonial...
                </>
              ) : (
                'Submit Testimonial & Rating'
              )}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="text-center text-green-400 py-3 bg-green-500/10 rounded-lg border border-green-500/30">
                ✓ Thank you for your feedback!
              </div>

              {/* AI Evaluation Result */}
              {testimonialResult && (
                <div className={`p-4 rounded-lg border ${testimonialResult.approved
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-yellow-500/10 border-yellow-500/30'
                  }`}>
                  {testimonialResult.approved ? (
                    <div>
                      <p className="text-green-400 font-semibold flex items-center gap-2">
                        🌟 Your testimonial has been approved!
                      </p>
                      <p className="text-gray-300 text-sm mt-1">
                        It will be featured on our landing page. Thank you for the kind words!
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-yellow-400 font-semibold flex items-center gap-2">
                        📝 Testimonial received
                      </p>
                      <p className="text-gray-300 text-sm mt-1">
                        Your feedback has been recorded. {testimonialResult.reason}
                      </p>
                      <p className="text-gray-500 text-xs mt-2">
                        To unlock the System Upgrade feature, please provide a more detailed positive review (4+ stars).
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* System Upgrade Request Section */}
        <div className={`bg-gray-800 rounded-xl border p-6 mb-8 transition-all ${isUpgradeUnlocked
            ? 'border-purple-500/30'
            : 'border-gray-700 opacity-60'
          }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              🚀 Request System Upgrade
            </h2>
            {!isUpgradeUnlocked && (
              <span className="text-xs bg-gray-700 text-gray-400 px-3 py-1 rounded-full">
                🔒 Locked
              </span>
            )}
          </div>

          {!isUpgradeUnlocked ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">🔒</span>
              </div>
              <p className="text-gray-400 text-sm mb-2">
                Submit a positive testimonial (4+ stars) to unlock this feature.
              </p>
              <p className="text-gray-500 text-xs">
                This ensures mutual respect — you share your experience, and we continue to serve you with upgrades.
              </p>
            </div>
          ) : upgradeSubmitted ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">✅</span>
              </div>
              <p className="text-purple-400 font-semibold mb-2">Upgrade Request Submitted!</p>
              <p className="text-gray-400 text-sm">
                Our team will review your request and get back to you within 1-2 business days.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-300 text-sm">
                Need new features, improvements, or a system overhaul? Describe what you need and we'll prepare a quote.
              </p>

              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                <p className="text-purple-300 text-xs font-medium mb-2">Available upgrade types:</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                  <span className="flex items-center gap-1">✨ New features</span>
                  <span className="flex items-center gap-1">🎨 UI/UX redesign</span>
                  <span className="flex items-center gap-1">⚡ Performance boost</span>
                  <span className="flex items-center gap-1">📱 Mobile optimization</span>
                  <span className="flex items-center gap-1">🔗 API integrations</span>
                  <span className="flex items-center gap-1">📊 Analytics/Reports</span>
                  <span className="flex items-center gap-1">🔒 Security upgrade</span>
                  <span className="flex items-center gap-1">🗄️ Database migration</span>
                </div>
              </div>

              <textarea
                value={upgradeRequest}
                onChange={(e) => setUpgradeRequest(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                placeholder="Describe the upgrade you need... (e.g., 'I want to add an online payment system to my website' or 'I need a mobile app version')"
              />

              <button
                onClick={handleSubmitUpgrade}
                disabled={!upgradeRequest.trim() || isSubmittingUpgrade}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmittingUpgrade ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  '🚀 Submit Upgrade Request'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Back to Portal / Home */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <Link to="/portal" className="text-blue-400 hover:text-blue-300 text-sm">
            ← Back to Portal
          </Link>
          <span className="text-gray-600">|</span>
          <Link to="/" className="text-blue-400 hover:text-blue-300 text-sm">
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
