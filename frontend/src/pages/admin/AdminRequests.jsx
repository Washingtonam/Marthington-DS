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
  // FETCH REQUESTS
  // =========================
  const fetchRequests = async () => {

    try {

      setLoading(true);

      const res = await axios.get(
        `${API_BASE}/api/admin/requests?page=${page}&limit=${LIMIT}&status=${filter}`,
        { headers }
      );

      setRequests(
        res.data?.data || []
      );

      setPages(
        res.data?.pagination?.pages || 1
      );

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

      setRequests(prev =>
        prev.map(r =>
          r._id === id
            ? { ...r, status: "approved" }
            : r
        )
      );

      if (selected?._id === id) {
        setSelected(prev => ({
          ...prev,
          status: "approved"
        }));
      }

    } catch (err) {

      console.error(
        "APPROVE ERROR:",
        err.response?.data || err.message
      );

      alert("Approval failed");
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

      setRequests(prev =>
        prev.map(r =>
          r._id === id
            ? { ...r, status: "rejected" }
            : r
        )
      );

      if (selected?._id === id) {
        setSelected(prev => ({
          ...prev,
          status: "rejected"
        }));
      }

    } catch (err) {

      console.error(
        "REJECT ERROR:",
        err.response?.data || err.message
      );

      alert("Rejection failed");
    }

    setActionLoading(null);
  };

  // =========================
  // OPEN MODAL
  // =========================
  const open = (r) => {

    setSelected(r);

    setNote(
      r.adminNotes || ""
    );
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

      alert("Note saved");

    } catch (err) {

      console.error(
        "NOTE ERROR:",
        err.response?.data || err.message
      );

      alert("Failed to save note");
    }
  };

  // =========================
  // COMMENT
  // =========================
  const addComment = async () => {

    if (!comment) return;

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

      alert("Failed to add comment");
    }
  };

  // =========================
  // STATUS STYLE
  // =========================
  const statusStyle = (status) => {

    switch (status) {

      case "pending":
        return "bg-yellow-100 text-yellow-700";

      case "approved":
        return "bg-green-100 text-green-700";

      case "completed":
        return "bg-blue-100 text-blue-700";

      case "rejected":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // =========================
  // STATS
  // =========================
  const pendingCount = requests.filter(
    r => r.status === "pending"
  ).length;

  const approvedCount = requests.filter(
    r => r.status === "approved"
  ).length;

  const completedCount = requests.filter(
    r => r.status === "completed"
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">

      {/* HERO */}
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

            <p className="text-sm text-blue-100 mb-2">
              Active Filter
            </p>

            <h2 className="text-4xl font-bold uppercase">
              {filter}
            </h2>

          </div>

        </div>

      </div>

      {/* STATS */}
      <div className="grid md:grid-cols-3 gap-5 mb-8">

        <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-6 border border-gray-100 dark:border-gray-800">

          <div className="flex justify-between items-center">

            <div>

              <p className="text-sm text-gray-500 mb-2">
                Pending
              </p>

              <h2 className="text-4xl font-bold dark:text-white">
                {pendingCount}
              </h2>

            </div>

            <div className="bg-yellow-100 p-4 rounded-2xl">
              <Clock3 className="text-yellow-700" />
            </div>

          </div>

        </div>

        <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-6 border border-gray-100 dark:border-gray-800">

          <div className="flex justify-between items-center">

            <div>

              <p className="text-sm text-gray-500 mb-2">
                Approved
              </p>

              <h2 className="text-4xl font-bold dark:text-white">
                {approvedCount}
              </h2>

            </div>

            <div className="bg-green-100 p-4 rounded-2xl">
              <BadgeCheck className="text-green-700" />
            </div>

          </div>

        </div>

        <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-6 border border-gray-100 dark:border-gray-800">

          <div className="flex justify-between items-center">

            <div>

              <p className="text-sm text-gray-500 mb-2">
                Completed
              </p>

              <h2 className="text-4xl font-bold dark:text-white">
                {completedCount}
              </h2>

            </div>

            <div className="bg-blue-100 p-4 rounded-2xl">
              <CheckCircle2 className="text-blue-700" />
            </div>

          </div>

        </div>

      </div>

      {/* FILTERS */}
      <div className="flex gap-3 flex-wrap mb-8">

        {[
          "pending",
          "approved",
          "completed",
          "rejected",
          "all",
        ].map((f) => (

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

      {/* LOADING */}
      {loading && (

        <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-10 text-center">

          <p className="text-gray-500 dark:text-gray-400">
            Loading requests...
          </p>

        </div>

      )}

      {/* EMPTY */}
      {!loading && requests.length === 0 && (

        <div className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl p-10 text-center">

          <p className="text-gray-500 dark:text-gray-400">
            No requests found
          </p>

        </div>

      )}

      {/* GRID */}
      {!loading && requests.length > 0 && (

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">

          {requests.map((r) => (

            <div
              key={r._id}
              className="bg-white dark:bg-[#161616] rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800"
            >

              {/* TOP */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white">

                <div className="flex justify-between items-start gap-3">

                  <div>

                    <div className="flex items-center gap-2 mb-2">

                      <div className="bg-white/20 p-2 rounded-xl">
                        <FileText size={18} />
                      </div>

                      <span
                        className={`text-xs px-3 py-1 rounded-full ${statusStyle(r.status)}`}
                      >
                        {r.status}
                      </span>

                    </div>

                    <h2 className="font-semibold text-sm break-all">
                      {r.userId?.email || "Unknown"}
                    </h2>

                  </div>

                </div>

              </div>

              {/* BODY */}
              <div className="p-5">

                <div className="space-y-3 mb-5">

                  <div className="flex justify-between">

                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Service
                    </span>

                    <span className="font-semibold capitalize dark:text-white">
                      {r.service}
                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Type
                    </span>

                    <span className="font-semibold capitalize dark:text-white">
                      {r.type}
                    </span>

                  </div>

                  <div className="flex justify-between">

                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Amount
                    </span>

                    <span className="font-bold text-blue-600">
                      ₦{r.amount?.toLocaleString()}
                    </span>

                  </div>

                </div>

                <p className="text-xs text-gray-400 mb-5">
                  {new Date(r.createdAt).toLocaleString()}
                </p>

                {/* ACTIONS */}
                <div className="flex gap-3">

                  <button
                    onClick={() => open(r)}
                    className="flex-1 bg-black hover:bg-gray-900 text-white py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <Eye size={16} />
                    View
                  </button>

                  {r.status === "pending" && (

                    <>
                      <button
                        onClick={() => approve(r._id)}
                        disabled={actionLoading === r._id}
                        className={`flex-1 py-3 rounded-2xl text-white text-sm font-semibold transition ${
                          actionLoading === r._id
                            ? "bg-gray-400"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        Approve
                      </button>

                      <button
                        onClick={() => reject(r._id)}
                        disabled={actionLoading === r._id}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-2xl text-sm font-semibold transition"
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

      {/* PAGINATION */}
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

      {/* MODAL */}
      {selected && (

        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">

          <div className="bg-white dark:bg-[#111111] w-full max-w-5xl rounded-3xl max-h-[95vh] overflow-y-auto shadow-2xl">

            {/* HEADER */}
            <div className="sticky top-0 bg-white dark:bg-[#111111] border-b border-gray-200 dark:border-gray-800 p-6 z-10">

              <div className="flex justify-between items-center">

                <div>

                  <h2 className="text-3xl font-bold dark:text-white">
                    Request Details
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Full operational overview
                  </p>

                </div>

                <button
                  onClick={() => setSelected(null)}
                  className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-2xl transition"
                >
                  <X size={20} />
                </button>

              </div>

            </div>

            {/* BODY */}
            <div className="p-6">

              {/* USER */}
              <div className="bg-gray-50 dark:bg-[#181818] rounded-3xl p-6 mb-6 border border-gray-100 dark:border-gray-800">

                <div className="flex items-center gap-3 mb-4">

                  <div className="bg-blue-100 p-3 rounded-2xl">
                    <User className="text-blue-700" />
                  </div>

                  <div>

                    <h3 className="font-bold text-lg dark:text-white">
                      Customer Information
                    </h3>

                    <p className="text-sm text-gray-500">
                      Request owner details
                    </p>

                  </div>

                </div>

                <div className="grid md:grid-cols-2 gap-4 text-sm">

                  <div className="bg-white dark:bg-[#111111] rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                    <b className="dark:text-white">Email</b>
                    <p className="text-gray-500 mt-1 break-all">
                      {selected.userId?.email}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-[#111111] rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                    <b className="dark:text-white">NIN</b>
                    <p className="text-gray-500 mt-1">
                      {selected.nin}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-[#111111] rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                    <b className="dark:text-white">Service</b>
                    <p className="text-gray-500 mt-1 capitalize">
                      {selected.service}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-[#111111] rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
                    <b className="dark:text-white">Type</b>
                    <p className="text-gray-500 mt-1 capitalize">
                      {selected.type}
                    </p>
                  </div>

                </div>

              </div>

              {/* FORM DATA */}
              <div className="bg-gray-50 dark:bg-[#181818] rounded-3xl p-6 mb-6 border border-gray-100 dark:border-gray-800">

                <h3 className="font-bold text-lg mb-5 dark:text-white">
                  Submitted Form Data
                </h3>

                <div className="grid md:grid-cols-2 gap-4">

                  {Object.entries(
                    selected.formData || {}
                  ).map(([k, v]) => (

                    <div
                      key={k}
                      className="bg-white dark:bg-[#111111] border border-gray-100 dark:border-gray-800 rounded-2xl p-4"
                    >

                      <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">
                        {k}
                      </p>

                      <p className="text-sm dark:text-white break-words">
                        {String(v)}
                      </p>

                    </div>

                  ))}

                </div>

              </div>

              {/* FILES */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">

                {/* PAYMENT */}
                {selected.proof && (

                  <div className="bg-gray-50 dark:bg-[#181818] rounded-3xl p-6 border border-gray-100 dark:border-gray-800">

                    <h3 className="font-bold text-lg mb-4 dark:text-white">
                      Payment Proof
                    </h3>

                    <img
                      src={selected.proof}
                      alt="proof"
                      onClick={() => setPreviewImage(selected.proof)}
                      className="w-full h-72 object-cover rounded-2xl border cursor-pointer hover:scale-[1.01] transition"
                    />

                  </div>

                )}

                {/* PASSPORT */}
                {selected.passport && (

                  <div className="bg-gray-50 dark:bg-[#181818] rounded-3xl p-6 border border-gray-100 dark:border-gray-800">

                    <h3 className="font-bold text-lg mb-4 dark:text-white">
                      Passport Photograph
                    </h3>

                    <img
                      src={selected.passport}
                      alt="passport"
                      onClick={() => setPreviewImage(selected.passport)}
                      className="w-64 h-64 object-cover rounded-2xl border cursor-pointer hover:scale-[1.01] transition"
                    />

                  </div>

                )}

              </div>

              {/* NOTES */}
              <div className="bg-gray-50 dark:bg-[#181818] rounded-3xl p-6 mb-6 border border-gray-100 dark:border-gray-800">

                <div className="flex items-center gap-3 mb-4">

                  <div className="bg-blue-100 p-3 rounded-2xl">
                    <Save className="text-blue-700" />
                  </div>

                  <div>

                    <h3 className="font-bold text-lg dark:text-white">
                      Admin Notes
                    </h3>

                    <p className="text-sm text-gray-500">
                      Internal processing notes
                    </p>

                  </div>

                </div>

                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={5}
                  className="w-full border border-gray-200 dark:border-gray-700 dark:bg-[#111111] dark:text-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                />

                <button
                  onClick={saveNote}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-semibold transition"
                >
                  Save Note
                </button>

              </div>

              {/* COMMENTS */}
              <div className="bg-gray-50 dark:bg-[#181818] rounded-3xl p-6 border border-gray-100 dark:border-gray-800">

                <div className="flex items-center gap-3 mb-4">

                  <div className="bg-green-100 p-3 rounded-2xl">
                    <MessageSquare className="text-green-700" />
                  </div>

                  <div>

                    <h3 className="font-bold text-lg dark:text-white">
                      Team Comments
                    </h3>

                    <p className="text-sm text-gray-500">
                      Internal discussion thread
                    </p>

                  </div>

                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto mb-4">

                  {selected.comments?.length > 0 ? (

                    selected.comments.map((c, i) => (

                      <div
                        key={i}
                        className="bg-white dark:bg-[#111111] border border-gray-100 dark:border-gray-800 rounded-2xl p-4"
                      >

                        <div className="flex justify-between items-center mb-2">

                          <p className="font-semibold text-sm dark:text-white">
                            {c.by}
                          </p>

                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {c.text}
                        </p>

                      </div>

                    ))

                  ) : (

                    <div className="bg-white dark:bg-[#111111] border border-gray-100 dark:border-gray-800 rounded-2xl p-5 text-sm text-gray-500">
                      No comments yet
                    </div>

                  )}

                </div>

                <div className="flex gap-3">

                  <input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add comment..."
                    className="flex-1 border border-gray-200 dark:border-gray-700 dark:bg-[#111111] dark:text-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <button
                    onClick={addComment}
                    className="bg-black hover:bg-gray-900 text-white px-6 rounded-2xl transition flex items-center gap-2"
                  >
                    <Send size={18} />
                    Send
                  </button>

                </div>

              </div>

            </div>

          </div>

        </div>

      )}

      {/* IMAGE PREVIEW */}
      {previewImage && (

        <div className="fixed inset-0 bg-black/90 z-[100] flex justify-center items-center p-4">

          <div className="relative max-w-5xl w-full">

            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-14 right-0 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-2xl"
            >
              Close
            </button>

            <img
              src={previewImage}
              alt="preview"
              className="w-full max-h-[90vh] object-contain rounded-3xl"
            />

          </div>

        </div>

      )}

    </div>
  );
}

