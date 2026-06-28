import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import api from "../../lib/axios";
import {
  User,
  Phone,
  MapPin,
  CalendarDays,
  Loader2,
  Wallet,
  BadgeCheck,
  Info,
} from "lucide-react";
import { formatNaira } from "../../lib/currency";
import ModificationNoticeModal from "../../components/ModificationNoticeModal";

const initialFormData = {
  previousModification: "",
  nin: "",
  surname: "",
  firstname: "",
  middlename: "",
  email: "",
  gsm: "",
  newGsm: "",
  oldGsm: "",
  address: "",
  newDob: "",
  gender: "",
  maritalStatus: "",
  stateOfOrigin: "",
  lgaOfOrigin: "",
  townOfOrigin: "",
  placeOfBirth: "",
  stateOfBirth: "",
  lgaOfBirth: "",
  residentState: "",
  residentLga: "",
  nearestCenter: "",
  fullAddress: "",
  educationLevel: "",
  occupation: "",
  workAddress: "",
  oldDob: "",
  fatherSurname: "",
  fatherFirstname: "",
  fatherMiddlename: "",
  fatherStateOfOrigin: "",
  fatherLgaOfOrigin: "",
  fatherVillage: "",
  motherSurname: "",
  motherMaidenName: "",
  motherStateOfOrigin: "",
  motherLgaOfOrigin: "",
  motherVillage: "",
};

