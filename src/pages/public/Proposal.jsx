import { useState, useEffect, useRef } from 'react';
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
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

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
    // Validate checkboxes and signature
    if (!agreedToTerms) {
      alert('Please agree to the Terms & Conditions');
      return;
    }
    if (!agreedToScope) {
      alert('Please confirm you understand the Scope of Work');
      return;
    }

    // Check if signature canvas is not empty
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const hasSignature = imageData.data.some((value) => value !== 0);
      if (!hasSignature) {
        alert('Please draw your signature before accepting');
        return;
      }
    }

    setSigning(true);
    try {
      // Get signature as data URL
      const signatureDataUrl = canvas.toDataURL('image/png');

      // Update project with signature
      const docRef = doc(db, 'projects', id);
      await updateDoc(docRef, {
        clientSignature: signatureDataUrl,
        signedAt: new Date().toISOString(),
        signerName: proposal?.clientName || proposal?.fullName || 'Client',
        status: 'proposal_accepted',
        proposalAcceptedAt: new Date(),
      });

      // Create notification
      await createNotifications.proposalAccepted({
        id: id,
        clientName: proposal?.clientName,
      });
      setSigned(true);
    } catch (err) {
      console.error('Error accepting proposal:', err);
      setError('Failed to accept proposal');
    } finally {
      setSigning(false);
    }
  };

  // Canvas drawing handlers
  const getCanvasCoords = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasCoords(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCanvasCoords(e, canvas);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
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

  // Build effective proposal data: use generated proposalData if available,
  // otherwise construct a fallback from aiAssessment so old proposals still render
  const rawProposalData = proposal?.proposalData;
  const aiAssessment = proposal?.aiAssessment || {};
  const tierPrice = getTierPrice(proposal?.saasTier);

  const proposalData = rawProposalData || (Object.keys(aiAssessment).length > 0 ? {
    projectTitle: `${proposal?.businessName || 'Project'} — ${aiAssessment.projectType || 'Web Development'}`,
    subtitle: aiAssessment.scopeSummary || 'Custom web solution for your business.',
    investmentSummary: {
      totalCost: aiAssessment.suggestedPrice || 0,
      downpayment: aiAssessment.downpayment || 0,
      finalPayment: aiAssessment.finalPayment || 0,
      paymentMethods: 'GCash / Maya / Bank Transfer',
    },
    pricingBreakdown: [
      { module: 'Design & Development', price: Math.round((aiAssessment.suggestedPrice || 0) * 0.6) },
      { module: 'Testing & QA', price: Math.round((aiAssessment.suggestedPrice || 0) * 0.2) },
      { module: 'Deployment & Setup', price: Math.round((aiAssessment.suggestedPrice || 0) * 0.2) },
    ],
    timeline: [
      { milestone: 'Design & Planning', duration: '3–5 days' },
      { milestone: 'Development', duration: `${aiAssessment.estimatedDays || 14} days` },
      { milestone: 'Testing & Revisions', duration: '3–5 days' },
      { milestone: 'Launch & Handover', duration: '1–2 days' },
    ],
    scopeOfWork: proposal?.servicesNeeded?.length > 0 ? [
      {
        category: 'Services Included',
        icon: '🛠️',
        items: proposal.servicesNeeded,
      },
      {
        category: 'Tech Stack',
        icon: '⚙️',
        items: aiAssessment.technologiesNeeded || ['React', 'Firebase', 'Vercel'],
      },
    ] : [],
    outOfScope: [
      { category: 'Not Included', items: ['Ongoing maintenance (unless SaaS plan)', 'Content writing', 'Third-party integrations not specified'] },
    ],
    revisionPolicy: { roundsIncluded: 2, revisionWindow: '14 days after delivery', additionalCost: '₱500 per round' },
    bugPolicy: [
      { type: 'Critical / Core Broken', freePeriod: '30 days ✅', afterFree: '₱2,500+' },
      { type: 'Minor / UI Issues', freePeriod: '30 days ✅', afterFree: 'FREE' },
    ],
    assumptions: aiAssessment.warnings?.length > 0 ? aiAssessment.warnings : ['Stable internet required', 'Client provides content within 3 days', 'Firebase free tier limits apply'],
    termsAndConditions: [
      'Scope is limited to what is described in this proposal.',
      '50% downpayment required before work begins. Non-refundable.',
      'Final 50% due upon delivery.',
      'Client owns the source code upon full payment.',
      'Timeline starts upon receipt of downpayment.',
      'Developer not liable for changes made by client after delivery.',
      'Revisions limited to 2 rounds. Additional revisions charged separately.',
    ],
  } : null);

  const currentDate = new Date();
  const currentMonthYear = currentDate.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

  // Calculate totals
  const pricingTotal = proposalData?.pricingBreakdown?.reduce((sum, item) => sum + (item.price || 0), 0) || 0;
  const timelineTotal = proposalData?.timeline?.reduce((sum, item) => {
    const match = item.duration?.match(/(\d+)/);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0) || 0;
  const timelineWeeks = Math.ceil(timelineTotal / 7);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-white text-xl">Loading proposal...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  if (signed || proposal?.clientSignature) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">✅ Proposal Accepted</h2>
          <p className="text-gray-300 mb-4">
            Thank you, {proposal?.clientName || proposal?.fullName || 'Client'}. We'll be in touch shortly to begin your project.
          </p>
          {proposal?.clientSignature && (
            <div className="mt-4 p-4 bg-white rounded-lg">
              <p className="text-gray-500 text-sm mb-2">Your Signature:</p>
              <img src={proposal.clientSignature} alt="Client Signature" className="max-h-20 mx-auto" />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!proposalData) {
    // Only hits this if project has neither proposalData nor aiAssessment
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Proposal Being Prepared</h2>
          <p className="text-gray-300">We're reviewing your inquiry. We'll send you the proposal details soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 1. HEADER */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{proposalData.projectTitle || 'Project Proposal'}</h1>
          <p className="text-xl text-gray-300 mb-4">{proposalData.subtitle || ''}</p>
          <p className="text-gray-500 text-sm">Prepared by CronzPH | {currentMonthYear}</p>
          <div className="mt-4 text-gray-400">
            <p><span className="text-gray-500">Client:</span> {proposal?.fullName || proposal?.clientName || '-'}</p>
            <p><span className="text-gray-500">Business:</span> {proposal?.businessName || '-'}</p>
          </div>
        </div>

        {/* 2. INVESTMENT SUMMARY (green-accented) */}
        <div className="mb-6">
          <div className="rounded-t-lg px-6 py-3 bg-green-600 font-bold text-white">Investment Summary</div>
          <div className="bg-gray-800 rounded-b-lg px-6 py-4">
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b border-gray-700">
                  <td className="py-3 text-gray-300">Total Project Cost</td>
                  <td className="py-3 text-right text-green-400 font-bold text-xl">{formatCurrency(proposalData.investmentSummary?.totalCost)}</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="py-3 text-gray-300">Downpayment (50%)</td>
                  <td className="py-3 text-right text-white font-semibold">{formatCurrency(proposalData.investmentSummary?.downpayment)}</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="py-3 text-gray-300">Final Payment</td>
                  <td className="py-3 text-right text-white font-semibold">{formatCurrency(proposalData.investmentSummary?.finalPayment)}</td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-300">Payment Methods</td>
                  <td className="py-3 text-right text-white">{proposalData.investmentSummary?.paymentMethods || 'GCash / Maya / Bank Transfer'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. PRICING BREAKDOWN (blue-accented) */}
        <div className="mb-6">
          <div className="rounded-t-lg px-6 py-3 bg-blue-600 font-bold text-white">Pricing Breakdown</div>
          <div className="bg-gray-800 rounded-b-lg px-6 py-4">
            <table className="w-full border-collapse">
              <tbody>
                {proposalData.pricingBreakdown?.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-700 last:border-0">
                    <td className="py-3 text-gray-300">{item.module}</td>
                    <td className="py-3 text-right text-white">{formatCurrency(item.price)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-600">
                  <td className="py-3 text-white font-bold">TOTAL</td>
                  <td className="py-3 text-right text-green-400 font-bold text-lg">{formatCurrency(pricingTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. TIMELINE (purple-accented) */}
        <div className="mb-6">
          <div className="rounded-t-lg px-6 py-3 bg-purple-600 font-bold text-white">Timeline</div>
          <div className="bg-gray-800 rounded-b-lg px-6 py-4">
            <table className="w-full border-collapse">
              <tbody>
                {proposalData.timeline?.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-700 last:border-0">
                    <td className="py-3 text-gray-300">{item.milestone}</td>
                    <td className="py-3 text-right text-white">{item.duration}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-600">
                  <td className="py-3 text-white font-bold">Total Duration</td>
                  <td className="py-3 text-right text-purple-400 font-bold text-lg">{timelineWeeks} weeks</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. SCOPE OF WORK (green-accented "✅ What's Included") */}
        <div className="mb-6">
          <div className="rounded-t-lg px-6 py-3 bg-green-600 font-bold text-white">✅ What's Included</div>
          <div className="bg-gray-800 rounded-b-lg px-6 py-4">
            {proposalData.scopeOfWork?.map((item, idx) => (
              <div key={idx} className="mb-4 last:mb-0">
                <h3 className="text-lg font-semibold text-white mb-2">{item.icon} {item.category}</h3>
                <ul className="space-y-1">
                  {item.items?.map((subItem, subIdx) => (
                    <li key={subIdx} className="text-gray-300 flex items-start gap-2">
                      <span className="text-green-400">✅</span>
                      <span>{subItem}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* 6. OUT OF SCOPE (red-accented "❌ What's Not Included") */}
        <div className="mb-6">
          <div className="rounded-t-lg px-6 py-3 bg-red-600 font-bold text-white">❌ What's Not Included</div>
          <div className="bg-gray-800 rounded-b-lg px-6 py-4">
            {proposalData.outOfScope?.map((item, idx) => (
              <div key={idx} className="mb-4 last:mb-0">
                <h3 className="text-lg font-semibold text-white mb-2">{item.category}</h3>
                <ul className="space-y-1">
                  {item.items?.map((subItem, subIdx) => (
                    <li key={subIdx} className="text-gray-300 flex items-start gap-2">
                      <span className="text-red-400">❌</span>
                      <span>{subItem}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* 7. REVISION POLICY */}
        <div className="mb-6">
          <div className="rounded-t-lg px-6 py-3 bg-gray-600 font-bold text-white">Revision Policy</div>
          <div className="bg-white/5 rounded-b-lg px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Rounds Included</p>
                <p className="text-white font-semibold">{proposalData.revisionPolicy?.roundsIncluded || 2} rounds</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Revision Window</p>
                <p className="text-white font-semibold">{proposalData.revisionPolicy?.revisionWindow || '14 days'} after each delivery</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Additional Cost</p>
                <p className="text-white font-semibold">{proposalData.revisionPolicy?.additionalCost || '₱500 per round'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 8. BUG SUPPORT POLICY */}
        <div className="mb-6">
          <div className="rounded-t-lg px-6 py-3 bg-gray-600 font-bold text-white">Bug Support Policy</div>
          <div className="bg-gray-800 rounded-b-lg px-6 py-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="py-3 text-left text-gray-400 font-medium">Bug Type</th>
                  <th className="py-3 text-left text-gray-400 font-medium">Free Support Period</th>
                  <th className="py-3 text-left text-gray-400 font-medium">After Free Period</th>
                </tr>
              </thead>
              <tbody>
                {proposalData.bugPolicy?.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-700 last:border-0">
                    <td className="py-3 text-white">{item.type}</td>
                    <td className="py-3 text-green-400">{item.freePeriod}</td>
                    <td className="py-3 text-gray-300">{item.afterFree}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 9. ASSUMPTIONS & LIMITATIONS (yellow-accented "⚠️") */}
        <div className="mb-6">
          <div className="rounded-t-lg px-6 py-3 bg-yellow-600 font-bold text-white">⚠️ Assumptions & Limitations</div>
          <div className="bg-gray-800 rounded-b-lg px-6 py-4">
            <ul className="space-y-2">
              {proposalData.assumptions?.map((item, idx) => (
                <li key={idx} className="text-gray-300 flex items-start gap-2">
                  <span className="text-yellow-400">⚠️</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 10. TERMS & CONDITIONS (gray-accented "⚖️") */}
        <div className="mb-6">
          <div className="rounded-t-lg px-6 py-3 bg-gray-600 font-bold text-white">⚖️ Terms & Conditions</div>
          <div className="bg-gray-800 rounded-b-lg px-6 py-4">
            <ol className="list-decimal list-inside space-y-2 text-gray-300">
              {proposalData.termsAndConditions?.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ol>
          </div>
        </div>

        {/* E-Signature Section */}
        <div id="signature-section" className="mb-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">🤝 Agreement</h2>

            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div>
                <p className="text-gray-400">Developer:</p>
                <p className="text-white font-semibold">CronzPH</p>
              </div>
              <div>
                <p className="text-gray-400">Client:</p>
                <p className="text-white font-semibold">{proposal?.clientName || proposal?.fullName || '-'}</p>
              </div>
              <div>
                <p className="text-gray-400">Project:</p>
                <p className="text-white font-semibold">{proposalData?.projectTitle || '-'}</p>
              </div>
              <div>
                <p className="text-gray-400">Date:</p>
                <p className="text-white font-semibold">{new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <div className="col-span-2">
                <p className="text-gray-400">Total:</p>
                <p className="text-green-400 font-bold text-lg">{formatCurrency(proposalData?.investmentSummary?.totalCost)}</p>
              </div>
            </div>

            {/* Canvas for signature */}
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">Draw Your Signature Here</p>
              <canvas
                ref={canvasRef}
                width={600}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="bg-white border-2 border-dashed border-gray-400 rounded-lg w-full h-40 cursor-crosshair"
              />
            </div>

            <button
              onClick={clearCanvas}
              className="text-sm text-gray-400 hover:text-white mb-6"
            >
              Clear Signature
            </button>

            {/* Checkboxes */}
            <div className="space-y-4 mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-5 h-5 mt-1 text-blue-500 rounded"
                />
                <span className="text-gray-300">
                  I agree to the Terms & Conditions
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
                  I understand the Scope of Work
                </span>
              </label>
            </div>

            {/* Accept Button */}
            <button
              onClick={handleAccept}
              disabled={signing}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signing ? 'Processing...' : 'Accept & Sign Proposal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Proposal;
