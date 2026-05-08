import { useEffect, useState } from "react";
import {
  User,
  Phone,
  MapPin,
  CalendarDays,
  Upload,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import api from "../lib/axios";
import ModificationNoticeModal from "../../components/ModificationNoticeModal";

const API = "https://xcombinator.onrender.com";

export default function Modification() {
  const [pricing, setPricing] = useState({});
  const [selectedType, setSelectedType] = useState(null);
  const [formData, setFormData] = useState({});
  const [proof, setProof] = useState(null);
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    fetch(`${API}/api/pricing`)
      .then((res) => res.json())
      .then((data) => {
        setPricing(data?.ninServices?.modification || {});
      });
  }, []);

  useEffect(() => {
    if (user?.email) {
      setFormData((prev) => ({
        ...prev,
        email: user.email,
      }));
    }
  }, []);

  const total = pricing?.[selectedType] || 0;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFile = (e, type) => {
    const file = e.target.files[0];

    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      return alert("File too large (max 2MB)");
    }

    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onloadend = () => {
      if (type === "proof") setProof(reader.result);
      if (type === "passport") setPassport(reader.result);
    };
  };

  const submit = async () => {
    if (!selectedType || !formData.nin) {
      return alert("Fill all required fields");
    }

    if (!proof) {
      return alert("Upload payment receipt");
    }

    if (!passport) {
      return alert("Upload passport photograph");
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/api/nin-services/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          userId: user?.id,
          email: user?.email,
          service: "modification",
          type: selectedType,
          nin: formData.nin,
          slipType: "none",
          proof,
          passport,
          formData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message);
      }

      alert("✅ Request submitted successfully");

      setSelectedType(null);

      setFormData({
        email: user?.email || "",
      });

      setProof(null);
      setPassport(null);

    } catch (err) {
      alert(err.message);
    }

    setLoading(false);
  };

  const services = [
    {
      key: "name",
      label: "Name Modification",
      desc: "Correct name mismatch & spelling errors",
      icon: <User size={24} />,
    },

    {
      key: "phone",
      label: "Phone Number",
      desc: "Update linked phone number",
      icon: <Phone size={24} />,
    },

    {
      key: "address",
      label: "Address Correction",
      desc: "Fix residential address records",
      icon: <MapPin size={24} />,
    },

    {
      key: "dob",
      label: "Date Of Birth",
      desc: "Correct date of birth information",
      icon: <CalendarDays size={24} />,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">

      <ModificationNoticeModal />

      {/* HERO */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-3xl p-8 md:p-10 text-white mb-8 shadow-xl">

        <div className="max-w-3xl">

          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={22} />
            <span className="text-sm uppercase tracking-wider opacity-80">
              Secure NIN Processing
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
            Modify Your NIN Details Professionally
          </h1>

          <p className="text-blue-100 text-sm md:text-base">
            Submit corrections securely and avoid rejection, delays,
            and repeated enrollment issues.
          </p>

        </div>

      </div>

      {/* SERVICES */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">

        {services.map((s) => (

          <div
            key={s.key}
            onClick={() => setSelectedType(s.key)}
            className={`cursor-pointer rounded-3xl border transition-all duration-300 p-6 ${
              selectedType === s.key
                ? "bg-blue-600 text-white shadow-2xl scale-[1.03]"
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

      {/* FORM */}
      {selectedType && (

        <div className="grid lg:grid-cols-3 gap-6">

          {/* LEFT */}
          <div className="lg:col-span-2 bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-6 md:p-8">

            <h2 className="text-2xl font-bold mb-6 dark:text-white">
              Applicant Information
            </h2>

            <div className="grid md:grid-cols-2 gap-4">

              <Input
                name="nin"
                placeholder="NIN"
                onChange={handleChange}
              />

              <Input
                name="surname"
                placeholder="Surname"
                onChange={handleChange}
              />

              <Input
                name="firstname"
                placeholder="First Name"
                onChange={handleChange}
              />

              <Input
                name="middlename"
                placeholder="Middle Name"
                onChange={handleChange}
              />

            </div>

            <div className="mt-4">

              <input
                value={formData.email || ""}
                disabled
                className="w-full border p-4 rounded-2xl bg-gray-100 dark:bg-[#202020] dark:border-[#2d2d2d]"
              />

            </div>

            {/* CONDITIONAL FORMS */}

            {selectedType === "name" && (
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <Input
                  name="gsm"
                  placeholder="Phone Number"
                  onChange={handleChange}
                />

                <Input
                  name="previousModification"
                  placeholder="Previous Modification (Yes/No)"
                  onChange={handleChange}
                />
              </div>
            )}

            {selectedType === "phone" && (
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <Input
                  name="oldGsm"
                  placeholder="Old Phone Number"
                  onChange={handleChange}
                />

                <Input
                  name="newGsm"
                  placeholder="New Phone Number"
                  onChange={handleChange}
                />
              </div>
            )}

            {selectedType === "address" && (
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <Input
                  name="address"
                  placeholder="New Address"
                  onChange={handleChange}
                />

                <Input
                  name="gsm"
                  placeholder="Phone Number"
                  onChange={handleChange}
                />
              </div>
            )}

            {selectedType === "dob" && (
              <div className="space-y-6 mt-6">

                <Section title="Basic Information">
                  <Input name="gsm" placeholder="Phone Number" onChange={handleChange} />
                  <Input name="newDob" placeholder="New Date of Birth" onChange={handleChange} />
                  <Input name="oldDob" placeholder="Old Date of Birth" onChange={handleChange} />
                  <Input name="gender" placeholder="Gender" onChange={handleChange} />
                  <Input name="maritalStatus" placeholder="Marital Status" onChange={handleChange} />
                </Section>

                <Section title="Origin Details">
                  <Input name="stateOfOrigin" placeholder="State of Origin" onChange={handleChange} />
                  <Input name="lgaOfOrigin" placeholder="LGA of Origin" onChange={handleChange} />
                  <Input name="townOfOrigin" placeholder="Town/Village" onChange={handleChange} />
                </Section>

                <Section title="Birth Details">
                  <Input name="placeOfBirth" placeholder="Place Of Birth" onChange={handleChange} />
                  <Input name="stateOfBirth" placeholder="State Of Birth" onChange={handleChange} />
                  <Input name="lgaOfBirth" placeholder="LGA Of Birth" onChange={handleChange} />
                </Section>

              </div>
            )}

          </div>

          {/* RIGHT */}
          <div className="space-y-6">

            {/* PAYMENT */}
            <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-6">

              <div className="flex items-center gap-2 mb-4">
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

            {/* UPLOADS */}
            <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-6">

              <div className="flex items-center gap-2 mb-5">
                <Upload size={20} />
                <h3 className="font-bold text-lg dark:text-white">
                  Upload Documents
                </h3>
              </div>

              <div className="space-y-5">

                <div>
                  <p className="text-sm mb-2 dark:text-gray-300">
                    Payment Receipt
                  </p>

                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFile(e, "proof")}
                    className="w-full border p-3 rounded-2xl dark:border-[#2d2d2d]"
                  />
                </div>

                <div>
                  <p className="text-sm mb-2 dark:text-gray-300">
                    Passport Photograph
                  </p>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFile(e, "passport")}
                    className="w-full border p-3 rounded-2xl dark:border-[#2d2d2d]"
                  />
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
                : "Submit & Start Processing"}
            </button>

          </div>

        </div>

      )}

    </div>
  );
}

/* INPUT */
function Input({ name, placeholder, onChange }) {
  return (
    <input
      name={name}
      placeholder={placeholder}
      onChange={onChange}
      className="w-full border dark:border-[#2d2d2d] dark:bg-[#202020] dark:text-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition"
    />
  );
}

/* SECTION */
function Section({ title, children }) {
  return (
    <div className="bg-gray-50 dark:bg-[#202020] p-5 rounded-3xl border dark:border-[#2d2d2d]">

      <h3 className="font-semibold mb-4 dark:text-white">
        {title}
      </h3>

      <div className="grid md:grid-cols-2 gap-4">
        {children}
      </div>

    </div>
  );
}