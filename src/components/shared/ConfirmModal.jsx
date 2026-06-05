/**
 * ConfirmModal - Reusable confirmation dialog
 * Replaces native window.confirm() across the admin panel.
 *
 * Props:
 *  - isOpen       {boolean}   Show/hide the modal
 *  - title        {string}    Modal heading
 *  - message      {string}    Body text / description
 *  - confirmText  {string}    Confirm button label (default: "Confirm")
 *  - cancelText   {string}    Cancel button label (default: "Cancel")
 *  - variant      {string}    "danger" | "warning" | "info" (default: "danger")
 *  - onConfirm    {function}  Called when user clicks confirm
 *  - onCancel     {function}  Called when user clicks cancel or overlay
 */
const ConfirmModal = ({
  isOpen,
  title = 'Are you sure?',
  message = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: (
        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      iconBg: 'bg-red-500/10',
      confirmBtn: 'bg-red-600 hover:bg-red-500 focus:ring-red-500',
    },
    warning: {
      icon: (
        <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      iconBg: 'bg-yellow-500/10',
      confirmBtn: 'bg-yellow-600 hover:bg-yellow-500 focus:ring-yellow-500',
    },
    info: {
      icon: (
        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: 'bg-blue-500/10',
      confirmBtn: 'bg-blue-600 hover:bg-blue-500 focus:ring-blue-500',
    },
  };

  const s = variantStyles[variant] || variantStyles.danger;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {/* Modal */}
      <div
        className="relative glass-modal rounded-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon + Title */}
        <div className="flex items-center gap-4 mb-4">
          <div className={`p-3 rounded-xl ${s.iconBg} backdrop-blur-sm shrink-0`}>
            {s.icon}
          </div>
          <h3 className="text-lg font-semibold text-white leading-snug">{title}</h3>
        </div>

        {/* Message */}
        {message && (
          <p className="text-gray-400 text-sm mb-6 pl-[60px]">{message}</p>
        )}

        {/* Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-gray-300 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-gray-600"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${s.confirmBtn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
