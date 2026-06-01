import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { fetchTemplateById, fetchTemplates } from '../../utils/templateData';
import TemplateInquiryModal from '../../components/client/TemplateInquiryModal';
import PreInquiryModal from '../../components/client/PreInquiryModal';
import ImagePreviewModal from '../../components/shared/ImagePreviewModal';

const TemplateDetail = () => {
  const { id } = useParams();
  const [template, setTemplate] = useState(null);
  const [relatedTemplates, setRelatedTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [preInquiryOpen, setPreInquiryOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [activePromos, setActivePromos] = useState([]);

  useEffect(() => {
    const loadTemplate = async () => {
      setLoading(true);
      const tmpl = await fetchTemplateById(id);
      setTemplate(tmpl);

      // Fetch related templates
      const allTemplates = await fetchTemplates();
      setRelatedTemplates(allTemplates.filter(t => t.id !== id).slice(0, 2));
      setLoading(false);
    };
    loadTemplate();
  }, [id]);

  // Fetch active promos for this template
  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const promosQuery = query(
          collection(db, 'promos'),
          where('active', '==', true)
        );
        const snap = await getDocs(promosQuery);
        const now = new Date();
        const promos = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(p => {
            if (p.endDate && new Date(p.endDate) < now) return false;
            if (p.maxSlots && p.usedSlots >= p.maxSlots) return false;
            if (p.startDate && new Date(p.startDate) > now) return false;
            // Check if promo applies to this template
            if (p.applicableTemplates?.length > 0 && !p.applicableTemplates.includes(id)) return false;
            return true;
          });
        setActivePromos(promos);
      } catch (err) {
        console.error('Error fetching promos:', err);
      }
    };
    fetchPromos();
  }, [id]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Loading template...</p>
        </div>
      </div>
    );
  }

  // 404 state
  if (!template) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4">404</h1>
          <p className="text-gray-400 mb-8">Template not found</p>
          <Link to="/templates" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-colors">
            Back to Templates
          </Link>
        </div>
      </div>
    );
  }

  const categoryEmoji = template.category === 'E-commerce' ? '🛒' :
    template.category === 'POS' ? '💳' :
      template.category === 'Landing Page' ? '🌐' : '☕';

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-40 transition-all duration-300 ${scrolled ? 'bg-gray-900/95 backdrop-blur-sm shadow-lg' : 'bg-gray-900/80 backdrop-blur-sm'}`}>
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="text-2xl font-bold text-white">
              Cronz<span className="text-blue-400">PH</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link to="/" className="text-gray-300 hover:text-white transition-colors">Home</Link>
              <Link to="/templates" className="text-white font-medium">Templates</Link>
              <Link to="/portal/login" className="text-gray-300 hover:text-white transition-colors">Client Portal</Link>
              <button
                onClick={() => template.status === 'coming' ? setPreInquiryOpen(true) : setModalOpen(true)}
                className="px-5 py-2 rounded-lg font-medium text-white transition-all hover:opacity-90"
                style={{ background: template.status === 'coming' ? '#d97706' : template.color }}
              >
                {template.status === 'coming' ? '🔔 Notify Me' : 'Inquire Now'}
              </button>
            </div>
            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-3">
              <button
                onClick={() => template.status === 'coming' ? setPreInquiryOpen(true) : setModalOpen(true)}
                className="px-4 py-2 rounded-lg font-medium text-sm text-white transition-all hover:opacity-90"
                style={{ background: template.status === 'coming' ? '#d97706' : template.color }}
              >
                {template.status === 'coming' ? '🔔 Notify Me' : 'Inquire Now'}
              </button>
              <button className="p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-gray-800 border-t border-gray-700">
            <div className="px-4 py-4 space-y-3">
              <Link to="/" className="block text-gray-300 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>Home</Link>
              <Link to="/templates" className="block text-white font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Templates</Link>
              <Link to="/portal/login" className="block text-gray-300 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>Client Portal</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-8 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-1/3 w-96 h-96 rounded-full blur-[150px]" style={{ background: template.color }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-8">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <span>›</span>
            <Link to="/templates" className="hover:text-white transition-colors">Templates</Link>
            <span>›</span>
            <span className="text-white">{template.name}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left - Image — Clickable for preview modal */}
            <div
              className="relative rounded-2xl overflow-hidden border border-gray-800 shadow-2xl group cursor-zoom-in"
              onClick={() => setPreviewImage({ url: template.image, alt: template.name, color: template.color })}
            >
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: template.color }} />
              <img
                src={template.image}
                alt={template.name}
                className="w-full aspect-[16/10] object-cover group-hover:scale-[1.02] transition-transform duration-700"
              />
              {/* Zoom overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20">
                <div className="p-4 bg-black/50 backdrop-blur-sm rounded-full border border-white/20">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Right - Info */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: `${template.color}20`, color: template.color }}
                >
                  {template.category}
                </span>
                <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-500/15 text-green-400">
                  ⚡ {template.setupTime} setup
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {categoryEmoji} {template.name}
              </h1>
              <p className="text-xl text-gray-300 mb-6">{template.description}</p>

              {/* Price Box */}
              <div className="p-5 bg-gray-900/80 border border-gray-800 rounded-2xl mb-6">
                {activePromos.length > 0 ? (
                  <>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xl text-gray-500 line-through">{template.price}</span>
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold animate-pulse">
                        🔥 {activePromos[0].discountType === 'percentage'
                          ? `${activePromos[0].discountValue}% OFF`
                          : `₱${activePromos[0].discountValue?.toLocaleString()} OFF`}
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-red-400 mb-1">
                      {activePromos[0].discountType === 'percentage'
                        ? `${activePromos[0].discountValue}% Discount Applied`
                        : `₱${activePromos[0].discountValue?.toLocaleString()} Off`}
                    </p>
                    <p className="text-gray-400 text-sm">{template.priceNote} • Everything included</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-3xl font-bold" style={{ color: template.color }}>{template.price}</span>
                    </div>
                    <p className="text-gray-400 text-sm">{template.priceNote} • Everything included</p>
                  </>
                )}
              </div>

              {/* Active Promo Banner */}
              {activePromos.length > 0 && (
                <div className="mb-6 space-y-3">
                  {activePromos.map((promo) => (
                    <div
                      key={promo.id}
                      className="relative overflow-hidden bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 rounded-2xl p-4 shadow-lg shadow-red-500/20"
                    >
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute -top-2 -left-2 w-20 h-20 bg-white/20 rounded-full blur-xl animate-pulse" />
                        <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-yellow-300/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-bold text-lg">
                            {promo.discountType === 'percentage'
                              ? `${promo.discountValue}% OFF`
                              : `₱${promo.discountValue?.toLocaleString()} OFF`}
                          </span>
                          {promo.badgeText && (
                            <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-bold text-white">
                              {promo.badgeText}
                            </span>
                          )}
                        </div>
                        {promo.bannerText && (
                          <p className="text-white/90 text-sm">{promo.bannerText}</p>
                        )}
                        {promo.maxSlots && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-white/80 text-xs">
                              🎫 {promo.maxSlots - (promo.usedSlots || 0)} of {promo.maxSlots} slots left
                            </span>
                            <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-white/70 rounded-full"
                                style={{ width: `${((promo.usedSlots || 0) / promo.maxSlots) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {promo.code && (
                          <p className="mt-2 text-white/80 text-xs">
                            Use code: <span className="font-mono font-bold text-yellow-300 bg-black/20 px-1.5 py-0.5 rounded">{promo.code}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tech Stack */}
              <div className="mb-6">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tech Stack</p>
                <div className="flex flex-wrap gap-2">
                  {template.techStack.map((tech) => (
                    <span key={tech} className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm font-medium text-gray-300">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col gap-3">
                {/* Live Demo Button */}
                {template.demoUrl ? (
                  <a
                    href={template.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 rounded-xl font-bold text-lg text-white transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-500/25"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Try Live Demo
                  </a>
                ) : (
                  <div className="w-full py-4 rounded-xl font-bold text-lg text-gray-500 bg-gray-800/50 border border-gray-700/50 flex items-center justify-center gap-3 cursor-default">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Live Demo Coming Soon
                  </div>
                )}

                {/* Demo Credentials */}
                {template.demoCredentials && (
                  <div className="p-4 bg-gray-800/60 border border-gray-700/50 rounded-xl">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">🔑 Demo Login Credentials</p>
                    <div className="flex items-center gap-3 text-sm mb-1.5">
                      <span className="text-gray-500 w-16">Email:</span>
                      <span className="font-mono text-gray-200">{template.demoCredentials.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-500 w-16">Password:</span>
                      <span className="font-mono text-gray-200">{template.demoCredentials.password}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => template.status === 'coming' ? setPreInquiryOpen(true) : setModalOpen(true)}
                    className="flex-1 py-4 rounded-xl font-bold text-lg text-white transition-all hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3"
                    style={{
                      background: template.status === 'coming'
                        ? 'linear-gradient(135deg, #d97706, #b45309)'
                        : `linear-gradient(135deg, ${template.color}, ${template.color}cc)`
                    }}
                  >
                    {template.status === 'coming' ? (
                      <>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        Notify Me When Available
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Inquire This Template
                      </>
                    )}
                  </button>
                  <Link
                    to="/inquiry"
                    className="px-6 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl font-semibold text-gray-300 hover:text-white transition-all flex items-center"
                  >
                    Custom Build
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Features List */}
            <div>
              <h2 className="text-3xl font-bold mb-8">
                <span style={{ color: template.color }}>Features</span> Included
              </h2>
              <div className="space-y-3">
                {template.features.map((feature, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 p-4 bg-gray-900/60 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors group"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${template.color}15` }}
                    >
                      <svg className="w-4 h-4" style={{ color: template.color }} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-200 font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* What's Included + Ideal For */}
            <div className="space-y-8">
              {/* What's Included */}
              <div className="p-6 bg-gray-900/60 border border-gray-800 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-5">📦 What's Included</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {template.includes.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-gray-300">
                      <svg className="w-4 h-4 text-green-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Ideal For */}
              <div className="p-6 bg-gray-900/60 border border-gray-800 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-5">🎯 Ideal For</h3>
                <div className="space-y-3">
                  {template.idealFor.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-gray-300">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: template.color }} />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Setup Process */}
      <section className="py-16 border-t border-gray-800/50 bg-gray-900/30">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">How Setup Works</h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            No complicated process. Just 3 simple steps and your system is live.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {template.setupSteps.map((step, idx) => (
              <div key={idx} className="relative text-center group">
                {/* Step number */}
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg transition-transform group-hover:scale-110"
                  style={{ background: `linear-gradient(135deg, ${template.color}, ${template.color}99)` }}
                >
                  {step.step}
                </div>

                {/* Connector line */}
                {idx < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-gray-700 to-transparent" />
                )}

                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-gray-400 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => template.status === 'coming' ? setPreInquiryOpen(true) : setModalOpen(true)}
              className="px-10 py-4 rounded-xl font-bold text-lg text-white transition-all hover:opacity-90 hover:scale-105"
              style={{
                background: template.status === 'coming'
                  ? 'linear-gradient(135deg, #d97706, #b45309)'
                  : `linear-gradient(135deg, ${template.color}, ${template.color}cc)`
              }}
            >
              {template.status === 'coming'
                ? '🔔 Notify Me When Available'
                : `Inquire This Template — ${template.setupTime} setup`}
            </button>
          </div>
        </div>
      </section>

      {/* Related Templates */}
      {relatedTemplates.length > 0 && (
        <section className="py-16 border-t border-gray-800/50">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4">Other Templates</h2>
            <p className="text-gray-400 text-center mb-10">Explore more ready-to-deploy systems</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {relatedTemplates.map((t) => (
                <Link
                  key={t.id}
                  to={`/templates/${t.id}`}
                  className="group bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-600 transition-all duration-300"
                >
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img
                      src={t.image}
                      alt={t.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4">
                      <span
                        className="px-3 py-1 rounded-lg text-xs font-bold backdrop-blur-md"
                        style={{ background: `${t.color}30`, color: t.color }}
                      >
                        {t.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{t.name}</h3>
                    <p className="text-gray-400 text-sm mt-1">{t.tagline}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="font-bold" style={{ color: t.color }}>{t.price}</span>
                      <span className="text-gray-500 text-sm">⚡ {t.setupTime}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link
                to="/templates"
                className="px-8 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-xl font-semibold transition-all"
              >
                View All Templates
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 border-t border-gray-800/50 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} CronzPH. All rights reserved.</p>
      </footer>

      {/* Inquiry Modal */}
      <TemplateInquiryModal
        template={template}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />

      {/* Pre-Inquiry Modal (Coming Soon) */}
      <PreInquiryModal
        template={template}
        isOpen={preInquiryOpen}
        onClose={() => setPreInquiryOpen(false)}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={!!previewImage}
        imageUrl={previewImage?.url}
        altText={previewImage?.alt}
        accentColor={previewImage?.color}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
};

export default TemplateDetail;
