import { useEffect, useState } from "react";
import axios from "axios";
import {
  CheckCircle2,
  XCircle,
  Clock3,
  Eye,
  MessageSquare,
  ShieldCheck,
  FileText,
  User,
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  BadgeCheck,
  X,
} from "lucide-react";

const API_BASE = "https://xcombinator.onrender.com";

export default function AdminRequests() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Stats Counters Trackers
  const [counts, setCounts] = useState({ pending: 0, approved: 0, completed: 0 });

  // =========================
  // PAGINATION
  // =========================
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const LIMIT = 20;

  const headers = {
    email: localStorage.getItem("email"),
  };

  // =========================
  // FETCH REQUESTS & GLOBAL STATS
  // =========================
  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch current targeted pagination filter segment array block
      const res = await axios.get(
        `${API_BASE}/api/admin/requests?page=${page}&limit=${LIMIT}&status=${filter}`,
        { headers }
      );
      setRequests(res.data?.data || []);
      setPages(res.data?.pagination?.pages || 1);

      // 2. Fallback count matrix logic: Calculates distribution gracefully
      if (filter === "all") {
        const rawData = res.data?.data || [];
        setCounts({
          pending: rawData.filter(r => r.status === "pending").length,
          approved: rawData.filter(r => r.status === "approved").length,
          completed: rawData.filter(r => r.status === "completed").length
        });
      } else {
        // If viewing an isolated filtered status page, ensure the active tracker stays filled
        const activeCount = res.data?.data?.length || 0;
        setCounts(prev => ({
          ...prev,
          [filter]: activeCount
        }));
      }

    } catch (err) {
      console.error(
        "FETCH ERROR:",
        err.response?.data || err.message
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [filter, page]);

  // =========================
  // APPROVE
  // =========================
  const approve = async (id) => {
    try {
      setActionLoading(id);
      await axios.post(
        `${API_BASE}/api/admin/requests/${id}/approve`,
        {},
        { headers }
      );

      // Dynamically filter out items that no longer match the current filter state
      setRequests(prev =>
        filter === "all"
          ? prev.map(r => r._id === id ? { ...r, status: "approved" } : r)
          : prev.filter(r => r._id !== id)
      );

      // Adjust counts down on-the-fly to guarantee UI sync
      setCounts(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        approved: prev.approved + 1
      }));

      if (selected?._id === id) {
        setSelected(null); // Safely close details layout to clean active view state
      }
      alert("Submission status updated to APPROVED");
    } catch (err) {
      console.error(
        "APPROVE ERROR:",
        err.response?.data || err.message
      );
      alert("Approval processing encountered an operational halt.");
    }
    setActionLoading(null);
  };

  // =========================
  // REJECT
  // =========================
  const reject = async (id) => {
    try {
      setActionLoading(id);
      await axios.post(
        `${API_BASE}/api/admin/requests/${id}/reject`,
        {},
        { headers }
      );

      // Dynamically remove or update item from UI array mapping
      setRequests(prev =>
        filter === "all"
          ? prev.map(r => r._id === id ? { ...r, status: "rejected" } : r)
          : prev.filter(r => r._id !== id)
      );

      setCounts(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1)
      }));

      if (selected?._id === id) {
        setSelected(null);
      }
      alert("Submission status updated to REJECTED");
    } catch (err) {
      console.error(
        "REJECT ERROR:",
        err.response?.data || err.message
      );
      alert("Rejection execution failed to update status.");
    }
    setActionLoading(null);
  };

  // =========================
  // OPEN MODAL
  // =========================
  const open = (r) => {
    setSelected(r);
    setNote(r.adminNotes || r.note || "");
  };

  // =========================
  // SAVE NOTE
  // =========================
  const saveNote = async () => {
    try {
      await axios.put(
        `${API_BASE}/api/admin/requests/${selected._id}/note`,
        { note },
        { headers }
      );
      alert("Internal operation notes updated successfully.");
    } catch (err) {
      console.error(
        "NOTE ERROR:",
        err.response?.data || err.message
      );
      alert("Failed to save operational notes.");
    }
  };

  // =========================
  // COMMENT
  // =========================
  const addComment = async () => {
    if (!comment.trim()) return;
    try {
      await axios.post(
        `${API_BASE}/api/admin/requests/${selected._id}/comment`,
        {
          text: comment,
          by: headers.email,
        },
        { headers }
      );

      setSelected(prev => ({
        ...prev,
        comments: [
          ...(prev.comments || []),
          {
            text: comment,
            by: headers.email
          }
        ]
      }));
      setComment("");
    } catch (err) {
      console.error(
        "COMMENT ERROR:",
        err.response?.data || err.message
      );
      alert("Could not append group comment.");
    }
  };

  // =========================
  // STATUS STYLE
  // =========================
  const statusStyle = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 font-bold";
      case "approved":
        return "bg-green-100 text-green-700 font-bold";
      case "completed":
        return "bg-blue-100 text-blue-700 font-bold";
      case "rejected":
        return "bg-red-100 text-red-700 font-bold";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">
      {/* HERO SECTION */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-900 rounded-3xl p-8 text-white shadow-2xl mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={20} />
              <span className="uppercase tracking-widest text-sm opacity-80">
                REQUEST OPERATIONS
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-3">
              Service Requests
            </h1>
            <p className="text-blue-100 max-w-2xl">
              Review customer submissions, process approvals,
              inspect uploaded documents, and coordinate operations
              from one unified workspace.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/10 min-w-[260px]">
            <p className="text-sm text-blue-100 mb-2">Active Filter</p>
            <h2 className="text-4xl font-bold uppercase">{filter}</h2>
          </div>
        </div>
      </div>

      {/* GLOBAL STATS ROW */}
      <div className="grid md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-6 border border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 mb-2">Pending Count</p>
              <h2 className="text-4xl font-bold dark:text-white">{counts.pending}</h2>
            </div>
            <div className="bg-yellow-100 p-4 rounded-2xl">
              <Clock3 className="text-yellow-700" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-6 border border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 mb-2">Approved Count</p>
              <h2 className="text-4xl font-bold dark:text-white">{counts.approved}</h2>
            </div>
            <div className="bg-green-100 p-4 rounded-2xl">
              <BadgeCheck className="text-green-700" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-6 border border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 mb-2">Completed Count</p>
              <h2 className="text-4xl font-bold dark:text-white">{counts.completed}</h2>
            </div>
            <div className="bg-blue-100 p-4 rounded-2xl">
              <CheckCircle2 className="text-blue-700" />
            </div>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS TABS */}
      <div className="flex gap-3 flex-wrap mb-8">
        {["pending", "approved", "completed", "rejected", "all"].map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
            className={`px-5 py-3 rounded-2xl text-sm font-semibold transition ${
              filter === f
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white dark:bg-[#161616] dark:text-white border border-gray-200 dark:border-gray-800 hover:shadow-md"
            }`}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* PROCESSING PLUGINS AND LAYOUT CORES */}
      {loading && (
        <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-10 text-center">
          <p className="text-gray-500 dark:text-gray-400 animate-pulse">Querying database engine cluster...</p>
        </div>
      )}

      {!loading && requests.length === 0 && (
        <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-10 text-center">
          <p className="text-gray-500 dark:text-gray-400">No requests found inside this operations query folder.</p>
        </div>
      )}

      {!loading && requests.length > 0 && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {requests.map((r) => (
            <div
              key={r._id}
              className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col justify-between"
            >
              <div>
                {/* CARD TITLE HEADER */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white">
                  <div className="flex justify-between items-start gap-3">
                    <div className="w-full">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="bg-white/20 p-2 rounded-xl">
                          <FileText size={18} />
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full ${statusStyle(r.status)}`}>
                          {r.status}
                        </span>
                      </div>
                      <h2 className="font-semibold text-sm break-all opacity-95">
                        Owner: {r.userId?.email || r.email || "System User"}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* INFORMATION ROWS */}
                <div className="p-5 space-y-3">
                  <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Main Category</span>
                    <span className="font-semibold capitalize dark:text-white">{r.service}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Action Module</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {r.type?.replace(/([A-Z])/g, ' $1')}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total Charged</span>
                    <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                      ₦{r.amount?.toLocaleString() || "0"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 pt-2">
                    Received: {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* ACTION ROW FOOTER */}
              <div className="p-5 pt-0 border-t border-gray-50 dark:border-gray-800 mt-auto">
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => open(r)}
                    className="flex-1 bg-black hover:bg-gray-900 text-white py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <Eye size={16} />
                    View Details
                  </button>

                  {r.status === "pending" && (
                    <>
                      <button
                        onClick={() => approve(r._id)}
                        disabled={actionLoading === r._id}
                        className={`px-3 rounded-2xl text-white text-sm font-semibold transition ${
                          actionLoading === r._id ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => reject(r._id)}
                        disabled={actionLoading === r._id}
                        className="px-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-sm font-semibold transition"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PAGINATION MATRIX BAR */}
      {!loading && pages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-10">
          <button
            disabled={page === 1}
            onClick={() => setPage(prev => prev - 1)}
            className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-gray-800 dark:text-white px-5 py-3 rounded-2xl disabled:opacity-50 flex items-center gap-2"
          >
            <ChevronLeft size={18} />
            Previous
          </button>
          <div className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-semibold">
            Page {page} of {pages}
          </div>
          <button
            disabled={page === pages}
            onClick={() => setPage(prev => prev + 1)}
            className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-gray-800 dark:text-white px-5 py-3 rounded-2xl disabled:opacity-50 flex items-center gap-2"
          >
            Next
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* DETAILED INSPECTOR MODAL WRAPPER */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-[#111111] w-full max-w-5xl rounded-3xl max-h-[95vh] overflow-y-auto shadow-2xl">
            {/* STICKY BAR HEADER */}
            <div className="sticky top-0 bg-white dark:bg-[#111111] border-b border-gray-200 dark:border-gray-800 p-6 z-10">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold dark:text-white">Request Details</h2>
                  <p className="text-sm text-gray-500 mt-1">Full operational data mapping matrix</p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-2xl transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* MODAL WORKSPACE CONTENT */}
            <div className="p-6">
              {/* CORE METADATA CARD */}
              <div className="bg-gray-50 dark:bg-[#181818] rounded-3xl p-6 mb-6 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-100 p-3 rounded-2xl">
                    <User className="text-blue-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg dark:text-white">Customer Profile Records</h3>
                    <p className="text-sm text-gray-500">System account origin</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-white dark:bg-[#111111] rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                    <b className="dark:text-white text-xs uppercase tracking-wider text-gray-400">Account Mail Link</b>
                    <p className="text-gray-700 dark:text-gray-300 mt-1 font-medium break-all">
                      {selected.userId?.email || selected.email || "N/A"}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-[#111111] rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                    <b className="dark:text-white text-xs uppercase tracking-wider text-gray-400">Target Core Identity (NIN)</b>
                    <p className="text-gray-700 dark:text-gray-300 mt-1 font-mono text-base font-semibold tracking-wider">
                      {selected.nin || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* DYNAMIC SUBMITTED DATA DICTIONARY ENGINE */}
              <div className="bg-gray-50 dark:bg-[#181818] rounded-3xl p-6 mb-6 border border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-lg mb-5 dark:text-white">Form Specifications Payload</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(selected.formData || {}).map(([k, v]) => {
                    if (!v) return null;
                    const isUrl = typeof v === "string" && (v.startsWith("http://") || v.startsWith("https://"));
                    const isImage = isUrl && /\.(jpeg|jpg|gif|png|webp)$/i.test(v);
                    const formattedKey = k.replace(/([A-Z])/g, ' $1').trim();

                    return (
                      <div
                        key={k}
                        className="bg-white dark:bg-[#111111] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex flex-col justify-between"
                      >
                        <div>
                          <p className="text-xs uppercase tracking-widest text-gray-400 mb-1 font-bold">
                            {formattedKey}
                          </p>
                          {isImage ? (
                            <img
                              src={v}
                              alt={k}
                              onClick={() => setPreviewImage(v)}
                              className="w-full h-32 object-cover rounded-xl border cursor-pointer hover:opacity-90 transition mt-2"
                            />
                          ) : isUrl ? (
                            <a
                              href={v}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-blue-500 hover:underline break-all block font-medium mt-2"
                            >
                              View Secure Link Document ↗
                            </a>
                          ) : (
                            <p className="text-sm dark:text-white break-words font-semibold mt-1 text-gray-800">
                              {String(v)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* GRAPHICS INSPECTION BOXES */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {selected.proof && (
                  <div className="bg-gray-50 dark:bg-[#181818] rounded-3xl p-6 border border-gray-100 dark:border-gray-800">
                    <h3 className="font-bold text-lg mb-4 dark:text-white">Verification Transfer Slip</h3>
                    <img
                      src={selected.proof}
                      alt="payment status confirmation sheet"
                      onClick={() => setPreviewImage(selected.proof)}
                      className="w-full h-72 object-cover rounded-2xl border cursor-pointer hover:scale-[1.01] transition shadow"
                    />
                  </div>
                )}

                {selected.passport && (
                  <div className="bg-gray-50 dark:bg-[#181818] rounded-3xl p-6 border border-gray-100 dark:border-gray-800">
                    <h3 className="font-bold text-lg mb-4 dark:text-white">Biometric Identity Portrait</h3>
                    <img
                      src={selected.passport}
                      alt="customer portrait biometric"
                      onClick={() => setPreviewImage(selected.passport)}
                      className="w-64 h-64 mx-auto object-cover rounded-2xl border cursor-pointer hover:scale-[1.01] transition shadow"
                    />
                  </div>
                )}
              </div>

              {/* PROCESSING OPERATIONS REMARKS NOTES PANEL */}
              <div className="bg-gray-50 dark:bg-[#181818] rounded-3xl p-6 mb-6 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-100 p-3 rounded-2xl">
                    <Save className="text-blue-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg dark:text-white">Internal Processing Field Memo</h3>
                    <p className="text-sm text-gray-500">Persistent processing logs visibility tracker</p>
                  </div>
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  placeholder="Insert secure validation status logs or verification keys here..."
                  className="w-full border border-gray-200 dark:border-gray-700 dark:bg-[#111111] dark:text-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
                <button
                  onClick={saveNote}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-semibold transition shadow-md"
                >
                  Save Internal Ledger Note
                </button>
              </div>

              {/* ESCALATION TEAM COMMITTED STRINGS SECTION */}
              <div className="bg-gray-50 dark:bg-[#181818] rounded-3xl p-6 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-green-100 p-3 rounded-2xl">
                    <MessageSquare className="text-green-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg dark:text-white">Workspace Operations Thread</h3>
                    <p className="text-sm text-gray-500">Internal cross-team timeline updates</p>
                  </div>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto mb-4 pr-1">
                  {selected.comments?.length > 0 ? (
                    selected.comments.map((c, i) => (
                      <div
                        key={i}
                        className="bg-white dark:bg-[#111111] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <p className="font-bold text-sm text-indigo-600 dark:text-indigo-400">{c.by}</p>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">{c.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white dark:bg-[#111111] border border-gray-100 dark:border-gray-800 rounded-2xl p-5 text-sm text-gray-400 text-center">
                      Workspace thread is currently unlogged. No comments submitted yet.
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Type task timeline remark update..."
                    className="flex-1 border border-gray-200 dark:border-gray-700 dark:bg-[#111111] dark:text-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={addComment}
                    className="bg-black hover:bg-gray-900 text-white px-6 rounded-2xl transition flex items-center gap-2 font-bold"
                  >
                    <Send size={16} />
                    Commit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ENHANCED IMAGE PREVIEW PORTAL LIGHTBOX */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex justify-center items-center p-4 backdrop-blur-md">
          <div className="relative max-w-5xl w-full flex flex-col items-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-14 right-0 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 rounded-2xl shadow-xl z-50 transition"
            >
              Close Media
            </button>
            <img
              src={previewImage}
              alt="biometric document high resolution asset screen view"
              className="w-full max-h-[85vh] object-contain rounded-3xl bg-neutral-900 shadow-2xl border border-neutral-800"
            />
          </div>
        </div>
      )}
    </div>
  );
}