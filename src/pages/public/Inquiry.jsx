import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { assessInquiry } from '../../ai/cerebras';
import { getAgencyName } from '../../utils/settings';
import { createNotifications } from '../../utils/notifications';

const Inquiry = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit'); // null for new, project ID for edit

  const [formData, setFormData] = useState({
    clientType: '',
    fullName: '',
    businessName: '',
    studentProjectType: '',
    email: '',
    phone: '',
    services: [],
    projectDescription: '',
    timeline: '',
    paymentType: '',
    budgetRange: '',
    selectedTier: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [inquiryRef, setInquiryRef] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [agencyName, setAgencyName] = useState('CronzPH');
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const progressPercent = (currentStep / totalSteps) * 100;

  useEffect(() => {
    const fetchAgencyName = async () => {
      const name = await getAgencyName();
      setAgencyName(name);
    };
    fetchAgencyName();
  }, []);

  // If editing an existing inquiry, pre-fill the form
  useEffect(() => {
    if (!editId) return;
    const fetchExisting = async () => {
      try {
        const snap = await getDoc(doc(db, 'projects', editId));
        if (snap.exists()) {
          const d = snap.data();
          setFormData({
            clientType: d.clientType || '',
            fullName: d.clientName || '',
            businessName: d.businessName || '',
            studentProjectType: d.studentProjectType || '',
            email: d.email || '',
            phone: d.phone || '',
            services: d.servicesNeeded || [],
            projectDescription: d.projectDescription || '',
            timeline: d.preferredTimeline || '',
            paymentType: d.paymentPreference || '',
            budgetRange: d.budgetRange || '',
            selectedTier: d.saasTier || '',
          });
        }
      } catch (err) {
        console.error('Failed to load existing inquiry:', err);
      }
    };
    fetchExisting();
  }, [editId]);



  const servicesList = [
    'Website / Landing Page',
    'Inventory System',
    'Appointment Booking System',
    'Paper to Digital Forms',
    'Payroll / HR System',
    'POS System',
    'Custom Automation',
    'Capstone Project',
    'School Activity',
    'Simple Fix',
    'Other',
  ];

  const timelines = [
    'Rush (Less than 1 week)',
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
      price: '₱2,000-₱3,500/month',
      description: 'For: Sari-sari store, solo freelancers, small online shops',
      includes: 'Hosting & uptime, critical bug fixes, 1 minor update/month, FB support (48hr response)',
    },
    {
      id: 'growth',
      name: 'Growth',
      price: '₱5,000-₱8,000/month',
      description: 'For: Restaurants, small retail, service businesses',
      includes: 'Everything in Starter + 3 minor updates/month, 1 major update/quarter, 24hr support, monthly analytics report',
    },
    {
      id: 'business',
      name: 'Business',
      price: '₱15,000-₱25,000/month',
      description: 'For: Medium businesses, multi-branch',
      includes: 'Everything in Growth + unlimited minor updates, 2 major updates/month, 12hr priority support, AI features, 1 new feature/month',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '₱30,000-₱50,000/month',
      description: 'For: Large businesses, corporations',
      includes: 'Everything in Business + unlimited major updates, 7-day support, weekly reports, features on request, DB backup management',
    },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let updated = { ...formData, [name]: value };
    if (name === 'paymentType' && value === 'build-only') {
      updated = { ...formData, paymentType: value, selectedTier: '' };
    }
    // When switching client type, clear the irrelevant field
    if (name === 'clientType') {
      if (value === 'business') {
        updated.studentProjectType = '';
      } else if (value === 'student') {
        updated.businessName = '';
      }
    }
    setFormData(updated);
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
    if (!formData.clientType) {
      newErrors.clientType = 'Please select if you are a Business Owner or Student';
    }
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    }
    if (formData.clientType === 'business' && !formData.businessName.trim()) {
      newErrors.businessName = 'Business Name is required';
    }
    if (formData.clientType === 'student' && !formData.studentProjectType) {
      newErrors.studentProjectType = 'Please select your project type';
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

    // Section 2 - Project Info
    if (formData.services.length === 0) newErrors.services = 'Select at least one service';
    if (!formData.projectDescription.trim()) newErrors.projectDescription = 'Project Description is required';
    if (!formData.timeline) newErrors.timeline = 'Preferred Timeline is required';

    // Section 3 - Service Type & Budget
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
      formData.clientType &&
      formData.fullName.trim() &&
      (formData.clientType !== 'business' || formData.businessName.trim()) &&
      (formData.clientType !== 'student' || formData.studentProjectType) &&
      emailRegex.test(formData.email.trim()) &&
      phoneRegex.test(formData.phone.trim()) &&
      formData.services.length > 0 &&
      formData.projectDescription.trim() &&
      formData.timeline &&
      formData.paymentType &&
      formData.budgetRange &&
      (formData.paymentType !== 'saas' || formData.selectedTier)
    );
  };

  // Validate only the current step
  const validateStep = (step) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^09\d{9}$/;
    const newErrors = {};

    if (step === 1) {
      // Step 1: Personal Info
      if (!formData.clientType) newErrors.clientType = 'Please select if you are a Business Owner or Student';
      if (!formData.fullName?.trim()) newErrors.fullName = 'Full Name is required';
      if (formData.clientType === 'business' && !formData.businessName?.trim()) newErrors.businessName = 'Business Name is required';
      if (formData.clientType === 'student' && !formData.studentProjectType) newErrors.studentProjectType = 'Please select your project type';
      if (!formData.email?.trim()) newErrors.email = 'Email is required';
      else if (!emailRegex.test(formData.email.trim())) newErrors.email = 'Please enter a valid email';
      if (!formData.phone?.trim()) newErrors.phone = 'Phone number is required';
      else if (!phoneRegex.test(formData.phone.trim())) newErrors.phone = 'Please enter a valid phone (e.g., 09123456789)';
    } else if (step === 2) {
      // Step 2: Project Info
      if (formData.services.length === 0) newErrors.services = 'Select at least one service';
      if (!formData.projectDescription?.trim()) newErrors.projectDescription = 'Project Description is required';
      if (!formData.timeline) newErrors.timeline = 'Timeline is required';
    } else if (step === 3) {
      // Step 3: Service - require budget, payment type
      if (!formData.budgetRange) newErrors.budgetRange = 'Budget is required';
      if (!formData.paymentType) newErrors.paymentType = 'Payment Preference is required';
      if (formData.paymentType === 'saas' && !formData.selectedTier) newErrors.selectedTier = 'Please select a maintenance tier';
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;
    setIsSubmitting(true);

    const payload = {
      clientType: formData.clientType,
      clientName: sanitizeText(formData.fullName),
      businessName: formData.clientType === 'business' ? sanitizeText(formData.businessName) : '',
      studentProjectType: formData.clientType === 'student' ? formData.studentProjectType : '',
      email: sanitizeText(formData.email),
      phone: sanitizeText(formData.phone),
      servicesNeeded: formData.services,
      projectDescription: sanitizeText(formData.projectDescription),
      preferredTimeline: formData.timeline,
      paymentPreference: formData.paymentType,
      budgetRange: formData.budgetRange,
      saasTier: formData.selectedTier || null,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editId) {
        // --- EDIT MODE: update existing document ---
        await updateDoc(doc(db, 'projects', editId), payload);
        // Navigate back to portal
        navigate('/portal');
      } else {
        // --- CREATE MODE: new inquiry ---
        const docRef = await addDoc(collection(db, 'projects'), {
          ...payload,
          status: 'inquiry',
          createdAt: serverTimestamp(),
        });

        await createNotifications.newInquiry({
          id: docRef.id,
          clientName: formData.fullName,
          businessName: formData.businessName,
        });

        // Try AI assessment
        try {
          const assessment = await assessInquiry({
            servicesNeeded: formData.services,
            projectDescription: formData.projectDescription,
            preferredTimeline: formData.timeline,
            paymentPreference: formData.paymentType,
            budgetRange: formData.budgetRange,
            selectedTier: formData.selectedTier,
          });
          await updateDoc(doc(db, 'projects', docRef.id), {
            aiAssessment: assessment,
            status: 'assessed',
            assessedAt: serverTimestamp(),
          });
        } catch (aiError) {
          console.error('AI assessment failed:', aiError);
        }

        setShowSuccess(true);
        setInquiryRef(docRef.id);
      }
    } catch (err) {
      console.error('Error submitting form:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form to step 1
  const resetForm = () => {
    setFormData({
      clientType: '',
      fullName: '',
      businessName: '',
      studentProjectType: '',
      email: '',
      phone: '',
      businessType: '',
      monthlyIncome: '',
      services: [],
      projectDescription: '',
      timeline: '',
      paymentType: '',
      budgetRange: '',
      selectedTier: '',
    });
    setCurrentStep(1);
    setShowSuccess(false);
    setInquiryRef('');
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
          <h2 className="text-2xl font-bold text-white mb-4">Inquiry Submitted!</h2>
          <p className="text-gray-300 mb-4">
            Thank you for your inquiry! We'll be in touch soon.
          </p>
          {inquiryRef && (
            <div className="mb-6 p-4 bg-gray-700 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Your Reference #</p>
              <p className="text-white font-mono text-lg font-bold">{inquiryRef}</p>
            </div>
          )}
          <button
            onClick={() => navigate('/portal/login')}
            className="w-full mb-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Track Your Project Progress →
          </button>
          <p className="text-gray-400 text-sm mb-4">
            Log in with your email to check your project status anytime.
          </p>
          <button
            onClick={resetForm}
            className="w-full bg-gray-600 hover:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Submit Another Inquiry
          </button>
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
          <p className="text-gray-400 mt-2">{editId ? 'Edit Your Inquiry' : 'Tell us about your project'}</p>
          <p className="text-gray-500 text-sm mt-2">
            Already have a project?{' '}
            <Link to="/portal/login" className="text-blue-400 hover:text-blue-300 underline">
              Track your progress here
            </Link>
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${step < currentStep ? 'bg-green-500 text-white' :
                  step === currentStep ? 'bg-blue-600 text-white' :
                    'bg-gray-700 text-gray-400'
                  }`}>
                  {step < currentStep ? '✓' : step}
                </div>
                <span className={`text-xs mt-1 hidden sm:block ${step === currentStep ? 'text-blue-400' : 'text-gray-500'}`}>
                  {step === 1 ? 'Personal' : step === 2 ? 'Project' : 'Service'}
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
          {currentStep === 1 && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Personal Information</h2>

              {/* Client Type Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  I am a... <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer border-2 transition-all ${
                    formData.clientType === 'business'
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                  }`}>
                    <input
                      type="radio"
                      name="clientType"
                      value="business"
                      checked={formData.clientType === 'business'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-500"
                    />
                    <div>
                      <span className="font-medium">🏢 Business Owner</span>
                      <p className="text-xs text-gray-400">I need a system for my business</p>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer border-2 transition-all ${
                    formData.clientType === 'student'
                      ? 'bg-purple-600/20 border-purple-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                  }`}>
                    <input
                      type="radio"
                      name="clientType"
                      value="student"
                      checked={formData.clientType === 'student'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-purple-500"
                    />
                    <div>
                      <span className="font-medium">🎓 Student</span>
                      <p className="text-xs text-gray-400">I need help with a school project</p>
                    </div>
                  </label>
                </div>
                {errors.clientType && <p className="text-red-500 text-sm mt-1">{errors.clientType}</p>}
              </div>

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

                {/* Business Name - only for Business Owners */}
                {formData.clientType === 'business' && (
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
                      placeholder="Your business name"
                    />
                    {errors.businessName && <p className="text-red-500 text-sm mt-1">{errors.businessName}</p>}
                  </div>
                )}

                {/* Student Project Type - only for Students */}
                {formData.clientType === 'student' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Project Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="studentProjectType"
                      value={formData.studentProjectType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select project type</option>
                      <option value="Capstone Project">Capstone Project</option>
                      <option value="School Activity">School Activity</option>
                    </select>
                    {errors.studentProjectType && <p className="text-red-500 text-sm mt-1">{errors.studentProjectType}</p>}
                  </div>
                )}

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
              </div>
            </div>
          )}

          {/* Section 2 - Project Info */}
          {currentStep === 2 && (
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
          )}

          {/* Section 3 - Service Type & Budget */}
          {currentStep === 3 && (
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
                  <label className="flex items-start gap-3 p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600">
                    <input
                      type="radio"
                      name="paymentType"
                      value="student"
                      checked={formData.paymentType === 'student'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-500 mt-1"
                    />
                    <div>
                      <span className="text-white font-medium">Student/Capstone</span>
                      <p className="text-gray-400 text-sm">Special pricing for academic projects</p>
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
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-6">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Previous
              </button>
            )}
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={() => {
                  if (validateStep(currentStep)) {
                    setCurrentStep(currentStep + 1);
                  }
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting || !isFormValid()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (editId ? 'Updating...' : 'Submitting...') : (editId ? 'Update Inquiry' : 'Submit Inquiry')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Inquiry;
