import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../lib/axios";
import { ArrowRight, BriefcaseBusiness, Building2, FileText, Fingerprint, Loader2, Search, Sparkles } from "lucide-react";

const normalizeCategory = (value = "") => {
  const raw = String(value || "").trim().toLowerCase();
  if (["nin", "nimc"].includes(raw)) return "NIMC";
  if (["cac"].includes(raw)) return "CAC";
  if (["jamb"].includes(raw)) return "JAMB";
  if (["cse"].includes(raw)) return "CSE";
  return raw ? raw.toUpperCase() : "NIMC";
};

const TRENDING_CODES = ["modification-name", "modification-dob", "validation-noRecord", "validation-vnin"];

const categoryDetails = {
  NIMC: { label: "NIMC services", eyebrow: "Identity, made simpler", icon: Fingerprint, accent: "from-blue-950 via-blue-900 to-cyan-800" },
  CAC: { label: "CAC services", eyebrow: "Build with confidence", icon: Building2, accent: "from-slate-950 via-slate-900 to-emerald-900" },
  JAMB: { label: "JAMB services", eyebrow: "Ready when you are", icon: BriefcaseBusiness, accent: "from-amber-950 via-orange-900 to-rose-800" },
  CSE: { label: "Other services", eyebrow: "More ways to move forward", icon: Sparkles, accent: "from-violet-950 via-indigo-900 to-blue-900" },
};

export default function CategoryServicesPage({ defaultCategory }) {
  const { category: routeCategory } = useParams();
  const navigate = useNavigate();
  const category = normalizeCategory(routeCategory || defaultCategory);
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const nextCategory = normalizeCategory(routeCategory || defaultCategory);
    const fetchServices = async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/services/catalog", { params: { category: nextCategory } });
        const catalog = Array.isArray(res.data?.services) ? res.data.services : [];
        const activeServices = catalog.filter((service) => String(service.status || "active") === "active");
        setServices(activeServices);
      } catch (err) {
        console.error("Category service fetch error:", err);
        setServices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [defaultCategory, routeCategory]);

  const details = categoryDetails[category] || { ...categoryDetails.CSE, label: `${category} services` };
  const Icon = details.icon;
  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return services;
    return services.filter((service) => [service.name, service.type, service.serviceCode, service.metadata?.description].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [search, services]);
  const trendingServices = useMemo(() => services.filter((service) => service.metadata?.trending || TRENDING_CODES.includes(service.serviceCode)).slice(0, 4), [services]);
  const displayServices = search.trim() ? filteredServices : filteredServices.filter((service) => !trendingServices.some((trending) => trending.serviceCode === service.serviceCode));

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
      <div className={`relative mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-br ${details.accent} p-7 text-white shadow-2xl sm:p-10`}>
        <div className="relative z-10 max-w-2xl">
          <div className="mb-6 flex items-center gap-3 text-sm font-semibold text-white/70"><Icon size={20} /> {details.eyebrow}</div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{details.label}</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-white/75">Find the service you need, understand what it costs, and start your request in a few clear steps.</p>
          <label className="mt-8 flex max-w-xl items-center gap-3 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-white/20">
            <Search className="ml-3 text-slate-400" size={21} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search services..." className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400" />
          </label>
        </div>
        <Icon className="absolute -bottom-12 -right-8 h-64 w-64 text-white/10" strokeWidth={1} />
      </div>

      {trendingServices.length > 0 && !search.trim() && <section className="mb-10"><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Popular right now</p><h2 className="mt-1 text-2xl font-black">Trending services</h2></div><Sparkles className="text-amber-500" size={22} /></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{trendingServices.map((service) => <ServiceCard key={service.serviceCode} service={service} trending onOpen={() => navigate(`/services/${category.toLowerCase()}/${encodeURIComponent(service.serviceCode)}`)} />)}</div></section>}

      <section><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Browse the catalog</p><h2 className="mt-1 text-2xl font-black">{search.trim() ? `${filteredServices.length} matching services` : "All services"}</h2></div></div><div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">{displayServices.map((service) => <ServiceCard key={service.serviceCode} service={service} onOpen={() => navigate(`/services/${category.toLowerCase()}/${encodeURIComponent(service.serviceCode)}`)} />)}</div></section>

      {(!services.length || (search.trim() && !filteredServices.length)) && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          No active services are available in this category yet. Create one from the services engine and it will appear here.
        </div>
      )}
    </div>
    </div>
  );
}

function ServiceCard({ service, trending, onOpen }) {
  return <article className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
    <div className="mb-5 flex items-start justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><FileText size={22} /></div>{trending && <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-700">Trending</span>}</div>
    <h3 className="text-xl font-bold tracking-tight">{service.name}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-slate-500 dark:text-slate-400">{service.metadata?.description || "A guided service request from our catalog."}</p>
    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5 dark:border-slate-800"><span className="font-bold">₦{Number(service.price || 0).toLocaleString()}</span><button type="button" onClick={onOpen} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition group-hover:bg-blue-700">Start service <ArrowRight size={16} /></button></div>
  </article>;
}
