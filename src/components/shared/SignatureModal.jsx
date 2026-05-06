import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * SignatureModal - A legally-binding digital signature capture modal
 * 
 * Features:
 * - Canvas-based signature drawing (no scrolling while signing)
 * - Required - cannot be skipped
 * - Captures: signature image, timestamp, IP address, device info, unique signature ID
 * - Consent checkbox for legal validity
 * - Touch and mouse support
 * - Prevents page scroll when modal is open
 */
const SignatureModal = ({ isOpen, onClose, onSign, clientName, contractId }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [agreedToLegal, setAgreedToLegal] = useState(false);
    const [typedName, setTypedName] = useState('');
    const [ipAddress, setIpAddress] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const lastPoint = useRef(null);

    // Generate unique signature ID
    const generateSignatureId = () => {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 10);
        return `SIG-${timestamp}-${random}`.toUpperCase();
    };

    // Fetch IP address for legal record
    useEffect(() => {
        if (isOpen) {
            fetch('https://api.ipify.org?format=json')
                .then(res => res.json())
                .then(data => setIpAddress(data.ip))
                .catch(() => setIpAddress('Unable to capture'));
        }
    }, [isOpen]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.top = `-${window.scrollY}px`;
        } else {
            const scrollY = document.body.style.top;
            document.body.style.overflow = '';
            document.body.style.touchAction = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.top = '';
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }

        return () => {
            document.body.style.overflow = '';
            document.body.style.touchAction = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.top = '';
        };
    }, [isOpen]);

    // Initialize canvas
    useEffect(() => {
        if (isOpen && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            // Set canvas size based on container
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = 200;

            // Set drawing styles
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Draw signature line
            ctx.beginPath();
            ctx.strokeStyle = '#4b5563';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.moveTo(20, 160);
            ctx.lineTo(canvas.width - 20, 160);
            ctx.stroke();
            ctx.setLineDash([]);

            // Reset drawing style
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
        }
    }, [isOpen]);

    // Get coordinates from event (mouse or touch)
    const getCoordinates = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();

        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        }

        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }, []);

    // Start drawing
    const startDrawing = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        const coords = getCoordinates(e);
        if (!coords) return;

        setIsDrawing(true);
        lastPoint.current = coords;

        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
    }, [getCoordinates]);

    // Draw
    const draw = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isDrawing) return;

        const coords = getCoordinates(e);
        if (!coords || !lastPoint.current) return;

        const ctx = canvasRef.current.getContext('2d');
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();

        lastPoint.current = coords;
        setHasSignature(true);
    }, [isDrawing, getCoordinates]);

    // Stop drawing
    const stopDrawing = useCallback((e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setIsDrawing(false);
        lastPoint.current = null;
    }, []);

    // Clear canvas
    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Redraw signature line
        ctx.beginPath();
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.moveTo(20, 160);
        ctx.lineTo(canvas.width - 20, 160);
        ctx.stroke();
        ctx.setLineDash([]);

        setHasSignature(false);
    };

    // Handle submit
    const handleSubmit = async () => {
        setError('');

        // Validate typed name matches client name
        if (!typedName.trim()) {
            setError('Please type your full legal name.');
            return;
        }

        if (typedName.trim().toLowerCase() !== clientName?.trim().toLowerCase()) {
            setError(`Name must match: "${clientName}"`);
            return;
        }

        if (!hasSignature) {
            setError('Please draw your signature in the box above.');
            return;
        }

        if (!agreedToLegal) {
            setError('You must agree to the legal declaration to proceed.');
            return;
        }

        setIsSubmitting(true);

        try {
            // Capture signature as base64 image
            const signatureImage = canvasRef.current.toDataURL('image/png');

            // Collect all legal metadata
            const signatureData = {
                signatureId: generateSignatureId(),
                signatureImage,
                signedBy: typedName.trim(),
                signedAt: new Date().toISOString(),
                ipAddress: ipAddress || 'Not captured',
                userAgent: navigator.userAgent,
                screenResolution: `${window.screen.width}x${window.screen.height}`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                contractId: contractId || 'N/A',
                legalConsent: true,
                consentText: 'I confirm that I am the person named above, this is my genuine signature, and I agree to be legally bound by the terms of this contract.',
            };

            await onSign(signatureData);
        } catch (err) {
            setError('Failed to submit signature. Please try again.');
            console.error('Signature submission error:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Prevent touch scrolling on canvas
    const preventScroll = useCallback((e) => {
        e.preventDefault();
    }, []);

    // Add passive: false touch event listeners to canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !isOpen) return;

        canvas.addEventListener('touchstart', preventScroll, { passive: false });
        canvas.addEventListener('touchmove', preventScroll, { passive: false });
        canvas.addEventListener('touchend', preventScroll, { passive: false });

        return () => {
            canvas.removeEventListener('touchstart', preventScroll);
            canvas.removeEventListener('touchmove', preventScroll);
            canvas.removeEventListener('touchend', preventScroll);
        };
    }, [isOpen, preventScroll]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop - no close on click (required signature) */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            {/* Modal Content */}
            <div className="relative w-full max-w-lg mx-4 max-h-[95vh] overflow-y-auto bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 rounded-t-2xl z-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                ✍️ Digital Signature
                            </h2>
                            <p className="text-gray-400 text-sm mt-1">
                                Required to proceed — legally binding
                            </p>
                        </div>
                        <div className="bg-red-500/20 text-red-400 text-xs font-bold px-3 py-1 rounded-full">
                            REQUIRED
                        </div>
                    </div>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {/* Legal Notice */}
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                        <p className="text-yellow-400 text-xs font-medium flex items-center gap-2">
                            ⚖️ Legal Notice
                        </p>
                        <p className="text-yellow-300/80 text-xs mt-1">
                            This digital signature is legally binding under the Philippine E-Commerce Act (RA 8792)
                            and the Rules on Electronic Evidence. Your signature, IP address, timestamp, and device
                            information will be recorded as proof of consent.
                        </p>
                    </div>

                    {/* Typed Name Verification */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Full Legal Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={typedName}
                            onChange={(e) => setTypedName(e.target.value)}
                            placeholder={`Type: ${clientName}`}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-gray-500 text-xs mt-1">
                            Must exactly match: <span className="text-blue-400 font-medium">{clientName}</span>
                        </p>
                    </div>

                    {/* Signature Canvas */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-300">
                                Draw Your Signature <span className="text-red-500">*</span>
                            </label>
                            <button
                                onClick={clearSignature}
                                className="text-xs text-red-400 hover:text-red-300 transition-colors"
                            >
                                Clear
                            </button>
                        </div>

                        <div className="relative border-2 border-dashed border-gray-600 rounded-lg bg-gray-800/50 overflow-hidden touch-none">
                            <canvas
                                ref={canvasRef}
                                className="w-full cursor-crosshair touch-none"
                                style={{ height: '200px', touchAction: 'none' }}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                            />

                            {!hasSignature && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <p className="text-gray-500 text-sm">Sign here with your finger or mouse</p>
                                </div>
                            )}
                        </div>

                        <p className="text-gray-500 text-xs mt-2 text-center">
                            Draw your signature above the dotted line
                        </p>
                    </div>

                    {/* Metadata Display */}
                    <div className="bg-gray-800/50 rounded-lg p-3 space-y-1">
                        <p className="text-gray-400 text-xs font-medium mb-2">📋 Signature Metadata (recorded for legal purposes):</p>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                            <span className="text-gray-500">IP Address:</span>
                            <span className="text-gray-300">{ipAddress || 'Fetching...'}</span>
                            <span className="text-gray-500">Timestamp:</span>
                            <span className="text-gray-300">{new Date().toLocaleString('en-PH')}</span>
                            <span className="text-gray-500">Device:</span>
                            <span className="text-gray-300 truncate">{navigator.platform || 'Unknown'}</span>
                            <span className="text-gray-500">Contract ID:</span>
                            <span className="text-gray-300">{contractId || 'N/A'}</span>
                        </div>
                    </div>

                    {/* Legal Consent Checkbox */}
                    <div className="flex items-start gap-3 bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <input
                            type="checkbox"
                            id="legalConsent"
                            checked={agreedToLegal}
                            onChange={(e) => setAgreedToLegal(e.target.checked)}
                            className="w-5 h-5 mt-0.5 text-blue-500 rounded shrink-0"
                        />
                        <label htmlFor="legalConsent" className="text-gray-300 text-sm leading-relaxed">
                            I, <span className="text-white font-semibold">{typedName || clientName}</span>, confirm that I am the person named in this contract.
                            This is my genuine signature, and I agree to be <span className="text-white font-semibold">legally bound</span> by
                            all terms and conditions stated in this agreement. I understand that this electronic signature
                            carries the same legal weight as a handwritten signature.
                        </label>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !hasSignature || !agreedToLegal || !typedName.trim()}
                            className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Signing...
                                </>
                            ) : (
                                '✅ Sign Contract'
                            )}
                        </button>
                    </div>

                    {/* Footer Legal Text */}
                    <p className="text-gray-600 text-[10px] text-center leading-relaxed">
                        This signature is protected under RA 8792 (E-Commerce Act of the Philippines) and A.M. No. 01-7-01-SC
                        (Rules on Electronic Evidence). Tampering with or forging electronic signatures is punishable by law.
                        All signature data including IP address, timestamp, and device information are securely stored as evidence.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignatureModal;
