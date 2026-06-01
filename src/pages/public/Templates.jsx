import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { fetchTemplates, getTemplateCategoriesFromList } from '../../utils/templateData';
import TemplateInquiryModal from '../../components/client/TemplateInquiryModal';
import ImagePreviewModal from '../../components/shared/ImagePreviewModal';

const Templates = () => {
  const [filter, setFilter] = useState('All');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [activePromos, setActivePromos] = useState([]);

  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true);
      const data = await fetchTemplates();
      setTemplates(data);
      setLoading(false);
    };
    loadTemplates();
  }, []);

  // Fetch active promos
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
            // Filter out expired promos
            if (p.endDate && new Date(p.endDate) < now) return false;
            // Filter out fully claimed promos
            if (p.maxSlots && p.usedSlots >= p.maxSlots) return false;
            // Filter out promos that haven't started yet
            if (p.startDate && new Date(p.startDate) > now) return false;
            return true;
          });
        setActivePromos(promos);
      } catch (err) {
        console.error('Error fetching promos:', err);
      }
    };
    fetchPromos();
  }, []);

  // Fetch approved template reviews
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const reviewsQuery = query(
          collection(db, 'templateReviews'),
          where('approved', '==', true)
        );
        const snap = await getDocs(reviewsQuery);
        setReviews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error('Error fetching reviews:', err);
      }
    };
    fetchReviews();
  }, []);

  const categories = getTemplateCategoriesFromList(templates);
  const filtered = filter === 'All' ? templates : templates.filter((t) => t.category === filter);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const openInquiry = (template) => {
    setSelectedTemplate(template);
    setModalOpen(true);
  };

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
              <Link to="/inquiry" className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors">
                Get Started
              </Link>
            </div>
            {/* Mobile Menu Button */}
            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
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
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-gray-800 border-t border-gray-700">
            <div className="px-4 py-4 space-y-3">
              <Link to="/" className="block text-gray-300 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>Home</Link>
              <Link to="/templates" className="block text-white font-medium py-2" onClick={() => setMobileMenuOpen(false)}>Templates</Link>
              <Link to="/portal/login" className="block text-gray-300 hover:text-white py-2" onClick={() => setMobileMenuOpen(false)}>Client Portal</Link>
              <Link to="/inquiry" className="block w-full text-center px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium" onClick={() => setMobileMenuOpen(false)}>
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 pb-16 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-blue-950/30 to-gray-950" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-1/4 w-80 h-80 bg-blue-500/40 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-purple-500/40 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/2 left-1/2 w-60 h-60 bg-cyan-500/30 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '3s' }} />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-blue-300">Ready to Deploy — No waiting, no building from scratch</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-5 leading-tight">
            Ready-to-Deploy{' '}
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              System Templates
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-4 max-w-3xl mx-auto">
            Skip the long development process. Pick a template, we set it up for you, and you're live in days.
            Just schedule, pay, and launch.
          </p>
          <p className="text-gray-500 text-sm">
            Templates include full source code • Admin panel • Responsive design • Deployment
          </p>
        </div>
      </section>

      {/* How It Works Mini-Bar */}
      <section className="py-10 border-y border-gray-800/50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '🎯', title: 'Pick a Template', desc: 'Browse our ready-made systems' },
              { icon: '📅', title: 'Schedule Setup', desc: 'Choose your preferred date' },
              { icon: '🚀', title: 'Go Live', desc: 'We deploy, you launch!' },
            ].map((step, idx) => (
              <div key={idx} className="flex items-center gap-4 group">
                <div className="w-14 h-14 bg-gray-800 border border-gray-700 rounded-xl flex items-center justify-center text-2xl group-hover:border-blue-500/50 group-hover:bg-blue-500/5 transition-all shrink-0">
                  {step.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-400">STEP {idx + 1}</span>
                    {idx < 2 && <span className="hidden md:inline text-gray-600">→</span>}
                  </div>
                  <h3 className="font-semibold text-white">{step.title}</h3>
                  <p className="text-gray-400 text-sm">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Promo Banner */}
      {activePromos.length > 0 && (
        <section className="py-6">
          <div className="max-w-7xl mx-auto px-4">
            {activePromos.filter(p => p.bannerText).map((promo) => (
              <div
                key={promo.id}
                className="relative overflow-hidden bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 rounded-2xl p-6 mb-4 shadow-lg shadow-red-500/20"
              >
                {/* Animated background elements */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute -top-4 -left-4 w-32 h-32 bg-white/20 rounded-full blur-2xl animate-pulse" />
                  <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-yellow-300/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
                </div>
                <div className="relative z-10 text-center">
                  <p className="text-white font-bold text-lg md:text-xl">{promo.bannerText}</p>
                  {promo.maxSlots && (
                    <div className="mt-2 flex items-center justify-center gap-3">
                      <span className="text-white/90 text-sm font-medium">
                        🎫 {promo.maxSlots - (promo.usedSlots || 0)} slots remaining out of {promo.maxSlots}
                      </span>
                      <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white/80 rounded-full transition-all"
                          style={{ width: `${((promo.usedSlots || 0) / promo.maxSlots) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {promo.code && (
                    <p className="mt-2 text-white/80 text-sm">
                      Use code: <span className="font-mono font-bold text-yellow-300 bg-black/20 px-2 py-0.5 rounded">{promo.code}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filter + Templates Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${filter === cat
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700 border border-gray-700 hover:border-gray-600'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden animate-pulse">
                  <div className="aspect-[16/10] bg-gray-800" />
                  <div className="p-6 space-y-3">
                    <div className="h-6 bg-gray-800 rounded w-2/3" />
                    <div className="h-4 bg-gray-800 rounded w-1/2" />
                    <div className="flex gap-2">
                      <div className="h-7 bg-gray-800 rounded w-16" />
                      <div className="h-7 bg-gray-800 rounded w-16" />
                    </div>
                    <div className="h-10 bg-gray-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Templates Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filtered.map((template, idx) => (
                <div
                  key={template.id}
                  className="group relative bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-600 transition-all duration-500 hover:shadow-2xl"
                  style={{
                    animationDelay: `${idx * 100}ms`,
                    animation: 'fadeInUp 0.5s ease-out forwards',
                  }}
                >
                  {/* Accent top border */}
                  <div className="absolute top-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: template.color }} />

                  {/* Preview Image — Clickable for preview modal */}
                  <div
                    className="relative aspect-[16/10] overflow-hidden bg-gray-800 cursor-zoom-in"
                    onClick={() => setPreviewImage({ url: template.image, alt: template.name, color: template.color })}
                  >
                    <img
                      src={template.image}
                      alt={template.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60" />

                    {/* Zoom icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="p-3 bg-black/50 backdrop-blur-sm rounded-full border border-white/20">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>

                    {/* Category Badge */}
                    <div className="absolute top-4 left-4">
                      <span
                        className="px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-md"
                        style={{ background: `${template.color}30`, color: template.color, border: `1px solid ${template.color}40` }}
                      >
                        {template.category}
                      </span>
                    </div>

                    {/* Setup time badge */}
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-black/50 text-green-400 backdrop-blur-md border border-green-500/20">
                        ⚡ {template.setupTime}
                      </span>
                    </div>

                    {/* Promo Badge */}
                    {activePromos.some(p => p.badgeText && (p.applicableTemplates?.length === 0 || p.applicableTemplates?.includes(template.id))) && (
                      <div className="absolute bottom-4 left-4">
                        <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/90 text-white backdrop-blur-md border border-red-400/50 animate-pulse shadow-lg shadow-red-500/30">
                          🔥 {activePromos.find(p => p.badgeText && (p.applicableTemplates?.length === 0 || p.applicableTemplates?.includes(template.id)))?.badgeText}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                          {template.name}
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">{template.tagline}</p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        {(() => {
                          const templatePromo = activePromos.find(p => p.applicableTemplates?.length === 0 || p.applicableTemplates?.includes(template.id));
                          if (templatePromo) {
                            return (
                              <>
                                <p className="text-sm text-gray-500 line-through">{template.price}</p>
                                <p className="text-lg font-bold text-red-400">
                                  {templatePromo.discountType === 'percentage'
                                    ? `${templatePromo.discountValue}% OFF`
                                    : `₱${templatePromo.discountValue?.toLocaleString()} OFF`}
                                </p>
                                <p className="text-gray-500 text-xs">{template.priceNote}</p>
                              </>
                            );
                          }
                          return (
                            <>
                              <p className="text-lg font-bold" style={{ color: template.color }}>{template.price}</p>
                              <p className="text-gray-500 text-xs">{template.priceNote}</p>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Tech Stack */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {template.techStack.map((tech) => (
                        <span
                          key={tech}
                          className="px-2.5 py-1 bg-gray-800 border border-gray-700 rounded-lg text-xs font-medium text-gray-300"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>

                    {/* Feature highlights */}
                    <div className="grid grid-cols-2 gap-1.5 mb-6">
                      {template.features.slice(0, 4).map((feature, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-2 text-sm text-gray-300">
                          <svg className="w-3.5 h-3.5 shrink-0" style={{ color: template.color }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="truncate">{feature.split(' & ')[0]}</span>
                        </div>
                      ))}
                    </div>

                    {/* Demo Credentials */}
                    {template.demoCredentials && (
                      <div className="mb-4 p-3 bg-gray-800/60 border border-gray-700/50 rounded-xl">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">🔑 Demo Credentials</p>
                        <div className="flex items-center gap-2 text-xs mb-1">
                          <span className="text-gray-500">Email:</span>
                          <span className="font-mono text-gray-300">{template.demoCredentials.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500">Password:</span>
                          <span className="font-mono text-gray-300">{template.demoCredentials.password}</span>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      {template.demoUrl ? (
                        <a
                          href={template.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-3 rounded-xl font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-500/20"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Live Demo
                        </a>
                      ) : (
                        <div className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-800/50 border border-gray-700/50 flex items-center justify-center gap-2 cursor-default">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Demo Coming Soon
                        </div>
                      )}
                      <button
                        onClick={() => openInquiry(template)}
                        className="px-5 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        style={{ background: `linear-gradient(135deg, ${template.color}, ${template.color}cc)` }}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Inquire
                      </button>
                      <Link
                        to={`/templates/${template.id}`}
                        className="px-5 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-xl font-semibold text-gray-300 hover:text-white transition-all flex items-center gap-2"
                      >
                        Details
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">No templates found for this category.</p>
              <button onClick={() => setFilter('All')} className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors">
                View All Templates
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Custom Build CTA */}
      <section className="py-16 border-t border-gray-800/50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Need Something Custom?</h2>
          <p className="text-gray-300 mb-8 max-w-xl mx-auto">
            Don't see what you need? We also build custom systems from scratch, tailored exactly to your business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/inquiry"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-lg transition-all hover:scale-105"
            >
              Start Custom Project
            </Link>
            <Link
              to="/"
              className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold text-lg border border-gray-700 transition-all"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>

      {/* Client Reviews Section */}
      {reviews.length > 0 && (
        <section className="py-16 border-t border-gray-800/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-3">What Our Clients Say</h2>
              <p className="text-gray-400">Real reviews from clients who availed our templates</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((review) => (
                <div key={review.id} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 hover:border-gray-600/50 transition-colors">
                  {/* Stars */}
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} className={`w-5 h-5 ${star <= review.rating ? 'text-yellow-400' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  {/* Review Text */}
                  <p className="text-gray-300 text-sm leading-relaxed mb-4">"{review.comment}"</p>
                  {/* Client Info */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium text-sm">{review.clientName}</p>
                      {review.templateName && (
                        <p className="text-gray-500 text-xs">{review.templateName}</p>
                      )}
                    </div>
                    {review.createdAt && (
                      <span className="text-gray-600 text-xs">
                        {(review.createdAt.toDate ? review.createdAt.toDate() : new Date(review.createdAt)).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 border-t border-gray-800/50 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} CronzPH. All rights reserved.</p>
      </footer>

      {/* Template Inquiry Modal */}
      <TemplateInquiryModal
        template={selectedTemplate}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={!!previewImage}
        imageUrl={previewImage?.url}
        altText={previewImage?.alt}
        accentColor={previewImage?.color}
        onClose={() => setPreviewImage(null)}
      />

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Templates;
