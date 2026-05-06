import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { getAgencyName, getActivePaymentMethods } from '../../utils/settings';
import { createNotifications } from '../../utils/notifications';

const Payment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [agencyName, setAgencyName] = useState('CronzPH');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [proofBase64, setProofBase64] = useState(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [rejectedPayment, setRejectedPayment] = useState(null);
  const canvasRef = useRef(null);

  const paymentTypeConfig = {
    gcash: { label: 'GCash', color: 'green', requiresRef: true },
    maya: { label: 'Maya', color: 'blue', requiresRef: true },
    cimb: { label: 'CIMB', color: 'red', requiresRef: false },
    maribank: { label: 'Maribank', color: 'purple', requiresRef: false },
    coinsph: { label: 'Coins.ph', color: 'orange', requiresRef: true },
    others: { label: 'Others', color: 'gray', requiresRef: false },
  };

  const colorClasses = {
    green: { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500', bgLight: 'bg-green-500/10' },
    blue: { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500', bgLight: 'bg-blue-500/10' },
    red: { bg: 'bg-red-500', text: 'text-red-400', border: 'border-red-500', bgLight: 'bg-red-500/10' },
    purple: { bg: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500', bgLight: 'bg-purple-500/10' },
    orange: { bg: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500', bgLight: 'bg-orange-500/10' },
    gray: { bg: 'bg-gray-500', text: 'text-gray-400', border: 'border-gray-500', bgLight: 'bg-gray-500/10' },
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const name = await getAgencyName();
        setAgencyName(name);

        const methods = await getActivePaymentMethods();
        setPaymentMethods(methods);

        const projectRef = doc(db, 'projects', id);
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists()) {
          setError('Project not found');
          setLoading(false);
          return;
        }

        const projectData = { id: projectSnap.id, ...projectSnap.data() };

        // Allow viewing payment page for all statuses from proposal_accepted onwards
        const allowedStatuses = ['proposal_accepted', 'awaiting_payment', 'payment_submitted', 'payment_confirmed', 'in_progress', 'planning', 'building', 'for_review', 'delivered', 'completed'];
        if (!allowedStatuses.includes(projectData.status)) {
          navigate(`/proposal/${id}`);
          return;
        }

        // Check for rejected payment
        const paymentsQuery = query(
          collection(db, 'payments'),
          where('projectId', '==', id),
          where('status', '==', 'rejected')
        );
        const paymentsSnap = await getDocs(paymentsQuery);
        if (!paymentsSnap.empty) {
          const rejected = paymentsSnap.docs[0].data();
          setRejectedPayment({
            id: paymentsSnap.docs[0].id,
            ...rejected
          });
        }

        setProject(projectData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load payment page');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const getMethodLabel = (method) => {
    if (method.type === 'others') {
      return method.customName || 'Others';
    }
    return paymentTypeConfig[method.type]?.label || 'Unknown';
  };

  const getMethodColor = (method) => {
    const colorKey = method.type === 'others' ? 'gray' : method.type;
    return colorClasses[colorKey] || colorClasses.gray;
  };

  const requiresRefNumber = (method) => {
    if (!method) return false;
    if (method.type === 'others') return false;
    return paymentTypeConfig[method.type]?.requiresRef || false;
  };

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          let width = img.width;
          let height = img.height;
          const maxSize = 800;

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedBase64);
        };
      };
    });
  };

  const MAX_FILE_SIZE_MB = 5;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setFieldErrors((prev) => ({ ...prev, proof: 'Only JPG, PNG, or GIF images are allowed' }));
      e.target.value = '';
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFieldErrors((prev) => ({ ...prev, proof: `File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB` }));
      e.target.value = '';
      return;
    }

    setFieldErrors((prev) => ({ ...prev, proof: '' }));
    setSelectedFile(file);

    // Compress and convert to Base64
    try {
      const base64 = await compressImage(file);
      setProofBase64(base64);
      setFilePreview(base64);
      setError('');
    } catch (err) {
      console.error('Error compressing image:', err);
      setFieldErrors((prev) => ({ ...prev, proof: 'Failed to process image. Please try a different file.' }));
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const validateForm = () => {
    const newFieldErrors = {};
    let isValid = true;

    if (!selectedMethod) {
      setError('Please select a payment method');
      return false;
    }

    if (!proofBase64) {
      newFieldErrors.proof = 'Please upload a payment proof image';
      isValid = false;
    }

    if (requiresRefNumber(selectedMethod)) {
      const methodLabel = getMethodLabel(selectedMethod);
      if (!referenceNumber.trim()) {
        newFieldErrors.referenceNumber = `${methodLabel} reference number is required`;
        isValid = false;
      } else {
        // Reference number: digits only, 8–18 characters (covers GCash/Maya/Coins.ph formats)
        const refRegex = /^\d{8,18}$/;
        if (!refRegex.test(referenceNumber.trim())) {
          newFieldErrors.referenceNumber = `${methodLabel} reference number must be 8–18 digits`;
          isValid = false;
        }
      }
    }

    setFieldErrors(newFieldErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Calculate downpayment
      const downpaymentAmount = project.aiAssessment?.suggestedPrice
        ? project.aiAssessment.suggestedPrice * 0.5
        : 0;

      // Add payment record with Base64
      await addDoc(collection(db, 'payments'), {
        projectId: id,
        clientId: project.email,
        clientName: project.clientName,
        businessName: project.businessName,
        projectType: project.aiAssessment?.projectType || project.servicesNeeded?.[0],
        amount: downpaymentAmount,
        type: 'downpayment',
        paymentMethod: selectedMethod.type,
        paymentMethodLabel: getMethodLabel(selectedMethod),
        accountNumber: selectedMethod.accountNumber,
        accountName: selectedMethod.accountName,
        proofBase64: proofBase64,
        referenceNumber: referenceNumber || null,
        notes: notes || null,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // Create notification
      await createNotifications.paymentSubmitted(
        { id: '', projectId: id, clientName: project.clientName, amount: downpaymentAmount },
        project
      );

      // Update project status
      await updateDoc(doc(db, 'projects', id), {
        status: 'payment_submitted',
        paymentSubmittedAt: new Date(),
      });

      setShowSuccess(true);
    } catch (err) {
      console.error('Error submitting payment:', err);
      setError('Failed to submit payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (showSuccess) {
    const clientLoggedIn = !!localStorage.getItem('clientPortal');
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Payment Submitted!</h2>
          <p className="text-gray-300 mb-6">
            Payment proof submitted! We will confirm your payment within 24 hours and begin your project.
          </p>
          <button
            onClick={() => navigate(clientLoggedIn ? '/portal' : '/')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
          >
            {clientLoggedIn ? 'Back to Portal' : 'Back to Home'}
          </button>
        </div>
      </div>
    );
  }

  const downpaymentAmount = project?.aiAssessment?.suggestedPrice
    ? project.aiAssessment.suggestedPrice * 0.5
    : 0;

  const isClientLoggedIn = !!localStorage.getItem('clientPortal');

  // Show payment receipt if already submitted or confirmed
  const paymentAlreadyDone = ['payment_submitted', 'payment_confirmed', 'in_progress', 'planning', 'building', 'for_review', 'delivered', 'completed'].includes(project?.status);

  if (paymentAlreadyDone && !showSuccess) {
    const isConfirmed = project?.status !== 'payment_submitted';
    return (
      <div className="min-h-screen bg-gray-900 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Back to Portal */}
          {isClientLoggedIn && (
            <div className="mb-6">
              <Link to="/portal" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm">
                ← Back to Portal
              </Link>
            </div>
          )}

          {/* Payment Status Banner */}
          <div className={`rounded-lg p-6 mb-6 border ${isConfirmed ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isConfirmed ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
                <span className="text-2xl">{isConfirmed ? '✅' : '⏳'}</span>
              </div>
              <div>
                <h2 className={`text-xl font-bold ${isConfirmed ? 'text-green-400' : 'text-yellow-400'}`}>
                  {isConfirmed ? 'Payment Confirmed' : 'Payment Under Review'}
                </h2>
                <p className="text-gray-400 text-sm">
                  {isConfirmed
                    ? 'Your payment has been confirmed. Your project is now in progress!'
                    : 'Your payment proof has been submitted and is being reviewed.'}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-gray-800 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Payment Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Project</p>
                <p className="text-white">{project?.businessName || project?.clientName || '-'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Amount</p>
                <p className="text-green-400 font-semibold">
                  {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(downpaymentAmount)}
                </p>
              </div>
              {project?.paymentSubmittedAt && (
                <div>
                  <p className="text-gray-400 text-sm">Submitted On</p>
                  <p className="text-white text-sm">
                    {new Date(project.paymentSubmittedAt?.toDate ? project.paymentSubmittedAt.toDate() : project.paymentSubmittedAt).toLocaleDateString('en-PH', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </p>
                </div>
              )}
              {project?.paymentConfirmedAt && (
                <div>
                  <p className="text-gray-400 text-sm">Confirmed On</p>
                  <p className="text-white text-sm">
                    {new Date(project.paymentConfirmedAt?.toDate ? project.paymentConfirmedAt.toDate() : project.paymentConfirmedAt).toLocaleDateString('en-PH', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      <div className="max-w-2xl mx-auto">
        {/* Back to Portal */}
        {isClientLoggedIn && (
          <div className="mb-6">
            <Link to="/portal" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm">
              ← Back to Portal
            </Link>
          </div>
        )}
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">{agencyName}</h1>
          <p className="text-gray-400 text-lg mt-2"> Payment Instructions</p>
          <p className="text-gray-500 text-sm mt-1">Project ID: {id.slice(0, 8)}</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Rejection Notice */}
        {rejectedPayment && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-red-500/30 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-400">Your previous payment was rejected.</h3>
                <p className="text-gray-300 mt-1">
                  <span className="font-medium">Reason:</span> {rejectedPayment.rejectionReason}
                </p>
                <p className="text-gray-400 text-sm mt-2">Please resubmit your payment proof with the correct details.</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1 - Choose Payment Method */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Choose Payment Method</h2>

            {paymentMethods.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No payment methods available. Please contact support.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {paymentMethods.map((method) => {
                  const colors = getMethodColor(method);
                  const label = getMethodLabel(method);
                  const isSelected = selectedMethod?.id === method.id;

                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => {
                        setSelectedMethod(method);
                        setError('');
                      }}
                      className={`p-4 rounded-lg border-2 text-center transition-colors ${isSelected ? `${colors.border} ${colors.bgLight}` : 'border-gray-600 hover:border-gray-500'}`}
                    >
                      <div className={`w-10 h-10 ${colors.bg} rounded-full flex items-center justify-center mx-auto mb-2`}>
                        <span className="text-white font-bold text-sm">{label.charAt(0)}</span>
                      </div>
                      <span className="text-white font-medium text-sm">{label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedMethod && (
              <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{getMethodLabel(selectedMethod)}</p>
                    <p className="text-gray-400 text-sm">Account: {selectedMethod.accountNumber}</p>
                    <p className="text-gray-400 text-sm">Name: {selectedMethod.accountName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedMethod.accountNumber)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded"
                  >
                    Copy Number
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 2 - Payment Details */}
          {selectedMethod && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Payment Details</h2>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Amount to Pay</p>
                    <p className="text-2xl font-bold text-green-400">{formatCurrency(downpaymentAmount)}</p>
                    <p className="text-gray-500 text-xs">Downpayment (50%)</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Payment Method</p>
                    <p className="text-white font-medium">{getMethodLabel(selectedMethod)}</p>
                    <p className="text-gray-500 text-xs">{selectedMethod.accountName}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 3 - Upload Proof */}
          {selectedMethod && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Upload Payment Proof</h2>

              <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-2">
                  Upload screenshot of your payment <span className="text-red-400">*</span>
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  onChange={handleFileChange}
                  className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer ${fieldErrors.proof ? 'border-red-500' : 'border-gray-600'}`}
                />
                <p className="text-gray-500 text-xs mt-1">JPG, PNG, or GIF only · Max 5MB</p>
                {fieldErrors.proof && <p className="text-red-400 text-sm mt-1">{fieldErrors.proof}</p>}
              </div>

              {filePreview && (
                <div className="mb-4">
                  <p className="text-sm text-gray-400 mb-2">Preview:</p>
                  <img
                    src={filePreview}
                    alt="Payment proof preview"
                    className="max-w-xs rounded-lg border border-gray-600"
                  />
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-2">
                  {getMethodLabel(selectedMethod)} Reference Number {requiresRefNumber(selectedMethod) && <span className="text-red-400">*</span>}
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => {
                    setReferenceNumber(e.target.value);
                    if (fieldErrors.referenceNumber) {
                      setFieldErrors((prev) => ({ ...prev, referenceNumber: '' }));
                    }
                  }}
                  className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white focus:ring-2 focus:ring-blue-500 ${fieldErrors.referenceNumber ? 'border-red-500' : 'border-gray-600'}`}
                  placeholder={requiresRefNumber(selectedMethod) ? 'Enter digits only (e.g. 123456789012)' : 'Enter reference (optional)'}
                />
                {requiresRefNumber(selectedMethod) && (
                  <p className="text-gray-500 text-xs mt-1">Digits only, 8–18 characters</p>
                )}
                {fieldErrors.referenceNumber && (
                  <p className="text-red-400 text-sm mt-1">{fieldErrors.referenceNumber}</p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Any additional notes..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Payment Proof'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Payment;