export default function Modification() {
  const navigate = useNavigate();
  const { user, setBalance } = useUser();
  const [pricing, setPricing] = useState({});
  const [selectedType, setSelectedType] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const { data } = await api.get("/api/pricing");
        setPricing(data?.ninServices?.modification || {});
      } catch (err) {
        console.error("Pricing fetch error:", err);
      }
    };
    fetchPricing();
  }, []);

  useEffect(() => {
    setFormData(initialFormData);
    setErrorMessage("");
  }, [selectedType]);

  const total = pricing?.[selectedType] || 0;

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? e.target.checked : value,
    }));
  };

  const getFieldLabel = (key) => {
    const labelMap = {
      previousModification: "modification history",
      nin: "NIN",
      surname: "surname",
      firstname: "first name",
      middlename: "middle name",
      email: "email",
      gsm: "GSM",
      newGsm: "new GSM",
      oldGsm: "old GSM",
      address: "address",
      newDob: "new date of birth",
      gender: "gender",
      maritalStatus: "marital status",
      stateOfOrigin: "state of origin",
      lgaOfOrigin: "LGA of origin",
      townOfOrigin: "town/village of origin",
      placeOfBirth: "place of birth",
      stateOfBirth: "state of birth",
      lgaOfBirth: "LGA of birth",
      residentState: "resident state",
      residentLga: "resident LGA",
      nearestCenter: "nearest registration center",
      fullAddress: "full house address",
      educationLevel: "education level",
      occupation: "occupation",
      workAddress: "work address",
      oldDob: "old date of birth",
      fatherSurname: "father's surname",
      fatherFirstname: "father's first name",
      fatherMiddlename: "father's middle name",
      fatherStateOfOrigin: "father's state of origin",
      fatherLgaOfOrigin: "father's LGA of origin",
      fatherVillage: "father's village/town",
      motherSurname: "mother's surname",
      motherMaidenName: "mother's maiden name",
      motherStateOfOrigin: "mother's state of origin",
      motherLgaOfOrigin: "mother's LGA of origin",
      motherVillage: "mother's village/town",
    };
    return labelMap[key] || key;
  };

  const serviceFields = {
    name: [
      { name: "previousModification", label: "Have you ever done modification before via NIMC Self-Service Portal?", type: "radio", options: ["yes", "no"] },
      { name: "nin", label: "NIN", type: "text", placeholder: "Enter NIN (11 digits)" },
      { name: "surname", label: "Last Name / Surname", type: "text", placeholder: "Surname" },
      { name: "firstname", label: "First Name", type: "text", placeholder: "First name" },
      { name: "middlename", label: "Middle Name (Optional)", type: "text", placeholder: "Middle name" },
      { name: "email", label: "Email", type: "email", placeholder: "Email address" },
      { name: "gsm", label: "GSM", type: "text", placeholder: "Phone number" },
    ],
    phone: [
      { name: "previousModification", label: "Have you ever done modification before via NIMC Self-Service Portal?", type: "radio", options: ["yes", "no"] },
      { name: "nin", label: "NIN", type: "text", placeholder: "Enter NIN (11 digits)" },
      { name: "surname", label: "Last Name / Surname", type: "text", placeholder: "Surname" },
      { name: "firstname", label: "First Name", type: "text", placeholder: "First name" },
      { name: "middlename", label: "Middle Name (Optional)", type: "text", placeholder: "Middle name" },
      { name: "newGsm", label: "New GSM", type: "text", placeholder: "New phone number" },
      { name: "oldGsm", label: "Old GSM", type: "text", placeholder: "Old phone number" },
      { name: "email", label: "Email", type: "email", placeholder: "Email address" },
    ],
    address: [
      { name: "previousModification", label: "Have you ever done modification before via NIMC Self-Service Portal?", type: "radio", options: ["yes", "no"] },
      { name: "nin", label: "NIN", type: "text", placeholder: "Enter NIN (11 digits)" },
      { name: "surname", label: "Last Name / Surname", type: "text", placeholder: "Surname" },
      { name: "firstname", label: "First Name", type: "text", placeholder: "First name" },
      { name: "middlename", label: "Middle Name (Optional)", type: "text", placeholder: "Middle name" },
      { name: "gsm", label: "GSM", type: "text", placeholder: "Phone number" },
      { name: "address", label: "Address", type: "text", placeholder: "Full address" },
      { name: "email", label: "Email", type: "email", placeholder: "Email address" },
    ],
    dob: [
      { name: "previousModification", label: "Have you ever done modification before via NIMC Self-Service Portal?", type: "radio", options: ["yes", "no"] },
      { name: "nin", label: "NIN", type: "text", placeholder: "Enter NIN (11 digits)" },
      { name: "surname", label: "Last Name / Surname", type: "text", placeholder: "Surname" },
      { name: "firstname", label: "First Name", type: "text", placeholder: "First name" },
      { name: "middlename", label: "Middle Name (Optional)", type: "text", placeholder: "Middle name" },
      { name: "gsm", label: "GSM", type: "text", placeholder: "Phone number" },
      { name: "email", label: "Email", type: "email", placeholder: "Email address" },
      { name: "newDob", label: "New Date of Birth", type: "date" },
      { name: "gender", label: "Gender", type: "text", placeholder: "Gender" },
      { name: "maritalStatus", label: "Marital Status", type: "text", placeholder: "Marital status" },
      { name: "stateOfOrigin", label: "State of Origin", type: "text", placeholder: "State of origin" },
      { name: "lgaOfOrigin", label: "LGA of Origin", type: "text", placeholder: "LGA of origin" },
      { name: "townOfOrigin", label: "Town/Village of Origin", type: "text", placeholder: "Town/village of origin" },
      { name: "placeOfBirth", label: "Place of Birth", type: "text", placeholder: "Place of birth" },
      { name: "stateOfBirth", label: "State of Birth", type: "text", placeholder: "State of birth" },
      { name: "lgaOfBirth", label: "LGA of Birth", type: "text", placeholder: "LGA of birth" },
      { name: "residentState", label: "Resident State (Birth Registration)", type: "text", placeholder: "Resident state" },
      { name: "residentLga", label: "Resident LGA (Birth Registration)", type: "text", placeholder: "Resident LGA" },
      { name: "nearestCenter", label: "Nearest Registration Center", type: "text", placeholder: "Nearest registration center" },
      { name: "fullAddress", label: "Full House Address", type: "text", placeholder: "Full house address" },
      { name: "educationLevel", label: "Education Level", type: "text", placeholder: "Education level" },
      { name: "occupation", label: "Occupation", type: "text", placeholder: "Occupation" },
      { name: "workAddress", label: "Work Address", type: "text", placeholder: "Work address" },
      { name: "oldDob", label: "Old Date of Birth", type: "date" },
      { name: "fatherSurname", label: "Father’s Surname", type: "text", placeholder: "Father’s surname" },
      { name: "fatherFirstname", label: "Father’s First Name", type: "text", placeholder: "Father’s first name" },
      { name: "fatherMiddlename", label: "Father’s Middle Name (Optional)", type: "text", placeholder: "Father’s middle name" },
      { name: "fatherStateOfOrigin", label: "Father’s State of Origin", type: "text", placeholder: "Father’s state of origin" },
      { name: "fatherLgaOfOrigin", label: "Father’s LGA of Origin", type: "text", placeholder: "Father’s LGA of origin" },
      { name: "fatherVillage", label: "Father’s Village/Town", type: "text", placeholder: "Father’s village/town" },
      { name: "motherSurname", label: "Mother’s Surname", type: "text", placeholder: "Mother’s surname" },
      { name: "motherMaidenName", label: "Mother’s Maiden Name (Compulsory)", type: "text", placeholder: "Mother’s maiden name" },
      { name: "motherStateOfOrigin", label: "Mother’s State of Origin", type: "text", placeholder: "Mother’s state of origin" },
      { name: "motherLgaOfOrigin", label: "Mother’s LGA of Origin", type: "text", placeholder: "Mother’s LGA of origin" },
      { name: "motherVillage", label: "Mother’s Village/Town", type: "text", placeholder: "Mother’s village/town" },
    ],
  };

  const requiredFields = {
    name: ["previousModification", "nin", "surname", "firstname", "email", "gsm"],
    phone: ["previousModification", "nin", "surname", "firstname", "newGsm", "oldGsm", "email"],
    address: ["previousModification", "nin", "surname", "firstname", "gsm", "address", "email"],
    dob: [
      "previousModification",
      "nin",
      "surname",
      "firstname",
      "gsm",
      "email",
      "newDob",
      "gender",
      "maritalStatus",
      "stateOfOrigin",
      "lgaOfOrigin",
      "townOfOrigin",
      "placeOfBirth",
      "stateOfBirth",
      "lgaOfBirth",
      "residentState",
      "residentLga",
      "nearestCenter",
      "fullAddress",
      "educationLevel",
      "occupation",
      "workAddress",
      "oldDob",
      "fatherSurname",
      "fatherFirstname",
      "fatherStateOfOrigin",
      "fatherLgaOfOrigin",
      "fatherVillage",
      "motherSurname",
      "motherMaidenName",
      "motherStateOfOrigin",
      "motherLgaOfOrigin",
      "motherVillage",
    ],
  };

  const validateForm = () => {
    if (!selectedType) return "Select a modification type first.";
    const fields = requiredFields[selectedType] || [];
    for (const key of fields) {
      const value = formData[key];
      if (!value || String(value).trim() === "") {
        if (key === "previousModification") continue;
        return `Please complete the ${getFieldLabel(key)} field.`;
      }
    }
    if (formData.nin && formData.nin.replace(/\D/g, "").length !== 11) {
      return "NIN must be 11 digits.";
    }
    return "";
  };

  const submit = async () => {
    setErrorMessage("");
    const validationError = validateForm();
    if (validationError) return setErrorMessage(validationError);
    if (!selectedType || !formData.nin) return setErrorMessage("Please fill all required fields.");
    if (total > (user?.walletBalance || 0)) return setErrorMessage("Insufficient wallet balance. Please fund your wallet.");

    setLoading(true);
    try {
      const response = await api.post("/api/services/request", {
        service: "modification",
        type: selectedType,
        nin: formData.nin,
        formData,
      });

      if (response.data?.userWalletBalance !== undefined) {
        setBalance(response.data.userWalletBalance);
      }
      alert("✅ Modification request submitted successfully!");
      navigate("/my-requests");
    } catch (err) {
      console.error("Modification submit error:", err);
      setErrorMessage(err.response?.data?.message || "Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  const services = [
    { key: "name", label: "Name Modification", desc: "Correct name, surname, or spelling records.", icon: <User size={24} /> },
    { key: "phone", label: "Phone Number Modification", desc: "Update linked phone number on your NIN record.", icon: <Phone size={24} /> },
    { key: "address", label: "Address Modification", desc: "Fix residential address records in NIMC.", icon: <MapPin size={24} /> },
    { key: "dob", label: "DOB Modification & NPC Attestation", desc: "Correct DOB and request NPC online attestation.", icon: <CalendarDays size={24} /> },
  ];

  const renderField = (field) => {
    if (field.type === "radio") {
      return (
        <div key={field.name} className="space-y-2">
          <label className="font-semibold text-slate-800 dark:text-white">{field.label}</label>
          <div className="flex flex-wrap gap-4">
            {field.options.map((option) => (
              <label key={option} className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={field.name}
                  value={option}
                  checked={formData[field.name] === option}
                  onChange={handleChange}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                {option === "yes" ? "Yes" : "No"}
              </label>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div key={field.name}>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{field.label}</label>
        <input
          type={field.type}
          name={field.name}
          value={formData[field.name] || ""}
          onChange={handleChange}
          placeholder={field.placeholder || ""}
          className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 dark:bg-[#0B1120] dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 animate-in fade-in duration-500">
      <ModificationNoticeModal />

      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-[2rem] p-10 text-white mb-8 shadow-2xl">
        <h1 className="text-4xl font-black mb-2">Modify Your NIN Details</h1>
        <p className="opacity-80">Secure, wallet-integrated data corrections with full documentation guidance.</p>
        <div className="mt-6 rounded-3xl bg-white/10 p-6 border border-white/10">
          <h2 className="font-semibold">Processing time</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-100">
            Please allow up to <strong>3 working days</strong> for complete processing of your modification request. Our agents work through each application carefully to ensure accuracy and approval.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {services.map((s) => (
          <button
            key={s.key}
            onClick={() => setSelectedType(s.key)}
            className={`text-left rounded-3xl border-2 p-6 transition-all ${
              selectedType === s.key
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "bg-white dark:bg-[#111827] border-transparent shadow-sm"
            }`}
          >
            <div className="text-blue-600 mb-4">{s.icon}</div>
            <h2 className="font-bold text-lg dark:text-white">{s.label}</h2>
            <p className="text-sm opacity-60 mb-4 dark:text-gray-400">{s.desc}</p>
            <p className="font-black text-xl dark:text-white">{formatNaira(pricing?.[s.key] || 0)}</p>
          </button>
        ))}
      </div>

      {selectedType && (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white dark:bg-[#111827] rounded-[2rem] p-8 shadow-sm border space-y-6">
            <h2 className="text-2xl font-bold dark:text-white">{services.find((s) => s.key === selectedType)?.label}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Complete the required fields for the selected modification type. Fields marked as required must be filled before submission.
            </p>
            <div className="grid gap-6">
              {serviceFields[selectedType].map(renderField)}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-[#111827] rounded-[2rem] p-8 shadow-xl border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg dark:text-white">Payment Summary</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Modification fee</p>
                </div>
                <Info className="text-blue-500" />
              </div>
              <h2 className="text-4xl font-black text-blue-600">{formatNaira(total)}</h2>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Wallet balance: {formatNaira(user?.walletBalance || 0)}
              </p>
              <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-[#0B1120] p-4 text-sm text-slate-600 dark:text-slate-300">
                <p className="font-semibold">Important:</p>
                <p className="mt-2">Submit your request only after preparing your photos and a new email account for NIMC communication.</p>
              </div>
            </div>

            <button
              onClick={submit}
              disabled={loading}
              className="w-full py-5 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 flex items-center justify-center gap-2 transition disabled:opacity-80 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><BadgeCheck size={20} /> Submit Application</>}
            </button>
            {errorMessage && (
              <p className="rounded-2xl bg-red-50 text-red-700 p-4 text-sm">{errorMessage}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}