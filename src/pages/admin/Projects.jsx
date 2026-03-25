import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';

import { collection, query, onSnapshot, updateDoc, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import StatusBadge from '../../components/shared/StatusBadge';
import { useToast } from '../../components/shared/Toast';
import { callAIJson } from '../../ai/callAI';
import { generateProposal } from '../../utils/proposalGenerator';

const Projects = () => {
  const { showToast } = useToast();

  const [projects, setProjects] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [isSending, setIsSending] = useState(null);
  const [generatingId, setGeneratingId] = useState(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const projectsPerPage = 10;
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    scopeSummary: '',
    projectType: '',
    complexity: 'medium',
    estimatedDays: 30,
    suggestedPrice: 0,
    monthlySassPrice: 0,
    sassTier: 'starter',
    technologiesNeeded: [],
    warnings: [],
  });
  const [newTech, setNewTech] = useState('');
  const [newWarning, setNewWarning] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const emailFilter = searchParams.get('email');

  // Remove unused navItems since we now use AdminLayout
  // (kept for reference)
  // const navItems = [
  //   { path: '/admin', label: 'Dashboard' },
  //   { path: '/admin/clients', label: 'Clients' },
  //   { path: '/admin/projects', label: 'Projects' },
  //   { path: '/admin/payments', label: 'Payments' },
  //   { path: '/admin/settings', label: 'Settings' },
  // ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'inquiry', label: 'Inquiry' },
    { value: 'assessed', label: 'Assessed' },
    { value: 'proposal_sent', label: 'Proposal Sent' },
    { value: 'proposal_accepted', label: 'Proposal Accepted' },
    { value: 'awaiting_payment', label: 'Awaiting Payment' },
    { value: 'payment_submitted', label: 'Payment Submitted' },
    { value: 'payment_confirmed', label: 'Payment Confirmed' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'discovery_completed', label: 'Discovery Completed' },
    { value: 'planning', label: 'Planning' },
    { value: 'building', label: 'Building' },
    { value: 'for_review', label: 'For Review' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const complexityOptions = [
    { value: 'simple', label: 'Simple' },
    { value: 'medium', label: 'Medium' },
    { value: 'complex', label: 'Complex' },
  ];

  const sassTierOptions = [
    { value: 'starter', label: 'Starter' },
    { value: 'growth', label: 'Growth' },
    { value: 'business', label: 'Business' },
    { value: 'enterprise', label: 'Enterprise' },
  ];

  // Get unique service types from projects
  const getServiceTypes = () => {
    const services = new Set();
    projects.forEach(p => {
      if (p.servicesNeeded) {
        p.servicesNeeded.forEach(s => services.add(s));
      }
    });
    return Array.from(services).sort();
  };

  const statusOrder = [
    'inquiry',
    'assessed',
    'proposal_sent',
    'proposal_accepted',
    'awaiting_payment',
    'payment_submitted',
    'payment_confirmed',
    'in_progress',
    'discovery_completed',
    'planning',
    'building',
    'for_review',
    'delivered',
    'completed'
  ];

  const getStepStatus = (status, step) => {
    const currentIdx = statusOrder.indexOf(status);
    const stepIdx = statusOrder.indexOf(step);
    if (currentIdx === -1) return 'pending';
    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'current';
    return 'pending';
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  useEffect(() => {
    const projectsQuery = query(collection(db, 'projects'));

    const unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectsData);
    }, (error) => {
      console.error('Firestore projects error:', error);
    });

    return () => unsubscribe();
  }, []);

  const handleSendProposal = async (projectId) => {
    setIsSending(projectId);
    try {
      const proposalLink = `${window.location.origin}/proposal/${projectId}`;
      await navigator.clipboard.writeText(proposalLink);

      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        status: 'proposal_sent',
        proposalSentAt: new Date(),
      });

      showToast('Proposal link copied! Send this to your client via FB Messenger', 'success');
    } catch (err) {
      console.error('Error sending proposal:', err);
      showToast('Failed to copy link. Please try again.', 'error');
    } finally {
      setIsSending(null);
    }
  };

  const handleGenerateProposal = async (project) => {
    setGeneratingId(project.id);
    try {
      const proposalData = await generateProposal(project);
      await updateDoc(doc(db, 'projects', project.id), {
        proposalData,
        status: 'proposal_sent',
        proposalGeneratedAt: new Date().toISOString()
      });
      showToast('Proposal generated successfully!', 'success');
    } catch (err) {
      console.error('Proposal generation failed:', err);
      showToast('Proposal generation failed', 'error');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleCopyProposalLink = async (projectId) => {
    try {
      const proposalLink = `${window.location.origin}/proposal/${projectId}`;
      await navigator.clipboard.writeText(proposalLink);
      showToast('Proposal link copied to clipboard!', 'success');
    } catch (err) {
      console.error('Error copying link:', err);
      showToast('Failed to copy link. Please try again.', 'error');
    }
  };

  const handlePreviewProposal = (projectId) => {
    window.open(`/proposal/${projectId}`, '_blank');
  };

  const handleSendDiscovery = async (projectId) => {
    setIsSending(projectId);
    try {
      const discoveryLink = `${window.location.origin}/discovery/${projectId}`;
      await navigator.clipboard.writeText(discoveryLink);

      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        discoveryLinkSentAt: new Date(),
      });

      showToast('Discovery link copied! Send this to your client via FB Messenger', 'success');
    } catch (err) {
      console.error('Error sending discovery:', err);
      showToast('Failed to copy link. Please try again.', 'error');
    } finally {
      setIsSending(null);
    }
  };

  const handleCopyDiscoveryLink = async (projectId) => {
    try {
      const discoveryLink = `${window.location.origin}/discovery/${projectId}`;
      await navigator.clipboard.writeText(discoveryLink);
      showToast('Discovery link copied to clipboard!', 'success');
    } catch (err) {
      console.error('Error copying link:', err);
      showToast('Failed to copy link. Please try again.', 'error');
    }
  };

  const handleSendPaymentLink = async (projectId) => {
    setIsSending(projectId);
    try {
      const paymentLink = `${window.location.origin}/payment/${projectId}`;
      await navigator.clipboard.writeText(paymentLink);

      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        status: 'awaiting_payment',
        paymentLinkSentAt: new Date(),
      });

      showToast('Payment link copied! Send this to your client via FB Messenger', 'success');
    } catch (err) {
      console.error('Error sending payment link:', err);
      showToast('Failed to copy link. Please try again.', 'error');
    } finally {
      setIsSending(null);
    }
  };

  const handleStatusChange = async (projectId, newStatus, additionalData = {}) => {
    try {
      const statusTimestamps = {};
      if (newStatus === 'planning') statusTimestamps.planningStartedAt = new Date();
      else if (newStatus === 'building') statusTimestamps.buildingStartedAt = new Date();
      else if (newStatus === 'for_review') statusTimestamps.forReviewStartedAt = new Date();
      else if (newStatus === 'delivered') statusTimestamps.deliveredAt = new Date();
      else if (newStatus === 'completed') statusTimestamps.completedAt = new Date();

      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        status: newStatus,
        statusUpdatedAt: new Date(),
        ...statusTimestamps,
        ...additionalData,
      });
      showToast(`Project marked as ${newStatus.replace('_', ' ')}`, 'success');
    } catch (err) {
      console.error('Error updating status:', err);
      showToast('Failed to update status. Please try again.', 'error');
    }
  };

  const handleGenerateProjectPlan = async () => {
    if (!selectedProject) return;

    setIsGeneratingPlan(true);
    showToast('Generating plan...', 'info');

    try {
      const project = selectedProject;
      const ai = project.aiAssessment || {};

      const projectInfo = `Client: ${project.clientName}\nBusiness: ${project.businessName}\nBusiness Type: ${project.businessType}\nProject Type: ${ai.projectType}\nServices Needed: ${project.servicesNeeded?.join(', ')}\nDescription: ${project.projectDescription}\nComplexity: ${ai.complexity}\nEstimated Days: ${ai.estimatedDays}\nTechnologies: ${ai.technologiesNeeded?.join(', ')}\nScope: ${ai.scopeSummary}`;

      const prompt = `Generate a complete technical project plan based on this project:\n\n${projectInfo}\n\nIMPORTANT: Always use this tech stack only:\n- Frontend: React, TailwindCSS, JavaScript\n- Backend: Firebase Functions (not PHP)\n- Database: Firebase Firestore\n- Hosting: Vercel\nNever recommend PHP, MySQL, or Laravel.\n\nReturn this JSON structure:\n{\n  projectName: (string - suggested repo name, lowercase-with-dashes),\n  overview: (string - 3-4 sentence project overview),\n  techStack: {\n    frontend: (array of strings),\n    backend: (array of strings),\n    database: (array of strings),\n    hosting: (array of strings)\n  },\n  folderStructure: (string - complete folder tree as text),\n  databaseSchema: (array of objects - collection, fields[], description),\n  pages: (array of objects - name, path, description, components[]),\n  features: (array of objects - name, description, priority),\n  kiloCodePrompts: (array of objects - step, title, prompt),\n  deploymentChecklist: (array of strings),\n  estimatedHours: (number),\n  milestones: (array of objects - name, description, estimatedDays)\n}`;

      console.log('Calling AI with prompt...');

      const projectPlan = await callAIJson(prompt, { max_tokens: 4000 });

      // Save to Firestore
      const projectRef = doc(db, 'projects', selectedProject.id);
      await updateDoc(projectRef, {
        projectPlan: projectPlan,
        status: 'planning',
        planGeneratedAt: new Date(),
      });

      showToast('Project plan generated!', 'success');

      // Refresh selected project
      const updatedSnap = await getDoc(projectRef);
      setSelectedProject({ id: updatedSnap.id, ...updatedSnap.data() });

    } catch (err) {
      console.error('Error generating plan:', err);
      showToast('Failed to generate plan. Please try again.', 'error');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const openEditForm = async (project) => {
    const projectRef = doc(db, 'projects', project.id);
    const projectSnap = await getDoc(projectRef);
    const projectData = projectSnap.data();

    const assessment = projectData.aiAssessment || {};
    setEditForm({
      scopeSummary: assessment.scopeSummary || '',
      projectType: assessment.projectType || project.servicesNeeded?.[0] || '',
      complexity: assessment.complexity || 'medium',
      estimatedDays: assessment.estimatedDays || 30,
      suggestedPrice: assessment.suggestedPrice || 0,
      monthlySassPrice: assessment.monthlySassPrice || 0,
      sassTier: assessment.sassTier || 'starter',
      technologiesNeeded: assessment.technologiesNeeded || [],
      warnings: assessment.warnings || [],
    });
    setIsEditMode(true);
  };

  const handlePriceChange = (value) => {
    const price = parseFloat(value) || 0;
    setEditForm(prev => ({ ...prev, suggestedPrice: price }));
  };

  const handleSaveProposal = async () => {
    if (!selectedProject) return;

    setIsSaving(true);
    try {
      const projectRef = doc(db, 'projects', selectedProject.id);

      const aiAssessment = {
        scopeSummary: editForm.scopeSummary,
        projectType: editForm.projectType,
        complexity: editForm.complexity,
        estimatedDays: parseInt(editForm.estimatedDays),
        suggestedPrice: parseFloat(editForm.suggestedPrice),
        downpayment: parseFloat(editForm.suggestedPrice) * 0.5,
        finalPayment: parseFloat(editForm.suggestedPrice) * 0.5,
        monthlySassPrice: parseFloat(editForm.monthlySassPrice),
        sassTier: editForm.sassTier,
        technologiesNeeded: editForm.technologiesNeeded,
        warnings: editForm.warnings,
      };

      await updateDoc(projectRef, {
        aiAssessment,
        status: 'assessed',
        aiAssessedAt: new Date(),
      });

      showToast('Proposal updated!', 'success');
      setIsEditMode(false);

      // Refresh selected project
      const updatedSnap = await getDoc(projectRef);
      setSelectedProject({ id: updatedSnap.id, ...updatedSnap.data() });
    } catch (err) {
      console.error('Error saving proposal:', err);
      showToast('Failed to save. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const addTechnology = () => {
    if (newTech.trim() && !editForm.technologiesNeeded.includes(newTech.trim())) {
      setEditForm(prev => ({
        ...prev,
        technologiesNeeded: [...prev.technologiesNeeded, newTech.trim()]
      }));
      setNewTech('');
    }
  };

  const removeTechnology = (tech) => {
    setEditForm(prev => ({
      ...prev,
      technologiesNeeded: prev.technologiesNeeded.filter(t => t !== tech)
    }));
  };

  const addWarning = () => {
    if (newWarning.trim() && !editForm.warnings.includes(newWarning.trim())) {
      setEditForm(prev => ({
        ...prev,
        warnings: [...prev.warnings, newWarning.trim()]
      }));
      setNewWarning('');
    }
  };

  const removeWarning = (warning) => {
    setEditForm(prev => ({
      ...prev,
      warnings: prev.warnings.filter(w => w !== warning)
    }));
  };

  const filteredProjects = projects.filter(p => {
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesEmail = !emailFilter || p.email === emailFilter;

    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      (p.clientName && p.clientName.toLowerCase().includes(searchLower)) ||
      (p.businessName && p.businessName.toLowerCase().includes(searchLower));

    // Service type filter
    const matchesService = serviceFilter === 'all' ||
      (p.servicesNeeded && p.servicesNeeded.includes(serviceFilter));

    // Payment type filter
    let matchesPaymentType = true;
    if (paymentTypeFilter === 'build_only') {
      matchesPaymentType = !p.aiAssessment?.monthlySassPrice || p.aiAssessment.monthlySassPrice === 0;
    } else if (paymentTypeFilter === 'saas') {
      matchesPaymentType = p.aiAssessment?.monthlySassPrice > 0;
    }

    return matchesStatus && matchesEmail && matchesSearch && matchesService && matchesPaymentType;
  }).sort((a, b) => {
    // Sort
    if (sortBy === 'newest') {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB - dateA;
    } else if (sortBy === 'oldest') {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateA - dateB;
    } else if (sortBy === 'amount') {
      return (b.aiAssessment?.suggestedPrice || 0) - (a.aiAssessment?.suggestedPrice || 0);
    } else if (sortBy === 'status') {
      const statusOrder = ['inquiry', 'assessed', 'proposal_sent', 'proposal_accepted', 'awaiting_payment', 'payment_submitted', 'in_progress', 'planning', 'building', 'for_review', 'delivered', 'completed', 'cancelled'];
      return statusOrder.indexOf(a.status || 'inquiry') - statusOrder.indexOf(b.status || 'inquiry');
    }
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / projectsPerPage);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * projectsPerPage,
    currentPage * projectsPerPage
  );

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '-';
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
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      inquiry: 'bg-gray-500',
      assessed: 'bg-blue-500',
      proposal_sent: 'bg-indigo-500',
      proposal_accepted: 'bg-violet-500',
      awaiting_payment: 'bg-orange-500',
      payment_submitted: 'bg-yellow-500',
      payment_confirmed: 'bg-green-500',
      in_progress: 'bg-purple-500',
      discovery_completed: 'bg-teal-500',
      planning: 'bg-cyan-500',
      building: 'bg-purple-600',
      for_review: 'bg-indigo-600',
      delivered: 'bg-green-500',
      completed: 'bg-green-600',
      cancelled: 'bg-red-500',
    };
    return classes[status] || 'bg-gray-500';
  };

  const getServicesDisplay = (services) => {
    if (!services || services.length === 0) return '-';
    if (services.length === 1) return services[0];
    return `${services[0]} +${services.length - 1} more`;
  };

  const getComplexityColor = (complexity) => {
    const colors = {
      low: 'text-green-400',
      simple: 'text-green-400',
      medium: 'text-yellow-400',
      complex: 'text-orange-400',
      high: 'text-red-400',
      critical: 'text-red-400',
    };
    return colors[complexity?.toLowerCase()] || 'text-gray-400';
  };

  const getTimelineDisplay = (project) => {
    const timeline = [];
    if (project.createdAt) timeline.push({ label: 'Inquiry', date: project.createdAt });
    if (project.aiAssessedAt) timeline.push({ label: 'AI Assessment', date: project.aiAssessedAt });
    if (project.proposalSentAt) timeline.push({ label: 'Proposal Sent', date: project.proposalSentAt });
    if (project.proposalAcceptedAt) timeline.push({ label: 'Proposal Accepted', date: project.proposalAcceptedAt });
    if (project.paymentReceivedAt) timeline.push({ label: 'Payment Received', date: project.paymentReceivedAt });
    if (project.deliveredAt) timeline.push({ label: 'Delivered', date: project.deliveredAt });
    if (project.cancelledAt) timeline.push({ label: 'Cancelled', date: project.cancelledAt });
    return timeline;
  };

  const getProgressPercentage = (status) => {
    const progress = {
      inquiry: 10,
      assessed: 20,
      proposal_sent: 30,
      proposal_accepted: 40,
      awaiting_payment: 50,
      payment_submitted: 60,
      in_progress: 70,
      planning: 75,
      building: 85,
      for_review: 90,
      delivered: 95,
      completed: 100,
      cancelled: 0,
    };
    return progress[status] || 10;
  };

  return (
    <div>
      {/* Page content - no layout wrapper needed */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          {emailFilter && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {emailFilter}
              <button
                onClick={() => navigate('/admin/projects')}
                className="ml-1 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`p-2 rounded ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search client or business..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full px-4 py-2 pl-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
            />
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          {/* Service Type Filter */}
          <select
            value={serviceFilter}
            onChange={(e) => { setServiceFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Services</option>
            {getServiceTypes().map(service => (
              <option key={service} value={service}>{service}</option>
            ))}
          </select>

          {/* Payment Type Filter */}
          <select
            value={paymentTypeFilter}
            onChange={(e) => { setPaymentTypeFilter(e.target.value); setCurrentPage(1); }}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Payment Types</option>
            <option value="build_only">Build Only</option>
            <option value="saas">SaaS Subscription</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="status">By Status</option>
            <option value="amount">By Amount (High)</option>
          </select>
        </div>

        {/* Clear Filters */}
        {(searchQuery || filterStatus !== 'all' || serviceFilter !== 'all' || paymentTypeFilter !== 'all') && (
          <button
            onClick={() => { setSearchQuery(''); setFilterStatus('all'); setServiceFilter('all'); setPaymentTypeFilter('all'); setCurrentPage(1); }}
            className="mt-3 text-sm text-blue-400 hover:text-blue-300"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="text-gray-400 text-sm mb-4">
        Showing {paginatedProjects.length} of {filteredProjects.length} projects
      </p>

      {/* Projects Table / Cards */}
      {viewMode === 'table' ? (
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
          {/* Mobile Cards */}
          <div className="flex flex-col gap-3 lg:hidden">
            {paginatedProjects.length === 0 ? (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center text-gray-400">No projects found</div>
            ) : (
              paginatedProjects.map((project) => (
                <div key={project.id} className="bg-gray-800 rounded-lg border border-gray-700 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-white font-semibold truncate">{project.clientName || '-'}</p>
                      <p className="text-gray-400 text-sm truncate">{project.businessName || '-'}</p>
                      <p className="text-gray-500 text-xs">{getServicesDisplay(project.servicesNeeded)}</p>
                    </div>
                    <span className={`shrink-0 inline-block px-2 py-1 rounded-full text-xs text-white ${getStatusBadgeClass(project.status)}`}>
                      {project.status || 'inquiry'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-400 font-semibold">
                      {project.aiAssessment?.suggestedPrice ? formatCurrency(project.aiAssessment.suggestedPrice) : project.budgetRange || '-'}
                    </span>
                    <span className="text-gray-500 text-xs">{formatDate(project.createdAt)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setSelectedProject(project)} className="px-3 py-1.5 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded-lg">View</button>
                    {project.status === 'assessed' && (
                      <button onClick={() => handleGenerateProposal(project)} disabled={generatingId === project.id} className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50">
                        {generatingId === project.id ? 'Generating...' : 'Generate Proposal'}
                      </button>
                    )}
                    {project.status === 'assessed' && (
                      <button onClick={() => handleSendProposal(project.id)} disabled={isSending === project.id} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50">
                        {isSending === project.id ? '...' : 'Send Proposal'}
                      </button>
                    )}
                    {(project.status === 'in_progress' || project.status === 'payment_confirmed') && !project.discovery?.completed && (
                      <button onClick={() => handleSendDiscovery(project.id)} disabled={isSending === project.id} className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-lg disabled:opacity-50">
                        {isSending === project.id ? '...' : 'Discovery'}
                      </button>
                    )}
                    {project.discovery?.completed && (
                      <Link to={`/admin/projects/${project.id}/discovery`} className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-500 text-white rounded-lg">Discovery</Link>
                    )}
                    <Link to={`/admin/projects/${project.id}/bugs`} className="px-3 py-1.5 text-xs bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg">Bugs</Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Business</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Budget</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProjects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                      No projects found
                    </td>
                  </tr>
                ) : (
                  paginatedProjects.map((project) => (
                    <tr key={project.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="px-6 py-4 text-white">{project.clientName || '-'}</td>
                      <td className="px-6 py-4 text-gray-300">{project.businessName || '-'}</td>
                      <td className="px-6 py-4 text-gray-300">{getServicesDisplay(project.servicesNeeded)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs text-white ${getStatusBadgeClass(project.status)}`}>
                          {project.status || 'inquiry'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {project.aiAssessment?.suggestedPrice
                          ? formatCurrency(project.aiAssessment.suggestedPrice)
                          : project.budgetRange || '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-300">{formatDate(project.createdAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2 items-center">
                          <button
                            onClick={() => setSelectedProject(project)}
                            className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded whitespace-nowrap"
                          >
                            View
                          </button>
                          {project.status === 'assessed' && (
                            <button
                              onClick={() => handleSendProposal(project.id)}
                              disabled={isSending === project.id}
                              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50 whitespace-nowrap"
                            >
                              {isSending === project.id ? 'Sending...' : 'Send Proposal'}
                            </button>
                          )}
                          {(project.status === 'in_progress' || project.status === 'payment_confirmed') && !project.discovery?.completed && (
                            <button
                              onClick={() => handleSendDiscovery(project.id)}
                              disabled={isSending === project.id}
                              className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded disabled:opacity-50 whitespace-nowrap"
                            >
                              {isSending === project.id ? '...' : 'Send Discovery'}
                            </button>
                          )}
                          {project.discovery?.completed && (
                            <Link
                              to={`/admin/projects/${project.id}/discovery`}
                              className="px-3 py-1 text-xs bg-green-600 hover:bg-green-500 text-white rounded whitespace-nowrap"
                            >
                              View Discovery
                            </Link>
                          )}
                          <Link
                            to={`/admin/projects/${project.id}/bugs`}
                            className="px-3 py-1 text-xs bg-yellow-600 hover:bg-yellow-500 text-white rounded whitespace-nowrap"
                          >
                            Bugs
                          </Link>
                          <button
                            onClick={() => {
                              const link = `${window.location.origin}/feature-request/${project.id}`;
                              navigator.clipboard.writeText(link);
                            }}
                            className="px-3 py-1 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded whitespace-nowrap"
                          >
                            Feature Req Link
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedProjects.map((project) => (
            <div key={project.id} className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-gray-600 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-white font-medium">{project.clientName || '-'}</h3>
                  <p className="text-gray-400 text-sm">{project.businessName || '-'}</p>
                </div>
                <span className={`inline-block px-2 py-1 rounded-full text-xs text-white ${getStatusBadgeClass(project.status)}`}>
                  {project.status?.replace('_', ' ') || 'inquiry'}
                </span>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {project.servicesNeeded?.slice(0, 2).map((s, i) => (
                  <span key={i} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">{s}</span>
                ))}
              </div>

              <div className="mb-3">
                <p className="text-gray-400 text-xs">Amount</p>
                <p className="text-green-400 font-semibold">
                  {project.aiAssessment?.suggestedPrice
                    ? formatCurrency(project.aiAssessment.suggestedPrice)
                    : project.budgetRange || '-'}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{getProgressPercentage(project.status)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${getProgressPercentage(project.status)}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-gray-500 text-xs">{formatDate(project.createdAt)}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedProject(project)}
                    className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded"
                  >
                    View
                  </button>
                  {project.status === 'assessed' && (
                    <button
                      onClick={() => handleGenerateProposal(project)}
                      disabled={generatingId === project.id}
                      className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded disabled:opacity-50"
                    >
                      {generatingId === project.id ? '...' : 'Gen Prop'}
                    </button>
                  )}
                  {project.status === 'assessed' && (
                    <button
                      onClick={() => handleSendProposal(project.id)}
                      disabled={isSending === project.id}
                      className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-50"
                    >
                      {isSending === project.id ? '...' : 'Send'}
                    </button>
                  )}
                  {(project.status === 'in_progress' || project.status === 'payment_confirmed') && !project.discovery?.completed && (
                    <button
                      onClick={() => handleSendDiscovery(project.id)}
                      disabled={isSending === project.id}
                      className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded disabled:opacity-50"
                    >
                      {isSending === project.id ? '...' : 'Discovery'}
                    </button>
                  )}
                  {project.discovery?.completed && (
                    <Link
                      to={`/admin/projects/${project.id}/discovery`}
                      className="px-3 py-1 text-xs bg-green-600 hover:bg-green-500 text-white rounded"
                    >
                      Discovery
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 hover:bg-gray-600"
          >
            Previous
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let page;
            if (totalPages <= 5) {
              page = i + 1;
            } else if (currentPage <= 3) {
              page = i + 1;
            } else if (currentPage >= totalPages - 2) {
              page = totalPages - 4 + i;
            } else {
              page = currentPage - 2 + i;
            }
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 rounded-lg ${currentPage === page
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
              >
                {page}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 hover:bg-gray-600"
          >
            Next
          </button>
        </div>
      )}

      {/* Project Details Modal */}
      {selectedProject && !isEditMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-white">{selectedProject.businessName}</h2>
                  <p className="text-gray-400 text-sm mt-1">Project ID: {selectedProject.id.slice(0, 8)}</p>
                </div>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Current Status */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                {/* Progress Stepper — Grouped into major phases */}
                <div className="mb-4">
                  <p className="text-gray-400 text-xs mb-2">Project Progress</p>
                  {(() => {
                    const phases = [
                      { label: 'Inquiry', statuses: ['inquiry', 'assessed'] },
                      { label: 'Proposal', statuses: ['proposal_sent', 'proposal_accepted'] },
                      { label: 'Payment', statuses: ['awaiting_payment', 'payment_submitted', 'payment_confirmed'] },
                      { label: 'Discovery', statuses: ['in_progress', 'discovery_completed'] },
                      { label: 'Planning', statuses: ['planning'] },
                      { label: 'Building', statuses: ['building'] },
                      { label: 'Review', statuses: ['for_review'] },
                      { label: 'Delivered', statuses: ['delivered', 'completed'] },
                    ];
                    const currentIdx = statusOrder.indexOf(selectedProject.status);
                    const getPhaseStatus = (phase) => {
                      const phaseMinIdx = Math.min(...phase.statuses.map(s => statusOrder.indexOf(s)).filter(i => i >= 0));
                      const phaseMaxIdx = Math.max(...phase.statuses.map(s => statusOrder.indexOf(s)).filter(i => i >= 0));
                      if (currentIdx > phaseMaxIdx) return 'completed';
                      if (currentIdx >= phaseMinIdx && currentIdx <= phaseMaxIdx) return 'current';
                      return 'pending';
                    };
                    return (
                      <div className="flex items-center justify-between overflow-x-auto pb-2">
                        {phases.map((phase, idx) => (
                          <div key={phase.label} className="flex items-center">
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                getPhaseStatus(phase) === 'completed' ? 'bg-green-500 text-white' :
                                getPhaseStatus(phase) === 'current' ? 'bg-blue-500 text-white' :
                                'bg-gray-600 text-gray-400'
                              }`}>
                                {getPhaseStatus(phase) === 'completed' ? '✓' : idx + 1}
                              </div>
                              <span className={`text-xs mt-1 whitespace-nowrap ${
                                getPhaseStatus(phase) === 'current' ? 'text-blue-400 font-medium' : 'text-gray-500'
                              }`}>
                                {phase.label}
                              </span>
                            </div>
                            {idx < phases.length - 1 && (
                              <div className={`w-6 sm:w-10 h-0.5 mx-1 ${
                                getPhaseStatus(phase) === 'completed' ? 'bg-green-500' : 'bg-gray-600'
                              }`}></div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Current Status</span>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs text-white ${getStatusBadgeClass(selectedProject.status)}`}>
                    {selectedProject.status?.replace('_', ' ') || 'inquiry'}
                  </span>
                </div>
              </div>

              {/* Client Details */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Client Details</h3>
                <div className="bg-gray-700/30 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-xs">Client Name</p>
                    <p className="text-white">{selectedProject.clientName}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Email</p>
                    <p className="text-white">{selectedProject.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Phone</p>
                    <p className="text-white">{selectedProject.phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Business Type</p>
                    <p className="text-white">{selectedProject.businessType}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Monthly Revenue</p>
                    <p className="text-white">{selectedProject.monthlyRevenue}</p>
                  </div>
                </div>
              </div>

              {/* Project Details */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Project Details</h3>
                <div className="bg-gray-700/30 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-gray-400 text-xs">Services Needed</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedProject.servicesNeeded?.map((s, i) => (
                        <span key={i} className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-sm">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Project Description</p>
                    <p className="text-white mt-1">{selectedProject.projectDescription}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Budget Range</p>
                    <p className="text-white">{selectedProject.budgetRange}</p>
                  </div>
                </div>
              </div>

              {/* AI Assessment Results */}
              {selectedProject.aiAssessment && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">AI Assessment Results</h3>
                  <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-4 space-y-4 border border-purple-500/20">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-gray-400 text-xs">Suggested Price</p>
                        <p className="text-2xl font-bold text-green-400">{formatCurrency(selectedProject.aiAssessment.suggestedPrice)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Complexity</p>
                        <p className={`text-lg font-semibold capitalize ${getComplexityColor(selectedProject.aiAssessment.complexity)}`}>
                          {selectedProject.aiAssessment.complexity}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Timeline</p>
                        <p className="text-lg font-semibold text-white">{selectedProject.aiAssessment.estimatedDays} days</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Turnaround</p>
                        <p className="text-lg font-semibold text-white">{selectedProject.aiAssessment.estimatedDays * 1.5} days</p>
                      </div>
                    </div>

                    {/* Payment breakdown */}
                    {(selectedProject.aiAssessment.downpayment || selectedProject.aiAssessment.monthlySassPrice) && (
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-600">
                        {selectedProject.aiAssessment.downpayment > 0 && (
                          <>
                            <div>
                              <p className="text-gray-400 text-xs">Downpayment (50%)</p>
                              <p className="text-white font-semibold">{formatCurrency(selectedProject.aiAssessment.downpayment)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs">Final Payment (50%)</p>
                              <p className="text-white font-semibold">{formatCurrency(selectedProject.aiAssessment.finalPayment)}</p>
                            </div>
                          </>
                        )}
                        {selectedProject.aiAssessment.monthlySassPrice > 0 && (
                          <>
                            <div>
                              <p className="text-gray-400 text-xs">Monthly SaaS Price</p>
                              <p className="text-white font-semibold">{formatCurrency(selectedProject.aiAssessment.monthlySassPrice)}/mo</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-xs">SaaS Tier</p>
                              <p className="text-white font-semibold capitalize">{selectedProject.aiAssessment.sassTier}</p>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {selectedProject.aiAssessment.scopeSummary && (
                      <div>
                        <p className="text-gray-400 text-xs">Scope Summary</p>
                        <p className="text-white mt-1">{selectedProject.aiAssessment.scopeSummary}</p>
                      </div>
                    )}

                    {selectedProject.aiAssessment.technologiesNeeded && selectedProject.aiAssessment.technologiesNeeded.length > 0 && (
                      <div>
                        <p className="text-gray-400 text-xs">Recommended Technologies</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedProject.aiAssessment.technologiesNeeded.map((tech, i) => (
                            <span key={i} className="bg-gray-600 text-gray-200 px-2 py-1 rounded text-xs">{tech}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedProject.aiAssessment.warnings && selectedProject.aiAssessment.warnings.length > 0 && (
                      <div>
                        <p className="text-gray-400 text-xs">Warnings</p>
                        <div className="flex flex-col gap-1 mt-1">
                          {selectedProject.aiAssessment.warnings.map((warning, i) => (
                            <div key={i} className="flex items-center gap-2 text-red-400 text-sm">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              {warning}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Project Timeline</h3>
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <div className="relative">
                    <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-600"></div>
                    <div className="space-y-4">
                      {getTimelineDisplay(selectedProject).map((item, index) => (
                        <div key={index} className="relative pl-6">
                          <div className={`absolute left-1 w-3 h-3 rounded-full ${index === getTimelineDisplay(selectedProject).length - 1 ? 'bg-blue-500' : 'bg-gray-500'}`}></div>
                          <p className="text-white text-sm">{item.label}</p>
                          <p className="text-gray-400 text-xs">{formatDate(item.date)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    onClick={() => handleCopyProposalLink(selectedProject.id)}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Copy Proposal Link
                  </button>

                  <button
                    onClick={() => handlePreviewProposal(selectedProject.id)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Preview Proposal
                  </button>

                  <button
                    onClick={() => openEditForm(selectedProject)}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Edit Proposal
                  </button>

                  {selectedProject.status === 'proposal_accepted' && (
                    <button
                      onClick={() => handleSendPaymentLink(selectedProject.id)}
                      disabled={isSending === selectedProject.id}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {isSending === selectedProject.id ? 'Sending...' : 'Send Payment Link'}
                    </button>
                  )}

                  {selectedProject.status === 'proposal_accepted' && (
                    <button
                      onClick={() => handleStatusChange(selectedProject.id, 'awaiting_payment')}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Request Payment
                    </button>
                  )}

                  {selectedProject.status === 'payment_submitted' && (
                    <button
                      onClick={() => handleStatusChange(selectedProject.id, 'payment_confirmed')}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      ✅ Confirm Payment
                    </button>
                  )}

                  {selectedProject.status === 'payment_confirmed' && (
                    <button
                      onClick={() => handleStatusChange(selectedProject.id, 'in_progress')}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Start Work
                    </button>
                  )}

                  {selectedProject.status === 'in_progress' && (
                    <button
                      onClick={() => handleGenerateProjectPlan()}
                      disabled={isGeneratingPlan}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {isGeneratingPlan ? 'Generating plan...' : 'Generate Project Plan'}
                    </button>
                  )}

                  {selectedProject.status === 'building' && (
                    <button
                      onClick={() => handleGenerateProjectPlan()}
                      disabled={isGeneratingPlan}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {isGeneratingPlan ? 'Generating plan...' : 'Generate Project Plan'}
                    </button>
                  )}

                  {selectedProject.status === 'planning' && (
                    <>
                      <Link
                        to={`/admin/projects/${selectedProject.id}/plan`}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        View Project Plan
                      </Link>
                      <button
                        onClick={() => handleStatusChange(selectedProject.id, 'building')}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Mark as Building
                      </button>
                    </>
                  )}

                  {selectedProject.status === 'building' && selectedProject.projectPlan && (
                    <button
                      onClick={() => handleStatusChange(selectedProject.id, 'for_review')}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Mark as For Review
                    </button>
                  )}

                  {selectedProject.status === 'for_review' && (
                    <button
                      onClick={async () => {
                        // Create final payment request
                        if (selectedProject.aiAssessment?.finalPayment > 0) {
                          try {
                            await addDoc(collection(db, 'payments'), {
                              projectId: selectedProject.id,
                              clientId: selectedProject.email,
                              clientName: selectedProject.clientName,
                              businessName: selectedProject.businessName,
                              projectType: selectedProject.aiAssessment?.projectType,
                              amount: selectedProject.aiAssessment.finalPayment,
                              type: 'final',
                              status: 'pending_request',
                              createdAt: serverTimestamp(),
                            });
                            showToast('Final payment request created!', 'success');
                          } catch (err) {
                            console.error('Error creating final payment:', err);
                          }
                        }
                        handleStatusChange(selectedProject.id, 'delivered');
                      }}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Mark as Delivered
                    </button>
                  )}

                  {selectedProject.status === 'delivered' && (
                    <button
                      onClick={() => handleStatusChange(selectedProject.id, 'completed')}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Mark as Completed
                    </button>
                  )}

                  {selectedProject.status === 'building' && !selectedProject.projectPlan && (
                    <button
                      onClick={() => handleStatusChange(selectedProject.id, 'delivered')}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Mark as Delivered
                    </button>
                  )}

                  {selectedProject.status === 'building' && !selectedProject.projectPlan && (
                    <button
                      onClick={() => handleStatusChange(selectedProject.id, 'delivered')}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Mark as Delivered
                    </button>
                  )}

                  {!['delivered', 'cancelled'].includes(selectedProject.status) && (
                    <button
                      onClick={() => handleStatusChange(selectedProject.id, 'cancelled')}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Cancel Project
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Proposal Modal */}
      {selectedProject && isEditMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-white">Edit Proposal</h2>
                  <p className="text-gray-400 text-sm mt-1">{selectedProject.businessName}</p>
                </div>
                <button
                  onClick={() => setIsEditMode(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Scope Summary */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">Scope Summary</label>
                <textarea
                  value={editForm.scopeSummary}
                  onChange={(e) => setEditForm(prev => ({ ...prev, scopeSummary: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the project scope..."
                />
              </div>

              {/* Project Type & Complexity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Project Type</label>
                  <input
                    type="text"
                    value={editForm.projectType}
                    onChange={(e) => setEditForm(prev => ({ ...prev, projectType: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Website, Web App"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Complexity</label>
                  <select
                    value={editForm.complexity}
                    onChange={(e) => setEditForm(prev => ({ ...prev, complexity: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {complexityOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Estimated Days & Suggested Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Estimated Days</label>
                  <input
                    type="number"
                    value={editForm.estimatedDays}
                    onChange={(e) => setEditForm(prev => ({ ...prev, estimatedDays: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Suggested Price (₱)</label>
                  <input
                    type="number"
                    value={editForm.suggestedPrice}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Payment breakdown preview */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-2">Payment Breakdown (Auto-computed)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Downpayment (50%)</p>
                    <p className="text-lg font-bold text-green-400">{formatCurrency(editForm.suggestedPrice * 0.5)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Final Payment (50%)</p>
                    <p className="text-lg font-bold text-green-400">{formatCurrency(editForm.suggestedPrice * 0.5)}</p>
                  </div>
                </div>
              </div>

              {/* SaaS Options */}
              <div className="border-t border-gray-700 pt-4">
                <p className="text-sm text-gray-300 mb-3">SaaS Subscription (Optional)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Monthly SaaS Price (₱)</label>
                    <input
                      type="number"
                      value={editForm.monthlySassPrice}
                      onChange={(e) => setEditForm(prev => ({ ...prev, monthlySassPrice: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">SaaS Tier</label>
                    <select
                      value={editForm.sassTier}
                      onChange={(e) => setEditForm(prev => ({ ...prev, sassTier: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    >
                      {sassTierOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Technologies Needed */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">Technologies Needed</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTech}
                    onChange={(e) => setNewTech(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTechnology())}
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Add technology..."
                  />
                  <button
                    type="button"
                    onClick={addTechnology}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editForm.technologiesNeeded.map((tech, i) => (
                    <span key={i} className="flex items-center gap-1 bg-gray-600 text-gray-200 px-2 py-1 rounded text-sm">
                      {tech}
                      <button
                        type="button"
                        onClick={() => removeTechnology(tech)}
                        className="text-gray-400 hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Warnings */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">Warnings</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newWarning}
                    onChange={(e) => setNewWarning(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addWarning())}
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Add warning..."
                  />
                  <button
                    type="button"
                    onClick={addWarning}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {editForm.warnings.map((warning, i) => (
                    <span key={i} className="flex items-center gap-1 bg-red-900/50 text-red-300 px-2 py-1 rounded text-sm border border-red-700">
                      {warning}
                      <button
                        type="button"
                        onClick={() => removeWarning(warning)}
                        className="text-red-400 hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setIsEditMode(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProposal}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay for mobile */}
    </div>
  );
};

export default Projects;
