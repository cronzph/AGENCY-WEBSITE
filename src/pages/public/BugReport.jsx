import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { analyzeBug } from '../../ai/bugRouter';
import { createNotifications } from '../../utils/notifications';

const BugReport = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        expectedBehavior: '',
        stepsToReproduce: [''],
        bugTypeHint: '',
        screenshot: '',
        pageUrl: '',
        device: '',
        browser: '',
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
                setProject(data);
            } catch (err) {
                console.error('Error fetching project:', err);
                setError('Failed to load project data.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProject();
    }, [id]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleStepChange = (index, value) => {
        const newSteps = [...formData.stepsToReproduce];
        newSteps[index] = value;
        setFormData(prev => ({ ...prev, stepsToReproduce: newSteps }));
    };

    const addStep = () => {
        setFormData(prev => ({ ...prev, stepsToReproduce: [...prev.stepsToReproduce, ''] }));
    };

    const removeStep = (index) => {
        if (formData.stepsToReproduce.length > 1) {
            const newSteps = formData.stepsToReproduce.filter((_, i) => i !== index);
            setFormData(prev => ({ ...prev, stepsToReproduce: newSteps }));
        }
    };

    const handleScreenshotChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, screenshot: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const validateForm = () => {
        return formData.title.trim() && formData.description.trim() && formData.expectedBehavior.trim();
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            setError('Please fill in all required fields.');
            return;
        }

        setIsSubmitting(true);
        setIsAnalyzing(true);
        setError('');
        setSuccess('');

        try {
            // Save bug report to Firestore subcollection
            const bugReportData = {
                ...formData,
                stepsToReproduce: formData.stepsToReproduce.filter(s => s.trim()),
                status: 'submitted',
                createdAt: serverTimestamp(),
                aiAnalysis: null,
                analyzedAt: null,
            };

            const bugRef = await addDoc(collection(db, 'projects', id, 'bugReports'), bugReportData);
            const bugId = bugRef.id;

            // Trigger AI classification and analysis
            try {
                console.log('Starting AI bug analysis...');
                const analysis = await analyzeBug(formData);
                console.log('Analysis complete:', analysis);

                // Update bug report with AI analysis
                await updateDoc(doc(db, 'projects', id, 'bugReports', bugId), {
                    aiAnalysis: analysis,
                    status: 'analyzed',
                    analyzedAt: serverTimestamp(),
                });

                // Update main status
                await updateDoc(doc(db, 'projects', id), {
                    lastBugReportAt: serverTimestamp(),
                });

                // Create notification
                await createNotifications.bugReportSubmitted(
                    { id, clientName: project.clientName, businessName: project.businessName },
                    { title: formData.title, id: bugId }
                );

                setSuccess('Bug report submitted and analyzed! We will get back to you soon.');
            } catch (aiError) {
                console.error('AI analysis failed:', aiError);
                // Still save the bug report even if AI fails
                await updateDoc(doc(db, 'projects', id, 'bugReports', bugId), {
                    status: 'submitted',
                    aiAnalysisError: aiError.message,
                });

                await createNotifications.bugReportSubmitted(
                    { id, clientName: project.clientName, businessName: project.businessName },
                    { title: formData.title, id: bugId }
                );

                setSuccess('Bug report submitted! Our team will review it manually.');
            }

            // Reset form
            setFormData({
                title: '',
                description: '',
                expectedBehavior: '',
                stepsToReproduce: [''],
                bugTypeHint: '',
                screenshot: '',
                pageUrl: '',
                device: '',
                browser: '',
            });

        } catch (err) {
            console.error('Error submitting bug report:', err);
            setError('Failed to submit bug report. Please try again.');
        } finally {
            setIsSubmitting(false);
            setIsAnalyzing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    if (error && !project) {
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
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Report a Bug</h1>
                    <p className="text-gray-400">
                        {project?.businessName} - {project?.clientName}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-500/20 border border-green-500 text-green-500 px-4 py-3 rounded-lg mb-6">
                        {success}
                    </div>
                )}

                {isAnalyzing && (
                    <div className="bg-blue-500/20 border border-blue-500 text-blue-500 px-4 py-3 rounded-lg mb-6">
                        🔄 Analyzing your bug report with AI...
                    </div>
                )}

                <div className="bg-gray-800 rounded-lg p-6 space-y-6">
                    {/* Bug Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Bug Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            placeholder="Brief description of the bug"
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Bug Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            What happened? <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows={3}
                            placeholder="Describe what went wrong in detail..."
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Expected Behavior */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            What should happen? <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            name="expectedBehavior"
                            value={formData.expectedBehavior}
                            onChange={handleInputChange}
                            rows={2}
                            placeholder="Describe what you expected to happen..."
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Steps to Reproduce */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Steps to Reproduce
                        </label>
                        {formData.stepsToReproduce.map((step, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                                <span className="text-gray-500 py-2">{index + 1}.</span>
                                <input
                                    type="text"
                                    value={step}
                                    onChange={(e) => handleStepChange(index, e.target.value)}
                                    placeholder={`Step ${index + 1}...`}
                                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                                />
                                {formData.stepsToReproduce.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeStep(index)}
                                        className="px-3 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addStep}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                            + Add another step
                        </button>
                    </div>

                    {/* Bug Type Hint */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            What seems to be the problem?
                        </label>
                        <div className="space-y-2">
                            {[
                                { value: 'visual', label: 'Something looks wrong visually' },
                                { value: 'functional', label: "Something doesn't work" },
                                { value: 'unsure', label: "I'm not sure" },
                            ].map((option) => (
                                <label key={option.value} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600">
                                    <input
                                        type="radio"
                                        name="bugTypeHint"
                                        value={option.value}
                                        checked={formData.bugTypeHint === option.value}
                                        onChange={handleInputChange}
                                        className="w-4 h-4 text-blue-500"
                                    />
                                    <span className="text-white">{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Screenshot */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Screenshot (optional)
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleScreenshotChange}
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer"
                        />
                        {formData.screenshot && (
                            <img src={formData.screenshot} alt="Screenshot preview" className="mt-2 max-h-40 rounded-lg" />
                        )}
                    </div>

                    {/* Page URL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Page/URL where bug occurs
                        </label>
                        <input
                            type="text"
                            name="pageUrl"
                            value={formData.pageUrl}
                            onChange={handleInputChange}
                            placeholder="e.g., /dashboard or https://..."
                            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Device */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Device used
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {['Desktop', 'Phone', 'Tablet'].map((device) => (
                                <label key={device} className="flex items-center justify-center p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600">
                                    <input
                                        type="radio"
                                        name="device"
                                        value={device}
                                        checked={formData.device === device}
                                        onChange={handleInputChange}
                                        className="w-4 h-4 text-blue-500"
                                    />
                                    <span className="text-white ml-2">{device}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Browser */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Browser
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {['Chrome', 'Safari', 'Firefox', 'Other'].map((browser) => (
                                <label key={browser} className="flex items-center justify-center p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600">
                                    <input
                                        type="radio"
                                        name="browser"
                                        value={browser}
                                        checked={formData.browser === browser}
                                        onChange={handleInputChange}
                                        className="w-4 h-4 text-blue-500"
                                    />
                                    <span className="text-white ml-2">{browser}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !validateForm()}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Bug Report'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BugReport;