import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";
import { useToast } from "../../context/ToastContext";
import api from "../../lib/axios";
import { formatNaira } from "../../lib/currency";
import { Edit3, Wallet2 } from "lucide-react";
import SlideOver from "../../components/ui/SlideOver";

export default function UserDetailView() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useUser();
  const { success, error: toastError } = useToast();
  const canFundWallet = currentUser?.role === "super_admin";
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [fundAction, setFundAction] = useState("add");
  const [fundNote, setFundNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", passwordConfirm: "" });
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  const loadUserProfile = useCallback(async () => {
    const [uRes, hRes] = await Promise.all([
      api.get(`/api/admin/user/${userId}`),
      api.get(`/api/admin/users/${userId}/history`),
    ]);
    setUser(uRes.data.data || null);
    setHistory(hRes.data.data || []);
  }, [userId]);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        await loadUserProfile();
      } catch (err) {
        console.error("Failed to load user details:", err);
        toastError(err.response?.data?.message || "Could not load the user audit profile.");
      } finally {
        setLoading(false);
      }
    };
    void fetch();
  }, [loadUserProfile, toastError]);

  const openProfileEditor = () => {
    setProfileForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      phone: user.phone || "",
      password: "",
      passwordConfirm: "",
    });
    setShowProfileEditor(true);
  };

  const handleProfileUpdate = async (event) => {
    event.preventDefault();
    if (profileForm.password && profileForm.password !== profileForm.passwordConfirm) {
      toastError("The password confirmation does not match.");
      return;
    }
    const updates = {
      firstName: profileForm.firstName,
      lastName: profileForm.lastName,
      email: profileForm.email,
      phone: profileForm.phone,
      ...(profileForm.password ? { password: profileForm.password } : {}),
    };
    setProfileSubmitting(true);
    try {
      const response = await api.put(`/api/admin/users/${userId}/profile`, updates);
      setUser(response.data.data || { ...user, ...updates, password: undefined });
      setShowProfileEditor(false);
      success(response.data.message || "User profile updated.");
    } catch (updateError) {
      console.error("Failed to update user profile:", updateError);
      toastError(updateError.response?.data?.message || "Could not update the user profile.");
    } finally {
      setProfileSubmitting(false);
    }
  };

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
        await loadUserProfile();
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
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800">Back</button>
          {canFundWallet && user.role === "user" && (
            <button type="button" onClick={openProfileEditor} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              <Edit3 size={16} aria-hidden="true" /> Edit profile
            </button>
          )}
          {canFundWallet && (
            <button type="button" onClick={openFundModal} className="px-4 py-2 rounded-lg bg-emerald-600 text-white flex items-center gap-2">
              <Wallet2 size={16} /> Fund Wallet
            </button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-xl border">
          <h3 className="font-semibold mb-4">Profile Summary</h3>
          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <div><strong>Name:</strong> {user.firstName || ''} {user.lastName || ''}</div>
            <div><strong>Email:</strong> {user.email}</div>
            <div><strong>WhatsApp:</strong> {user.phone || "Not listed"}</div>
            <div><strong>Account status:</strong> {user.status || "active"} · {user.approvalStatus || "approved"}</div>
            <div><strong>Balance:</strong> {formatNaira((user.walletBalanceKobo || 0) / 100)}</div>
            <div><strong>Registered:</strong> {user.createdAt ? new Date(user.createdAt).toLocaleString() : "—"}</div>
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

      <SlideOver isOpen={showProfileEditor} onClose={() => setShowProfileEditor(false)} title="Edit registered user">
        <form className="space-y-5" onSubmit={handleProfileUpdate}>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
            Update the user’s account identity and WhatsApp contact details. Leave both password fields blank to keep the current password.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">First name
              <input value={profileForm.firstName} onChange={(event) => setProfileForm((current) => ({ ...current, firstName: event.target.value }))} maxLength={100} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="text-sm font-semibold">Last name
              <input value={profileForm.lastName} onChange={(event) => setProfileForm((current) => ({ ...current, lastName: event.target.value }))} maxLength={100} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="text-sm font-semibold">Email address
              <input type="email" required value={profileForm.email} onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))} maxLength={254} autoComplete="email" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="text-sm font-semibold">WhatsApp number
              <input type="tel" value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} maxLength={20} autoComplete="tel" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="text-sm font-semibold">New password
              <input type="password" value={profileForm.password} onChange={(event) => setProfileForm((current) => ({ ...current, password: event.target.value }))} minLength={6} maxLength={128} autoComplete="new-password" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="text-sm font-semibold">Confirm new password
              <input type="password" value={profileForm.passwordConfirm} onChange={(event) => setProfileForm((current) => ({ ...current, passwordConfirm: event.target.value }))} minLength={6} maxLength={128} autoComplete="new-password" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950" />
            </label>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" onClick={() => setShowProfileEditor(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancel</button>
            <button type="submit" disabled={profileSubmitting} className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] disabled:opacity-60">{profileSubmitting ? "Saving…" : "Save profile"}</button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
