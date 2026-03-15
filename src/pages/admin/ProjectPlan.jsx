import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '../../components/shared/Toast';

const ProjectPlan = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});
  const { showToast } = useToast();

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const projectRef = doc(db, 'projects', id);
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists()) {
          showToast('Project not found', 'error');
          return;
        }

        const projectData = { id: projectSnap.id, ...projectSnap.data() };
        setProject(projectData);
        
        // Initialize checked items for deployment checklist
        if (projectData.projectPlan?.deploymentChecklist) {
          const initial = {};
          projectData.projectPlan.deploymentChecklist.forEach((_, idx) => {
            initial[idx] = false;
          });
          setCheckedItems(initial);
        }
      } catch (err) {
        console.error('Error fetching project:', err);
        showToast('Failed to load project', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  const copyToClipboard = async (text, label = 'Copied!') => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(label, 'success');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyAllPrompts = () => {
    if (!project?.projectPlan?.kiloCodePrompts) return;
    
    const allPrompts = project.projectPlan.kiloCodePrompts
      .map(p => `Step ${p.step}: ${p.title}\n${p.prompt}`)
      .join('\n\n---\n\n');
    
    copyToClipboard(allPrompts, 'All prompts copied!');
  };

  const toggleChecklist = (idx) => {
    setCheckedItems(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      inquiry: 'bg-gray-500',
      assessed: 'bg-blue-500',
      proposal_sent: 'bg-indigo-500',
      proposal_accepted: 'bg-violet-500',
      payment: 'bg-orange-500',
      building: 'bg-purple-500',
      planning: 'bg-cyan-500',
      delivered: 'bg-green-500',
      cancelled: 'bg-red-500',
    };
    return classes[status] || 'bg-gray-500';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'text-red-400 bg-red-500/20',
      medium: 'text-yellow-400 bg-yellow-500/20',
      low: 'text-green-400 bg-green-500/20',
    };
    return colors[priority?.toLowerCase()] || 'text-gray-400 bg-gray-500/20';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-white">Project not found</div>
      </div>
    );
  }

  const plan = project.projectPlan;

  return (
    <div className="p-6">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 mb-6">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/admin/projects"
              className="flex items-center gap-2 text-gray-300 hover:text-white whitespace-nowrap"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Back</span>
            </Link>
            <h1 className="text-lg font-semibold text-white truncate">
              {project.clientName} - {project.aiAssessment?.projectType || 'Project'}
            </h1>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className={`inline-block px-3 py-1 rounded-full text-xs text-white ${getStatusBadgeClass(project.status)}`}>
              {project.status}
            </span>
            <button
              onClick={() => copyAllPrompts()}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm whitespace-nowrap"
            >
              Copy All
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        {/* Section 1 - Overview */}
        <section className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Overview</h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">Project Name</p>
              <pre className="bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto">
                <code>{plan.projectName}</code>
              </pre>
            </div>
            
            <div>
              <p className="text-gray-400 text-sm mb-1">Overview</p>
              <p className="text-white">{plan.overview}</p>
            </div>
            
            <div>
              <p className="text-gray-400 text-sm mb-2">Tech Stack</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-blue-400 text-xs mb-1">Frontend</p>
                  <div className="flex flex-wrap gap-2">
                    {plan.techStack?.frontend?.map((tech, i) => (
                      <span key={i} className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-sm">{tech}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-green-400 text-xs mb-1">Backend</p>
                  <div className="flex flex-wrap gap-2">
                    {plan.techStack?.backend?.map((tech, i) => (
                      <span key={i} className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm">{tech}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-purple-400 text-xs mb-1">Database</p>
                  <div className="flex flex-wrap gap-2">
                    {plan.techStack?.database?.map((tech, i) => (
                      <span key={i} className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-sm">{tech}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-orange-400 text-xs mb-1">Hosting</p>
                  <div className="flex flex-wrap gap-2">
                    {plan.techStack?.hosting?.map((tech, i) => (
                      <span key={i} className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded text-sm">{tech}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
              <div>
                <p className="text-gray-400 text-xs">Estimated Hours</p>
                <p className="text-2xl font-bold text-white">{plan.estimatedHours} hours</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Estimated Days</p>
                <p className="text-2xl font-bold text-white">{project.aiAssessment?.estimatedDays || '-'} days</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 - Folder Structure */}
        <section className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Folder Structure</h2>
            <button
              onClick={() => copyToClipboard(plan.folderStructure, 'Folder structure copied!')}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
            >
              Copy
            </button>
          </div>
          <pre className="bg-gray-900 text-gray-300 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre">
            {plan.folderStructure}
          </pre>
        </section>

        {/* Section 3 - Database Schema */}
        <section className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Database Schema</h2>
          <div className="space-y-6">
            {plan.databaseSchema?.map((collection, idx) => (
              <div key={idx} className="bg-gray-700/30 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-400 mb-2">{collection.collection}</h3>
                <div className="flex flex-wrap gap-2 mb-2">
                  {collection.fields?.map((field, i) => (
                    <span key={i} className="bg-gray-600 text-gray-300 px-2 py-1 rounded text-xs font-mono">{field}</span>
                  ))}
                </div>
                <p className="text-gray-400 text-sm">{collection.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4 - Pages & Components */}
        <section className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Pages & Components</h2>
          <div className="space-y-6">
            {plan.pages?.map((page, idx) => (
              <div key={idx} className="bg-gray-700/30 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-white">{page.name}</h3>
                  <code className="text-sm text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">{page.path}</code>
                </div>
                <p className="text-gray-400 text-sm mb-3">{page.description}</p>
                <div className="flex flex-wrap gap-2">
                  {page.components?.map((comp, i) => (
                    <span key={i} className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded text-xs">{comp}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5 - Features */}
        <section className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Features</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3">Priority</th>
                </tr>
              </thead>
              <tbody>
                {plan.features?.map((feature, idx) => (
                  <tr key={idx} className="border-b border-gray-700/50">
                    <td className="py-3 pr-4 text-white font-medium">{feature.name}</td>
                    <td className="py-3 pr-4 text-gray-300">{feature.description}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(feature.priority)}`}>
                        {feature.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 6 - Milestones */}
        <section className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Milestones</h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-600"></div>
            <div className="space-y-6">
              {plan.milestones?.map((milestone, idx) => (
                <div key={idx} className="relative pl-10">
                  <div className={`absolute left-2.5 w-3 h-3 rounded-full ${idx === plan.milestones.length - 1 ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-lg font-semibold text-white">{milestone.name}</h3>
                      <span className="text-sm text-gray-400">{milestone.estimatedDays} days</span>
                    </div>
                    <p className="text-gray-400 text-sm">{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 7 - Kilo Code Prompts */}
        <section className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Kilo Code Prompts</h2>
          <div className="space-y-6">
            {plan.kiloCodePrompts?.map((prompt, idx) => (
              <div key={idx} className="bg-gray-700/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {prompt.step}
                    </span>
                    <h3 className="text-lg font-semibold text-white">{prompt.title}</h3>
                  </div>
                  <button
                    onClick={() => copyToClipboard(prompt.prompt, 'Prompt copied!')}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                  >
                    Copy Prompt
                  </button>
                </div>
                <pre className="bg-gray-900 text-gray-300 p-4 rounded-lg overflow-x-auto text-sm">
                  {prompt.prompt}
                </pre>
              </div>
            ))}
          </div>
        </section>

        {/* Section 8 - Deployment Checklist */}
        <section className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Deployment Checklist</h2>
          <div className="space-y-3">
            {plan.deploymentChecklist?.map((item, idx) => (
              <label
                key={idx}
                className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-700/30"
              >
                <input
                  type="checkbox"
                  checked={checkedItems[idx] || false}
                  onChange={() => toggleChecklist(idx)}
                  className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700"
                />
                <span className={`text-sm ${checkedItems[idx] ? 'text-gray-500 line-through' : 'text-white'}`}>
                  {item}
                </span>
              </label>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProjectPlan;
