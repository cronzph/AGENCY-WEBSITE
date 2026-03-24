import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { createNotifications } from '../../utils/notifications';

const Contract = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSigning, setIsSigning] = useState(false);
    const [error, setError] = useState('');
    const [signatureData, setSignatureData] = useState({
        fullName: '',
        agreedToTerms: false,
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
        const { name, value, type, checked } = e.target;
        setSignatureData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSign = async () => {
        if (!signatureData.fullName.trim()) {
            setError('Please enter your full name.');
            return;
        }

        if (!signatureData.agreedToTerms) {
            setError('Please agree to all terms to sign the contract.');
            return;
        }

        // Verify name matches client name
        if (signatureData.fullName.trim().toLowerCase() !== project.clientName?.trim().toLowerCase()) {
            setError('The name must match the client name on the contract.');
            return;
        }

        setIsSigning(true);
        setError('');

        try {
            // Save signed contract
            await updateDoc(doc(db, 'projects', id), {
                contract: {
                    signedBy: signatureData.fullName.trim(),
                    signedAt: serverTimestamp(),
                    agreedToTerms: true,
                    contractText: project.contract?.fullText || '',
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
            setError('Failed to sign contract. Please try again.');
        } finally {
            setIsSigning(false);
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

    const contract = project?.contract;
    const isSigned = contract?.signedBy && contract?.signedAt;

    return (
        <div className="min-h-screen bg-gray-900 py-8 px-4">
            <div className="max-w-4xl mx-auto">
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
                        <Link to="/" className="text-blue-400 hover:text-blue-300">Go to Homepage</Link>
                    </div>
                ) : isSigned ? (
                    /* Already Signed */
                    <div className="bg-gray-800 rounded-lg p-8 text-center">
                        <div className="text-4xl mb-4">✅</div>
                        <h2 className="text-xl font-bold text-white mb-2">Contract Already Signed</h2>
                        <p className="text-gray-400 mb-6">
                            This contract was signed on {new Date(contract.signedAt?.toDate()).toLocaleDateString('en-PH', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}.
                        </p>
                        <Link to={`/payment/${id}`} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg">
                            Continue to Payment
                        </Link>
                    </div>
                ) : (
                    /* Contract Display */
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

                        {/* E-Signature Section */}
                        <div className="bg-gray-800 rounded-lg p-6 border border-blue-500/30">
                            <h3 className="text-lg font-bold text-white mb-4">E-Signature</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Type your full name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={signatureData.fullName}
                                        onChange={handleInputChange}
                                        placeholder="Enter your full name as shown in the contract"
                                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-gray-500 text-xs mt-1">
                                        Must match: <span className="text-white">{project.clientName}</span>
                                    </p>
                                </div>

                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        name="agreedToTerms"
                                        id="agreedToTerms"
                                        checked={signatureData.agreedToTerms}
                                        onChange={handleInputChange}
                                        className="w-5 h-5 mt-1 text-blue-500 rounded"
                                    />
                                    <label htmlFor="agreedToTerms" className="text-gray-300 text-sm">
                                        I have read and agree to all terms and conditions of this contract, including the payment terms, warranty policy, and termination clauses.
                                    </label>
                                </div>

                                <button
                                    onClick={handleSign}
                                    disabled={isSigning || !signatureData.fullName || !signatureData.agreedToTerms}
                                    className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSigning ? 'Signing...' : 'Sign Contract'}
                                </button>

                                <p className="text-gray-500 text-xs text-center">
                                    By signing, you agree to the terms and authorize the development work as described.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Contract;