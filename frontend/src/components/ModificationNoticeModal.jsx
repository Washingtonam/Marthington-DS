import { useEffect, useState } from "react";
 
export default function ModificationNoticeModal({ onAccept }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("nin_notice_seen");
    if (!seen) {
      setOpen(true);
    }
  }, []);

  const handleContinue = () => {
    localStorage.setItem("nin_notice_seen", "true");
    setOpen(false);
    if (onAccept) onAccept();
  };

  const handleClose = () => {
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">

      <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-fadeIn">

        {/* HEADER */}
        <h2 className="text-lg font-bold mb-3 text-gray-900">
          ⚠️ Important Notice
        </h2>

        {/* CONTENT */}
        <div className="text-sm text-gray-600 space-y-3 leading-relaxed">

          <p>
            NIN modification services are officially handled by the National Identity Management Commission (NIMC) through their self-service portal.
          </p>

          <p>
            You may choose to complete your modification directly on the official platform.
          </p>

          <p>
            However, due to the complexity of the process, document requirements, and frequent errors, many users prefer professional assistance to avoid delays or rejection.
          </p>

          <p>
            Our service provides guided support, proper documentation handling, and ensures your request is submitted correctly for a smooth and successful outcome.
          </p>

          <p className="text-xs text-gray-500 border-t pt-3">
            By continuing, you acknowledge that we are an independent service provider and are not affiliated with NIMC.
          </p>

        </div>

        {/* ACTIONS */}
        <div className="mt-6 flex flex-col gap-3">

          <button
            onClick={handleContinue}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition"
          >
            Continue with Assistance
          </button>

          <button
            onClick={handleClose}
            className="w-full border border-gray-300 hover:bg-gray-100 py-3 rounded-xl text-sm transition"
          >
            Cancel
          </button>

        </div>

      </div>
    </div>
  );
}