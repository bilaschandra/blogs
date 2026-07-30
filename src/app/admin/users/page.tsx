"use client";

import { useEffect, useState } from "react";
import { useAdminSession } from "@/lib/useAdminSession";

type AdminUser = {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "author";
  createdAt: string;
};

export default function AdminUsersPage() {
  const { user, loading } = useAdminSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "author">("author");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch("/api/admin/users").then(async (res) => {
      if (res.ok) setUsers(await res.json());
    });
  }, [user]);

  if (loading || !user) return null;

  if (user.role !== "admin") {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <p>You don&apos;t have access to this page.</p>
      </main>
    );
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName, password, role }),
    });

    if (res.ok) {
      setUsername("");
      setDisplayName("");
      setPassword("");
      setRole("author");
      const listRes = await fetch("/api/admin/users");
      if (listRes.ok) setUsers(await listRes.json());
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create user");
    }
    setCreating(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-xl font-bold">Users ({users.length})</h1>
      <ul className="mt-6 space-y-2">
        {users.map((u) => (
          <li key={u.id} className="border-b border-gray-200 pb-2">
            <span className="font-semibold">{u.displayName}</span>{" "}
            <span className="text-sm text-gray-500">
              @{u.username} — {u.role}
            </span>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-lg font-bold">Add a user</h2>
      <form onSubmit={createUser} className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-semibold">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold">Display name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "author")}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          >
            <option value="author">Author</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="rounded bg-uber-black px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {creating ? "Creating..." : "Create user"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </main>
  );
}
