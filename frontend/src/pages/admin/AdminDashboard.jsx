import { useEffect, useState } from "react";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState("");

  const ADMIN_EMAIL = "washingtonamedu@gmail.com";

  // ============================
  // FETCH USERS
  // ============================
  const fetchUsers = async () => {
    const res = await fetch("https://xcombinator.onrender.com/api/admin/users", {
      headers: { email: ADMIN_EMAIL },
    });

    const data = await res.json();
    setUsers(data);
  };

  // ============================
  // FETCH STATS
  // ============================
  const fetchStats = async () => {
    const res = await fetch("https://xcombinator.onrender.com/api/admin/stats", {
      headers: { email: ADMIN_EMAIL },
    });

    const data = await res.json();
    setStats(data);
  };

  // ============================
  // SEARCH USERS
  // ============================
  const handleSearch = async () => {
    if (!search) return fetchUsers();

    const res = await fetch(
      `https://xcombinator.onrender.com/api/admin/users/search?query=${search}`,
      {
        headers: { email: ADMIN_EMAIL },
      }
    );

    const data = await res.json();
    setUsers(data);
  };

  // ============================
  // ACTIONS
  // ============================
  const suspendUser = async (id) => {
    await fetch(`https://xcombinator.onrender.com/api/admin/user/${id}/suspend`, {
      method: "PUT",
      headers: { email: ADMIN_EMAIL },
    });

    fetchUsers();
  };

  const activateUser = async (id) => {
    await fetch(`https://xcombinator.onrender.com/api/admin/user/${id}/activate`, {
      method: "PUT",
      headers: { email: ADMIN_EMAIL },
    });

    fetchUsers();
  };

  const deleteUser = async (id) => {
    if (!confirm("Delete this user?")) return;

    await fetch(`https://xcombinator.onrender.com/api/admin/user/${id}`, {
      method: "DELETE",
      headers: { email: ADMIN_EMAIL },
    });

    fetchUsers();
  };

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* HEADER */}
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* ========================= */}
      {/* STATS */}
      {/* ========================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

        <Card title="Users" value={stats.totalUsers} />
        <Card title="Active" value={stats.activeUsers} />
        <Card title="Suspended" value={stats.suspendedUsers} />
        <Card title="Transactions" value={stats.totalTransactions} />

        <Card title="Revenue" value={`₦${stats.totalRevenue}`} />
        <Card title="Profit" value={`₦${stats.totalProfit}`} />
        <Card title="NIN Sales" value={stats.ninCount} />
        <Card title="BVN Sales" value={stats.bvnCount} />

      </div>

      {/* ========================= */}
      {/* SEARCH */}
      {/* ========================= */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-3 rounded w-full"
        />
        <button
          onClick={handleSearch}
          className="bg-blue-600 text-white px-4 rounded"
        >
          Search
        </button>
      </div>

      {/* ========================= */}
      {/* USER TABLE */}
      {/* ========================= */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm">

          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Name</th>
              <th>Email</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user._id} className="border-t">

                <td className="p-3">
                  {user.firstName} {user.lastName}
                </td>

                <td>{user.email}</td>

                <td>₦{user.balance}</td>

                <td>
                  <span
                    className={`px-2 py-1 rounded text-white text-xs ${
                      user.status === "active"
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  >
                    {user.status}
                  </span>
                </td>

                <td className="space-x-2">

                  {user.status === "active" ? (
                    <button
                      onClick={() => suspendUser(user._id)}
                      className="bg-yellow-500 text-white px-2 py-1 rounded text-xs"
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      onClick={() => activateUser(user._id)}
                      className="bg-green-600 text-white px-2 py-1 rounded text-xs"
                    >
                      Activate
                    </button>
                  )}

                  <button
                    onClick={() => deleteUser(user._id)}
                    className="bg-red-600 text-white px-2 py-1 rounded text-xs"
                  >
                    Delete
                  </button>

                </td>

              </tr>
            ))}
          </tbody>

        </table>
      </div>
    </div>
  );
}

// ============================
// CARD COMPONENT
// ============================
function Card({ title, value }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <p className="text-gray-500 text-sm">{title}</p>
      <h2 className="text-xl font-bold">{value || 0}</h2>
    </div>
  );
}