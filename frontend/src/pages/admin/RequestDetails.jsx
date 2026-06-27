import React from 'react';
import { Calendar, MessageSquare, Shield } from 'lucide-react';

export default function RequestDetails({
  selected,
  modalStatus,
  setModalStatus,
  modalComment,
  setModalComment,
  handleStatusUpdate,
  fetchRequests,
  page,
  setSelected,
}) {
  if (!selected) return null;

  const getRequestDetails = (request) => {
    const hiddenKeys = ["_id", "__v", "userId", "createdAt", "updatedAt", "statusHistory", "adminComments", "formData", "pipelineSource"];
    if (request.pipelineSource === "cac") {
      return Object.entries(request)
        .filter(([key]) => !hiddenKeys.includes(key))
        .map(([key, value]) => ({ key, value }));
    }
    if (request.formData && Object.keys(request.formData).length > 0) {
      return Object.entries(request.formData).map(([key, value]) => ({ key, value }));
    }
    return Object.entries(request)
      .filter(([key]) => !hiddenKeys.includes(key))
      .map(([key, value]) => ({ key, value }));
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 mt-4">
        <div>
          <p className="text-xs text-slate-500">Requester</p>
          <p className="font-semibold">{selected.userId?.email} <span className="text-sm font-normal">({selected.userId?.role || 'user'})</span></p>
          <p className="text-xs text-slate-500 mt-2">Status</p>
          <p className="font-semibold">{selected.status}</p>
          <p className="text-xs text-slate-500 mt-2">Submitted</p>
          <p className="font-semibold">{new Date(selected.createdAt).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Reference</p>
          <p className="font-semibold">{selected.nin || selected.businessName1 || selected.serviceType || 'N/A'}</p>
          <p className="text-xs text-slate-500 mt-2">Amount</p>
          <p className="font-semibold">{selected.amount || selected.amountCharged || 0}</p>
          <p className="text-xs text-slate-500 mt-2">Pipeline</p>
          <p className="font-semibold">{selected.pipelineSource}</p>
        </div>
      </div>

      <div>
        <h3 className="font-bold mb-2">Request Data</h3>
        {getRequestDetails(selected).length > 0 ? (
          <div className="grid gap-2">
            {getRequestDetails(selected).map(({ key, value }) => (
              <div key={key} className="flex gap-4 items-start">
                <div className="w-40 text-sm text-slate-500">{key}</div>
                <div className="flex-1 text-sm break-words">{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No request data available.</p>
        )}

        {selected.formData && Object.keys(selected.formData).length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold mb-2">Form Data</h4>
            <div className="grid gap-2">
              {Object.entries(selected.formData).map(([k, v]) => (
                <div key={k} className="flex gap-4 items-start">
                  <div className="w-40 text-sm text-slate-500">{k}</div>
                  <div className="flex-1 text-sm break-words">{typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Status Timeline
          </h3>
          {Array.isArray(selected.statusHistory) && selected.statusHistory.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-auto">
              {[...selected.statusHistory].reverse().map((item, idx) => (
                <div key={idx} className={`p-3 rounded-xl border-l-4 bg-gray-50`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold capitalize text-sm">{item.status}</span>
                    <span className="text-xs text-slate-500 ml-2">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  {item.note && <div className="text-sm text-slate-700 ml-6">{item.note}</div>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No status history.</p>
          )}
        </div>

        <div className="mt-6">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Admin Comments
          </h3>
          {Array.isArray(selected.adminComments) && selected.adminComments.length > 0 ? (
            <div className="space-y-3 max-h-48 overflow-auto">
              {[...selected.adminComments].reverse().map((c, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500 font-semibold">{c.authorRole || c.author}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{new Date(c.createdAt).toLocaleString()}</div>
                  <div className="mt-2 text-sm text-slate-700">{c.comment}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No comments yet.</p>
          )}
        </div>

        <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-blue-900">
            <Shield className="w-4 h-4" />
            Resolution Actions
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700">New Status</label>
              <select value={modalStatus} onChange={(e) => setModalStatus(e.target.value)} className="w-full p-3 rounded-xl border border-blue-300 mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="pending">📋 Pending</option>
                <option value="in-progress">⏳ In Progress</option>
                <option value="processing">🔄 Processing</option>
                <option value="approved">✅ Approved</option>
                <option value="completed">🎉 Completed</option>
                <option value="rejected">❌ Rejected</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Comment/Resolution Note
                {modalStatus === 'rejected' && <span className="text-red-600 ml-1">*Required for rejection</span>}
              </label>
              <textarea value={modalComment} onChange={(e) => setModalComment(e.target.value)} placeholder={modalStatus === 'rejected' ? "Explain why this request was rejected..." : "Add a resolution note or comment..."} className="w-full p-3 rounded-xl border border-blue-300 mt-2 h-24 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={async () => {
                if (modalStatus === 'rejected' && (!modalComment || modalComment.trim().length < 5)) {
                  return alert('Please provide a detailed rejection reason (at least 5 characters).');
                }
                const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : {};
                if (selected.status === 'pending' && user.role !== 'super_admin') {
                  return alert('Forbidden: Only Super Admin may modify pending requests.');
                }
                try {
                  await fetchRequests();
                } catch (err) {
                  console.error(err);
                }
              }} className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">Update Status</button>
              <button onClick={() => { setModalStatus(selected.status || "pending"); setModalComment(""); }} className="px-4 py-2 rounded-xl bg-gray-200 text-gray-800 hover:bg-gray-300 transition">Reset</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
