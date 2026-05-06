import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { createNotifications } from '../../utils/notifications';
import { generateContractPDF } from '../../utils/pdfExport';
import SignatureModal from '../../components/shared/SignatureModal';

const Contract = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [showSignatureModal, setShowSignatureModal] = useState(false);

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

    const handleSignContract = async (signatureData) => {
        try {
            // Save signed contract with full legal metadata
            await updateDoc(doc(db, 'projects', id), {
                contract: {
                    ...project.contract,
                    signedBy: signatureData.signedBy,
                    signedAt: serverTimestamp(),
                    agreedToTerms: true,
                    contractText: project.contract?.fullText || '',
                    // Legal signature metadata
                    signatureId: signatureData.signatureId,
                    signatureImage: signatureData.signatureImage,
                    signatureIp: signatureData.ipAddress,
                    signatureUserAgent: signatureData.userAgent,
                    signatureScreenResolution: signatureData.screenResolution,
                    signatureTimezone: signatureData.timezone,
                    signatureTimestamp: signatureData.signedAt,
                    legalConsent: signatureData.legalConsent,
                    consentText: signatureData.consentText,
                },
                status: 'contract_signed',
                contractSignedAt: serverTimestamp(),
            });

            // Create notification
            await createNotifications.contractSigned({
                id: id,
                clientName: project.clientName,
                businessName: project.businessName,
            });

            // Navigate to payment page
            navigate(`/payment/${id}`);
        } catch (err) {
            console.error('Error signing contract:', err);
            throw new Error('Failed to sign contract. Please try again.');
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
                    <Link to="/portal" className="text-blue-400 hover:text-blue-300">← Back to Portal</Link>
                </div>
            </div>
        );
    }

    const contract = project?.contract;
    const isSigned = contract?.signedBy && contract?.signedAt;

    return (
        <div className="min-h-screen bg-gray-900 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Back to Portal + PDF Export */}
                <div className="mb-6 flex items-center justify-between">
                    <Link to="/portal" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm">
                        ← Back to Portal
                    </Link>
                    {contract?.fullText && (
                        <button
                            onClick={() => generateContractPDF(project, contract)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                        >
                            📄 Download PDF
                        </button>
                    )}
                </div>

                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Cronz<span className="text-blue-400">PH</span>
                    </h1>
                    <p className="text-gray-400">Software Development Agreement</p>
                    {contract?.contractId && (
                        <p className="text-gray-500 text-sm mt-2">Contract ID: {contract.contractId}</p>
                    )}
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {/* Contract Not Ready */}
                {!contract?.fullText ? (
                    <div className="bg-gray-800 rounded-lg p-8 text-center">
                        <div className="text-4xl mb-4">📄</div>
                        <h2 className="text-xl font-bold text-white mb-2">Contract is Being Prepared</h2>
                        <p className="text-gray-400 mb-6">
                            Your contract is being prepared by our team. Please check back later or contact us.
                        </p>
                        <Link to="/portal" className="text-blue-400 hover:text-blue-300">← Back to Portal</Link>
                    </div>
                ) : isSigned ? (
                    /* Already Signed — show full contract in read-only mode */
                    <div className="space-y-6">
                        {/* Signed Banner */}
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
                                <span className="text-xl">✅</span>
                            </div>
                            <div>
                                <p className="text-green-400 font-semibold">Contract Signed</p>
                                <p className="text-gray-400 text-sm">
                                    Signed by {contract.signedBy} on {new Date(contract.signedAt?.toDate()).toLocaleDateString('en-PH', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </p>
                            </div>
                        </div>

                        {/* Signature Verification Info */}
                        {contract.signatureId && (
                            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                                <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                                    🔐 Signature Verification
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-500">Signature ID:</span>
                                        <span className="text-gray-300 ml-2 font-mono">{contract.signatureId}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">IP Address:</span>
                                        <span className="text-gray-300 ml-2">{contract.signatureIp}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Timezone:</span>
                                        <span className="text-gray-300 ml-2">{contract.signatureTimezone}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Timestamp:</span>
                                        <span className="text-gray-300 ml-2">{contract.signatureTimestamp}</span>
                                    </div>
                                </div>
                                {/* Display captured signature */}
                                {contract.signatureImage && (
                                    <div className="mt-3 pt-3 border-t border-gray-700">
                                        <p className="text-gray-500 text-xs mb-2">Captured Signature:</p>
                                        <div className="bg-gray-900 rounded-lg p-2 inline-block">
                                            <img
                                                src={contract.signatureImage}
                                                alt="Digital Signature"
                                                className="h-16 w-auto"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Contract Content */}
                        <div className="bg-gray-800 rounded-lg p-8">
                            <h2 className="text-2xl font-bold text-white mb-6 text-center">
                                {contract.contractTitle || 'Software Development Agreement'}
                            </h2>
                            <div className="prose prose-invert max-w-none">
                                <div className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed">
                                    {contract.fullText}
                                </div>
                            </div>
                        </div>

                        {/* Per-Issue Pricing Table */}
                        <div className="bg-gray-800 rounded-lg p-6">
                            <h3 className="text-lg font-bold text-white mb-4">Per-Issue Pricing (After Warranty)</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-700">
                                            <th className="text-left py-2 text-gray-400">Issue Type</th>
                                            <th className="text-left py-2 text-gray-400">Description</th>
                                            <th className="text-left py-2 text-gray-400">Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-300">
                                        <tr className="border-b border-gray-700/50">
                                            <td className="py-2">Minor (cosmetic)</td>
                                            <td className="py-2">Visual issues, spacing, colors</td>
                                            <td className="py-2">FREE always</td>
                                        </tr>
                                        <tr className="border-b border-gray-700/50">
                                            <td className="py-2">Medium</td>
                                            <td className="py-2">Broken feature, not core</td>
                                            <td className="py-2">₱1,000 - ₱2,500</td>
                                        </tr>
                                        <tr className="border-b border-gray-700/50">
                                            <td className="py-2">Major</td>
                                            <td className="py-2">Core functionality broken</td>
                                            <td className="py-2">₱2,500 - ₱5,000</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2">Critical</td>
                                            <td className="py-2">System down, urgent</td>
                                            <td className="py-2">₱5,000+</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-gray-500 text-xs mt-4">
                                * All issues within 30 days of delivery are covered under warranty at no additional cost.
                            </p>
                        </div>
                    </div>
                ) : (
                    /* Contract Display - Unsigned */
                    <div className="space-y-6">
                        {/* Contract Content */}
                        <div className="bg-gray-800 rounded-lg p-8">
                            <h2 className="text-2xl font-bold text-white mb-6 text-center">
                                {contract.contractTitle || 'Software Development Agreement'}
                            </h2>

                            <div className="prose prose-invert max-w-none">
                                <div className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed">
                                    {contract.fullText}
                                </div>
                            </div>
                        </div>

                        {/* Per-Issue Pricing Table */}
                        <div className="bg-gray-800 rounded-lg p-6">
                            <h3 className="text-lg font-bold text-white mb-4">Per-Issue Pricing (After Warranty)</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-700">
                                            <th className="text-left py-2 text-gray-400">Issue Type</th>
                                            <th className="text-left py-2 text-gray-400">Description</th>
                                            <th className="text-left py-2 text-gray-400">Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-300">
                                        <tr className="border-b border-gray-700/50">
                                            <td className="py-2">Minor (cosmetic)</td>
                                            <td className="py-2">Visual issues, spacing, colors</td>
                                            <td className="py-2">FREE always</td>
                                        </tr>
                                        <tr className="border-b border-gray-700/50">
                                            <td className="py-2">Medium</td>
                                            <td className="py-2">Broken feature, not core</td>
                                            <td className="py-2">₱1,000 - ₱2,500</td>
                                        </tr>
                                        <tr className="border-b border-gray-700/50">
                                            <td className="py-2">Major</td>
                                            <td className="py-2">Core functionality broken</td>
                                            <td className="py-2">₱2,500 - ₱5,000</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2">Critical</td>
                                            <td className="py-2">System down, urgent</td>
                                            <td className="py-2">₱5,000+</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-gray-500 text-xs mt-4">
                                * All issues within 30 days of delivery are covered under warranty at no additional cost.
                            </p>
                        </div>

                        {/* Sign Contract CTA */}
                        <div className="bg-gray-800 rounded-lg p-6 border border-blue-500/30">
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
                                    <span className="text-3xl">✍️</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Ready to Sign?</h3>
                                    <p className="text-gray-400 text-sm mt-1">
                                        By signing this contract, you agree to all terms and conditions above.
                                        A digital signature with your handwritten mark is required.
                                    </p>
                                </div>

                                <div className="bg-gray-700/50 rounded-lg p-3 text-left">
                                    <p className="text-gray-400 text-xs font-medium mb-2">What you'll need to provide:</p>
                                    <ul className="text-gray-300 text-xs space-y-1">
                                        <li className="flex items-center gap-2">
                                            <span className="text-blue-400">✓</span> Your full legal name (must match: {project.clientName})
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="text-blue-400">✓</span> Your handwritten digital signature
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="text-blue-400">✓</span> Legal consent acknowledgment
                                        </li>
                                    </ul>
                                </div>

                                <button
                                    onClick={() => setShowSignatureModal(true)}
                                    className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2"
                                >
                                    ✍️ Open Signature Pad & Sign
                                </button>

                                <p className="text-gray-600 text-xs">
                                    Your signature is legally binding under RA 8792 (E-Commerce Act of the Philippines).
                                    IP address, timestamp, and device info will be recorded.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Signature Modal */}
            <SignatureModal
                isOpen={showSignatureModal}
                onClose={() => setShowSignatureModal(false)}
                onSign={handleSignContract}
                clientName={project?.clientName || ''}
                contractId={contract?.contractId || id}
            />
        </div>
    );
};

export default Contract;
