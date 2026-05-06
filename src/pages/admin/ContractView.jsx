import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { generateContract } from '../../ai/contract';
import { useToast } from '../../components/shared/Toast';
import { generateContractPDF } from '../../utils/pdfExport';

const ContractView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [project, setProject] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const projectDoc = await getDoc(doc(db, 'projects', id));
                if (!projectDoc.exists()) {
                    showToast('Project not found', 'error');
                    navigate('/admin/projects');
                    return;
                }

                const data = projectDoc.data();
                setProject(data);
            } catch (err) {
                console.error('Error fetching project:', err);
                showToast('Failed to load project', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProject();
    }, [id]);

    const handleGenerateContract = async () => {
        setIsGenerating(true);
        try {
            const contract = await generateContract(project);

            // Save contract to Firestore
            await updateDoc(doc(db, 'projects', id), {
                contract: {
                    ...contract,
                    generatedAt: serverTimestamp(),
                },
                contractGeneratedAt: serverTimestamp(),
            });

            // Refresh project data
            const projectDoc = await getDoc(doc(db, 'projects', id));
            setProject(projectDoc.data());

            showToast('Contract generated successfully!', 'success');
        } catch (err) {
            console.error('Error generating contract:', err);
            showToast(`Failed to generate contract: ${err.message}`, 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSendContractLink = async () => {
        setIsSending(true);
        try {
            const contractLink = `${window.location.origin}/contract/${id}`;
            await navigator.clipboard.writeText(contractLink);
            showToast('Contract link copied! Send this to your client.', 'success');
        } catch (err) {
            console.error('Error copying link:', err);
            showToast('Failed to copy link', 'error');
        } finally {
            setIsSending(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    const contract = project?.contract;
    const isSigned = contract?.signedBy && contract?.signedAt;

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link to="/admin/projects" className="text-blue-400 hover:text-blue-300 mb-2 inline-block">
                            ← Back to Projects
                        </Link>
                        <h1 className="text-3xl font-bold text-white">
                            Contract: {project?.businessName}
                        </h1>
                        <p className="text-gray-400">{project?.clientName}</p>
                    </div>
                    <div className="flex gap-3 print:hidden">
                        {!contract?.fullText ? (
                            <button
                                onClick={handleGenerateContract}
                                disabled={isGenerating}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50"
                            >
                                {isGenerating ? 'Generating...' : 'Generate Contract'}
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={handleSendContractLink}
                                    disabled={isSending}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg disabled:opacity-50"
                                >
                                    {isSending ? 'Sending...' : 'Send Contract Link'}
                                </button>
                                <button
                                    onClick={() => generateContractPDF(project, contract)}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg"
                                >
                                    📄 Export PDF
                                </button>
                                <button
                                    onClick={handlePrint}
                                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
                                >
                                    Print / Download
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Contract Status */}
                <div className="bg-gray-800 rounded-lg p-4 mb-6 flex items-center justify-between">
                    <div>
                        <span className="text-gray-400">Status: </span>
                        {!contract?.fullText ? (
                            <span className="text-yellow-400">Not Generated</span>
                        ) : isSigned ? (
                            <span className="text-green-400">Signed</span>
                        ) : (
                            <span className="text-blue-400">Generated - Awaiting Signature</span>
                        )}
                    </div>
                    {contract?.contractId && (
                        <span className="text-gray-500 text-sm">Contract ID: {contract.contractId}</span>
                    )}
                </div>

                {/* Signed Contract Details */}
                {isSigned && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                        <h3 className="text-lg font-semibold text-green-400 mb-2">✅ Signed Contract</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <p className="text-gray-300">
                                    Signed by: <span className="text-white font-medium">{contract.signedBy}</span>
                                </p>
                                <p className="text-gray-300">
                                    Signed on: {new Date(contract.signedAt?.toDate()).toLocaleString('en-PH', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </p>
                                <p className="text-gray-300">
                                    Terms agreed: {contract.agreedToTerms ? 'Yes' : 'No'}
                                </p>
                            </div>
                            {contract.signatureId && (
                                <div className="space-y-2">
                                    <p className="text-gray-300 text-sm">
                                        Signature ID: <span className="text-white font-mono text-xs">{contract.signatureId}</span>
                                    </p>
                                    <p className="text-gray-300 text-sm">
                                        IP Address: <span className="text-white">{contract.signatureIp}</span>
                                    </p>
                                    <p className="text-gray-300 text-sm">
                                        Timezone: <span className="text-white">{contract.signatureTimezone}</span>
                                    </p>
                                    <p className="text-gray-300 text-sm">
                                        Device: <span className="text-white text-xs">{contract.signatureUserAgent?.substring(0, 60)}...</span>
                                    </p>
                                </div>
                            )}
                        </div>
                        {/* Display captured signature image */}
                        {contract.signatureImage && (
                            <div className="mt-4 pt-4 border-t border-green-500/20">
                                <p className="text-gray-400 text-sm mb-2">🖊️ Captured Digital Signature:</p>
                                <div className="bg-gray-900 rounded-lg p-3 inline-block border border-gray-700">
                                    <img
                                        src={contract.signatureImage}
                                        alt="Client Digital Signature"
                                        className="h-20 w-auto"
                                    />
                                </div>
                                <p className="text-gray-500 text-xs mt-2">
                                    This signature was captured via digital signature pad with legal consent under RA 8792.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Contract Content */}
                {contract?.fullText ? (
                    <div className="bg-white text-gray-900 rounded-lg p-8 print:bg-white print:text-black">
                        <h1 className="text-2xl font-bold text-center mb-6">
                            {contract.contractTitle || 'Software Development Agreement'}
                        </h1>

                        {contract.date && (
                            <p className="text-center text-gray-600 mb-6">Date: {contract.date}</p>
                        )}

                        {/* Parties */}
                        {contract.parties && (
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold mb-2">Parties</h2>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="font-medium">Developer:</p>
                                        <p>{contract.parties.developer?.name}</p>
                                        <p className="text-gray-600">{contract.parties.developer?.address}</p>
                                    </div>
                                    <div>
                                        <p className="font-medium">Client:</p>
                                        <p>{contract.parties.client?.name}</p>
                                        <p>{contract.parties.client?.business}</p>
                                        <p className="text-gray-600">{contract.parties.client?.email}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Full Contract Text */}
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                            {contract.fullText}
                        </div>

                        {/* Signature Section */}
                        <div className="mt-8 pt-8 border-t">
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <p className="font-medium mb-4">Developer:</p>
                                    <p className="border-b border-gray-300 pb-2">CronzPH</p>
                                    <p className="text-gray-600 text-sm">Date: _______________</p>
                                </div>
                                <div>
                                    <p className="font-medium mb-4">Client:</p>
                                    {contract.signatureImage ? (
                                        <div className="mb-2">
                                            <img src={contract.signatureImage} alt="Client Signature" className="h-12 w-auto" />
                                        </div>
                                    ) : null}
                                    <p className="border-b border-gray-300 pb-2">{contract.signedBy || '________________'}</p>
                                    <p className="text-gray-600 text-sm">Date: {contract.signedAt ? new Date(contract.signedAt.toDate()).toLocaleDateString() : '_______________'}</p>
                                    {contract.signatureId && (
                                        <p className="text-gray-500 text-xs mt-1">Signature ID: {contract.signatureId}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-800 rounded-lg p-8 text-center">
                        <div className="text-4xl mb-4">📄</div>
                        <h2 className="text-xl font-bold text-white mb-2">No Contract Generated Yet</h2>
                        <p className="text-gray-400 mb-6">
                            Generate a contract for this project to send to the client.
                        </p>
                        <button
                            onClick={handleGenerateContract}
                            disabled={isGenerating}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50"
                        >
                            {isGenerating ? 'Generating...' : 'Generate Contract'}
                        </button>
                    </div>
                )}
            </div>

            {/* Print Styles */}
            <style>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:text-black { color: black !important; }
        }
      `}</style>
        </div>
    );
};

export default ContractView;