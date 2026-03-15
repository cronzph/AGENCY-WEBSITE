const statusConfig = {
  inquiry: { color: 'bg-gray-100 text-gray-800', label: 'Inquiry' },
  assessed: { color: 'bg-blue-100 text-blue-800', label: 'Assessed' },
  proposal_sent: { color: 'bg-cyan-100 text-cyan-800', label: 'Proposal Sent' },
  proposal_accepted: { color: 'bg-indigo-100 text-indigo-800', label: 'Proposal Accepted' },
  awaiting_payment: { color: 'bg-yellow-100 text-yellow-800', label: 'Awaiting Payment' },
  payment_submitted: { color: 'bg-orange-100 text-orange-800', label: 'Payment Submitted' },
  in_progress: { color: 'bg-purple-100 text-purple-800', label: 'In Progress' },
  planning: { color: 'bg-violet-100 text-violet-800', label: 'Planning' },
  building: { color: 'bg-pink-100 text-pink-800', label: 'Building' },
  for_review: { color: 'bg-amber-100 text-amber-800', label: 'For Review' },
  delivered: { color: 'bg-lime-100 text-lime-800', label: 'Delivered' },
  completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
};

const StatusBadge = ({ status, customLabel }) => {
  const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {customLabel || config.label}
    </span>
  );
};

export default StatusBadge;
