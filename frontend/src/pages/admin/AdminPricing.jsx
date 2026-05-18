import { useEffect, useState } from "react";
import axios from "axios";
import {
  Wallet,
  ShieldCheck,
  FileText,
  CreditCard,
  Building2,
  Loader2,
  Settings2,
  BadgeDollarSign,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";

const API_BASE = "https://xcombinator.onrender.com";

export default function AdminPricing() {
  // 🔥 FIX: Correctly extract email from the stored user JSON object string
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const headers = {
    email: user?.email || "",
  };

  const [loadingSection, setLoadingSection] = useState("");
  const [fetching, setFetching] = useState(true);

  // =========================
  // UNIT STATE
  // =========================
  const [unitPrice, setUnitPrice] = useState("");
  const [agentPrice, setAgentPrice] = useState("");
  const [mode, setMode] = useState("bundle");

  // =========================
  // VALIDATION STATE
  // =========================
  const [validation, setValidation] = useState({
    noRecord: 1000,
    updateRecord: 1150,
    validateModification: 1150,
    vnin: 1000,
    photoError: 1150,
    bypass: 1150,
    slipPrice: 150,
  });

  // =========================
  // IPE STATE
  // =========================
  const [ipe, setIpe] = useState({
    inProcessingError: 1000,
    stillProcessing: 1000,
    newEnrollment: 1000,
    invalidTracking: 1000,
  });

  // =========================
  // MODIFICATION STATE
  // =========================
  const [modification, setModification] = useState({
    name: 12000,
    phone: 12000,
    address: 12000,
    dob: 50000,
  });

  // =========================
  // 🔥 NEW: CAC PRICING ENGINE STATE
  // =========================
  const [cac, setCac] = useState({
    soleProprietorship: 28000,
    partnership: 32000,
    limited1M: 40000,
  });

  // =========================
  // 📥 FETCH ENGINE DATA
  // =========================
  const fetchPricing = async () => {
    try {
      setFetching(true);
      const res = await axios.get(`${API_BASE}/api/pricing`);
      const data = res.data;

      setUnitPrice(data?.nin?.unitPrice ?? 215);
      setAgentPrice(data?.nin?.agentPrice ?? 150);
      setMode(data?.nin?.mode ?? "bundle");

      setValidation({
        noRecord: data?.ninServices?.validation?.noRecord ?? 1000,
        updateRecord: data?.ninServices?.validation?.updateRecord ?? 1150,
        validateModification: data?.ninServices?.validation?.validateModification ?? 1150,
        vnin: data?.ninServices?.validation?.vnin ?? 1000,
        photoError: data?.ninServices?.validation?.photoError ?? 1150,
        bypass: data?.ninServices?.validation?.bypass ?? 1150,
        slipPrice: data?.ninServices?.slipPrice ?? 150,
      });

      setIpe({
        inProcessingError: data?.ninServices?.ipe?.inProcessingError ?? 1000,
        stillProcessing: data?.ninServices?.ipe?.stillProcessing ?? 1000,
        newEnrollment: data?.ninServices?.ipe?.newEnrollment ?? 1000,
        invalidTracking: data?.ninServices?.ipe?.invalidTracking ?? 1000,
      });

      setModification({
        name: data?.ninServices?.modification?.name ?? 12000,
        phone: data?.ninServices?.modification?.phone ?? 12000,
        address: data?.ninServices?.modification?.address ?? 12000,
        dob: data?.ninServices?.modification?.dob ?? 50000,
      });

      // Hydrate custom corporate registries if present in collection profile
      if (data?.cacServices) {
        setCac({
          soleProprietorship: data.cacServices.soleProprietorship ?? 28000,
          partnership: data.cacServices.partnership ?? 32000,
          limited1M: data.cacServices.limited1M ?? 40000,
        });
      }
    } catch (err) {
      console.error("Fetch Pricing Error:", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  // =========================
  // 💾 SAVE SECTIONS PUT LOGIC
  // =========================
  const saveSection = async (section, payload) => {
    try {
      setLoadingSection(section);
      // Calls unified backend admin PUT endpoint route cleanly
      await axios.put(
        `${API_BASE}/api/admin/pricing`,
        payload,
        { headers }
      );
      alert(`${formatLabel(section)} Pricing updated successfully!`);
      fetchPricing();
    } catch (err) {
      console.error(`Update Error (${section}):`, err.response?.data || err.message);
      alert(err.response?.data?.message || "Update failed. Verify login authority.");
    } finally {
      setLoadingSection("");
    }
  };

  if (fetching) {
    return (
      <div className="min-h-[60vh] flex justify-center items-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
          <p className="text-gray-500 font-medium">Loading platform pricing engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 pt-6">
      {/* CONTROL HERO BOARD BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-900 rounded-3xl p-8 text-white shadow-2xl mb-8">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Settings2 size={20} />
              <span className="uppercase tracking-widest text-sm opacity-80">
                REVENUE CONTROL CENTER
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3">Pricing Engine</h1>
            <p className="text-blue-100 max-w-2xl">
              Configure unit costs, service pricing, validation fees, modification rates,
              and operational pricing strategy across the entire platform matrix.
            </p>
          </div>

          <div className="bg-white/10 border border-white/10 backdrop-blur-xl rounded-3xl p-6 min-w-[280px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white/20 p-3 rounded-2xl">
                <TrendingUp />
              </div>
              <div>
                <p className="text-sm opacity-80">Base Unit Retail</p>
                <h2 className="text-4xl font-bold">₦{Number(unitPrice).toLocaleString()}</h2>
              </div>
            </div>
            <div className="text-sm text-blue-100">
              Pricing Operational Mode:
              <span className="ml-2 font-bold uppercase text-yellow-400">{mode}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CORE INPUT GRID VIEW CONTROLS */}
      <div className="grid gap-8">
        {/* UNIT WALLET PARAMS CARD CONTAINER */}
        <PricingCard
          title="Unit & Account Economics"
          subtitle="Configure base wallet purchase and transaction margins"
          icon={<Wallet size={24} />}
        >
          <div className="grid md:grid-cols-2 gap-5">
            <Input label="General User Unit Price (₦)" value={unitPrice} set={setUnitPrice} />
            <Input label="Sub-Agent Assigned Price (₦)" value={agentPrice} set={setAgentPrice} />
          </div>
          <div className="mt-5">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">
              Global Platform Deductions Mode
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#101010] dark:text-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="bundle">Bundle Mode (Bulk Account Rate Matrix)</option>
              <option value="single">Single Mode (Individual Hits Extraction)</option>
            </select>
          </div>
          <SaveButton
            loading={loadingSection === "unit"}
            onClick={() =>
              saveSection("unit", {
                unitPrice: Number(unitPrice),
                agentPrice: Number(agentPrice),
                mode,
              })
            }
          />
        </PricingCard>

        {/* VALIDATION PROFILE ENGINE METRICS CARD */}
        <PricingCard
          title="Validation Services"
          subtitle="Manage transaction costs for system matching and validations"
          icon={<ShieldCheck size={24} />}
        >
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Object.keys(validation).map((key) => (
              <Input
                key={key}
                label={`${formatLabel(key)} Fee (₦)`}
                value={validation[key]}
                set={(val) => setValidation({ ...validation, [key]: val })}
              />
            ))}
          </div>
          <SaveButton
            loading={loadingSection === "validation"}
            onClick={() => {
              const { slipPrice, ...validationData } = validation;
              saveSection("validation", {
                validation: validationData,
                slipPrice: Number(slipPrice),
              });
            }}
          />
        </PricingCard>

        {/* IPE INTEGRATED EXCLUSIONS AND DISCREPANCIES ENGINE */}
        <PricingCard
          title="IPE Clearance Parameters"
          subtitle="Configure system error corrections and track assignment units"
          icon={<FileText size={24} />}
        >
          <div className="grid md:grid-cols-2 gap-5">
            {Object.keys(ipe).map((key) => (
              <Input
                key={key}
                label={`${formatLabel(key)} Rate (₦)`}
                value={ipe[key]}
                set={(val) => setIpe({ ...ipe, [key]: val })}
              />
            ))}
          </div>
          <SaveButton
            loading={loadingSection === "ipe"}
            onClick={() => saveSection("ipe", { ipe })}
          />
        </PricingCard>

        {/* MODIFICATIONS RATES CONFIGURATOR */}
        <PricingCard
          title="NIN Field Modifications"
          subtitle="Configure NIMC registry parameter adjustment cost mappings"
          icon={<CreditCard size={24} />}
        >
          <div className="grid md:grid-cols-2 gap-5">
            {Object.keys(modification).map((key) => (
              <Input
                key={key}
                label={`${formatLabel(key)} Update Cost (₦)`}
                value={modification[key]}
                set={(val) => setModification({ ...modification, [key]: val })}
              />
            ))}
          </div>
          <SaveButton
            loading={loadingSection === "modification"}
            onClick={() => saveSection("modification", { modification })}
          />
        </PricingCard>

        {/* 🔥 NEW: CORPORATE AFFAIRS COMMISSION (CAC) SERVICE CARD */}
        <PricingCard
          title="CAC Registration Services"
          subtitle="Configure rates for Business Names and Limited Liability setup forms"
          icon={<Building2 size={24} />}
        >
          <div className="grid md:grid-cols-3 gap-5">
            {Object.keys(cac).map((key) => (
              <Input
                key={key}
                label={`${formatLabel(key)} Rate (₦)`}
                value={cac[key]}
                set={(val) => setCac({ ...cac, [key]: val })}
              />
            ))}
          </div>
          <SaveButton
            loading={loadingSection === "cac"}
            onClick={() => saveSection("cac", { cacServices: cac })}
          />
        </PricingCard>
      </div>
    </div>
  );
}

// ==========================================
// RENDER COMPONENT: PRICING CARD
// ==========================================
function PricingCard({ title, subtitle, icon, children }) {
  return (
    <div className="bg-white dark:bg-[#121212] rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden transition">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3.5 rounded-2xl">{icon}</div>
          <div>
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-blue-100 text-xs mt-0.5">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ==========================================
// RENDER COMPONENT: FIELD INPUT FORMATTER
// ==========================================
function Input({ label, value, set }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <BadgeDollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="number"
          value={value ?? ""}
          onChange={(e) => set(e.target.value)}
          className="w-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] dark:text-white rounded-xl p-3.5 pl-11 outline-none focus:ring-2 focus:ring-blue-500 transition font-medium"
        />
      </div>
    </div>
  );
}

// ==========================================
// RENDER COMPONENT: CONTROL ACTION CTA BUTTON
// ==========================================
function SaveButton({ onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`mt-6 w-full py-3.5 rounded-xl text-white font-semibold transition flex justify-center items-center gap-2 text-sm ${
        loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-md"
      }`}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin" size={16} />
          Saving System Changes...
        </>
      ) : (
        <>
          <CheckCircle2 size={16} />
          Save Changes
        </>
      )}
    </button>
  );
}

// ==========================================
// RENDER UTILITY: TEXT PARSING REPLACEMENTS
// ==========================================
function formatLabel(text) {
  return text
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
}