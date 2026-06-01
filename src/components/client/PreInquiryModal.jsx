import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

const PreInquiryModal = ({ template, isOpen, onClose }) => {
    const [formData, setFormData] = useState({ fullName: '', email: '', phone: '' });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData({ fullName: '', email: '', phone: '' });
            setErrors({});
            setShowSuccess(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen || !template) return null;

    const validate = () => {
        const e = {};
        if (!formData.fullName.trim()) e.fullName = 'Name is required';
        if (!formData.email.trim()) e.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Invalid email address';
        if (formData.phone && !/^[0-9+\-\s()]{7,15}$/.test(formData.phone)) e.phone = 'Invalid phone number';
        return e;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: value }));
        if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        setIsSubmitting(true);
        try {
            // Check for duplicate email for this template
            const dupQ = query(
                collection(db, 'preInquiries'),
                where('templateId', '==', template.id),
                where('email', '==', formData.email.trim().toLowerCase())
            );
            const dupSnap = await getDocs(dupQ);
            if (!dupSnap.empty) {
                setErrors({ email: 'You\'ve already registered for this template!' });
                setIsSubmitting(false);
                return;
            }

            await addDoc(collection(db, 'preInquiries'), {
                templateId: template.id,
                templateName: template.name,
                fullName: formData.fullName.trim(),
                email: formData.email.trim().toLowerCase(),
                phone: formData.phone.trim() || null,
                createdAt: serverTimestamp(),
                notified: false,
            });

            setShowSuccess(true);
        } catch (err) {
            console.error(err);
            setErrors({ submit: 'Something went wrong. Please try again.' });
        }
        setIsSubmitting(false);
    };

    const color = template.color || '#3b82f6';

    if (showSuccess) {
        return (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                <div
                    className="relative w-full max-w-md bg-gray-800 rounded-t-2xl sm:rounded-2xl p-8 text-center shadow-2xl border border-gray-700 animate-[fadeInUp_0.3s_ease-out]"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center" style={{ background: `${color}20` }}>
                        <svg className="w-10 h-10" style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">You're on the list! 🎉</h3>
                    <p className="text-gray-300 mb-1">
                        We'll notify you as soon as <span className="font-semibold text-white">{template.name}</span> is available.
                    </p>
                    <p className="text-gray-400 text-sm mb-6">Check your email at <span className="text-blue-400 font-mono">{formData.email}</span></p>
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
                        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
                    >
                        Got it!
                    </button>
                </div>
                <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }`}</style>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div
                className="relative w-full max-w-md bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-gray-700 border-b-0 sm:border-b overflow-hidden animate-[fadeInUp_0.3s_ease-out] max-h-[92vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative px-4 sm:px-6 pt-5 pb-4 border-b border-gray-700 shrink-0">
                    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: color }} />
                    <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-3 sm:hidden" />
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Coming Soon badge */}
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl shrink-0" style={{ background: `${color}20` }}>
                            {template.category === 'E-commerce' ? '🛒' :
                                template.category === 'POS' ? '💳' :
                                    template.category === 'Landing Page' ? '🌐' : '☕'}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base sm:text-lg font-bold text-white truncate">{template.name}</h3>
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                                    🚧 Coming Soon
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-400 truncate">{template.tagline}</p>
                        </div>
                    </div>

                    {/* Info banner */}
                    <div className="p-3 rounded-xl border flex items-start gap-2.5" style={{ background: `${color}10`, borderColor: `${color}30` }}>
                        <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <p className="text-xs" style={{ color }}>
                            This template is not yet available. Register below and we'll notify you the moment it launches — you may even get an early-bird discount!
                        </p>
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
                            className="w-full px-4 py-3 bg-gray-900/60 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:border-transparent transition-all text-sm"
                            style={{ '--tw-ring-color': color }}
                        />
                        {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">
                            Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="you@email.com"
                            className="w-full px-4 py-3 bg-gray-900/60 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:border-transparent transition-all text-sm"
                            style={{ '--tw-ring-color': color }}
                        />
                        {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">
                            Phone <span className="text-gray-500 text-xs">(optional)</span>
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="09123456789"
                            className="w-full px-4 py-3 bg-gray-900/60 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:border-transparent transition-all text-sm"
                            style={{ '--tw-ring-color': color }}
                        />
                        {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3.5 rounded-xl font-bold text-white text-base transition-all hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Registering...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                Notify Me When Available
                            </>
                        )}
                    </button>

                    <p className="text-center text-gray-500 text-xs pb-safe">
                        We'll send you an email when this template launches
                    </p>
                </form>
            </div>

            <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
        .pb-safe { padding-bottom: max(0.5rem, env(safe-area-inset-bottom)); }
      `}</style>
        </div>
    );
};

export default PreInquiryModal;
