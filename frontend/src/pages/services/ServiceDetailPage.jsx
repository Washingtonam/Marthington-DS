import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, FileText, Loader2, ShieldCheck, WalletCards } from "lucide-react";
import api from "../../lib/axios";
import DynamicServiceForm from "../../components/DynamicServiceForm";

export default function ServiceDetailPage() {
  const { category, serviceCode } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchService = async () => {
      try {
        const response = await api.get("/api/services/catalog", { params: { category: String(category || ""), status: "active" } });
        const code = decodeURIComponent(serviceCode || "");
        setService((response.data?.services || []).find((entry) => entry.serviceCode === code) || null);
      } catch (error) {
        console.error("Service detail fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchService();
  }, [category, serviceCode]);

  const submitService = async (payload) => {
    try {
      const response = await api.post("/api/services/request", { ...payload, paymentSource: "main", nin: payload.nin || "N/A" });
      if (response?.data?.success) {
        alert("Your service request has been submitted successfully.");
        navigate("/my-requests");
      }
    } catch (error) {
      console.error("Service submission error:", error);
      alert(error?.response?.data?.message || "Unable to submit service request.");
    }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (!service) return <div className="mx-auto max-w-3xl px-4 py-16 text-center"><h1 className="text-3xl font-black">Service unavailable</h1><p className="mt-3 text-slate-500">This service may have been removed or is not active right now.</p><button type="button" onClick={() => navigate(`/services/${category}`)} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"><ArrowLeft size={16} /> Back to services</button></div>;

  return <div className="min-h-screen bg-[#f5f7fb] px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-10"><div className="mx-auto max-w-6xl"><button type="button" onClick={() => navigate(`/services/${category}`)} className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-600"><ArrowLeft size={17} /> Back to services</button><div className="grid gap-8 lg:grid-cols-[1fr_0.7fr]"><main className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-9"><div className="mb-8 flex items-start gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white"><FileText /></div><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Service request</p><h1 className="mt-1 text-3xl font-black tracking-tight">{service.name}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{service.metadata?.description || "Complete the details below to begin your request."}</p></div></div><DynamicServiceForm service={service} onSubmit={submitService} onCancel={() => navigate(`/services/${category}`)} /></main><aside className="space-y-5"><div className="rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">Service fee</p><p className="mt-3 text-4xl font-black">₦{Number(service.price || 0).toLocaleString()}</p><div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5 text-sm text-white/70"><WalletCards size={19} className="text-cyan-300" /> Charged from your wallet on submission</div></div><div className="rounded-[2rem] border border-slate-200 bg-white p-7 dark:border-slate-800 dark:bg-slate-900"><h2 className="flex items-center gap-2 font-bold"><ShieldCheck className="text-emerald-600" size={19} /> What to expect</h2><ul className="mt-5 space-y-4 text-sm text-slate-500">{["Your information is handled securely", "A confirmation appears after submission", "Track progress from My Requests"].map((item) => <li key={item} className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-500" size={17} />{item}</li>)}</ul></div></aside></div></div></div>;
}