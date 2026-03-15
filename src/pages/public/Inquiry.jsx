import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { assessInquiry } from '../../ai/cerebras';
import { getAgencyName } from '../../utils/settings';
import { createNotifications } from '../../utils/notifications';

const Inquiry = () => {
  const [formData, setFormData] = useState({
    // Section 1 - Personal Info
    fullName: '',
    businessName: '',
    email: '',
    phone: '',
    fbPage: '',
    // Section 2 - Business Info
    businessType: '',
    monthlyIncome: '',
    // Section 3 - Project Info
    services: [],
    projectDescription: '',
    timeline: '',
    // Section 4 - Service Type & Budget
    paymentType: '',
    budgetRange: '',
    selectedTier: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [agencyName, setAgencyName] = useState('CronzPH');
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const progressPercent = (currentStep / totalSteps) * 100;

  useEffect(() => {
    const fetchAgencyName = async () => {
      const name = await getAgencyName();
      setAgencyName(name);
    };
    fetchAgencyName();
  }, []);

  const businessTypes = [
    'Restaurant/Food',
    'Retail Shop',
    'Service Business',
    'Freelancer/Professional',
    'Corporate',
    'Other',
  ];

  const incomeBrackets = [
    'Below ₱50,000',
    '₱50,000 - ₱200,000',
    '₱200,000 - ₱500,000',
    '₱500,000+',
  ];

  const servicesList = [
    'Website / Landing Page',
    'Inventory System',
    'Appointment Booking System',
    'Paper to Digital Forms',
    'Payroll / HR System',
    'POS System',
    'Custom Automation',
    'Other',
  ];

  const timelines = [
    '1-2 weeks',
    '3-4 weeks',
    '1-2 months',
    'Flexible',
  ];

  const budgetRanges = [
    'Below ₱5,000',
    '₱5,000 - ₱15,000',
    '₱15,000 - ₱30,000',
    '₱30,000 - ₱50,000',
    '₱50,000 - ₱100,000',
    '₱100,000+',
    'Not sure yet',
  ];

  const saasTiers = [
    {
      id: 'starter',
      name: 'Starter',
      price: '₱500-800/month',
      description: 'For: Sari-sari store, solo freelancers, small online shops',
      includes: 'Hosting & uptime, critical bug fixes, 1 minor update/month, FB support (48hr response)',
    },
    {
      id: 'growth',
      name: 'Growth',
      price: '₱1,000-2,000/month',
      description: 'For: Restaurants, small retail, service businesses',
      includes: 'Everything in Starter + 3 minor updates/month, 1 major update/quarter, 24hr support, monthly analytics report',
    },
    {
      id: 'business',
      name: 'Business',
      price: '₱3,000-5,000/month',
      description: 'For: Medium businesses, multi-branch',
      includes: 'Everything in Growth + unlimited minor updates, 2 major updates/month, 12hr priority support, dedicated Messenger, AI-powered features, 1 new feature/month',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '₱8,000-15,000/month',
      description: 'For: Large businesses, corporations',
      includes: 'Everything in Business + unlimited major updates, 7-day support, weekly reports, new features on request, DB backup management',
    },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === 'paymentType' && value === 'build-only') {
      setFormData({ ...formData, paymentType: value, selectedTier: '' });
    }
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleCheckboxChange = (service) => {
    const newServices = formData.services.includes(service)
      ? formData.services.filter((s) => s !== service)
      : [...formData.services, service];
    setFormData({ ...formData, services: newServices });
    if (errors.services) {
      setErrors({ ...errors, services: '' });
    }
  };

  // Sanitize text: trim whitespace and strip HTML tags
  const sanitizeText = (value) => {
    return value.trim().replace(/<[^>]*>/g, '');
  };

  const validateForm = () => {
    const newErrors = {};

    // Section 1 - Personal Info
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    }
    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business Name is required';
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // PH phone format: 09XXXXXXXXX (11 digits starting with 09)
    const phoneRegex = /^09\d{9}$/;
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone Number is required';
    } else if (!phoneRegex.test(formData.phone.trim())) {
      newErrors.phone = 'Enter a valid PH mobile number (e.g. 09XXXXXXXXX)';
    }

    // Section 2 - Business Info
    if (!formData.businessType) newErrors.businessType = 'Business Type is required';
    if (!formData.monthlyIncome) newErrors.monthlyIncome = 'Monthly Income is required';

    // Section 3 - Project Info
    if (formData.services.length === 0) newErrors.services = 'Select at least one service';
    if (!formData.projectDescription.trim()) newErrors.projectDescription = 'Project Description is required';
    if (!formData.timeline) newErrors.timeline = 'Preferred Timeline is required';

    // Section 4 - Service Type & Budget
    if (!formData.paymentType) newErrors.paymentType = 'Payment Preference is required';
    if (!formData.budgetRange) newErrors.budgetRange = 'Budget Range is required';
    if (formData.paymentType === 'saas' && !formData.selectedTier) newErrors.selectedTier = 'Maintenance Tier is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^09\d{9}$/;
    return (
      formData.fullName.trim() &&
      formData.businessName.trim() &&
      emailRegex.test(formData.email.trim()) &&
      phoneRegex.test(formData.phone.trim()) &&
      formData.businessType &&
      formData.monthlyIncome &&
      formData.services.length > 0 &&
      formData.projectDescription.trim() &&
      formData.timeline &&
      formData.paymentType &&
      formData.budgetRange &&
      (formData.paymentType !== 'saas' || formData.selectedTier)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Save inquiry to Firestore (sanitize all text inputs before saving)
      const docRef = await addDoc(collection(db, 'projects'), {
        clientName: sanitizeText(formData.fullName),
        businessName: sanitizeText(formData.businessName),
        email: sanitizeText(formData.email),
        phone: sanitizeText(formData.phone),
        fbLink: sanitizeText(formData.fbPage),
        businessType: formData.businessType,
        monthlyRevenue: formData.monthlyIncome,
        servicesNeeded: formData.services,
        projectDescription: sanitizeText(formData.projectDescription),
        preferredTimeline: formData.timeline,
        paymentPreference: formData.paymentType,
        budgetRange: formData.budgetRange,
        saasTier: formData.selectedTier || null,
        status: 'inquiry',
        createdAt: serverTimestamp(),
      });

      // Create notification for new inquiry
      await createNotifications.newInquiry({ 
        id: docRef.id, 
        clientName: formData.fullName,
        businessName: formData.businessName,
      });

      // Try AI assessment
      try {
        const assessment = await assessInquiry({
          businessType: formData.businessType,
          servicesNeeded: formData.services,
          projectDescription: formData.projectDescription,
          preferredTimeline: formData.timeline,
          paymentPreference: formData.paymentType,
          monthlyRevenue: formData.monthlyIncome,
          budgetRange: formData.budgetRange,
          selectedTier: formData.selectedTier,
        });

        // Update with AI assessment
        await updateDoc(doc(db, 'projects', docRef.id), {
          aiAssessment: assessment,
          status: 'assessed',
          assessedAt: serverTimestamp(),
        });
      } catch (aiError) {
        console.error('AI assessment failed:', aiError);
        // Status remains "inquiry" if AI fails
      }

      // Clear the form
      setFormData({
        fullName: '',
        businessName: '',
        email: '',
        phone: '',
        fbPage: '',
        businessType: '',
        monthlyIncome: '',
        services: [],
        projectDescription: '',
        timeline: '',
        paymentType: '',
        budgetRange: '',
        selectedTier: '',
      });

      setShowSuccess(true);
    } catch (err) {
      console.error('Error submitting form:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Inquiry Submitted and Assessed!</h2>
          <p className="text-gray-300">
            Your inquiry has been submitted and assessed! We will send you a proposal via Facebook or email within 24 hours.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* CronzPH */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">{agencyName}</h1>
          <p className="text-gray-400 mt-2">Tell us about your project</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step < currentStep ? 'bg-green-500 text-white' :
                  step === currentStep ? 'bg-blue-600 text-white' :
                  'bg-gray-700 text-gray-400'
                }`}>
                  {step < currentStep ? '✓' : step}
                </div>
                <span className={`text-xs mt-1 hidden sm:block ${step === currentStep ? 'text-blue-400' : 'text-gray-500'}`}>
                  {step === 1 ? 'Personal' : step === 2 ? 'Business' : step === 3 ? 'Project' : 'Service'}
                </span>
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-blue-600 h-full transition-all duration-300" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Section 1 - Personal Info */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.businessName && <p className="text-red-500 text-sm mt-1">{errors.businessName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Facebook Page/Profile Link
                </label>
                <input
                  type="text"
                  name="fbPage"
                  value={formData.fbPage}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://facebook.com/yourpage"
                />
              </div>
            </div>
          </div>

          {/* Section 2 - Business Info */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Business Information</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Business Type <span className="text-red-500">*</span>
              </label>
              <select
                name="businessType"
                value={formData.businessType}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Business Type</option>
                {businessTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.businessType && <p className="text-red-500 text-sm mt-1">{errors.businessType}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Monthly Business Revenue <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {incomeBrackets.map((bracket) => (
                  <label key={bracket} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600">
                    <input
                      type="radio"
                      name="monthlyIncome"
                      value={bracket}
                      checked={formData.monthlyIncome === bracket}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-500"
                    />
                    <span className="text-white">{bracket}</span>
                  </label>
                ))}
              </div>
              {errors.monthlyIncome && <p className="text-red-500 text-sm mt-1">{errors.monthlyIncome}</p>}
            </div>
          </div>

          {/* Section 3 - Project Info */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Project Information</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Services Needed <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {servicesList.map((service) => (
                  <label key={service} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600">
                    <input
                      type="checkbox"
                      checked={formData.services.includes(service)}
                      onChange={() => handleCheckboxChange(service)}
                      className="w-4 h-4 text-blue-500 rounded"
                    />
                    <span className="text-white">{service}</span>
                  </label>
                ))}
              </div>
              {errors.services && <p className="text-red-500 text-sm mt-1">{errors.services}</p>}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Project Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="projectDescription"
                value={formData.projectDescription}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe what you need in detail..."
              />
              {errors.projectDescription && <p className="text-red-500 text-sm mt-1">{errors.projectDescription}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Preferred Timeline <span className="text-red-500">*</span>
              </label>
              <select
                name="timeline"
                value={formData.timeline}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Timeline</option>
                {timelines.map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
              {errors.timeline && <p className="text-red-500 text-sm mt-1">{errors.timeline}</p>}
            </div>
          </div>

          {/* Section 4 - Service Type & Budget */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Service Type</h2>
            
            {/* Budget Range */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                What is your estimated budget? <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {budgetRanges.map((range) => (
                  <label key={range} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600">
                    <input
                      type="radio"
                      name="budgetRange"
                      value={range}
                      checked={formData.budgetRange === range}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-500"
                    />
                    <span className="text-white">{range}</span>
                  </label>
                ))}
              </div>
              <p className="text-gray-400 text-sm mt-2">
                Don't worry — this is just an estimate. We'll work with your budget and suggest the best solution for your business.
              </p>
              {errors.budgetRange && <p className="text-red-500 text-sm mt-1">{errors.budgetRange}</p>}
            </div>

            {/* Payment Preference */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Preference <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600">
                  <input
                    type="radio"
                    name="paymentType"
                    value="build-only"
                    checked={formData.paymentType === 'build-only'}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-500 mt-1"
                  />
                  <div>
                    <span className="text-white font-medium">Build Only</span>
                    <p className="text-gray-400 text-sm">I will maintain it myself</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600">
                  <input
                    type="radio"
                    name="paymentType"
                    value="saas"
                    checked={formData.paymentType === 'saas'}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-500 mt-1"
                  />
                  <div>
                    <span className="text-white font-medium">Build + SaaS</span>
                    <p className="text-gray-400 text-sm">Monthly maintenance by developer</p>
                  </div>
                </label>
              </div>
              {errors.paymentType && <p className="text-red-500 text-sm mt-1">{errors.paymentType}</p>}
            </div>

            {/* SaaS Tier Selection */}
            {formData.paymentType === 'saas' && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Maintenance Tier <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  {saasTiers.map((tier) => (
                    <label 
                      key={tier.id} 
                      className={`flex items-start gap-3 p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 border-2 ${formData.selectedTier === tier.id ? 'border-blue-500' : 'border-transparent'}`}
                    >
                      <input
                        type="radio"
                        name="selectedTier"
                        value={tier.id}
                        checked={formData.selectedTier === tier.id}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-500 mt-1"
                      />
                      <div>
                        <span className="text-white font-medium">{tier.name} - {tier.price}</span>
                        <p className="text-gray-400 text-sm">{tier.description}</p>
                        <p className="text-blue-400 text-xs mt-1">Includes: {tier.includes}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.selectedTier && <p className="text-red-500 text-sm mt-1">{errors.selectedTier}</p>}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !isFormValid()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Inquiry'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Inquiry;
