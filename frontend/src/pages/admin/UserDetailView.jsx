import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../lib/axios";
import { formatNaira } from "../../lib/currency";
import { Wallet2, Loader2 } from "lucide-react";

export default function UserDetailView() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [fundAction, setFundAction] = useState("add");
  const [fundNote, setFundNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [uRes, hRes] = await Promise.all([
          api.get(`/api/admin/user/${userId}`),
          api.get(`/api/admin/users/${userId}/history`),
        ]);
        setUser(uRes.data.data || null);
        setHistory(hRes.data.data || []);
      } catch (err) {
        console.error("Failed to load user details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [userId]);

  const openFundModal = () => {
    setShowFundModal(true);
    setFundAmount("");
    setFundAction("add");
    setFundNote("");
  };

  const handleFund = async () => {
    if (!fundAmount || Number(fundAmount) <= 0) return;
    setSubmitting(true);
    try {
      const res = await api.post("/api/admin/adjust-funds", {
        userId,
        amount: Number(fundAmount),
        action: fundAction,
        note: fundNote,
      });
      if (res.data?.success) {
        // Refresh user and history
        const [uRes, hRes] = await Promise.all([
          api.get(`/api/admin/user/${userId}`),
          api.get(`/api/admin/users/${userId}/history`),
        ]);
        setUser(uRes.data.data || null);
        setHistory(hRes.data.data || []);
        setShowFundModal(false);
      } else {
        alert(res.data?.message || "Failed to adjust funds");
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error adjusting funds");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) return <div className="p-6">User not found</div>;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">User Audit Profile</h1>
          <p className="text-sm text-slate-500">Detailed activity ledger for {user.email}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-slate-100">Back</button>
          <button onClick={openFundModal} className="px-4 py-2 rounded-lg bg-emerald-600 text-white flex items-center gap-2">
            <Wallet2 size={16} /> Fund Wallet
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-xl border">
          <h3 className="font-semibold mb-4">Profile Summary</h3>
          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <div><strong>Name:</strong> {user.firstName || ''} {user.lastName || ''}</div>
            <div><strong>Email:</strong> {user.email}</div>
            <div><strong>Balance:</strong> {formatNaira((user.walletBalanceKobo || 0) / 100)}</div>
            <div><strong>Registered:</strong> {new Date(user.createdAt).toLocaleString()}</div>
          </div>
        </div>
        <div className="md:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border">
          <h3 className="font-semibold mb-4">Activity Ledger</h3>
          {history.length === 0 ? (
            <div className="text-sm text-slate-500">No activity found for this user.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Date/Time</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Description</th>
                    <th className="px-4 py-2 text-right">Amount (₦)</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-t">
                      <td className="px-4 py-3 text-slate-700">{new Date(h.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-700">{h.type}</td>
                      <td className="px-4 py-3 text-slate-700">{h.description}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${h.amount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {h.amount >= 0 ? '+' : '-'}₦{Math.abs(h.amount).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showFundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl max-w-md w-full border">
            <h3 className="font-semibold mb-4">Fund Wallet - {user.email}</h3>
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm mb-1">Action</label>
                <div className="flex gap-2">
                  <button onClick={() => setFundAction('add')} className={`flex-1 py-2 rounded-lg ${fundAction === 'add' ? 'bg-green-600 text-white' : 'bg-slate-200'}`}>Add</button>
                  <button onClick={() => setFundAction('deduct')} className={`flex-1 py-2 rounded-lg ${fundAction === 'deduct' ? 'bg-red-600 text-white' : 'bg-slate-200'}`}>Deduct</button>
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Amount (₦)</label>
                <input type="number" min="0" step="0.01" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} className="w-full p-3 rounded-lg border" />
              </div>
              <div>
                <label className="block text-sm mb-1">Note (optional)</label>
                <input value={fundNote} onChange={(e) => setFundNote(e.target.value)} className="w-full p-3 rounded-lg border" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowFundModal(false)} className="flex-1 p-3 rounded-lg bg-slate-200">Cancel</button>
              <button onClick={handleFund} disabled={submitting} className={`flex-1 p-3 rounded-lg ${fundAction === 'add' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>{submitting ? 'Processing...' : fundAction === 'add' ? 'Add Funds' : 'Deduct Funds'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
