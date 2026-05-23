import {
  useEffect,
  useState,
} from "react";

import axios from "axios";
 
const API_BASE =
  "https://xcombinator.onrender.com";

export default function UserRequests() {

  // =========================
  // STATE
  // =========================
  const [requests, setRequests] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const [active, setActive] =
    useState(null);

  const [page, setPage] =
    useState(1);

  const [hasMore, setHasMore] =
    useState(true);

  // =========================
  // SAFE USER
  // =========================
  let user = null;

  try {
    user = JSON.parse(
      localStorage.getItem("user")
    );
  } catch {
    user = null;
  }

  // =========================
  //  api
  // =========================
  const apiRequests = async (
    pageNum = 1,
    append = false
  ) => {

    if (!user?._id && !user?.id) {
      setLoading(false);
      return;
    }

    try {

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const userId =
        user?._id || user?.id;

      const res = await axios.get(
        `${API_BASE}/api/user/requests/${userId}?page=${pageNum}&limit=10`
      );

      const newData =
        res.data?.data || [];

      if (append) {

        setRequests((prev) => [

          ...prev,

          ...newData.filter(
            (item) =>
              !prev.some(
                (p) =>
                  p._id === item._id
              )
          ),

        ]);

      } else {

        setRequests(newData);

      }

      const currentPage =
        res.data?.pagination?.page || 1;

      const totalPages =
        res.data?.pagination?.pages || 1;

      setHasMore(
        currentPage < totalPages
      );

    } catch (err) {

      console.error(
        "REQUEST  api ERROR:",
        err.response?.data ||
        err.message
      );

    } finally {

      setLoading(false);
      setLoadingMore(false);

    }
  };

  // =========================
  // INITIAL LOAD
  // =========================
  useEffect(() => {
     apiRequests(1);
  }, []);

  // =========================
  // LOAD MORE
  // =========================
  const loadMore = async () => {

    if (loadingMore) return;

    const nextPage =
      page + 1;

    setPage(nextPage);

    await  apiRequests(
      nextPage,
      true
    );
  };

  // =========================
  // STATUS STYLE
  // =========================
  const statusStyle = (
    status
  ) => {

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
  // STATUS TEXT
  // =========================
  const statusText = (
    status
  ) => {

    switch (status) {

      case "pending":
        return "⏳ Waiting for Review";

      case "approved":
        return "⚙️ Processing";

      case "completed":
        return "✅ Completed";

      case "rejected":
        return "❌ Rejected";

      default:
        return status;
    }
  };

  // =========================
  // LOADING
  // =========================
  if (loading) {

    return (

      <div className="flex justify-center items-center min-h-[60vh]">

        <div className="text-center">

          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />

          <p className="text-gray-500">
            Loading your requests...
          </p>

        </div>

      </div>

    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">

      {/* HEADER */}
      <div className="mb-8">

        <h1 className="text-3xl font-bold text-[var(--text)]">
          My Requests
        </h1>

        <p className="text-[var(--muted)] mt-2">
          Track your submitted NIN services and processing updates
        </p>

      </div>

      {/* EMPTY */}
      {requests.length === 0 && (

        <div className="card-ui p-10 text-center">

          <div className="text-5xl mb-4">
            📭
          </div>

          <h2 className="text-xl font-semibold mb-2">
            No Requests Yet
          </h2>

          <p className="text-gray-500">
            Your submitted requests will appear here
          </p>

        </div>

      )}

      {/* REQUESTS */}
      <div className="space-y-4">

        {requests.map((r) => (

          <div
            key={r._id}
            onClick={() => setActive(r)}
            className="card-ui p-5 cursor-pointer hover:scale-[1.01] transition-all duration-200"
          >

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

              {/* LEFT */}
              <div>

                <div className="flex items-center gap-2 flex-wrap">

                  <p className="font-bold text-lg capitalize">
                    {r.service}
                  </p>

                  <span className="text-gray-400">
                    •
                  </span>

                  <p className="capitalize text-gray-600">
                    {r.type}
                  </p>

                </div>

                <p className="text-sm text-gray-500 mt-1">
                  {new Date(
                    r.createdAt
                  ).toLocaleString()}
                </p>

                <p className="text-xs text-gray-400 mt-2">
                  NIN: {r.nin}
                </p>

              </div>

              {/* RIGHT */}
              <div className="md:text-right">

                <p className="text-2xl font-bold text-blue-600">
                  ₦{Number(
                    r.amount || 0
                  ).toLocaleString()}
                </p>

                <span
                  className={`inline-block mt-2 text-xs px-3 py-1 rounded-full ${statusStyle(r.status)}`}
                >
                  {statusText(r.status)}
                </span>

              </div>

            </div>

          </div>

        ))}

      </div>

      {/* LOAD MORE */}
      {hasMore && requests.length > 0 && (

        <div className="text-center mt-8">

          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="btn-primary"
          >

            {loadingMore
              ? "Loading..."
              : "Load More"}

          </button>

        </div>

      )}

      {/* ========================= */}
      {/* MODAL */}
      {/* ========================= */}
      {active && (

        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4">

          <div className="bg-[var(--card)] text-[var(--text)] rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl">

            {/* HEADER */}
            <div className="sticky top-0 bg-[var(--card)] border-b border-[var(--border)] p-5 flex justify-between items-center z-10">

              <div>

                <h2 className="text-2xl font-bold capitalize">
                  {active.service}
                </h2>

                <p className="text-sm text-gray-500 capitalize">
                  {active.type}
                </p>

              </div>

              <button
                onClick={() => setActive(null)}
                className="w-10 h-10 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition"
              >
                ✕
              </button>

            </div>

            {/* BODY */}
            <div className="p-6 space-y-6">

              {/* STATUS */}
              <div className="flex items-center justify-between flex-wrap gap-3">

                <span
                  className={`px-4 py-2 rounded-full text-sm font-medium ${statusStyle(active.status)}`}
                >
                  {statusText(active.status)}
                </span>

                <p className="font-bold text-2xl text-blue-600">
                  ₦{Number(
                    active.amount || 0
                  ).toLocaleString()}
                </p>

              </div>

              {/* DETAILS */}
              <div className="grid md:grid-cols-2 gap-4">

                <Detail
                  label="NIN"
                  value={active.nin}
                />

                <Detail
                  label="Service"
                  value={active.service}
                />

                <Detail
                  label="Type"
                  value={active.type}
                />

                <Detail
                  label="Created"
                  value={new Date(
                    active.createdAt
                  ).toLocaleString()}
                />

              </div>

              {/* FORM DATA */}
              {active.formData &&
                Object.keys(
                  active.formData
                ).length > 0 && (

                <div>

                  <h3 className="font-bold text-lg mb-4">
                    Submitted Information
                  </h3>

                  <div className="grid md:grid-cols-2 gap-3">

                    {Object.entries(
                      active.formData
                    ).map(([k, v]) => (

                      <div
                        key={k}
                        className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl"
                      >

                        <p className="text-xs text-gray-500 capitalize">
                          {k}
                        </p>

                        <p className="font-medium break-words">
                          {String(v)}
                        </p>

                      </div>

                    ))}

                  </div>

                </div>

              )}

              {/* TIMELINE */}
              {active.statusHistory?.length > 0 && (

                <div>

                  <h3 className="font-bold text-lg mb-4">
                    Progress Timeline
                  </h3>

                  <div className="space-y-4">

                    {active.statusHistory.map(
                      (s, i) => (

                      <div
                        key={i}
                        className="flex gap-4"
                      >

                        <div className="w-3 h-3 bg-blue-600 rounded-full mt-2" />

                        <div>

                          <p className="font-semibold capitalize">
                            {s.status}
                          </p>

                          <p className="text-sm text-gray-500">
                            {s.note}
                          </p>

                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(
                              s.date
                            ).toLocaleString()}
                          </p>

                        </div>

                      </div>

                    ))}

                  </div>

                </div>

              )}

              {/* COMMENTS */}
              {active.comments?.length > 0 && (

                <div>

                  <h3 className="font-bold text-lg mb-4">
                    Conversation
                  </h3>

                  <div className="space-y-3">

                    {active.comments.map(
                      (c, i) => (

                      <div
                        key={i}
                        className={`p-4 rounded-2xl ${
                          c.role === "admin"
                            ? "bg-gray-100 dark:bg-gray-800"
                            : "bg-blue-100 text-blue-900"
                        }`}
                      >

                        <p className="text-xs font-bold mb-1">
                          {c.by}
                        </p>

                        <p className="text-sm">
                          {c.text}
                        </p>

                      </div>

                    ))}

                  </div>

                </div>

              )}

              {/* PAYMENT PROOF */}
              {active.proof && (

                <div>

                  <h3 className="font-bold text-lg mb-4">
                    Payment Proof
                  </h3>

                  <img
                    src={active.proof}
                    alt="proof"
                    className="w-full rounded-2xl border"
                  />

                </div>

              )}

              {/* RESULT */}
              {active.status === "completed" &&
                active.resultSlip && (

                <a
                  href={active.resultSlip}
                  download
                  className="block text-center btn-primary"
                >
                  📥 Download Result Slip
                </a>

              )}

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

// =========================
// DETAIL COMPONENT
// =========================
function Detail({
  label,
  value,
}) {

  return (

    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">

      <p className="text-xs text-gray-500 mb-1">
        {label}
      </p>

      <p className="font-semibold break-words">
        {value || "-"}
      </p>

    </div>

  );
}