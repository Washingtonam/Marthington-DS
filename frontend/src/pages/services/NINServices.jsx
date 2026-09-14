import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../lib/axios";
import DynamicServiceForm from "../../components/DynamicServiceForm";
import { ArrowRight, FileCheck, Loader2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function NINServices() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await api.get("/api/services/catalog?category=NIN");
        const catalog = Array.isArray(res.data?.services) ? res.data.services : [];
        const activeServices = catalog.filter((service) => ["active", "paused"].includes(service.status));
        setServices(activeServices);
        setSelectedService(activeServices[0] || null);
      } catch (err) {
        console.error("Service catalog fetch error:", err);
        setServices([]);
        setSelectedService(null);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const submitService = async (payload) => {
    try {
      setSubmitting(true);
      const response = await api.post("/api/services/request", {
        ...payload,
        service: payload.service,
        type: payload.type,
        paymentSource: "main",
      });
      if (response.data?.success) {
        alert("Your service request has been submitted successfully.");
        navigate("/my-requests");
      }
    } catch (err) {
      console.error("Submission error:", err);
      alert(err?.response?.data?.message || "Unable to submit service request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-slate-950 to-blue-900 text-white p-10 rounded-[2rem] shadow-2xl mb-10">
        <h1 className="text-4xl font-black mb-2">NIMC Services</h1>
        <p className="text-white/70">Professional identity infrastructure powered by Marthington.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {services.map((service) => (
          <motion.div key={service.serviceCode} whileHover={{ y: -5 }} className={`bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 rounded-[2rem] shadow-lg border ${selectedService?.serviceCode === service.serviceCode ? "border-blue-500" : "border-gray-100 dark:border-slate-800"} flex flex-col`}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 text-white bg-blue-500 relative">
              <FileCheck />
              {service.status === "paused" && <span className="absolute -top-1 -right-1 text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">PAUSED</span>}
            </div>
            <h2 className="text-xl font-bold mb-2">{service.name}</h2>
            <p className="text-gray-600 dark:text-slate-300 text-xs mb-6 flex-grow">{service.metadata?.description || "Available service."}</p>
            <div className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">₦{Number(service.price || 0).toLocaleString()}</div>
            <button onClick={() => setSelectedService(service)} className="w-full bg-slate-900 text-white py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-blue-800 transition">
              {selectedService?.serviceCode === service.serviceCode ? "Selected" : "Open Service"} <ArrowRight size={16} />
            </button>
          </motion.div>
        ))}
      </div>

      {selectedService && (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-5 flex items-center gap-3">
            <ShieldCheck className="text-blue-600" />
            <div>
              <h3 className="text-2xl font-bold">{selectedService.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-300">{selectedService.metadata?.description || "Service intake form"}</p>
            </div>
          </div>
          <DynamicServiceForm service={selectedService} onSubmit={submitService} onCancel={() => setSelectedService(null)} />
          {submitting && <div className="mt-4 text-sm text-slate-500">Submitting request...</div>}
        </div>
      )}
    </div>
  );
}