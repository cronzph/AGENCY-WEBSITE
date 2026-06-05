import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, query, where, getDocs } from 'firebase/firestore';
import { createNotifications } from '../../utils/notifications';
import { getAgencyName } from '../../utils/settings';

// Logs a promo usage event to Firestore
const logPromoUsage = async ({ promoId, promoCode, projectId, clientName, email, templateName, discountType, discountValue }) => {
  try {
    await addDoc(collection(db, 'promoUsage'), {
      promoId,
      promoCode,
      projectId,
      clientName,
      email,
      templateName,
      discountType,
      discountValue,
      usedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to log promo usage:', err);
  }
};

const TemplateInquiryModal = ({ template, isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    preferredDate: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [inquiryRef, setInquiryRef] = useState('');
  const [agencyName, setAgencyName] = useState('CronzPH');

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState(null); // null | 'checking' | 'valid' | 'invalid'
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');

  useEffect(() => {
    const fetchName = async () => {
      const name = await getAgencyName();
      setAgencyName(name);
    };
    fetchName();
  }, []);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({ fullName: '', email: '', phone: '', preferredDate: '', notes: '' });
      setErrors({});
      setShowSuccess(false);
      setInquiryRef('');
      setPromoCode('');
      setPromoStatus(null);
      setAppliedPromo(null);
      setPromoError('');
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen || !template) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleApplyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    setPromoStatus('checking');
    setPromoError('');
    setAppliedPromo(null);

    try {
      const now = new Date();
      // Query by code field
      const promosQuery = query(
        collection(db, 'promos'),
        where('code', '==', code),
        where('active', '==', true)
      );
      const snap = await getDocs(promosQuery);

      if (snap.empty) {
        setPromoStatus('invalid');
        setPromoError('Invalid promo code. Please check and try again.');
        return;
      }

      const promoDoc = snap.docs[0];
      const promo = { id: promoDoc.id, ...promoDoc.data() };

      // Check expiry
      if (promo.endDate && new Date(promo.endDate) < now) {
        setPromoStatus('invalid');
        setPromoError('This promo code has already expired.');
        return;
      }

      // Check start date
      if (promo.startDate && new Date(promo.startDate) > now) {
        setPromoStatus('invalid');
        setPromoError('This promo code is not yet active.');
        return;
      }

      // Check slots
      if (promo.maxSlots && (promo.usedSlots || 0) >= promo.maxSlots) {
        setPromoStatus('invalid');
        setPromoError('Sorry, all slots for this promo have been claimed.');
        return;
      }

      // Check if applicable to this template
      if (promo.applicableTemplates?.length > 0 && !promo.applicableTemplates.includes(template.id)) {
        setPromoStatus('invalid');
        setPromoError('This promo code is not applicable to this template.');
        return;
      }

      setAppliedPromo(promo);
      setPromoStatus('valid');
    } catch (err) {
      console.error('Error validating promo:', err);
      setPromoStatus('invalid');
      setPromoError('Failed to validate promo code. Please try again.');
    }
  };

  const handleRemovePromo = () => {
    setPromoCode('');
    setPromoStatus(null);
    setAppliedPromo(null);
    setPromoError('');
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!emailRegex.test(formData.email.trim())) newErrors.email = 'Enter a valid email';
    const phoneRegex = /^09\d{9}$/;
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    else if (!phoneRegex.test(formData.phone.trim())) newErrors.phone = 'Enter a valid PH number (09XXXXXXXXX)';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      const payload = {
        source: 'template',
        templateId: template.id,
        templateName: template.name,
        templateCategory: template.category,
        clientName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        preferredSetupDate: formData.preferredDate || '',
        projectDescription: `Template Inquiry: ${template.name} — ${template.tagline}${formData.notes ? `\n\nAdditional Notes: ${formData.notes}` : ''}`,
        servicesNeeded: [`Template Setup — ${template.name}`],
        budgetRange: template.price,
        preferredTimeline: template.setupTime,
        paymentPreference: 'build-only',
        status: 'inquiry',
        clientType: 'business',
        notes: formData.notes || '',
        createdAt: serverTimestamp(),
        // Promo data
        promoCode: appliedPromo ? appliedPromo.code : null,
        promoId: appliedPromo ? appliedPromo.id : null,
        promoDiscount: appliedPromo ? {
          type: appliedPromo.discountType,
          value: appliedPromo.discountValue,
          title: appliedPromo.title,
        } : null,
      };

      const docRef = await addDoc(collection(db, 'projects'), payload);

      // Increment promo used slots and log usage if promo was applied
      if (appliedPromo) {
        try {
          await updateDoc(doc(db, 'promos', appliedPromo.id), {
            usedSlots: increment(1),
          });
        } catch (promoErr) {
          console.error('Failed to update promo slots:', promoErr);
        }
        // Log promo usage for history tracking
        await logPromoUsage({
          promoId: appliedPromo.id,
          promoCode: appliedPromo.code,
          projectId: docRef.id,
          clientName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          templateName: template.name,
          discountType: appliedPromo.discountType,
          discountValue: appliedPromo.discountValue,
        });
      }

      // Trigger notification
      try {
        await createNotifications.newInquiry({
          id: docRef.id,
          clientName: formData.fullName,
          businessName: `Template: ${template.name}`,
        });
      } catch (notifErr) {
        console.error('Notification failed:', notifErr);
      }

      setInquiryRef(docRef.id);
      setShowSuccess(true);
    } catch (err) {
      console.error('Template inquiry submission error:', err);
      setErrors({ submit: 'Something went wrong. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success State
  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div
          className="relative w-full max-w-md bg-gray-800 rounded-2xl p-8 text-center shadow-2xl border border-gray-700 animate-[fadeInUp_0.3s_ease-out]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Success Icon */}
          <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
            style={{ background: `${template.color}20` }}>
            <svg className="w-10 h-10" style={{ color: template.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h3 className="text-2xl font-bold text-white mb-2">Inquiry Submitted!</h3>
          <p className="text-gray-300 mb-1">
            Thank you for your interest in <span className="font-semibold text-white">{template.name}</span>
          </p>
          <p className="text-gray-400 text-sm mb-5">We'll get back to you within 24 hours to schedule your setup.</p>

          {appliedPromo && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-left">
              <p className="text-green-400 font-bold text-sm">
                🎟️ Promo Applied: {appliedPromo.discountType === 'percentage'
                  ? `${appliedPromo.discountValue}% OFF`
                  : `₱${appliedPromo.discountValue?.toLocaleString()} OFF`}
              </p>
              <p className="text-green-300/70 text-xs font-mono mt-0.5">{appliedPromo.code}</p>
            </div>
          )}

          {inquiryRef && (
            <div className="mb-6 p-4 bg-gray-900/60 rounded-xl border border-gray-700">
              <p className="text-gray-500 text-xs mb-1">Reference #</p>
              <p className="text-white font-mono text-lg font-bold">{inquiryRef}</p>
            </div>
          )}

          <a
            href="/portal/login"
            className="block w-full mb-3 py-3 rounded-xl font-semibold text-white text-center transition-all hover:opacity-90"
            style={{ background: template.color }}
          >
            Track Your Project →
          </a>
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-700 border-b-0 sm:border-b overflow-hidden animate-[fadeInUp_0.3s_ease-out] max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with template info */}
        <div className="relative px-4 sm:px-6 pt-5 pb-3 sm:pb-4 border-b border-gray-700 shrink-0">
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: template.color }} />
          {/* Drag handle for mobile */}
          <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-3 sm:hidden" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl shrink-0"
              style={{ background: `${template.color}20` }}
            >
              {template.category === 'E-commerce' ? '🛒' :
                template.category === 'POS' ? '💳' :
                  template.category === 'Landing Page' ? '🌐' : '☕'}
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-xl font-bold text-white leading-tight truncate pr-8">{template.name}</h3>
              <p className="text-xs sm:text-sm text-gray-400 truncate">{template.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="px-3 py-1 text-xs font-semibold rounded-full" style={{ background: `${template.color}20`, color: template.color }}>
              {template.setupTime} setup
            </span>
            {appliedPromo ? (
              <>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-700 text-gray-400 line-through">
                  {template.price}
                </span>
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                  🔥 {appliedPromo.discountType === 'percentage'
                    ? `${appliedPromo.discountValue}% OFF`
                    : `₱${appliedPromo.discountValue?.toLocaleString()} OFF`}
                </span>
              </>
            ) : (
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-500/15 text-green-400">
                {template.price}
              </span>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 overflow-y-auto flex-1">
          {errors.submit && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {errors.submit}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Juan Dela Cruz"
              className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:border-transparent transition-all"
              style={{ '--tw-ring-color': template.color, focusRingColor: template.color }}
            />
            {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@email.com"
                className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="09123456789"
                className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Preferred Setup Date <span className="text-gray-500 text-xs">(optional)</span>
            </label>
            <input
              type="date"
              name="preferredDate"
              value={formData.preferredDate}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Additional Notes <span className="text-gray-500 text-xs">(optional)</span>
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Any specific requirements, customizations, or questions..."
              className="w-full px-4 py-2.5 bg-gray-900/60 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Promo Code Field */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              🎟️ Promo Code <span className="text-gray-500 text-xs">(optional)</span>
            </label>
            {appliedPromo ? (
              /* Applied promo display */
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-green-400 font-bold text-sm">
                        {appliedPromo.discountType === 'percentage'
                          ? `${appliedPromo.discountValue}% OFF Applied!`
                          : `₱${appliedPromo.discountValue?.toLocaleString()} OFF Applied!`}
                      </p>
                      <p className="text-green-300/70 text-xs font-mono">{appliedPromo.code}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="text-gray-400 hover:text-red-400 transition-colors text-xs underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col xs:flex-row gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase());
                    setPromoError('');
                    setPromoStatus(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyPromo())}
                  placeholder="e.g. SAVE30"
                  className="flex-1 w-full px-4 py-3 bg-gray-900/60 border border-gray-600 rounded-xl text-white font-mono placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all uppercase text-sm"
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  disabled={!promoCode.trim() || promoStatus === 'checking'}
                  className="w-full xs:w-auto px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-colors whitespace-nowrap flex items-center justify-center gap-2"
                >
                  {promoStatus === 'checking' ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Checking...
                    </>
                  ) : 'Apply'}
                </button>
              </div>
            )}
            {promoError && (
              <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {promoError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl font-bold text-white text-lg transition-all hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${template.color}, ${template.color}cc)` }}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting...
              </>
            ) : (
              <>
                Inquire This Template
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>

          <p className="text-center text-gray-500 text-xs pb-safe">
            We'll contact you within 24 hours to schedule your setup
          </p>
        </form>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pb-safe {
          padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
};

export default TemplateInquiryModal;
