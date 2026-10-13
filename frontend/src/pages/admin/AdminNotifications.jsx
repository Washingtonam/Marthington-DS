import { useEffect, useState } from "react";
import api from "../../lib/axios";
import {
  Bell,
  CalendarClock,
  Check,
  CircleAlert,
  Clock3,
  Edit3,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";

const emptyNotification = {
  title: "",
  message: "",
  type: "info",
  isActive: false,
  startsAt: "",
  endsAt: "",
  targetType: "global",
  targetValue: "",
  dismissible: true,
  displayMode: "everyVisit",
  priority: 0,
};

const pageTargets = [
  ["/nin-services", "NIMC Services"],
  ["/cac-services", "CAC Services"],
  ["/services/jamb", "JAMB Services"],
  ["/services/cse", "CSE Services"],
];

const serviceTargets = [
  ["/nin-services/validation", "NIN Validation"],
  ["/nin-services/modification", "NIN Modification"],
  ["/nin-services/ipe-clearance", "IPE Clearance"],
  ["/nin-services/personalization", "Personalization"],
  ["/nin-services/selfservice", "NIMC Self-Service"],
];

const toInputDate = (value) => (value ? new Date(value).toISOString().slice(0, 16) : "");

const formatDate = (value) => (value ? new Date(value).toLocaleString() : "No limit");

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [form, setForm] = useState(emptyNotification);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/admin/notifications");
      setNotifications(response.data?.notifications || []);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchNotifications, 0);
    return () => clearTimeout(timer);
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyNotification);
  };

  const updateField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const editNotification = (notification) => {
    setEditingId(notification._id);
    setForm({
      ...emptyNotification,
      ...notification,
      startsAt: toInputDate(notification.startsAt),
      endsAt: toInputDate(notification.endsAt),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveNotification = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      priority: Number(form.priority) || 0,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      targetValue: form.targetType === "global" ? "" : form.targetValue,
    };

    try {
      if (editingId) {
        await api.patch(`/api/admin/notifications/${editingId}`, payload);
      } else {
        await api.post("/api/admin/notifications", payload);
      }
      resetForm();
      await fetchNotifications();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save notification.");
    } finally {
      setSaving(false);
    }
  };

  const toggleNotification = async (id) => {
    try {
      await api.patch(`/api/admin/notifications/${id}/toggle`);
      await fetchNotifications();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to change notification status.");
    }
  };

  const deleteNotification = async (id) => {
    if (!window.confirm("Delete this notification?")) return;
    try {
      await api.delete(`/api/admin/notifications/${id}`);
      if (editingId === id) resetForm();
      await fetchNotifications();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete notification.");
    }
  };

  const targetOptions = form.targetType === "page" ? pageTargets : serviceTargets;

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-20">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
            <Bell size={18} /> Notification Center
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Keep users informed</h1>
          <p className="mt-2 max-w-2xl text-slate-500 dark:text-slate-400">Publish notices that appear at the right moment, globally or on a specific service page.</p>
        </div>
        {editingId && (
          <button onClick={resetForm} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
            <X size={18} /> Cancel edit
          </button>
        )}
      </header>

      {error && <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"><CircleAlert size={18} />{error}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex items-center gap-3"><div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"><Plus size={20} /></div><div><h2 className="text-xl font-bold dark:text-white">{editingId ? "Edit notification" : "Create notification"}</h2><p className="text-sm text-slate-500 dark:text-slate-400">Schedule a message and choose where it belongs.</p></div></div>
        <form onSubmit={saveNotification} className="grid gap-5 md:grid-cols-2">
          <label className="md:col-span-2"><span className="field-label">Title</span><input required maxLength={120} value={form.title} onChange={(event) => updateField("title", event.target.value)} className="field-input" placeholder="Scheduled maintenance" /></label>
          <label className="md:col-span-2"><span className="field-label">Message</span><textarea required maxLength={2000} rows={4} value={form.message} onChange={(event) => updateField("message", event.target.value)} className="field-input" placeholder="Tell users what they need to know..." /></label>
          <label><span className="field-label">Notice type</span><select value={form.type} onChange={(event) => updateField("type", event.target.value)} className="field-input"><option value="info">Information</option><option value="warning">Warning</option><option value="success">Success</option><option value="critical">Critical</option></select></label>
          <label><span className="field-label">Priority</span><input type="number" min="0" max="100" value={form.priority} onChange={(event) => updateField("priority", event.target.value)} className="field-input" /></label>
          <label><span className="field-label">Audience</span><select value={form.targetType} onChange={(event) => { updateField("targetType", event.target.value); updateField("targetValue", ""); }} className="field-input"><option value="global">All pages</option><option value="page">A specific page</option><option value="service">A specific service</option></select></label>
          {form.targetType !== "global" && <label><span className="field-label">Target</span><select required value={form.targetValue} onChange={(event) => updateField("targetValue", event.target.value)} className="field-input"><option value="">Select a target</option>{targetOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
          <label><span className="field-label"><CalendarClock size={15} className="inline" /> Starts at</span><input type="datetime-local" value={form.startsAt} onChange={(event) => updateField("startsAt", event.target.value)} className="field-input" /></label>
          <label><span className="field-label"><Clock3 size={15} className="inline" /> Ends at</span><input type="datetime-local" value={form.endsAt} onChange={(event) => updateField("endsAt", event.target.value)} className="field-input" /></label>
          <label><span className="field-label">Repeat behavior</span><select value={form.displayMode} onChange={(event) => updateField("displayMode", event.target.value)} className="field-input"><option value="everyVisit">Show on every visit</option><option value="oncePerSession">Show once per session</option><option value="oncePerUser">Show once per user</option></select></label>
          <div className="flex items-end gap-5 pb-3"><label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200"><input type="checkbox" checked={form.isActive} onChange={(event) => updateField("isActive", event.target.checked)} /> Publish immediately</label><label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200"><input type="checkbox" checked={form.dismissible} onChange={(event) => updateField("dismissible", event.target.checked)} /> Allow dismissal</label></div>
          <div className="md:col-span-2 flex justify-end"><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}{editingId ? "Save changes" : "Create notification"}</button></div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between"><h2 className="text-xl font-bold dark:text-white">All notifications</h2><span className="text-sm text-slate-500">{notifications.length} total</span></div>
        {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading notifications...</div> : notifications.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700">No notifications created yet.</div> : <div className="grid gap-4">{notifications.map((notification) => <NotificationRow key={notification._id} notification={notification} onEdit={editNotification} onToggle={toggleNotification} onDelete={deleteNotification} />)}</div>}
      </section>
    </div>
  );
}

function NotificationRow({ notification, onEdit, onToggle, onDelete }) {
  const target = notification.targetType === "global" ? "All pages" : notification.targetValue;
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${notification.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{notification.isActive ? "Live" : "Off"}</span><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{target}</span><span className="text-xs text-slate-500">Priority {notification.priority}</span></div><h3 className="text-lg font-bold dark:text-white">{notification.title}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{notification.message}</p><p className="mt-3 text-xs text-slate-500">{formatDate(notification.startsAt)} to {formatDate(notification.endsAt)}</p></div><div className="flex shrink-0 items-center gap-2"><button title={notification.isActive ? "Turn off" : "Turn on"} onClick={() => onToggle(notification._id)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">{notification.isActive ? <EyeOff size={17} /> : <Eye size={17} />}</button><button title="Edit" onClick={() => onEdit(notification)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><Edit3 size={17} /></button><button title="Delete" onClick={() => onDelete(notification._id)} className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:hover:bg-red-950/30"><Trash2 size={17} /></button></div></div></article>;
}
