export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div
          className="fixed inset-0 bg-black/70 transition-opacity"
          onClick={onClose}
        />
        <div className="relative bg-gray-900 border-2 border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-100">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-100 text-2xl font-bold"
            >
              ×
            </button>
          </div>
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}