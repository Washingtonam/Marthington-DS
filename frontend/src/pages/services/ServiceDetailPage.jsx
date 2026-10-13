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

  return (
    <div className="min-h-full w-full min-w-0 overflow-x-hidden bg-[#f5f7fb] px-2 py-5 dark:bg-slate-950 sm:px-4 sm:py-8 lg:px-10">
      <div className="mx-auto w-full min-w-0 max-w-6xl">
        <button
          type="button"
          onClick={() => navigate(`/services/${category}`)}
          className="mb-6 inline-flex items-center gap-2 text-left text-sm font-semibold text-slate-500 transition hover:text-blue-600 sm:mb-7"
        >
          <ArrowLeft size={17} /> Back to services
        </button>
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.7fr)] lg:gap-8">
          <main className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-[2rem] sm:p-6 lg:p-9">
            <div className="mb-6 flex min-w-0 items-start gap-3 sm:mb-8 sm:gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white sm:h-14 sm:w-14">
                <FileText />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Service request</p>
                <h1 className="mt-1 break-words text-2xl font-black tracking-tight sm:text-3xl">{service.name}</h1>
                <p className="mt-2 break-words text-sm leading-6 text-slate-500">
                  {service.metadata?.description || "Complete the details below to begin your request."}
                </p>
              </div>
            </div>
            <DynamicServiceForm service={service} onSubmit={submitService} onCancel={() => navigate(`/services/${category}`)} />
          </main>
          <aside className="min-w-0 space-y-4 sm:space-y-5">
            <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white shadow-xl sm:rounded-[2rem] sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">Service fee</p>
              <p className="mt-3 break-words text-3xl font-black sm:text-4xl">₦{Number(service.price || 0).toLocaleString()}</p>
              <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5 text-sm text-white/70">
                <WalletCards size={19} className="shrink-0 text-cyan-300" />
                Charged from your wallet on submission
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:rounded-[2rem] sm:p-7">
              <h2 className="flex items-center gap-2 font-bold">
                <ShieldCheck className="shrink-0 text-emerald-600" size={19} /> What to expect
              </h2>
              <ul className="mt-5 space-y-4 text-sm text-slate-500">
                {["Your information is handled securely", "A confirmation appears after submission", "Track progress from My Requests"].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-500" size={17} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}