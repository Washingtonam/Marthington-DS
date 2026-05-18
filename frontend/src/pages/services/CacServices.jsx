import { useState, useEffect } from "react";
import axios from "axios";
import { 
  Building2, 
  UserPlus, 
  Trash2, 
  Upload, 
  CheckCircle, 
  HelpCircle,
  FileText,
  Loader2
} from "lucide-react";

const API_BASE = "https://xcombinator.onrender.com";

export default function CacServices() {
  const [service, setService] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Core User Information
  const user = JSON.parse(localStorage.getItem("user")) || {};
  const userId = user._id || user.id;

  // Form State Configurations
  const [businessInfo, setBusinessInfo] = useState({
    businessName1: "",
    businessName2: "",
    companyEmail: "",
    companyPhone: "",
    category: "",
    state: "",
    lga: "",
    shopNo: "",
    streetAddress: ""
  });

  const [proprietors, setProprietors] = useState([
    { fullName: "", dob: "", gender: "", phone: "", nin: "", email: "", state: "", lga: "", address: "", signature: "", passport: "" }
  ]);

  const [witness, setWitness] = useState({
    fullName: "", dob: "", gender: "", phone: "", nin: "", email: "", state: "", lga: "", address: "", signature: "", passport: ""
  });

  const [includeSecretary, setIncludeSecretary] = useState(false);
  const [secretary, setSecretary] = useState({ fullName: "", phone: "", email: "", nin: "" });

  // Price Mapping Matching UI Specifications
  const prices = {
    sole_proprietorship: 28000,
    partnership: 32000,
    limited_1m: 40000,
    custom_ngo: 0
  };

  const currentPrice = prices[service] || 0;

  // ==========================================
  // 🔄 FETCH USER CAC HISTORY LOGS
  // ==========================================
  const fetchHistory = async () => {
    if (!userId) return;
    try {
      setLoadingHistory(true);
      const res = await axios.get(`${API_BASE}/api/cac/user-history/${userId}`);
      setHistory(res.data || []);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  // Reset internal sub-states if service configuration selection shifts
  useEffect(() => {
    if (service === "sole_proprietorship") {
      setProprietors([proprietors[0]]);
    }
  }, [service]);

  // ==========================================
  // 📁 UTILITY: CONVERT FILES TO BASE64
  // ==========================================
  const handleFileChange = (e, index, field, type = "proprietor") => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("File is too large. Maximum size allowed is 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const base64String = reader.result;
      if (type === "proprietor") {
        const updated = [...proprietors];
        updated[index][field] = base64String;
        setProprietors(updated);
      } else if (type === "witness") {
        setWitness(prev => ({ ...prev, [field]: base64String }));
      }
    };
  };

  // ==========================================
  // ➕/➖ PROPRIETOR ARRAY MANAGEMENT
  // ==========================================
  const addProprietor = () => {
    setProprietors([...proprietors, { fullName: "", dob: "", gender: "", phone: "", nin: "", email: "", state: "", lga: "", address: "", signature: "", passport: "" }]);
  };

  const removeProprietor = (index) => {
    if (proprietors.length === 1) return;
    setProprietors(proprietors.filter((_, i) => i !== index));
  };

  // ==========================================
  // 🚀 SUBMIT DATA PAYLOAD TO BACKEND API
  // ==========================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentPrice > 0 && user.units < Math.ceil(currentPrice / 215)) {
      alert("Insufficient wallet balance. Please add units to process registration.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        userId,
        serviceType: service,
        ...businessInfo,
        proprietors,
        ...(service === "limited_1m" ? { witness, secretary: includeSecretary ? secretary : null } : {})
      };

      const res = await axios.post(`${API_BASE}/api/cac/submit`, payload);
      alert(res.data.message || "Registration logged successfully!");
      
      // Reset inputs
      setBusinessInfo({ businessName1: "", businessName2: "", companyEmail: "", companyPhone: "", category: "", state: "", lga: "", shopNo: "", streetAddress: "" });
      setProprietors([{ fullName: "", dob: "", gender: "", phone: "", nin: "", email: "", state: "", lga: "", address: "", signature: "", passport: "" }]);
      setService("");
      setAgree(false);
      fetchHistory();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "An error occurred while submitting.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 p-4 md:p-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER SECTION */}
        <div className="flex items-center gap-3 border-b pb-4 border-gray-200 dark:border-gray-800">
          <Building2 size={32} className="text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">CAC Services</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Register Business Names, Limited Liability Companies, and Corporations</p>
          </div>
        </div>

        {/* SELECT DROP-DOWN */}
        <div className="bg-white dark:bg-[#121212] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Choose Service</label>
          <select 
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="w-full md:w-1/2 p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] focus:ring-2 focus:ring-blue-500 outline-none transition"
          >
            <option value="">-- Select Service --</option>
            <option value="sole_proprietorship">Business Name Sole Proprietorship (₦28,000)</option>
            <option value="partnership">Business Name Partnership (₦32,000)</option>
            <option value="limited_1m">Limited Liability 1M Share (₦40,000)</option>
            <option value="custom_ngo">Company more than 1M, NGO, Clubs, Association, Etc. (₦0)</option>
          </select>
        </div>

        {service && (
          <form onSubmit={handleSubmit} className="space-y-8 animate-fadeIn">
            
            {/* CONDITIONAL HANDLING FOR ₦0 OPTIONS */}
            {service === "custom_ngo" ? (
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-2xl p-6 text-center space-y-4">
                <HelpCircle size={40} className="mx-auto text-blue-600" />
                <h3 className="text-lg font-bold">Custom Form Verification Required</h3>
                <p className="text-sm max-w-lg mx-auto text-gray-600 dark:text-gray-400">
                  NGO, Club, and high-tier capital registrations require manual validation parameters. Click below to lock tracking initialization or message management directly.
                </p>
                <a href="https://wa.me/2348129097599" target="_blank" rel="noreferrer" className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition shadow-md">
                  Contact Support on WhatsApp
                </a>
              </div>
            ) : (
              <>
                {/* BUSINESS CORE INFO SECTION */}
                <div className="bg-white dark:bg-[#121212] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
                  <h3 className="text-lg font-bold text-blue-600 border-b pb-2 border-gray-100 dark:border-gray-800">
                    {service === "limited_1m" ? "Company Information" : "Business Information"}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Proposed Name 1</label>
                      <input required type="text" value={businessInfo.businessName1} onChange={(e) => setBusinessInfo({...businessInfo, businessName1: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Proposed Name 2</label>
                      <input required type="text" value={businessInfo.businessName2} onChange={(e) => setBusinessInfo({...businessInfo, businessName2: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Company Email</label>
                      <input required type="email" value={businessInfo.companyEmail} onChange={(e) => setBusinessInfo({...businessInfo, companyEmail: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Company Phone Number</label>
                      <input type="tel" value={businessInfo.companyPhone} onChange={(e) => setBusinessInfo({...businessInfo, companyPhone: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-gray-500">Category of Business</label>
                      <input required type="text" placeholder="e.g. Retail, Agro-allied, Tech Services" value={businessInfo.category} onChange={(e) => setBusinessInfo({...businessInfo, category: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Company State of Residence</label>
                      <input required type="text" value={businessInfo.state} onChange={(e) => setBusinessInfo({...businessInfo, state: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Company LGA and City</label>
                      <input required type="text" value={businessInfo.lga} onChange={(e) => setBusinessInfo({...businessInfo, lga: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Company Shop No.</label>
                      <input type="text" value={businessInfo.shopNo} onChange={(e) => setBusinessInfo({...businessInfo, shopNo: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500">Company Street Address</label>
                      <input required type="text" value={businessInfo.streetAddress} onChange={(e) => setBusinessInfo({...businessInfo, streetAddress: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                    </div>
                  </div>
                </div>

                {/* PROPRIETOR DYNAMIC REPEATER CARD INTERFACES */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-blue-600">
                      {service === "limited_1m" ? "Director / Shareholder Details" : "Proprietor Information"}
                    </h3>
                    {service !== "sole_proprietorship" && (
                      <button type="button" onClick={addProprietor} className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl font-medium transition shadow-sm">
                        <UserPlus size={14} /> Add Proprietor
                      </button>
                    )}
                  </div>

                  {proprietors.map((prop, idx) => (
                    <div key={idx} className="bg-white dark:bg-[#121212] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 relative space-y-4">
                      {proprietors.length > 1 && (
                        <button type="button" onClick={() => removeProprietor(idx)} className="absolute top-4 right-4 text-red-500 hover:text-red-700 transition">
                          <Trash2 size={18} />
                        </button>
                      )}
                      <h4 className="text-sm font-bold opacity-70 uppercase tracking-wider">Person {idx + 1} Details</h4>
                      
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-gray-500">Full Name</label>
                          <input required type="text" value={prop.fullName} onChange={(e) => { const updated = [...proprietors]; updated[idx].fullName = e.target.value; setProprietors(updated); }} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500">Date of Birth</label>
                          <input required type="date" value={prop.dob} onChange={(e) => { const updated = [...proprietors]; updated[idx].dob = e.target.value; setProprietors(updated); }} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500">Gender</label>
                          <select required value={prop.gender} onChange={(e) => { const updated = [...proprietors]; updated[idx].gender = e.target.value; setProprietors(updated); }} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1">
                            <option value="">-- Select Gender --</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500">Phone Number</label>
                          <input required type="tel" value={prop.phone} onChange={(e) => { const updated = [...proprietors]; updated[idx].phone = e.target.value; setProprietors(updated); }} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500">NIN Number</label>
                          <input required type="text" maxLength={11} value={prop.nin} onChange={(e) => { const updated = [...proprietors]; updated[idx].nin = e.target.value; setProprietors(updated); }} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                        </div>
                        {service !== "sole_proprietorship" && (
                          <div>
                            <label className="text-xs font-semibold text-gray-500">Email Address</label>
                            <input type="email" value={prop.email} onChange={(e) => { const updated = [...proprietors]; updated[idx].email = e.target.value; setProprietors(updated); }} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                          </div>
                        )}
                        <div>
                          <label className="text-xs font-semibold text-gray-500">State of Residence</label>
                          <input type="text" value={prop.state} onChange={(e) => { const updated = [...proprietors]; updated[idx].state = e.target.value; setProprietors(updated); }} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500">LGA of Residence</label>
                          <input type="text" value={prop.lga} onChange={(e) => { const updated = [...proprietors]; updated[idx].lga = e.target.value; setProprietors(updated); }} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500">Home / Street Address</label>
                          <input type="text" value={prop.address} onChange={(e) => { const updated = [...proprietors]; updated[idx].address = e.target.value; setProprietors(updated); }} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                        </div>
                      </div>

                      {/* FILE ATTACHMENT PROCESSING SUB-CARDS */}
                      <div className="grid md:grid-cols-2 gap-4 pt-2">
                        <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
                          <label className="cursor-pointer block">
                            <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                            <span className="text-xs font-medium block">Signature (image only)</span>
                            <input required type="file" accept="image/*" onChange={(e) => handleFileChange(e, idx, "signature")} className="hidden" />
                          </label>
                          {prop.signature && <span className="text-[10px] text-green-600 mt-1 block font-medium">✓ Uploaded successfully</span>}
                        </div>
                        <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
                          <label className="cursor-pointer block">
                            <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                            <span className="text-xs font-medium block">Passport (Clear Image)</span>
                            <input required type="file" accept="image/*" onChange={(e) => handleFileChange(e, idx, "passport")} className="hidden" />
                          </label>
                          {prop.passport && <span className="text-[10px] text-green-600 mt-1 block font-medium">✓ Uploaded successfully</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* LIMITED LIABILITY INTERFACES: WITNESS & SECRETARY MODULARS */}
                {service === "limited_1m" && (
                  <>
                    {/* WITNESS INTERFACE SUB-CARD */}
                    <div className="bg-white dark:bg-[#121212] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
                      <h3 className="text-md font-bold text-blue-600 border-b pb-1 border-gray-100 dark:border-gray-800">Witness Details</h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-gray-500">Witness Full Name</label>
                          <input required type="text" value={witness.fullName} onChange={(e) => setWitness({...witness, fullName: e.target.value})} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500">Date of Birth</label>
                          <input required type="date" value={witness.dob} onChange={(e) => setWitness({...witness, dob: e.target.value})} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500">Witness Gender</label>
                          <select required value={witness.gender} onChange={(e) => setWitness({...witness, gender: e.target.value})} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1">
                            <option value="">-- Select Witness Gender --</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500">Phone Number</label>
                          <input required type="tel" value={witness.phone} onChange={(e) => setWitness({...witness, phone: e.target.value})} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500">NIN Number</label>
                          <input required type="text" maxLength={11} value={witness.nin} onChange={(e) => setWitness({...witness, nin: e.target.value})} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500">Witness Email</label>
                          <input type="email" value={witness.email} onChange={(e) => setWitness({...witness, email: e.target.value})} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4 pt-2">
                        <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
                          <label className="cursor-pointer block">
                            <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                            <span className="text-xs font-medium block">Witness Signature</span>
                            <input required type="file" accept="image/*" onChange={(e) => handleFileChange(e, null, "signature", "witness")} className="hidden" />
                          </label>
                          {witness.signature && <span className="text-[10px] text-green-600 mt-1 block font-medium">✓ Uploaded successfully</span>}
                        </div>
                        <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
                          <label className="cursor-pointer block">
                            <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                            <span className="text-xs font-medium block">Witness Passport</span>
                            <input required type="file" accept="image/*" onChange={(e) => handleFileChange(e, null, "passport", "witness")} className="hidden" />
                          </label>
                          {witness.passport && <span className="text-[10px] text-green-600 mt-1 block font-medium">✓ Uploaded successfully</span>}
                        </div>
                      </div>
                    </div>

                    {/* OPTIONAL SECRETARY TOGGLE INTERFACE CARD */}
                    <div className="bg-white dark:bg-[#121212] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="secToggle" checked={includeSecretary} onChange={(e) => setIncludeSecretary(e.target.checked)} className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded" />
                        <label htmlFor="secToggle" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer">Add Secretary Information? (Optional)</label>
                      </div>

                      {includeSecretary && (
                        <div className="grid md:grid-cols-2 gap-4 pt-2 animate-fadeIn">
                          <div>
                            <label className="text-xs font-semibold text-gray-500">Secretary Full Name</label>
                            <input required type="text" value={secretary.fullName} onChange={(e) => setSecretary({...secretary, fullName: e.target.value})} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500">Phone Number</label>
                            <input required type="tel" value={secretary.phone} onChange={(e) => setSecretary({...secretary, phone: e.target.value})} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500">Email Address</label>
                            <input type="email" value={secretary.email} onChange={(e) => setSecretary({...secretary, email: e.target.value})} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500">NIN Number</label>
                            <input required type="text" maxLength={11} value={secretary.nin} onChange={(e) => setSecretary({...secretary, nin: e.target.value})} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161616] mt-1" />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* TERMS DISCLAIMER & SUBMIT CONFIRMATION FOOTER CARD */}
                <div className="bg-white dark:bg-[#121212] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-2.5">
                    <input required type="checkbox" id="confirmTerms" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="w-5 h-5 text-blue-600 focus:ring-blue-500 rounded cursor-pointer" />
                    <label htmlFor="confirmTerms" className="text-sm font-medium text-gray-600 dark:text-gray-400 cursor-pointer">I confirm all information provided is accurate and correct.</label>
                  </div>

                  <button 
                    type="submit" 
                    disabled={!agree || submitting} 
                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold px-8 py-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin" size={18} /> Processing...
                      </>
                    ) : (
                      `Submit Registration (₦${currentPrice.toLocaleString()})`
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
        )}

        {/* OVERARCHING HISTORICAL LOGS ARCHIVE SUMMARY DATA DATA TABLE */}
        <div className="bg-white dark:bg-[#121212] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <FileText size={20} className="text-blue-600" />
            <h3 className="text-lg font-bold">Transaction History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#161616] text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-800">
                  <th className="p-4">Ref ID</th>
                  <th className="p-4">Action Variant</th>
                  <th className="p-4">Proposed Name 1</th>
                  <th className="p-4">Proposed Name 2</th>
                  <th className="p-4">Amount Charged</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Progress Notes</th>
                  <th className="p-4">Date Subm.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loadingHistory ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400">Loading history logs...</td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400">No transactions recorded yet.</td>
                  </tr>
                ) : (
                  history.map((h) => (
                    <tr key={h._id} className="hover:bg-gray-50/50 dark:hover:bg-[#161616]/30 transition">
                      <td className="p-4 font-mono text-xs text-gray-400 max-w-[100px] truncate">{h._id}</td>
                      <td className="p-4 capitalize font-medium">{h.serviceType.replace("_", " ")}</td>
                      <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">{h.businessName1}</td>
                      <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">{h.businessName2}</td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-200">₦{h.amountCharged.toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 text-xs rounded-full font-semibold ${
                          h.status === "completed" ? "bg-green-100 text-green-700" :
                          h.status === "rejected" ? "bg-red-100 text-red-700" :
                          h.status === "processing" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {h.status}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 dark:text-gray-400 text-xs max-w-[150px] truncate">{h.progressNotes}</td>
                      <td className="p-4 text-gray-400 text-xs">{new Date(h.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <p className="text-center text-xs text-gray-400 pb-4">© 2026 SLT. All rights reserved.</p>
      </div>
    </div>
  );
}