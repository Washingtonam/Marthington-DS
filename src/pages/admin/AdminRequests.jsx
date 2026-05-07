import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = "https://xcombinator.onrender.com";

export default function AdminRequests() {

  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("pending");

  const [selected, setSelected] = useState(null);

  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

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
  // 🚀 FETCH REQUESTS
  // =========================
  const fetchRequests = async () => {

    try {

      setLoading(true);

      const res = await axios.get(
        `${API_BASE}/api/admin/requests?page=${page}&limit=${LIMIT}&status=${filter}`,
        { headers }
      );

      setRequests(res.data?.data || []);

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
  // ✅ APPROVE
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
  // ❌ REJECT
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
  // 👁 OPEN MODAL
  // =========================
  const open = (r) => {

    setSelected(r);

    setNote(
      r.adminNotes || ""
    );
  };

  // =========================
  // 💾 SAVE NOTE
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
  // 💬 COMMENT
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
  // 🎨 STATUS COLORS
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

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* HEADER */}
      <div className="mb-6">

        <h1 className="text-3xl font-bold">
          NIN Service Requests
        </h1>

        <p className="text-gray-500 mt-1">
          Manage and process customer requests
        </p>

      </div>

      {/* FILTERS */}
      <div className="flex gap-3 flex-wrap mb-6">

        {[
          "pending",
          "approved",
          "completed",
          "rejected",
          "all"
        ].map((f) => (

          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            {f.toUpperCase()}
          </button>

        ))}

      </div>

      {/* LOADING */}
      {loading && (
        <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-500">
          Loading requests...
        </div>
      )}

      {/* EMPTY */}
      {!loading && requests.length === 0 && (
        <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-500">
          No requests found
        </div>
      )}

      {/* GRID */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">

        {requests.map((r) => (

          <div
            key={r._id}
            className="bg-white p-5 rounded-2xl shadow border hover:shadow-lg transition"
          >

            {/* TOP */}
            <div className="flex justify-between items-center mb-3">

              <p className="text-xs text-gray-500 truncate">
                {r.userId?.email || "Unknown"}
              </p>

              <span
                className={`text-xs px-2 py-1 rounded-full ${statusStyle(r.status)}`}
              >
                {r.status}
              </span>

            </div>

            {/* DETAILS */}
            <p className="font-semibold text-sm capitalize">
              {r.service} • {r.type}
            </p>

            <p className="text-sm text-gray-500 mt-1">
              ₦{r.amount?.toLocaleString()}
            </p>

            <p className="text-xs text-gray-400 mt-1">
              {new Date(r.createdAt).toLocaleString()}
            </p>

            {/* ACTIONS */}
            <div className="flex gap-2 mt-4">

              <button
                onClick={() => open(r)}
                className="flex-1 bg-black text-white py-2 rounded-xl text-sm"
              >
                View
              </button>

              {r.status === "pending" && (
                <>

                  <button
                    onClick={() => approve(r._id)}
                    disabled={actionLoading === r._id}
                    className={`flex-1 text-white py-2 rounded-xl text-sm ${
                      actionLoading === r._id
                        ? "bg-gray-400"
                        : "bg-green-600"
                    }`}
                  >
                    {actionLoading === r._id
                      ? "..."
                      : "Approve"}
                  </button>

                  <button
                    onClick={() => reject(r._id)}
                    disabled={actionLoading === r._id}
                    className="flex-1 bg-red-600 text-white py-2 rounded-xl text-sm"
                  >
                    Reject
                  </button>

                </>
              )}

            </div>

          </div>

        ))}

      </div>

      {/* PAGINATION */}
      {!loading && pages > 1 && (

        <div className="flex justify-center items-center gap-3 mt-8">

          <button
            disabled={page === 1}
            onClick={() => setPage(prev => prev - 1)}
            className="px-4 py-2 rounded-lg bg-gray-100 disabled:opacity-50"
          >
            Previous
          </button>

          <div className="text-sm font-medium">
            Page {page} of {pages}
          </div>

          <button
            disabled={page === pages}
            onClick={() => setPage(prev => prev + 1)}
            className="px-4 py-2 rounded-lg bg-gray-100 disabled:opacity-50"
          >
            Next
          </button>

        </div>

      )}

      {/* MODAL */}
      {selected && (

        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">

          <div className="bg-white w-full max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto shadow-2xl">

            <div className="p-6">

              {/* HEADER */}
              <div className="flex justify-between items-center mb-4">

                <h2 className="text-2xl font-bold">
                  Request Details
                </h2>

                <button
                  onClick={() => setSelected(null)}
                  className="text-red-500 text-sm"
                >
                  Close
                </button>

              </div>

              {/* BASIC */}
              <div className="space-y-2 text-sm">

                <p>
                  <b>NIN:</b> {selected.nin}
                </p>

                <p>
                  <b>Type:</b> {selected.type}
                </p>

                <p>
                  <b>Status:</b> {selected.status}
                </p>

              </div>

              {/* FORM DATA */}
              <div className="mt-6">

                <h3 className="font-semibold mb-3">
                  Form Data
                </h3>

                <div className="space-y-2">

                  {Object.entries(
                    selected.formData || {}
                  ).map(([k, v]) => (

                    <div
                      key={k}
                      className="bg-gray-50 p-3 rounded-xl text-sm"
                    >
                      <b>{k}:</b> {String(v)}
                    </div>

                  ))}

                </div>

              </div>

              {/* PROOF */}
              {selected.proof && (

                <div className="mt-6">

                  <h3 className="font-semibold mb-2">
                    Payment Proof
                  </h3>

                  <img
                    src={selected.proof}
                    alt="proof"
                    loading="lazy"
                    className="w-full rounded-xl border"
                  />

                </div>

              )}

              {/* PASSPORT */}
              {selected.passport && (

                <div className="mt-6">

                  <h3 className="font-semibold mb-2">
                    Passport Photograph
                  </h3>

                  <img
                    src={selected.passport}
                    alt="passport"
                    loading="lazy"
                    className="w-40 rounded-xl border"
                  />

                </div>

              )}

              {/* NOTES */}
              <div className="mt-6">

                <h3 className="font-semibold mb-2">
                  Admin Notes
                </h3>

                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full border p-3 rounded-xl"
                  rows={4}
                />

                <button
                  onClick={saveNote}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl mt-3"
                >
                  Save Note
                </button>

              </div>

              {/* COMMENTS */}
              <div className="mt-6">

                <h3 className="font-semibold mb-3">
                  Comments
                </h3>

                <div className="space-y-2 max-h-52 overflow-y-auto">

                  {selected.comments?.map((c, i) => (

                    <div
                      key={i}
                      className="bg-gray-100 p-3 rounded-xl text-sm"
                    >
                      <b>{c.by}</b>: {c.text}
                    </div>

                  ))}

                </div>

                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add comment..."
                  className="w-full border p-3 rounded-xl mt-3"
                />

                <button
                  onClick={addComment}
                  className="bg-black text-white px-4 py-2 rounded-xl mt-3"
                >
                  Send Comment
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}