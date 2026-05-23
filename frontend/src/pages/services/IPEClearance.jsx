import { useEffect, useState } from "react";
 
import {
  ShieldAlert,
  CreditCard,
  Upload,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

const API = "https://xcombinator.onrender.com";

export default function IPEClearance() {

  const [pricing, setPricing] = useState({});
  const [selectedType, setSelectedType] = useState(null);
  const [nin, setNin] = useState("");
  const [proof, setProof] = useState(null);

  const [loading, setLoading] = useState(false);

  // =========================
  //  api PRICING
  // =========================
  useEffect(() => {
     api(`${API}/api/pricing`)
      .then((res) => res)
      .then((data) => {
        setPricing(data?.ninServices?.ipe || {});
      });
  }, []);

  // =========================
  // TOTAL
  // =========================
  const total = pricing?.[selectedType] || 0;

  // =========================
  // HANDLE FILE
  // =========================
  const handleFile = (e) => {

    const file = e.target.files[0];

    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      return alert("File too large (max 2MB)");
    }

    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onloadend = () => {
      setProof(reader.result);
    };
  };

  // =========================
  // SUBMIT
  // =========================
  const submit = async () => {

    if (!selectedType || !nin) {
      return alert("Select issue type and enter NIN");
    }

    if (!proof) {
      return alert("Upload payment proof");
    }

    setLoading(true);

    try {

      const res = await  api(`${API}/api/nin-services/request`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          userId: JSON.parse(localStorage.getItem("user")).id,
          service: "ipe",
          type: selectedType,
          nin,
          slipType: "none",
          proof,
        }),
      });

      const data = await res;

      if (!res.ok) {
        throw new Error(data.message);
      }

      alert("✅ Payment submitted successfully");

      setSelectedType(null);
      setNin("");
      setProof(null);

    } catch (err) {

      alert(err.message);

    }

    setLoading(false);
  };

  const services = [
    {
      key: "inProcessingError",
      label: "In Processing Error",
      desc: "Fix records stuck during processing",
      icon: <AlertCircle size={24} />,
    },

    {
      key: "stillProcessing",
      label: "Still Processing",
      desc: "Resolve prolonged processing delays",
      icon: <ShieldAlert size={24} />,
    },

    {
      key: "newEnrollment",
      label: "New Enrollment",
      desc: "Tracking ID related enrollment issues",
      icon: <CheckCircle2 size={24} />,
    },

    {
      key: "invalidTracking",
      label: "Invalid Tracking ID",
      desc: "Correct invalid tracking problems",
      icon: <AlertCircle size={24} />,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">

      {/* HERO */}
      <div className="bg-gradient-to-r from-indigo-700 to-blue-700 text-white rounded-3xl p-8 md:p-10 shadow-xl mb-8">

        <div className="max-w-3xl">

          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert size={22} />
            <span className="uppercase tracking-wider text-sm opacity-80">
              IPE CLEARANCE SERVICE
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
            Resolve NIN Enrollment Issues Fast
          </h1>

          <p className="text-blue-100 text-sm md:text-base">
            Fix tracking problems, processing delays,
            and enrollment errors professionally.
          </p>

        </div>

      </div>

      {/* SERVICES */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">

        {services.map((s) => (

          <div
            key={s.key}
            onClick={() => setSelectedType(s.key)}
            className={`cursor-pointer rounded-3xl border p-6 transition-all duration-300 ${
              selectedType === s.key
                ? "bg-blue-600 text-white scale-[1.03] shadow-2xl"
                : "bg-white dark:bg-[#161616] hover:shadow-xl"
            }`}
          >

            <div className="mb-4">
              {s.icon}
            </div>

            <p className="text-xs opacity-70 mb-2">
              STARTING FROM
            </p>

            <h2 className="text-2xl font-bold mb-2">
              ₦{pricing?.[s.key] || 0}
            </h2>

            <p className="font-semibold mb-2">
              {s.label}
            </p>

            <p className="text-sm opacity-70">
              {s.desc}
            </p>

          </div>

        ))}

      </div>

      {/* MAIN */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* LEFT */}
        <div className="lg:col-span-2 bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-6 md:p-8">

          <h2 className="text-2xl font-bold mb-6 dark:text-white">
            Verification Information
          </h2>

          <div className="space-y-5">

            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                Enter NIN
              </label>

              <input
                type="text"
                placeholder="11-digit NIN"
                value={nin}
                onChange={(e) => setNin(e.target.value)}
                className="w-full border dark:border-[#2d2d2d] dark:bg-[#202020] dark:text-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                Upload Payment Receipt
              </label>

              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFile}
                className="w-full border dark:border-[#2d2d2d] dark:bg-[#202020] dark:text-white p-4 rounded-2xl"
              />
            </div>

          </div>

        </div>

        {/* RIGHT */}
        <div className="space-y-6">

          {/* PAYMENT */}
          <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-6">

            <div className="flex items-center gap-2 mb-5">
              <CreditCard size={20} />
              <h3 className="font-bold text-lg dark:text-white">
                Payment Details
              </h3>
            </div>

            <div className="bg-blue-50 dark:bg-[#1d2638] p-4 rounded-2xl text-sm space-y-2">

              <p>
                <b>Bank:</b> OPAY
              </p>

              <p>
                <b>Account Number:</b> 6104102697
              </p>

              <p>
                <b>Account Name:</b> WASHINGTON AMEDU
              </p>

            </div>

            <div className="mt-5 bg-gray-100 dark:bg-[#202020] p-4 rounded-2xl">

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Total Amount
              </p>

              <h2 className="text-3xl font-bold mt-1 dark:text-white">
                ₦{total}
              </h2>

            </div>

          </div>

          {/* UPLOAD STATUS */}
          <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-6">

            <div className="flex items-center gap-2 mb-4">
              <Upload size={20} />
              <h3 className="font-bold text-lg dark:text-white">
                Upload Status
              </h3>
            </div>

            <div className="space-y-3 text-sm">

              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Receipt Uploaded
                </span>

                <span className={`font-semibold ${
                  proof ? "text-green-600" : "text-red-500"
                }`}>
                  {proof ? "YES" : "NO"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">
                  Selected Issue
                </span>

                <span className="font-semibold dark:text-white">
                  {selectedType ? "READY" : "NOT SELECTED"}
                </span>
              </div>

            </div>

          </div>

          {/* BUTTON */}
          <button
            onClick={submit}
            disabled={loading}
            className={`w-full py-4 rounded-2xl text-white font-semibold transition-all ${
              loading
                ? "bg-gray-400"
                : "bg-blue-600 hover:bg-blue-700 hover:scale-[1.01]"
            }`}
          >
            {loading
              ? "Submitting Request..."
              : "Submit Payment"}
          </button>

        </div>

      </div>

    </div>
  );
}