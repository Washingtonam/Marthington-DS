import { useEffect, useState } from "react";

import axios from "axios";
 
import {
  Wallet,
  ShieldCheck,
  FileText,
  CreditCard,
  Save,
  Loader2,
  Settings2,
  BadgeDollarSign,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";

const API_BASE = "https://xcombinator.onrender.com";

export default function AdminPricing() {

  const headers = {
    email: localStorage.getItem("email"),
  };

  const [loadingSection, setLoadingSection] = useState("");

  const [fetching, setFetching] = useState(true);

  // =========================
  // UNIT
  // =========================
  const [unitPrice, setUnitPrice] = useState("");

  const [agentPrice, setAgentPrice] = useState("");

  const [mode, setMode] = useState("bundle");

  // =========================
  // VALIDATION
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
  // IPE
  // =========================
  const [ipe, setIpe] = useState({
    inProcessingError: 1000,
    stillProcessing: 1000,
    newEnrollment: 1000,
    invalidTracking: 1000,
  });

  // =========================
  // MODIFICATION
  // =========================
  const [modification, setModification] = useState({
    name: 12000,
    phone: 12000,
    address: 12000,
    dob: 50000,
  });

  // =========================
  // FETCH
  // =========================
  const fetchPricing = async () => {

    try {

      const res = await axios.get(
        `${API_BASE}/api/pricing`
      );

      const data = res.data;

      setUnitPrice(
        data?.nin?.unitPrice ?? 250
      );

      setAgentPrice(
        data?.nin?.agentPrice ?? 150
      );

      setMode(
        data?.nin?.mode ?? "bundle"
      );

      setValidation({
        noRecord:
          data?.ninServices?.validation?.noRecord ?? 1000,

        updateRecord:
          data?.ninServices?.validation?.updateRecord ?? 1150,

        validateModification:
          data?.ninServices?.validation?.validateModification ?? 1150,

        vnin:
          data?.ninServices?.validation?.vnin ?? 1000,

        photoError:
          data?.ninServices?.validation?.photoError ?? 1150,

        bypass:
          data?.ninServices?.validation?.bypass ?? 1150,

        slipPrice:
          data?.ninServices?.slipPrice ?? 150,
      });

      setIpe({
        inProcessingError:
          data?.ninServices?.ipe?.inProcessingError ?? 1000,

        stillProcessing:
          data?.ninServices?.ipe?.stillProcessing ?? 1000,

        newEnrollment:
          data?.ninServices?.ipe?.newEnrollment ?? 1000,

        invalidTracking:
          data?.ninServices?.ipe?.invalidTracking ?? 1000,
      });

      setModification({
        name:
          data?.ninServices?.modification?.name ?? 12000,

        phone:
          data?.ninServices?.modification?.phone ?? 12000,

        address:
          data?.ninServices?.modification?.address ?? 12000,

        dob:
          data?.ninServices?.modification?.dob ?? 50000,
      });

    } catch (err) {

      console.error(err);

      alert("Failed to load pricing");
    }

    setFetching(false);
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  // =========================
  // SAVE
  // =========================
  const saveSection = async (
    section,
    payload
  ) => {

    try {

      setLoadingSection(section);

      await axios.put(
        `${API_BASE}/api/admin/pricing`,
        payload,
        { headers }
      );

      alert("Updated successfully");

      fetchPricing();

    } catch (err) {

      console.error(err);

      alert("Update failed");
    }

    setLoadingSection("");
  };

  // =========================
  // LOADING
  // =========================
  if (fetching) {

    return (
      <div className="min-h-[60vh] flex justify-center items-center">

        <div className="text-center">

          <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={40} />

          <p className="text-gray-500">
            Loading pricing engine...
          </p>

        </div>

      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">

      {/* HERO */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-900 rounded-3xl p-8 text-white shadow-2xl mb-8">

        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-8">

          <div>

            <div className="flex items-center gap-2 mb-3">
              <Settings2 size={20} />
              <span className="uppercase tracking-widest text-sm opacity-80">
                REVENUE CONTROL CENTER
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              Pricing Engine
            </h1>

            <p className="text-blue-100 max-w-2xl">
              Configure unit costs, service pricing,
              validation fees, modification rates,
              and operational pricing strategy
              across the entire platform.
            </p>

          </div>

          <div className="bg-white/10 border border-white/10 backdrop-blur-xl rounded-3xl p-6 min-w-[280px]">

            <div className="flex items-center gap-3 mb-4">

              <div className="bg-white/20 p-3 rounded-2xl">
                <TrendingUp />
              </div>

              <div>

                <p className="text-sm opacity-80">
                  Current Unit Price
                </p>

                <h2 className="text-4xl font-bold">
                  ₦{Number(unitPrice).toLocaleString()}
                </h2>

              </div>

            </div>

            <div className="text-sm text-blue-100">
              Pricing mode:
              <span className="ml-2 font-bold uppercase">
                {mode}
              </span>
            </div>

          </div>

        </div>

      </div>

      {/* GRID */}
      <div className="grid gap-8">

        {/* UNIT */}
        <PricingCard
          title="Unit Pricing"
          subtitle="Configure verification unit economics"
          icon={<Wallet size={24} />}
        >

          <div className="grid md:grid-cols-2 gap-5">

            <Input
              label="Unit Price"
              value={unitPrice}
              set={setUnitPrice}
            />

            <Input
              label="Agent Price"
              value={agentPrice}
              set={setAgentPrice}
            />

          </div>

          <div className="mt-5">

            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2 block">
              Pricing Mode
            </label>

            <select
              value={mode}
              onChange={(e) =>
                setMode(e.target.value)
              }
              className="w-full border border-gray-200 dark:border-gray-700 dark:bg-[#101010] dark:text-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="bundle">
                Bundle Mode
              </option>

              <option value="single">
                Single Mode
              </option>

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

        {/* VALIDATION */}
        <PricingCard
          title="Validation Pricing"
          subtitle="Manage NIN verification and validation service pricing"
          icon={<ShieldCheck size={24} />}
        >

          <div className="grid md:grid-cols-2 gap-5">

            {Object.keys(validation).map((key) => (

              <Input
                key={key}
                label={formatLabel(key)}
                value={validation[key]}
                set={(val) =>
                  setValidation({
                    ...validation,
                    [key]: val,
                  })
                }
              />

            ))}

          </div>

          <SaveButton
            loading={loadingSection === "validation"}
            onClick={() => {

              const {
                slipPrice,
                ...validationData
              } = validation;

              saveSection(
                "validation",
                {
                  validation: validationData,
                  slipPrice: Number(slipPrice),
                }
              );
            }}
          />

        </PricingCard>

        {/* IPE */}
        <PricingCard
          title="IPE Clearance Pricing"
          subtitle="Configure issue resolution and enrollment processing fees"
          icon={<FileText size={24} />}
        >

          <div className="grid md:grid-cols-2 gap-5">

            {Object.keys(ipe).map((key) => (

              <Input
                key={key}
                label={formatLabel(key)}
                value={ipe[key]}
                set={(val) =>
                  setIpe({
                    ...ipe,
                    [key]: val,
                  })
                }
              />

            ))}

          </div>

          <SaveButton
            loading={loadingSection === "ipe"}
            onClick={() =>
              saveSection("ipe", {
                ipe,
              })
            }
          />

        </PricingCard>

        {/* MODIFICATION */}
        <PricingCard
          title="Modification Pricing"
          subtitle="Control pricing for NIN modifications and corrections"
          icon={<CreditCard size={24} />}
        >

          <div className="grid md:grid-cols-2 gap-5">

            {Object.keys(modification).map((key) => (

              <Input
                key={key}
                label={formatLabel(key)}
                value={modification[key]}
                set={(val) =>
                  setModification({
                    ...modification,
                    [key]: val,
                  })
                }
              />

            ))}

          </div>

          <SaveButton
            loading={loadingSection === "modification"}
            onClick={() =>
              saveSection(
                "modification",
                {
                  modification,
                }
              )
            }
          />

        </PricingCard>

      </div>

    </div>
  );
}

// =========================
// CARD
// =========================
function PricingCard({
  title,
  subtitle,
  icon,
  children,
}) {

  return (
    <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">

        <div className="flex items-center gap-4">

          <div className="bg-white/20 p-4 rounded-2xl">
            {icon}
          </div>

          <div>

            <h2 className="text-2xl font-bold">
              {title}
            </h2>

            <p className="text-blue-100 text-sm mt-1">
              {subtitle}
            </p>

          </div>

        </div>

      </div>

      {/* BODY */}
      <div className="p-6">
        {children}
      </div>

    </div>
  );
}

// =========================
// INPUT
// =========================
function Input({
  label,
  value,
  set,
}) {

  return (
    <div>

      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
        {label}
      </label>

      <div className="relative">

        <BadgeDollarSign
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <input
          type="number"
          value={value || ""}
          onChange={(e) =>
            set(e.target.value)
          }
          className="w-full border border-gray-200 dark:border-gray-700 dark:bg-[#101010] dark:text-white rounded-2xl p-4 pl-11 outline-none focus:ring-2 focus:ring-blue-500"
        />

      </div>

    </div>
  );
}

// =========================
// SAVE BUTTON
// =========================
function SaveButton({
  onClick,
  loading,
}) {

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`mt-6 w-full py-4 rounded-2xl text-white font-semibold transition flex justify-center items-center gap-3 ${
        loading
          ? "bg-gray-400"
          : "bg-blue-600 hover:bg-blue-700 shadow-lg"
      }`}
    >

      {loading ? (
        <>
          <Loader2 className="animate-spin" size={18} />
          Saving Changes...
        </>
      ) : (
        <>
          <CheckCircle2 size={18} />
          Save Pricing
        </>
      )}

    </button>
  );
}

// =========================
// LABEL FORMAT
// =========================
function formatLabel(text) {

  return text
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, str => str.toUpperCase());
}