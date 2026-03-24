import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { createNotifications } from '../../utils/notifications';

const Discovery = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [projectData, setProjectData] = useState(null);
    const [error, setError] = useState('');

    const totalSteps = 4;
    const progressPercent = (currentStep / totalSteps) * 100;

    const [formData, setFormData] = useState({
        // Step 1 - Business Process
        currentProcess: '',
        toolsUsed: [],
        painPoints: '',

        // Step 2 - Workflow Details
        workflowSteps: [''],
        roles: [{ role: '', task: '' }],
        approvalFlowNeeded: 'no',
        approvalFlowDescription: '',
        emergencyHandling: '',

        // Step 3 - Technical Requirements
        userRoles: [],
        devicePreferences: [],
        internetAvailability: '',
        dataVolume: '',

        // Step 4 - Feature Priorities
        suggestedFeatures: [],
        featurePriorities: {},
        additionalFeatures: '',
    });

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const projectDoc = await getDoc(doc(db, 'projects', id));
                if (!projectDoc.exists()) {
                    setError('Project not found. Please check your link.');
                    return;
                }

                const data = projectDoc.data();
                setProjectData(data);

                // Check if discovery is already completed
                if (data.discovery?.completed) {
                    setError('You have already completed the discovery form.');
                    return;
                }

                // Pre-populate feature suggestions based on AI assessment
                if (data.aiAssessment?.technologiesNeeded) {
                    setFormData(prev => ({
                        ...prev,
                        suggestedFeatures: getSuggestedFeatures(data.servicesNeeded || [], data.aiAssessment),
                    }));
                }
            } catch (err) {
                console.error('Error fetching project:', err);
                setError('Failed to load project data.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProject();
    }, [id]);

    const getSuggestedFeatures = (services, assessment) => {
        const featureMap = {
            'Website / Landing Page': [
                { id: 'homepage', name: 'Homepage with hero section' },
                { id: 'about', name: 'About Us page' },
                { id: 'services', name: 'Services/Pricing page' },
                { id: 'contact', name: 'Contact form' },
                { id: 'blog', name: 'Blog/News section' },
                { id: 'gallery', name: 'Portfolio/Gallery' },
                { id: 'faq', name: 'FAQ section' },
                { id: 'testimonials', name: 'Testimonials' },
            ],
            'Inventory System': [
                { id: 'dashboard', name: 'Dashboard with metrics' },
                { id: 'products', name: 'Product management' },
                { id: 'stock', name: 'Stock tracking' },
                { id: 'suppliers', name: 'Supplier management' },
                { id: 'orders', name: 'Purchase orders' },
                { id: 'alerts', name: 'Low stock alerts' },
                { id: 'reports', name: 'Reports & analytics' },
                { id: 'barcode', name: 'Barcode scanning' },
            ],
            'Appointment Booking': [
                { id: 'calendar', name: 'Interactive calendar' },
                { id: 'booking', name: 'Online booking widget' },
                { id: 'slots', name: 'Time slot management' },
                { id: 'reminders', name: 'SMS/Email reminders' },
                { id: 'staff', name: 'Staff scheduling' },
                { id: 'cancellation', name: 'Cancellation policy' },
                { id: 'reviews', name: 'Customer reviews' },
                { id: 'packages', name: 'Service packages' },
            ],
            'Payroll / HR System': [
                { id: 'employees', name: 'Employee database' },
                { id: 'attendance', name: 'Attendance tracking' },
                { id: 'payroll', name: 'Payroll calculation' },
                { id: 'deductions', name: 'Benefits & deductions' },
                { id: 'leave', name: 'Leave management' },
                { id: 'performance', name: 'Performance reviews' },
                { id: 'contracts', name: 'Contract management' },
                { id: 'reports', name: 'HR reports' },
            ],
            'POS System': [
                { id: 'pos', name: 'POS interface' },
                { id: 'products', name: 'Product catalog' },
                { id: 'cart', name: 'Cart management' },
                { id: 'payments', name: 'Payment processing' },
                { id: 'receipts', name: 'Receipt generation' },
                { id: 'inventory', name: 'Inventory sync' },
                { id: 'reports', name: 'Sales reports' },
                { id: 'loyalty', name: 'Customer loyalty' },
            ],
            'Paper to Digital Forms': [
                { id: 'forms', name: 'Digital form builder' },
                { id: 'submissions', name: 'Form submissions' },
                { id: 'validation', name: 'Data validation' },
                { id: 'approval', name: 'Approval workflow' },
                { id: 'export', name: 'Data export' },
                { id: 'templates', name: 'Form templates' },
                { id: 'signatures', name: 'E-signatures' },
                { id: 'notifications', name: 'Form notifications' },
            ],
        };

        let features = [];
        services.forEach(service => {
            if (featureMap[service]) {
                features = [...features, ...featureMap[service]];
            }
        });

        // Deduplicate by id
        const unique = [];
        const seen = new Set();
        features.forEach(f => {
            if (!seen.has(f.id)) {
                seen.add(f.id);
                unique.push(f);
            }
        });

        return unique;
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCheckboxChange = (field, value) => {
        setFormData(prev => {
            const current = prev[field] || [];
            if (current.includes(value)) {
                return { ...prev, [field]: current.filter(v => v !== value) };
            }
            return { ...prev, [field]: [...current, value] };
        });
    };

    const handleFeaturePriorityChange = (featureId, priority) => {
        setFormData(prev => ({
            ...prev,
            featurePriorities: { ...prev.featurePriorities, [featureId]: priority },
        }));
    };

    // Workflow steps management
    const addWorkflowStep = () => {
        setFormData(prev => ({
            ...prev,
            workflowSteps: [...prev.workflowSteps, ''],
        }));
    };

    const removeWorkflowStep = (index) => {
        setFormData(prev => ({
            ...prev,
            workflowSteps: prev.workflowSteps.filter((_, i) => i !== index),
        }));
    };

    const updateWorkflowStep = (index, value) => {
        setFormData(prev => {
            const newSteps = [...prev.workflowSteps];
            newSteps[index] = value;
            return { ...prev, workflowSteps: newSteps };
        });
    };

    // Roles management
    const addRole = () => {
        setFormData(prev => ({
            ...prev,
            roles: [...prev.roles, { role: '', task: '' }],
        }));
    };

    const removeRole = (index) => {
        setFormData(prev => ({
            ...prev,
            roles: prev.roles.filter((_, i) => i !== index),
        }));
    };

    const updateRole = (index, field, value) => {
        setFormData(prev => {
            const newRoles = [...prev.roles];
            newRoles[index] = { ...newRoles[index], [field]: value };
            return { ...prev, roles: newRoles };
        });
    };

    const validateStep = (step) => {
        switch (step) {
            case 1:
                return formData.currentProcess.trim() !== '';
            case 2:
                return formData.workflowSteps.some(s => s.trim() !== '');
            case 3:
                return formData.userRoles.length > 0 && formData.internetAvailability && formData.dataVolume;
            case 4:
                return Object.keys(formData.featurePriorities).length > 0;
            default:
                return true;
        }
    };

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, totalSteps));
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleSubmit = async () => {
        if (!validateStep(4)) {
            setError('Please rank at least one feature before submitting.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await updateDoc(doc(db, 'projects', id), {
                discovery: {
                    ...formData,
                    completed: true,
                },
                discoveryCompletedAt: serverTimestamp(),
                status: 'discovery_completed',
            });

            // Create notification for discovery completion
            await createNotifications.discoveryCompleted({
                id: id,
                clientName: projectData.clientName,
                businessName: projectData.businessName,
            });

            navigate(`/delivery/${id}?step=discovery-complete`);
        } catch (err) {
            console.error('Error saving discovery:', err);
            setError('Failed to save your responses. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-lg p-8 max-w-md text-center">
                    <div className="text-4xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-white mb-4">Error</h2>
                    <p className="text-gray-300 mb-6">{error}</p>
                    <Link to="/" className="text-blue-400 hover:text-blue-300">Go to Homepage</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Business Discovery Form</h1>
                    <p className="text-gray-400">
                        Help us understand your business to build the perfect system for you
                    </p>
                    {projectData && (
                        <p className="text-blue-400 mt-2">
                            {projectData.businessName} - {projectData.clientName}
                        </p>
                    )}
                </div>

                {/* Progress Steps */}
                <div className="mb-8">
                    <div className="flex justify-between mb-2">
                        {['Business Process', 'Workflow', 'Technical', 'Features'].map((label, idx) => (
                            <div key={idx} className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${idx + 1 < currentStep ? 'bg-green-500 text-white' :
                                    idx + 1 === currentStep ? 'bg-blue-600 text-white' :
                                        'bg-gray-700 text-gray-400'
                                    }`}>
                                    {idx + 1 < currentStep ? '✓' : idx + 1}
                                </div>
                                <span className={`text-xs mt-1 hidden sm:block ${idx + 1 === currentStep ? 'text-blue-400' : 'text-gray-500'}`}>
                                    {label}
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

                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {/* Step 1 - Business Process */}
                {currentStep === 1 && (
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-white mb-6">Step 1: Business Process</h2>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Describe your current business process <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={formData.currentProcess}
                                onChange={(e) => handleInputChange('currentProcess', e.target.value)}
                                rows={4}
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                                placeholder="Tell us how you currently handle your business operations day-to-day..."
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                What tools do you currently use?
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {['Excel', 'Paper Logbook', 'Messenger', 'Google Sheets', 'Manual Counting', 'Other'].map((tool) => (
                                    <label key={tool} className="flex items-center gap-2 p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600">
                                        <input
                                            type="checkbox"
                                            checked={formData.toolsUsed.includes(tool)}
                                            onChange={() => handleCheckboxChange('toolsUsed', tool)}
                                            className="w-4 h-4 text-blue-500 rounded"
                                        />
                                        <span className="text-white text-sm">{tool}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                What are the pain points with your current process?
                            </label>
                            <textarea
                                value={formData.painPoints}
                                onChange={(e) => handleInputChange('painPoints', e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                                placeholder="What problems do you face with your current system?"
                            />
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={nextStep}
                                disabled={!validateStep(1)}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next Step →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2 - Workflow Details */}
                {currentStep === 2 && (
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-white mb-6">Step 2: Workflow Details</h2>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                What are the core steps in your workflow? <span className="text-red-500">*</span>
                            </label>
                            {formData.workflowSteps.map((step, index) => (
                                <div key={index} className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={step}
                                        onChange={(e) => updateWorkflowStep(index, e.target.value)}
                                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                                        placeholder={`Step ${index + 1}...`}
                                    />
                                    {formData.workflowSteps.length > 1 && (
                                        <button
                                            onClick={() => removeWorkflowStep(index)}
                                            className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={addWorkflowStep}
                                className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
                            >
                                + Add another step
                            </button>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Who does what? (Role & Task pairs)
                            </label>
                            {formData.roles.map((role, index) => (
                                <div key={index} className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={role.role}
                                        onChange={(e) => updateRole(index, 'role', e.target.value)}
                                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                                        placeholder="Role (e.g., Cashier)"
                                    />
                                    <input
                                        type="text"
                                        value={role.task}
                                        onChange={(e) => updateRole(index, 'task', e.target.value)}
                                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                                        placeholder="Task (e.g., processes payments)"
                                    />
                                    {formData.roles.length > 1 && (
                                        <button
                                            onClick={() => removeRole(index)}
                                            className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={addRole}
                                className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
                            >
                                + Add another role
                            </button>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Do you need approval flows?
                            </label>
                            <div className="flex gap-4 mb-2">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="approvalFlowNeeded"
                                        value="yes"
                                        checked={formData.approvalFlowNeeded === 'yes'}
                                        onChange={(e) => handleInputChange('approvalFlowNeeded', e.target.value)}
                                        className="w-4 h-4 text-blue-500"
                                    />
                                    <span className="text-white">Yes</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="approvalFlowNeeded"
                                        value="no"
                                        checked={formData.approvalFlowNeeded === 'no'}
                                        onChange={(e) => handleInputChange('approvalFlowNeeded', e.target.value)}
                                        className="w-4 h-4 text-blue-500"
                                    />
                                    <span className="text-white">No</span>
                                </label>
                            </div>
                            {formData.approvalFlowNeeded === 'yes' && (
                                <textarea
                                    value={formData.approvalFlowDescription}
                                    onChange={(e) => handleInputChange('approvalFlowDescription', e.target.value)}
                                    rows={2}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                                    placeholder="Describe the approval process..."
                                />
                            )}
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                How do you handle emergencies or exceptions?
                            </label>
                            <textarea
                                value={formData.emergencyHandling}
                                onChange={(e) => handleInputChange('emergencyHandling', e.target.value)}
                                rows={2}
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                                placeholder="Describe how you handle special cases..."
                            />
                        </div>

                        <div className="flex justify-between">
                            <button
                                onClick={prevStep}
                                className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium"
                            >
                                ← Previous
                            </button>
                            <button
                                onClick={nextStep}
                                disabled={!validateStep(2)}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next Step →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3 - Technical Requirements */}
                {currentStep === 3 && (
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-white mb-6">Step 3: Technical Requirements</h2>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                What user roles do you need? <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {['Admin', 'Staff', 'Manager', 'Cashier', 'Customer', 'Other'].map((role) => (
                                    <label key={role} className="flex items-center gap-2 p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600">
                                        <input
                                            type="checkbox"
                                            checked={formData.userRoles.includes(role)}
                                            onChange={() => handleCheckboxChange('userRoles', role)}
                                            className="w-4 h-4 text-blue-500 rounded"
                                        />
                                        <span className="text-white text-sm">{role}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                What devices will users use?
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {['Desktop PC', 'Laptop', 'Phone', 'Tablet'].map((device) => (
                                    <label key={device} className="flex items-center gap-2 p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600">
                                        <input
                                            type="checkbox"
                                            checked={formData.devicePreferences.includes(device)}
                                            onChange={() => handleCheckboxChange('devicePreferences', device)}
                                            className="w-4 h-4 text-blue-500 rounded"
                                        />
                                        <span className="text-white text-sm">{device}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Internet availability <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {['Always', 'Sometimes', 'Rarely'].map((option) => (
                                    <label key={option} className="flex items-center justify-center p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600">
                                        <input
                                            type="radio"
                                            name="internetAvailability"
                                            value={option}
                                            checked={formData.internetAvailability === option}
                                            onChange={(e) => handleInputChange('internetAvailability', e.target.value)}
                                            className="w-4 h-4 text-blue-500"
                                        />
                                        <span className="text-white ml-2">{option}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Expected data volume <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {['Small', 'Medium', 'Large'].map((option) => (
                                    <label key={option} className="flex items-center justify-center p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600">
                                        <input
                                            type="radio"
                                            name="dataVolume"
                                            value={option}
                                            checked={formData.dataVolume === option}
                                            onChange={(e) => handleInputChange('dataVolume', e.target.value)}
                                            className="w-4 h-4 text-blue-500"
                                        />
                                        <span className="text-white ml-2">{option}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-gray-400 text-sm mt-2">
                                Small: &lt;1000 records | Medium: 1000-10000 records | Large: 10000+ records
                            </p>
                        </div>

                        <div className="flex justify-between">
                            <button
                                onClick={prevStep}
                                className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium"
                            >
                                ← Previous
                            </button>
                            <button
                                onClick={nextStep}
                                disabled={!validateStep(3)}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next Step →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4 - Feature Priorities */}
                {currentStep === 4 && (
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-white mb-6">Step 4: Feature Priorities</h2>

                        {formData.suggestedFeatures.length > 0 ? (
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-300 mb-4">
                                    Rank these features for your project <span className="text-red-500">*</span>
                                </label>
                                <div className="space-y-3">
                                    {formData.suggestedFeatures.map((feature) => (
                                        <div key={feature.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                                            <span className="text-white">{feature.name}</span>
                                            <div className="flex gap-2">
                                                {['Must Have', 'Nice to Have', 'Not Needed'].map((priority) => (
                                                    <button
                                                        key={priority}
                                                        onClick={() => handleFeaturePriorityChange(feature.id, priority)}
                                                        className={`px-3 py-1 text-xs rounded transition-colors ${formData.featurePriorities[feature.id] === priority
                                                            ? priority === 'Must Have'
                                                                ? 'bg-red-600 text-white'
                                                                : priority === 'Nice to Have'
                                                                    ? 'bg-yellow-600 text-white'
                                                                    : 'bg-gray-600 text-white'
                                                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                                                            }`}
                                                    >
                                                        {priority}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="mb-6 p-4 bg-gray-700 rounded-lg text-gray-400 text-center">
                                No specific features suggested for your project type. Skip to additional features.
                            </div>
                        )}

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Any additional features you'd like to include?
                            </label>
                            <textarea
                                value={formData.additionalFeatures}
                                onChange={(e) => handleInputChange('additionalFeatures', e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                                placeholder="Describe any other features you'd like..."
                            />
                        </div>

                        <div className="flex justify-between">
                            <button
                                onClick={prevStep}
                                className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium"
                            >
                                ← Previous
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !validateStep(4)}
                                className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Discovery Form'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Discovery;