import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../lib/axios";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  ChevronDown,
  Download,
  Layers3,
  SlidersHorizontal,
  X,
} from "lucide-react";
import SlideOver from "../../components/ui/SlideOver";
import RequestDetails from "./RequestDetails";
import { useToast } from "../../context/ToastContext";

// 🎨 Status Badge Color Mapping
const statusColors = {
  "pending": "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
  "in-progress": "bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-200 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/20",
  "processing": "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
  "approved": "bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-200 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/20",
  "completed": "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-600",
  "rejected": "bg-red-100 text-red-800 ring-1 ring-inset ring-red-200 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/20",
  "failed": "bg-red-100 text-red-800 ring-1 ring-inset ring-red-200 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/20"
};

const emptyAnalytics = {
  totalRequests: 0,
  totalAmount: 0,
  pending: 0,
  inProgress: 0,
  completed: 0,
  rejected: 0,
  services: [],
};

const formatAmount = (amount) => new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
}).format(Number(amount) || 0);

function MetricCard({ icon, label, value, detail, progress }) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[rgba(var(--accent-rgb),0.10)] text-[var(--accent-text)]">
          {React.createElement(icon, { size: 19, "aria-hidden": true })}
        </span>
      </div>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <div className="h-full rounded-full bg-[var(--accent)] transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      )}
      <p className="mt-3 truncate text-xs text-slate-500 dark:text-slate-400">{detail}</p>
    </article>
  );
}

