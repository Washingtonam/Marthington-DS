import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../lib/axios";
import DynamicServiceForm from "../../components/DynamicServiceForm";
import { ArrowRight, FileText, Loader2, ShieldCheck } from "lucide-react";

const normalizeCategory = (value = "") => {
  const raw = String(value || "").trim().toLowerCase();
  if (["nin", "nimc"].includes(raw)) return "NIN";
  if (["cac"].includes(raw)) return "CAC";
  if (["jamb"].includes(raw)) return "JAMB";
  if (["cse"].includes(raw)) return "CSE";
  return raw ? raw.toUpperCase() : "NIN";
};

export default function CategoryServicesPage() {
  const { category: routeCategory = "NIN" } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(normalizeCategory(routeCategory));
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const nextCategory = normalizeCategory(routeCategory);
    setCategory(nextCategory);

    const fetchServices = async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/services/catalog", { params: { category: nextCategory } });
        const catalog = Array.isArray(res.data?.services) ? res.data.services : [];
        const activeServices = catalog.filter((service) => String(service.status || "active") === "active");
        setServices(activeServices);
        setSelectedService(activeServices[0] || null);
      } catch (err) {
        console.error("Category service fetch error:", err);
        setServices([]);
        setSelectedService(null);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [routeCategory]);

  const submitService = async (payload) => {
    try {
      const response = await api.post("/api/services/request", {
        ...payload,
        paymentSource: "main",
        nin: payload.nin || "N/A",
      });

      if (response?.data?.success) {
        alert("Your service request has been submitted successfully.");
        navigate("/my-requests");
      }
    } catch (err) {
      console.error("Category service submission error:", err);
      alert(err?.response?.data?.message || "Unable to submit service request.");
    }
  };

  const categoryLabel = useMemo(() => {
    if (category === "NIN") return "NIMC Services";
    if (category === "CAC") return "CAC Services";
    if (category === "JAMB") return "JAMB Services";
    if (category === "CSE") return "CSE Services";
    return `${category} Services`;
  }, [category]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 rounded-[2rem] bg-gradient-to-r from-slate-950 to-blue-900 p-10 text-white shadow-2xl">
        <h1 className="text-4xl font-black">{categoryLabel}</h1>
        <p className="mt-2 text-white/70">Dynamic service catalog for {category}.</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => (
          <div key={service.serviceCode} className={`rounded-[2rem] border bg-white p-6 shadow-lg ${selectedService?.serviceCode === service.serviceCode ? "border-blue-500" : "border-slate-200"}`}>
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500 text-white">
              <FileText />
            </div>
            <h2 className="text-xl font-bold">{service.name}</h2>
            <p className="mt-3 text-sm text-slate-600">{service.metadata?.description || "Available service."}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-semibold text-slate-700">₦{Number(service.price || 0).toLocaleString()}</span>
              <button
                onClick={() => setSelectedService(service)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Open <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedService && (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <ShieldCheck className="text-blue-600" />
            <div>
              <h3 className="text-2xl font-bold">{selectedService.name}</h3>
              <p className="text-sm text-slate-500">{selectedService.metadata?.description || "Service intake form"}</p>
            </div>
          </div>
          <DynamicServiceForm service={selectedService} onSubmit={submitService} onCancel={() => setSelectedService(null)} />
        </div>
      )}

      {!services.length && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600">
          No active services are available in this category yet. Create one from the services engine and it will appear here.
        </div>
      )}
    </div>
  );
}
