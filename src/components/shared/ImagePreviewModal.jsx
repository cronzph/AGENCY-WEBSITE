import { useEffect } from 'react';

const ImagePreviewModal = ({ isOpen, imageUrl, altText, onClose, accentColor }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]" />

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 p-2.5 bg-gray-800/80 hover:bg-gray-700 text-white rounded-full transition-all hover:scale-110 border border-gray-600/50"
        aria-label="Close preview"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Image Container */}
      <div
        className="relative max-w-[90vw] max-h-[85vh] animate-[zoomIn_0.3s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent glow */}
        {accentColor && (
          <div
            className="absolute -inset-1 rounded-2xl opacity-30 blur-xl"
            style={{ background: accentColor }}
          />
        )}

        {/* Image */}
        <img
          src={imageUrl}
          alt={altText || 'Preview'}
          className="relative max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-gray-700/50"
        />

        {/* Alt text caption */}
        {altText && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-xl">
            <p className="text-white text-sm font-medium text-center">{altText}</p>
          </div>
        )}
      </div>

      {/* Hint text */}
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-gray-400 text-xs animate-[fadeIn_0.5s_ease-out_0.3s_both]">
        Click anywhere or press ESC to close
      </p>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ImagePreviewModal;