function ServicePerformanceCard({ title, description, services, icon, formatAmount: formatServiceAmount }) {
  const maxCount = Math.max(...services.map((service) => Number(service.count) || 0), 1);

  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <header className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[rgba(var(--accent-rgb),0.10)] text-[var(--accent-text)]">
          {React.createElement(icon, { size: 19, "aria-hidden": true })}
        </span>
        <div className="min-w-0">
          <h4 className="font-semibold text-slate-900 dark:text-white">{title}</h4>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </header>
      <ul className="mt-4 space-y-4">
        {services.map((service) => {
          const count = Number(service.count) || 0;
          return (
            <li key={service.service} className="min-w-0">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <span className="min-w-0 break-words text-sm font-semibold text-slate-800 dark:text-slate-200">{service.service}</span>
                <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">{count.toLocaleString()} requests</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-label={`${service.service} request volume`} aria-valuemin={0} aria-valuemax={maxCount} aria-valuenow={count}>
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.max(3, (count / maxCount) * 100)}%` }} />
              </div>
              <div className="mt-1.5 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span>{formatServiceAmount(service.totalAmount)} value</span>
                <span>{Number(service.completionRate) || 0}% completed</span>
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export default function AdminRequests() {
  const [searchParams] = useSearchParams();
  const { success, error: toastError, info } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [serviceCategories, setServiceCategories] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [activeStatus, setActiveStatus] = useState("all");
  const [requests, setRequests] = useState([]);
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalStatus, setModalStatus] = useState("");
  const [modalComment, setModalComment] = useState("");
  const [requesterRole, setRequesterRole] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [approximate, setApproximate] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [viewMode, setViewMode] = useState('table');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [pageSize, setPageSize] = useState(12);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [filtersVersion, setFiltersVersion] = useState(0);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);

  const serviceColors = {
    "Validation": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
    "IP Clearance": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200",
    "Modification": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
    "Personalization": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-200",
    "Self-Service": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-200",
    "sole_proprietorship": "bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200",
    "partnership": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
    "limited_1m": "bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-200",
    "custom_ngo": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200"
  };

  const fetchRequests = async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = {
        page: pageNum,
        limit: pageSize,
        status: activeStatus === "all" ? "" : activeStatus,
        category: activeTab === "all" ? "" : (serviceCategories.find((item) => item.slug === activeTab)?.label || activeTab),
        serviceType: selectedServices.length ? selectedServices.join(',') : '',
        search: searchQuery || searchTerm,
        userRole: requesterRole,
        sortBy,
        order,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        minAmount: minAmount || undefined,
        maxAmount: maxAmount || undefined,
      };

      const res = await api.get("/api/admin/requests", { params });
      const data = res.data?.data || res.data?.requests || [];
      setRequests(data);
      setAnalytics({ ...emptyAnalytics, ...(res.data?.analytics || {}) });
      setPages(res.data?.pagination?.pages || 1);
      setApproximate(!!res.data?.pagination?.approximate);
      setPage(pageNum);
    } catch (err) {
      console.error("Fetch Error:", err);
      setRequests([]);
      setAnalytics(emptyAnalytics);
      if (toastError) toastError(err.response?.data?.message || "Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await api.get("/api/services/categories");
        setServiceCategories(Array.isArray(response.data?.categories) ? response.data.categories : []);
      } catch (err) {
        console.error("Failed to load request categories:", err);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    fetchRequests(1);
  }, [activeStatus, activeTab, selectedServices, requesterRole, filtersVersion]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchTerm.trim()), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    // when searchQuery changes, refetch
    setPage(1);
    fetchRequests(1);
  }, [searchQuery]);

  useEffect(() => {
    if (selected) {
      setModalStatus(selected.status || "pending");
      setModalComment("");
    }
  }, [selected]);

  useEffect(() => {
    const requestId = searchParams.get("request");
    if (!requestId || selected) return;
    const matchingRequest = requests.find((request) => String(request._id) === requestId);
    if (matchingRequest) setSelected(matchingRequest);
  }, [requests, searchParams, selected]);

  const handleStatusUpdate = async (id, status, note = '') => {
    if (!id) return false;
    if (!window.confirm(`Confirm ${status} for this record?`)) return false;

    try {
      if (selected?.pipelineSource === "agent-job") {
        const agentJobStatus = status === "approved" || status === "completed"
          ? "completed"
          : status === "rejected"
            ? "cancelled"
            : status === "processing"
              ? "in-progress"
              : status;
        await api.patch(`/api/admin/agents/jobs/${id}/status`, { status: agentJobStatus, note });
      } else if (status === 'approved') {
        await api.put(`/api/admin/approve-request/${id}`, { note });
      } else {
        await api.put(`/api/admin/status/${id}`, { status, note });
      }
      if (success) success('Request status updated');
      await fetchRequests(page);
      return true;
    } catch (err) {
      console.error("Status update failed:", err);
      if (toastError) toastError(err.response?.data?.message || "Failed to update request status.");
      return false;
    }
  };

  const applyFilters = () => {
    setPage(1);
    fetchRequests(1);
  };

  // Job panel
  const [showJobs, setShowJobs] = useState(false);
  const [jobs, setJobs] = useState([]);

  const fetchJobs = async () => {
    try {
      const res = await api.get('/api/admin/requests/bulk-jobs', { params: { limit: 50, status: 'processing' } });
      setJobs(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch jobs', err);
    }
  };

  useEffect(() => {
    let iv;
    if (showJobs) {
      fetchJobs();
      iv = setInterval(fetchJobs, 3000);
    }
    return () => clearInterval(iv);
  }, [showJobs]);

  const [jobDetails, setJobDetails] = useState(null);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const selectAllVisible = () => {
    const ids = displayedRequests.filter((r) => r.pipelineSource !== "agent-job").map((r) => r._id);
    setSelectedIds(new Set(ids));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const performBulkAction = async (action) => {
    if (selectedIds.size === 0) {
      if (toastError) toastError('No requests selected');
      return;
    }

    const ids = Array.from(selectedIds);
    try {
      if (ids.length > 50) {
        const resp = await api.post('/api/admin/requests/bulk-job', { ids, action });
        const jobId = resp.data?.jobId;
        if (info) info(`Background job started (ID: ${jobId}). Monitoring progress...`);

        let intervalId;
        const poll = async () => {
          try {
            const r = await api.get(`/api/admin/requests/bulk-job/${jobId}`);
            const job = r.data?.data;
            if (job) {
              if (job.status === 'completed') {
                clearInterval(intervalId);
                if (success) success(`Job completed: ${job.processed}/${job.total}`);
                clearSelection();
                await fetchRequests(page);
              } else if (job.status === 'failed') {
                clearInterval(intervalId);
                if (toastError) toastError('Job failed');
              } else {
                if (info) info(`Job ${job.status}: ${job.processed}/${job.total}`);
              }
            }
          } catch (e) {
            console.error('Job poll error', e);
          }
        };
        intervalId = setInterval(poll, 2000);
        await poll();
      } else {
        const res = await api.post('/api/admin/requests/bulk', { ids, action });
        if (success) success(res.data?.message || 'Bulk action completed');
        clearSelection();
        await fetchRequests(page);
      }
    } catch (err) {
      console.error('Bulk request action error', err);
      if (toastError) toastError(err.response?.data?.message || 'Bulk action failed');
    }
  };

  const handleStatusChange = (status) => {
    setActiveStatus(status);
    setPage(1);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedServices([]);
    setPage(1);
  };

  const handleRoleChange = (role) => {
    setRequesterRole(role);
    setPage(1);
  };

  const displayedRequests = requests;
  const completionRate = analytics.totalRequests
    ? Math.round((analytics.completed / analytics.totalRequests) * 100)
    : 0;
  const activeFilterCount = [
    activeTab !== "all",
    selectedServices.length > 0,
    activeStatus !== "all",
    requesterRole !== "all",
    Boolean(searchQuery.trim()),
    Boolean(fromDate || toDate),
    Boolean(minAmount || maxAmount),
  ].filter(Boolean).length;
  const topServices = analytics.services.slice(0, Math.min(5, Math.ceil(analytics.services.length / 2)));
  const lowerVolumeServices = [...analytics.services]
    .sort((a, b) => a.count - b.count)
    .slice(0, Math.min(5, Math.floor(analytics.services.length / 2)));

  const formatDateShort = (iso) => iso ? new Date(iso).toLocaleDateString() : '-';

  const getRequestTitle = (request) => {
    if (request.pipelineSource === "cac") {
      return request.serviceType ? request.serviceType.replace(/_/g, " ") : "CAC";
    }
    if (request.pipelineSource === "agent-job") {
      return request.serviceName || request.serviceType || request.service || request.type || "Agent job";
    }
    return request.serviceName || request.service || request.type || request.serviceType || "General";
  };

  const getRequestName = (request) => {
    const formData = request.formData || {};
    const formName = [
      formData.firstName || formData.givenName,
      formData.middleName,
      formData.lastName || formData.surname,
    ].filter(Boolean).join(" ");
    const accountName = [request.userId?.firstName, request.userId?.lastName].filter(Boolean).join(" ");
    return request.agentName || formName || accountName || request.userId?.email || "Customer";
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] min-w-0 space-y-6 px-3 py-5 sm:px-6 sm:py-7">
      <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-text)]">Operations overview</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Service Requests</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Monitor incoming work, follow request progress, and prioritize customer service.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { const qs = new URLSearchParams({ search: searchQuery || searchTerm, status: activeStatus === 'all' ? '' : activeStatus, category: activeTab === 'all' ? '' : (serviceCategories.find((item) => item.slug === activeTab)?.label || activeTab), serviceType: selectedServices.length ? selectedServices.join(',') : '', userRole: requesterRole, sortBy, order }); window.open(`/api/admin/requests/export?${qs.toString()}`, '_blank'); }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download size={16} aria-hidden="true" /> Export
          </button>
          <button type="button" onClick={() => setShowJobs(true)} aria-label="Open Jobs panel" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
            <Layers3 size={16} aria-hidden="true" /> Background jobs
          </button>
        </div>
      </header>

      <section aria-label="Request metrics" className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Layers3}
          label="Total requests"
          value={analytics.totalRequests.toLocaleString()}
          detail={activeFilterCount ? `${activeFilterCount} filters applied · matching requests` : "All matching requests"}
        />
        <MetricCard icon={CircleDollarSign} label="Total request value" value={formatAmount(analytics.totalAmount)} detail="Across the matching request set" />
        <MetricCard
          icon={Clock3}
          label="Active pipeline"
          value={(analytics.pending + analytics.inProgress).toLocaleString()}
          detail={`${analytics.pending} pending · ${analytics.inProgress} in progress`}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Completion rate"
          value={`${completionRate}%`}
          detail={`${analytics.completed.toLocaleString()} completed requests`}
          progress={completionRate}
        />
      </section>

      <section aria-label="Request filters" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {[{ slug: "all", label: "All services" }, ...serviceCategories].map((tab) => (
            <button
              key={tab.slug}
              type="button"
              aria-pressed={activeTab === tab.slug}
              onClick={() => handleTabChange(tab.slug)}
              className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 ${activeTab === tab.slug ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}
            >
              {tab.label.toUpperCase() === "NIN" ? "NIMC" : tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2.5">
          <label className="flex min-w-[min(100%,16rem)] flex-[1_1_18rem] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-950">
            <Search size={17} className="shrink-0 text-slate-400" aria-hidden="true" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") applyFilters(); }}
              placeholder="Search name, NIN, email, job or ID"
              aria-label="Search service requests"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
            />
          </label>
          {activeTab !== "all" && (
            <input
              value={selectedServices[0] || ""}
              onChange={(event) => setSelectedServices(event.target.value ? [event.target.value] : [])}
              aria-label="Filter by service"
              placeholder="Service code or type"
              className="min-w-[10rem] flex-[1_1_10rem] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          )}
          <label className="sr-only" htmlFor="request-status-filter">Status</label>
          <select id="request-status-filter" value={activeStatus} onChange={(event) => handleStatusChange(event.target.value)} className="min-w-[9rem] flex-[1_1_9rem] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
            <option value="all">All statuses</option>
            {["pending", "approved", "in-progress", "processing", "completed", "rejected", "failed"].map((status) => <option key={status} value={status}>{status.replace("-", " ")}</option>)}
          </select>
          <label className="sr-only" htmlFor="request-role-filter">Requester</label>
          <select id="request-role-filter" value={requesterRole} onChange={(event) => handleRoleChange(event.target.value)} className="min-w-[9rem] flex-[1_1_9rem] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
            <option value="all">All requesters</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <button type="button" onClick={() => setAdvancedFiltersOpen((open) => !open)} aria-expanded={advancedFiltersOpen} aria-controls="request-advanced-filters" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
            <SlidersHorizontal size={16} aria-hidden="true" />
            Advanced filters
            <ChevronDown size={15} aria-hidden="true" className={`transition-transform ${advancedFiltersOpen ? "rotate-180" : ""}`} />
          </button>
          <button type="button" onClick={applyFilters} className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] shadow-sm hover:opacity-90">Apply filters</button>
          <button type="button" onClick={() => { if (selectedIds.size === 0) selectAllVisible(); else clearSelection(); }} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
            {selectedIds.size === 0 ? "Select visible" : `${selectedIds.size} selected`}
          </button>
        </div>

        {advancedFiltersOpen && (
          <div id="request-advanced-filters" className="mt-4 grid min-w-0 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0">
              <label htmlFor="requests-from-date" className="text-xs font-semibold text-slate-600 dark:text-slate-400">From date</label>
              <span className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
                <CalendarDays size={15} className="shrink-0 text-slate-400" aria-hidden="true" />
                <input id="requests-from-date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="min-w-0 w-full bg-transparent py-2 text-sm font-normal text-slate-800 outline-none dark:text-slate-100" />
              </span>
            </div>
            <div className="min-w-0">
              <label htmlFor="requests-to-date" className="text-xs font-semibold text-slate-600 dark:text-slate-400">To date</label>
              <span className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
                <CalendarDays size={15} className="shrink-0 text-slate-400" aria-hidden="true" />
                <input id="requests-to-date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="min-w-0 w-full bg-transparent py-2 text-sm font-normal text-slate-800 outline-none dark:text-slate-100" />
              </span>
            </div>
            <div className="min-w-0">
              <label htmlFor="requests-min-amount" className="text-xs font-semibold text-slate-600 dark:text-slate-400">Minimum amount</label>
              <span className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
                <span className="text-sm font-normal text-slate-400">₦</span>
                <input id="requests-min-amount" type="number" min="0" value={minAmount} onChange={(event) => setMinAmount(event.target.value)} placeholder="No minimum" className="min-w-0 w-full bg-transparent py-2 text-sm font-normal text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100" />
              </span>
            </div>
            <div className="min-w-0">
              <label htmlFor="requests-max-amount" className="text-xs font-semibold text-slate-600 dark:text-slate-400">Maximum amount</label>
              <span className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
                <span className="text-sm font-normal text-slate-400">₦</span>
                <input id="requests-max-amount" type="number" min="0" value={maxAmount} onChange={(event) => setMaxAmount(event.target.value)} placeholder="No maximum" className="min-w-0 w-full bg-transparent py-2 text-sm font-normal text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100" />
              </span>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button type="button" onClick={() => { setActiveStatus("all"); setActiveTab("all"); setSelectedServices([]); setRequesterRole("all"); setSearchTerm(""); setSearchQuery(""); setFromDate(""); setToDate(""); setMinAmount(""); setMaxAmount(""); setPage(1); setFiltersVersion((version) => version + 1); }} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
            <X size={15} aria-hidden="true" /> Clear
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950" role="group" aria-label="Request display">
              <button type="button" aria-pressed={viewMode === "table"} onClick={() => setViewMode("table")} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${viewMode === "table" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-500"}`}>Table</button>
              <button type="button" aria-pressed={viewMode === "cards"} onClick={() => setViewMode("cards")} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${viewMode === "cards" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-500"}`}>Cards</button>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              Rows
              <select aria-label="Rows per page" value={pageSize} onChange={(event) => { const nextSize = Number(event.target.value); setPageSize(nextSize); setPage(1); fetchRequests(1); }} className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                {[12, 25, 50, 100].map((size) => <option key={size} value={size}>{size} / page</option>)}
              </select>
            </label>
          </div>
        </div>
      </section>

      <section aria-label="Service breakdown insights" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button type="button" aria-expanded={insightsOpen} aria-controls="request-insights" onClick={() => setInsightsOpen((open) => !open)} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[var(--accent-focus)] dark:hover:bg-slate-800/60 sm:px-5">
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[rgba(var(--accent-rgb),0.10)] text-[var(--accent-text)]"><BarChart3 size={18} aria-hidden="true" /></span>
            <span className="min-w-0">
              <span className="block font-semibold text-slate-900 dark:text-white">Service breakdown insights</span>
              <span className="mt-1 block text-xs text-slate-600 dark:text-slate-400">{analytics.services.length} services · volume, request value and completion</span>
            </span>
          </span>
          <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-slate-500 transition-transform ${insightsOpen ? "rotate-180" : ""}`} />
        </button>
        {insightsOpen && (
          <div id="request-insights" className="space-y-4 border-t border-slate-100 p-4 dark:border-slate-800 sm:p-5">
            <p className="text-sm text-slate-600 dark:text-slate-400">Performance for the current filters, across all matching requests rather than only this page.</p>
            {topServices.length > 0 ? (
              <div className={`grid min-w-0 gap-4 ${lowerVolumeServices.length ? "lg:grid-cols-2" : ""}`}>
                <ServicePerformanceCard title="Highest request volume" description="Services with the most matching requests" services={topServices} icon={BarChart3} formatAmount={formatAmount} />
                {!!lowerVolumeServices.length && <ServicePerformanceCard title="Lower request volume" description="Services with fewer matching requests" services={lowerVolumeServices} icon={SlidersHorizontal} formatAmount={formatAmount} />}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">No service breakdown is available for the current filters.</p>
            )}
          </div>
        )}
      </section>

      {loading ? (
        <div className="flex items-center justify-center rounded-3xl border border-dashed border-slate-300 p-10 text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
            <span>Loading requests...</span>
          </div>
        </div>
      ) : displayedRequests.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">No requests found</p>
          <p className="mt-2">Try a different filter or search term.</p>
        </div>
      ) : (
        viewMode === 'table' ? (
          <div className="overflow-auto bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800">
            {selectedIds.size > 0 && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>{selectedIds.size} selected</div>
                <div className="flex gap-2">
                  <button onClick={() => performBulkAction('approve')} className="px-3 py-2 rounded-xl bg-emerald-600 text-white">Bulk Approve</button>
                  <button onClick={() => performBulkAction('reject')} className="px-3 py-2 rounded-xl bg-red-600 text-white">Bulk Reject</button>
                  <button onClick={() => { clearSelection(); }} className="px-3 py-2 rounded-xl bg-gray-200">Clear</button>
                </div>
              </div>
            )}
            <table className="w-full min-w-[680px] text-sm text-slate-900 dark:text-slate-100">
              <thead className="text-xs text-slate-500 uppercase bg-slate-100 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3"><input aria-label="Select eligible requests" type="checkbox" onChange={(e) => { if (e.target.checked) selectAllVisible(); else clearSelection(); }} checked={displayedRequests.some((r) => r.pipelineSource !== "agent-job") && displayedRequests.filter((r) => r.pipelineSource !== "agent-job").every((r) => selectedIds.has(r._id))} /></th>
                  <th scope="col" className="px-4 py-3 text-left">
                    <button type="button" onClick={() => { setSortBy("createdAt"); setOrder(order === "asc" ? "desc" : "asc"); fetchRequests(1); }} className="font-semibold hover:text-slate-900 dark:hover:text-white">
                      Created <span aria-hidden="true">{sortBy === "createdAt" ? (order === "asc" ? "↑" : "↓") : ""}</span>
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3">Customer and job</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {displayedRequests.map((r) => (
                  <tr key={r._id} tabIndex={0} aria-label={`Open request for ${getRequestName(r)}: ${getRequestTitle(r)}`} onClick={() => setSelected(r)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(r); } }} className="cursor-pointer border-b border-slate-200 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:border-slate-700 dark:hover:bg-slate-800/70">
                    <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}><input aria-label={`Select request ${r._id}`} type="checkbox" disabled={r.pipelineSource === "agent-job"} checked={selectedIds.has(r._id)} onKeyDown={(event) => event.stopPropagation()} onChange={() => toggleSelect(r._id)} /></td>
                    <td className="px-4 py-4">{formatDateShort(r.createdAt)}</td>
                    <td className="px-4 py-4">
                      <span className="block font-semibold">{getRequestName(r)}</span>
                      <span className="mt-1 block text-xs capitalize text-slate-500 dark:text-slate-400">{getRequestTitle(r)}</span>
                    </td>
                    <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusColors[r.status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {displayedRequests.map(r => (
              <div key={r._id} className={`bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition ${r.status === 'pending' ? 'ring-1 ring-yellow-300 dark:ring-yellow-600' : ''} h-full flex flex-col`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <button type="button" onClick={() => setSelected(r)} className="block max-w-full truncate text-left font-bold text-sm text-blue-600 hover:underline dark:text-blue-400">
                      {getRequestName(r)}
                    </button>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">ID: {r._id.slice(-6)}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase ${statusColors[r.status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>{r.status?.replace('-', ' ') || 'pending'}</span>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase ${serviceColors[r.service || r.serviceType] || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>{getRequestTitle(r)}</span>
                <div className="mt-auto flex gap-2 items-end">
                  <input aria-label={`Select request ${r._id}`} type="checkbox" disabled={r.pipelineSource === "agent-job"} checked={selectedIds.has(r._id)} onChange={() => toggleSelect(r._id)} className="w-4 h-4" />
                  <span className="text-xs text-slate-500">{formatDateShort(r.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <div className="flex justify-center items-center gap-4 mt-10">
        <button disabled={page === 1} onClick={() => { setPage(1); fetchRequests(1); }} className="p-2 rounded-xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50">First</button>
        <button disabled={page === 1} onClick={() => fetchRequests(page - 1)} className="p-2 rounded-xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50"><ChevronLeft /></button>
        <span className="font-bold text-slate-900 dark:text-slate-100">Page {page} of {pages} {approximate ? <span className="text-xs text-slate-500 ml-2">(approx)</span> : null}</span>
        <div className="flex items-center gap-2">
          <label className="text-sm">Jump</label>
          <input type="number" min={1} max={pages} value={page} onChange={(e) => { const v = Math.max(1, Math.min(pages, Number(e.target.value || 1))); setPage(v); fetchRequests(v); }} className="w-16 p-2 rounded-xl border" />
        </div>
        <button disabled={page === pages} onClick={() => fetchRequests(page + 1)} className="p-2 rounded-xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50"><ChevronRight /></button>
        <button disabled={page === pages} onClick={() => { setPage(pages); fetchRequests(pages); }} className="p-2 rounded-xl bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 disabled:opacity-50">Last</button>
      </div>
      {selected && (
        <SlideOver isOpen={!!selected} onClose={() => setSelected(null)} title="Request Details">
          <RequestDetails
            selected={selected}
            modalStatus={modalStatus}
            setModalStatus={setModalStatus}
            modalComment={modalComment}
            setModalComment={setModalComment}
            handleStatusUpdate={handleStatusUpdate}
            setSelected={setSelected}
          />
        </SlideOver>
      )}
      {showJobs && (
        <SlideOver isOpen={showJobs} onClose={() => setShowJobs(false)} title="Background Jobs">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold">Recent Bulk Jobs</h4>
              <div className="flex gap-2">
                <button onClick={fetchJobs} className="px-3 py-2 rounded bg-slate-100">Refresh</button>
                <button onClick={() => setShowJobs(false)} className="px-3 py-2 rounded bg-gray-200">Close</button>
              </div>
            </div>
            {jobs.length === 0 ? (
              <p className="text-sm text-slate-500">No running jobs.</p>
            ) : (
              <div className="space-y-3">
                {jobs.map(job => (
                  <div key={job._id} tabIndex={0} role="button" aria-label={`Bulk job ${job.action} ${job._id}`} onKeyDown={async (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); try { const r = await api.get(`/api/admin/requests/bulk-job/${job._id}`); const full = JSON.stringify(r.data?.data, null, 2); setJobDetails(full); } catch { if (toastError) toastError('Failed to load job details'); } } }} className="p-3 border rounded">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{job.action} — {job._id}</div>
                        <div className="text-xs text-slate-500">Created: {new Date(job.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="text-sm text-right">
                        <div className="font-semibold">{job.status}</div>
                        <div className="text-xs" aria-live="polite">{job.processed || 0}/{job.total || 0}</div>
                      </div>
                    </div>
                    {Array.isArray(job.errors) && job.errors.length > 0 && (
                      <div className="mt-2 text-sm text-red-600">
                        <strong>Errors:</strong>
                        <ul className="list-disc ml-5">
                          {job.errors.slice(0,3).map((e,i) => <li key={i}>{String(e).slice(0,200)}</li>)}
                        </ul>
                      </div>
                    )}
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={async () => { try { const r = await api.get(`/api/admin/requests/bulk-job/${job._id}`); const full = JSON.stringify(r.data?.data, null, 2); setJobDetails(full); } catch { if (toastError) toastError('Failed to load job details'); } }} aria-label={`View details for job ${job._id}`} className="px-2 py-1 rounded bg-slate-100 text-xs">View Details</button>
                      <button type="button" onClick={async () => { try { const r = await api.get(`/api/admin/requests/bulk-job/${job._id}`); const data = r.data?.data || {}; const errors = Array.isArray(data.errors) ? data.errors : []; const csv = errors.map(e => `"${String(e).replace(/"/g,'""')}"`).join('\n'); const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `job_${job._id}_errors.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); if (success) success('Errors downloaded'); } catch { if (toastError) toastError('Failed to download errors'); } }} aria-label={`Download errors for job ${job._id}`} className="px-2 py-1 rounded bg-slate-100 text-xs">Download Errors</button>
                      <button type="button" onClick={async () => { try { const r = await api.get(`/api/admin/requests/bulk-job/${job._id}`); const full = JSON.stringify(r.data?.data, null, 2); await navigator.clipboard.writeText(full); if (success) success('Job data copied'); } catch { if (toastError) toastError('Failed to copy job'); } }} aria-label={`Copy JSON for job ${job._id}`} className="px-2 py-1 rounded bg-slate-100 text-xs">Copy JSON</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {jobDetails && (
              <div className="mt-4 p-3 bg-slate-50 border rounded">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-semibold">Job Details</div>
                  <button onClick={() => setJobDetails(null)} className="px-2 py-1 rounded bg-gray-200">Close</button>
                </div>
                <pre className="text-xs max-h-64 overflow-auto p-2 bg-white border rounded">{jobDetails}</pre>
              </div>
            )}
          </div>
        </SlideOver>
      )}
    </div>
  );
}