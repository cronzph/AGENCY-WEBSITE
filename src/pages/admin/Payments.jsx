import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { createNotifications } from '../../utils/notifications';
import { useToast } from '../../components/shared/Toast';

const Payments = () => {
  const [authReady, setAuthReady] = useState(false);
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [rejectModal, setRejectModal] = useState({ open: false, paymentId: '', projectId: '', reason: 'blurry', otherReason: '' });
  const [proofModal, setProofModal] = useState({ open: false, proofBase64: '', paymentId: '', clientName: '', businessName: '', projectType: '', paymentType: '', amount: 0, paymentMethodLabel: '', referenceNumber: '', createdAt: null, notes: '', status: '' });
  const { showToast } = useToast();

  const rejectionReasons = [
    { value: 'blurry', label: 'Blurry or unreadable screenshot' },
    { value: 'wrong_amount', label: 'Wrong amount sent' },
    { value: 'wrong_ref', label: 'Reference number doesn\'t match' },
    { value: 'wrong_account', label: 'Payment sent to wrong number/account' },
    { value: 'duplicate', label: 'Duplicate submission' },
    { value: 'other', label: 'Other (please specify)' },
  ];

  // Wait for auth before subscribing to Firestore
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    
    const paymentsQuery = query(
      collection(db, 'payments'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(paymentsQuery, (snapshot) => {
      const paymentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPayments(paymentsData);
    });

    return () => unsubscribe();
  }, [authReady]);

  const handleConfirmPayment = async (paymentData) => {
    const paymentId = paymentData?.id || paymentData?.paymentId;
    if (!paymentId) return;
    
    try {
      // Update payment status to confirmed
      await updateDoc(doc(db, 'payments', paymentId), {
        status: 'confirmed',
        confirmedAt: new Date(),
      });

      // Update project status to in_progress
      const payment = payments.find(p => p.id === paymentId);
      if (payment) {
        await updateDoc(doc(db, 'projects', payment.projectId), {
          status: 'building',
          paymentReceivedAt: new Date(),
          buildingStartedAt: new Date(),
        });

        // Create notification
        await createNotifications.paymentConfirmed(payment, { businessName: payment.businessName });
      }

      showToast('Payment confirmed! Project is now in progress.', 'success');
    } catch (err) {
      console.error('Error confirming payment:', err);
      showToast('Failed to confirm payment. Please try again.', 'error');
    }
  };

  const handleRejectPayment = async () => {
    if (!rejectModal.paymentId) return;
    
    try {
      const payment = payments.find(p => p.id === rejectModal.paymentId);
      
      let finalReason = '';
      if (rejectModal.reason === 'other') {
        finalReason = rejectModal.otherReason || 'Other reason';
      } else {
        finalReason = rejectionReasons.find(r => r.value === rejectModal.reason)?.label || 'Other reason';
      }

      // Update payment status to rejected
      await updateDoc(doc(db, 'payments', rejectModal.paymentId), {
        status: 'rejected',
        rejectionReason: finalReason,
        rejectedAt: new Date(),
      });

      // Update project status back to proposal_accepted
      if (payment) {
        await updateDoc(doc(db, 'projects', payment.projectId), {
          status: 'proposal_accepted',
        });
      }

      showToast('Payment rejected. Client has been notified.', 'info');
      setRejectModal({ open: false, paymentId: '', projectId: '', reason: 'blurry', otherReason: '' });
    } catch (err) {
      console.error('Error rejecting payment:', err);
      showToast('Failed to reject payment. Please try again.', 'error');
    }
  };

  const handleViewProof = (payment) => {
    setProofModal({ 
      open: true, 
      proofBase64: payment.proofBase64,
      paymentId: payment.id,
      clientName: payment.clientName,
      businessName: payment.businessName,
      projectType: payment.projectType,
      paymentType: payment.type,
      amount: payment.amount,
      paymentMethodLabel: payment.paymentMethodLabel,
      referenceNumber: payment.referenceNumber,
      createdAt: payment.createdAt,
      notes: payment.notes,
      status: payment.status,
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredPayments = payments.filter(p => {
    if (activeTab === 'pending') return p.status === 'pending';
    if (activeTab === 'confirmed') return p.status === 'confirmed';
    if (activeTab === 'rejected') return p.status === 'rejected';
    return true;
  });

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-500',
      confirmed: 'bg-green-500',
      rejected: 'bg-red-500',
    };
    return badges[status] || 'bg-gray-500';
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Payment Management</h1>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {['pending', 'confirmed', 'rejected'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'pending' && payments.filter(p => p.status === 'pending').length > 0 && (
                  <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {payments.filter(p => p.status === 'pending').length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Payments Table */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                  <th className="px-6 py-3">Client Name</th>
                  <th className="px-6 py-3">Business Name</th>
                  <th className="px-6 py-3">Project Type</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Reference #</th>
                  <th className="px-6 py-3">Date Submitted</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-400">
                      No {activeTab} payments found
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="px-6 py-4 text-white">{payment.clientName || '-'}</td>
                      <td className="px-6 py-4 text-gray-300">{payment.businessName || '-'}</td>
                      <td className="px-6 py-4 text-gray-300">{payment.projectType || '-'}</td>
                      <td className="px-6 py-4 text-green-400 font-semibold">{formatCurrency(payment.amount)}</td>
                      <td className="px-6 py-4 text-gray-300">
                        <span className="capitalize">{payment.type || 'downpayment'}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">{payment.referenceNumber || '-'}</td>
                      <td className="px-6 py-4 text-gray-300">{formatDate(payment.createdAt)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs text-white ${getStatusBadge(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {payment.proofBase64 && (
                            <button
                              onClick={() => handleViewProof(payment)}
                              className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded"
                            >
                              View Proof
                            </button>
                          )}
                          {payment.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleConfirmPayment(payment)}
                                className="px-3 py-1 text-xs bg-green-600 hover:bg-green-500 text-white rounded"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setRejectModal({ open: true, paymentId: payment.id, projectId: payment.projectId, reason: 'blurry', otherReason: '' })}
                                className="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        {/* Proof Modal */}
      {proofModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Payment Proof - {proofModal.clientName || 'Payment'}</h3>
              <button
                onClick={() => setProofModal({ open: false, paymentId: '', proofBase64: '', clientName: '' })}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Side - Payment Details */}
              <div className="space-y-4">
                <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-gray-400 text-xs">Client Name</p>
                    <p className="text-white font-medium">{proofModal.clientName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Business Name</p>
                    <p className="text-white font-medium">{proofModal.businessName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Project Type</p>
                    <p className="text-white font-medium">{proofModal.projectType || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Payment Type</p>
                    <p className="text-white font-medium capitalize">{proofModal.paymentType || 'Downpayment'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Amount</p>
                    <p className="text-2xl font-bold text-green-400">{formatCurrency(proofModal.amount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Payment Method</p>
                    <p className="text-white font-medium">{proofModal.paymentMethodLabel || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Reference Number</p>
                    <p className="text-xl font-bold text-yellow-400">{proofModal.referenceNumber || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Date Submitted</p>
                    <p className="text-white font-medium">{formatDate(proofModal.createdAt)}</p>
                  </div>
                  {proofModal.notes && (
                    <div>
                      <p className="text-gray-400 text-xs">Notes</p>
                      <p className="text-white font-medium">{proofModal.notes}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Right Side - Proof Image */}
              <div className="space-y-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-xs mb-2">Payment Proof Image</p>
                  <img 
                    src={proofModal.proofBase64} 
                    alt="Payment proof" 
                    className="w-full h-auto rounded-lg border border-gray-600"
                  />
                  <a
                    href={proofModal.proofBase64}
                    download={`payment-proof-${proofModal.paymentId}.jpg`}
                    className="mt-3 w-full block text-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm"
                  >
                    Download Image
                  </a>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            {proofModal.status === 'pending' && (
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-700">
                <button
                  onClick={() => {
                    handleConfirmPayment(proofModal);
                    setProofModal({ open: false, paymentId: '', proofBase64: '', clientName: '' });
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium"
                >
                  Confirm Payment
                </button>
                <button
                  onClick={() => {
                    setRejectModal({ open: true, paymentId: proofModal.paymentId, projectId: '', reason: 'blurry', otherReason: '' });
                    setProofModal({ open: false, paymentId: '', proofBase64: '', clientName: '' });
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium"
                >
                  Reject Payment
                </button>
                <button
                  onClick={() => setProofModal({ open: false, paymentId: '', proofBase64: '', clientName: '' })}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium"
                >
                  Close
                </button>
              </div>
            )}
            
            {proofModal.status !== 'pending' && (
              <div className="flex justify-end mt-6 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setProofModal({ open: false, paymentId: '', proofBase64: '', clientName: '' })}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-white mb-2">Reject Payment</h3>
            <p className="text-gray-400 text-sm mb-4">
              Please select a reason for rejection. This will help the client resubmit correctly.
            </p>

            <div className="space-y-2 mb-4">
              {rejectionReasons.map((reason) => (
                <label
                  key={reason.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    rejectModal.reason === reason.value
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason.value}
                    checked={rejectModal.reason === reason.value}
                    onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                    className="w-4 h-4 text-red-500"
                  />
                  <span className="text-white text-sm">{reason.label}</span>
                </label>
              ))}
            </div>

            {rejectModal.reason === 'other' && (
              <div className="mb-4">
                <textarea
                  value={rejectModal.otherReason}
                  onChange={(e) => setRejectModal({ ...rejectModal, otherReason: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Please specify reason..."
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setRejectModal({ open: false, paymentId: '', projectId: '', reason: 'blurry', otherReason: '' })}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectPayment}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
