import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getAgencyName } from '../../utils/settings';
import { createNotifications } from '../../utils/notifications';

const Proposal = () => {
  const { id } = useParams();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToScope, setAgreedToScope] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [agencyName, setAgencyName] = useState('CronzPH');

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        const docRef = doc(db, 'projects', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProposal({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError('Proposal not found');
        }
      } catch (err) {
        console.error('Error fetching proposal:', err);
        setError('Failed to load proposal');
      } finally {
        setLoading(false);
      }
    };

    fetchProposal();
  }, [id]);

  useEffect(() => {
    const fetchAgencyName = async () => {
      const name = await getAgencyName();
      setAgencyName(name);
    };
    fetchAgencyName();
  }, []);

  const handleAccept = async () => {
    if (!agreedToTerms || !agreedToScope) return;

    setIsSubmitting(true);
    try {
      const docRef = doc(db, 'projects', id);
      await updateDoc(docRef, {
        status: 'proposal_accepted',
        proposalAcceptedAt: new Date(),
      });

      // Create notification
      await createNotifications.proposalAccepted({
        id: id,
        clientName: proposal?.clientName,
      });
      setShowSuccess(true);
    } catch (err) {
      console.error('Error accepting proposal:', err);
      setError('Failed to accept proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '₱0';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-PH', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTierPrice = (tier) => {
    const prices = {
      starter: { min: 500, max: 800 },
      growth: { min: 1000, max: 2000 },
      business: { min: 3000, max: 5000 },
      enterprise: { min: 8000, max: 15000 },
    };
    return prices[tier] || { min: 0, max: 0 };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading proposal...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Proposal Accepted!</h2>
          <p className="text-gray-300 mb-4">
            Thank you for accepting the proposal. We'll send you payment instructions shortly.
          </p>
          <p className="text-gray-400 text-sm">
            Check your email or Facebook for the payment details.
          </p>
        </div>
      </div>
    );
  }

  const aiAssessment = proposal?.aiAssessment || {};
  const tierPrice = getTierPrice(proposal?.saasTier);

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">{agencyName}</h1>
          <p className="text-gray-400 text-lg">Project Proposal</p>
          <p className="text-gray-500 text-sm mt-2">Date: {formatDate(proposal?.createdAt)}</p>
          <p className="text-gray-500 text-sm">Proposal ID: {id.slice(0, 8)}</p>
        </div>

        {/* Section 1 - Client Info */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-2">Client Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Client Name</p>
              <p className="text-white">{proposal?.clientName || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Business Name</p>
              <p className="text-white">{proposal?.businessName || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Email</p>
              <p className="text-white">{proposal?.email || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Phone</p>
              <p className="text-white">{proposal?.phone || '-'}</p>
            </div>
          </div>
        </div>

        {/* Section 2 - Project Scope */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-2">Project Scope</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-gray-400 text-sm">Project Type</p>
              <p className="text-white">{aiAssessment?.projectType || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Complexity</p>
              <p className="text-white capitalize">{aiAssessment?.complexity || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Estimated Completion</p>
              <p className="text-white">{aiAssessment?.estimatedDays || '-'} days</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-gray-400 text-sm mb-2">Services Needed</p>
            <div className="flex flex-wrap gap-2">
              {proposal?.servicesNeeded?.map((service, index) => (
                <span key={index} className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm">
                  {service}
                </span>
              )) || '-'}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-gray-400 text-sm mb-2">Scope Summary</p>
            <p className="text-white">{aiAssessment?.scopeSummary || '-'}</p>
          </div>

          <div>
            <p className="text-gray-400 text-sm mb-2">Technologies to be Used</p>
            <div className="flex flex-wrap gap-2">
              {aiAssessment?.technologiesNeeded?.map((tech, index) => (
                <span key={index} className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-sm">
                  {tech}
                </span>
              )) || '-'}
            </div>
          </div>
        </div>

        {/* Section 3 - Investment */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-lg p-6 mb-6 border border-gray-600">
          <h2 className="text-xl font-semibold text-white mb-4 border-b border-gray-600 pb-2">Investment</h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Total Project Cost</span>
              <span className="text-2xl font-bold text-green-400">{formatCurrency(aiAssessment?.suggestedPrice)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Downpayment (50%)</span>
              <span className="text-white font-semibold">{formatCurrency(aiAssessment?.downpayment)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Final Payment (50%)</span>
              <span className="text-white font-semibold">{formatCurrency(aiAssessment?.finalPayment)}</span>
            </div>

            {proposal?.paymentPreference === 'saas' && (
              <div className="pt-4 border-t border-gray-600 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Monthly SaaS Fee</span>
                  <span className="text-white font-semibold">
                    {formatCurrency(tierPrice.min)} - {formatCurrency(tierPrice.max)}/month
                  </span>
                </div>
                <p className="text-gray-400 text-sm mt-1">
                  Tier: {proposal?.saasTier?.charAt(0).toUpperCase() + proposal?.saasTier?.slice(1)}
                </p>
              </div>
            )}

            {proposal?.paymentPreference === 'build-only' && (
              <div className="pt-4 border-t border-gray-600 mt-4">
                <p className="text-gray-400">No monthly fees</p>
              </div>
            )}
          </div>
        </div>

        {/* Section 4 - Terms & Conditions */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 border-b border-gray-700 pb-2">Terms & Conditions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Scope of work is limited to what is described in this proposal only.</li>
            <li>Training and technical support are NOT included unless under a SaaS plan.</li>
            <li>Maintenance, bug fixes after delivery, and updates are NOT included in Build Only plan.</li>
            <li>50% downpayment is required before work begins. Downpayment is non-refundable.</li>
            <li>Remaining 50% is due upon project delivery.</li>
            <li>Client owns the code after full payment.</li>
            <li>Estimated timeline starts upon receipt of downpayment.</li>
            <li>Developer is not liable for issues caused by client modifications after delivery.</li>
            <li>SaaS monthly fee is billed every month. 30-day notice required for cancellation.</li>
            <li>Revisions are limited to 2 rounds only. Additional revisions charged separately.</li>
          </ol>
        </div>

        {/* Section 5 - Agreement */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Agreement</h2>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="w-5 h-5 mt-1 text-blue-500 rounded"
              />
              <span className="text-gray-300">
                I have read and agree to the Terms and Conditions
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToScope}
                onChange={(e) => setAgreedToScope(e.target.checked)}
                className="w-5 h-5 mt-1 text-blue-500 rounded"
              />
              <span className="text-gray-300">
                I understand what is and is NOT included in this proposal
              </span>
            </label>
          </div>

          <button
            onClick={handleAccept}
            disabled={!agreedToTerms || !agreedToScope || isSubmitting}
            className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Processing...' : 'Accept Proposal'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Proposal;
