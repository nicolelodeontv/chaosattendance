"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ToastContainer, type ToastItem } from "@/components/toast";
import { RoleBadge } from "@/components/role-badge";
import type { UserRole } from "@/types/roles";

type Admin = { discordId: string; username: string; createdAt: string; role: UserRole };
type AdminRoleValue = "ADMIN" | "MANAGER";

export function AccessTab({ isOwner }: { isOwner: boolean }) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<AdminRoleValue>("ADMIN");
  const [loading, setLoading] = useState(true);
  const [removeTarget, setRemoveTarget] = useState<Admin | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [removeError, setRemoveError] = useState("");
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  async function load() {
    const res = await fetch("/api/admin/admins");
    const data = await res.json();
    setAdmins(data.admins ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function showToast(message: string) {
    setToasts((current) => [
      ...current,
      { id: window.crypto.randomUUID(), message },
    ]);
  }

  function dismissToast(id: string) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!newId.trim()) return;

    const displayName = newName.trim() || newId.trim();
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discordId: newId.trim(), username: newName.trim(), role: newRole }),
    });

    setNewId("");
    setNewName("");
    setNewRole("ADMIN");
    if (res.ok) {
      showToast(`Admin access granted to ${displayName}`);
    }
    load();
  }

  async function updateAdminRole(admin: Admin, role: AdminRoleValue) {
    try {
      const res = await fetch("/api/admin/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordId: admin.discordId, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Unable to change admin role.");
      }
      await load();
      showToast(`${admin.username} is now a ${role === "MANAGER" ? "Manager" : "Admin"}`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Unable to change admin role.");
      await load();
    }
  }

  function requestRemoveAdmin(admin: Admin) {
    setRemoveTarget(admin);
    setRemoveError("");
  }

  async function removeAdmin(discordId: string) {
    setRemoveLoading(true);
    setRemoveError("");
    try {
      const res = await fetch("/api/admin/admins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Unable to remove admin.");
      }
      await load();
      setRemoveTarget(null);
      showToast("Admin access removed");
    } catch (err: any) {
      setRemoveError(err.message || "Unable to remove admin.");
    } finally {
      setRemoveLoading(false);
    }
  }

  if (loading) return <p className="text-sm text-ink2">Loading…</p>;

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove admin?"
        message={
          <>
            <strong className="font-medium text-ink">{removeTarget?.username}</strong> will lose admin access.
            {removeError && (
              <div className="mt-3 rounded-md border border-red/30 bg-red/5 px-3 py-2.5 text-sm text-red" role="alert" aria-live="assertive">
                {removeError}
              </div>
            )}
          </>
        }
        confirmLabel="Remove"
        variant="danger"
        loading={removeLoading}
        onCancel={() => { if (!removeLoading) { setRemoveTarget(null); setRemoveError(""); } }}
        onConfirm={() => removeTarget ? removeAdmin(removeTarget.discordId) : undefined}
      />
      <div className="max-w-3xl space-y-5">
        <div className="premium-card p-6">
          <div className="flex items-center gap-2">
            <p className="font-display text-sm text-ink">Owner</p>
            <RoleBadge variant="owner" />
          </div>
          <p className="mt-1 text-sm leading-6 text-ink2">
            Owner access is controlled by the OWNER_DISCORD_ID environment variable.
          </p>
        </div>

        <div className="premium-card p-6">
          <p className="mb-3 font-display text-sm text-ink">Admins</p>
          <ul className="mb-4 space-y-2">
            {admins.length === 0 && <li className="text-sm text-ink2">No additional admins yet.</li>}
            {admins.map((a) => (
              <li
                key={a.discordId}
                className="flex flex-col items-stretch gap-3 rounded-lg border border-line bg-panel2/60 px-3 py-2.5 text-sm min-[401px]:flex-row min-[401px]:items-center min-[401px]:justify-between"
              >
                <span className="min-w-0 flex-1 text-ink">
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="data-clip min-w-0 max-w-full font-medium" title={a.username}>{a.username}</span>
                    <RoleBadge variant={a.role} />
                    <span className="data-clip min-w-0 text-ink2" title={a.discordId}>— {a.discordId}</span>
                  </span>
                </span>
                <div className="flex shrink-0 flex-col gap-2 min-[401px]:flex-row min-[401px]:items-center">
                  {isOwner && a.role !== "owner" && (
                    <select
                      aria-label={`Role for ${a.username}`}
                      value={a.role === "manager" ? "MANAGER" : "ADMIN"}
                      onChange={(e) => void updateAdminRole(a, e.target.value as AdminRoleValue)}
                      className="h-9 !min-h-9 rounded-[10px] py-0 text-sm"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Manager</option>
                    </select>
                  )}
                  {isOwner && a.role !== "owner" && <button
                  type="button"
                  onClick={() => requestRemoveAdmin(a)}
                  className="inline-flex h-9 !min-h-9 w-full shrink-0 items-center justify-center rounded-[10px] border border-red/70 bg-red/5 px-3.5 py-0 text-sm font-semibold text-red transition-colors hover:border-red hover:bg-red/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red/30 disabled:cursor-not-allowed disabled:opacity-50 min-[401px]:w-auto"
                  aria-label={`Remove admin access for ${a.username}`}
                >
                  Remove
                  </button>}
                </div>
              </li>
            ))}
          </ul>

          <form onSubmit={addAdmin} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <label htmlFor="access-discord-user-id" className="text-xs text-ink2">Discord user ID</label>
              <input
                id="access-discord-user-id"
                type="text"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                placeholder="123456789012345678"
                className="h-9 !min-h-9 rounded-[10px] py-0"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <label htmlFor="access-admin-label" className="text-xs text-ink2">Label (optional)</label>
              <input
                id="access-admin-label"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Display name"
                className="h-9 !min-h-9 rounded-[10px] py-0"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <label htmlFor="access-admin-role" className="text-xs text-ink2">Role</label>
              <select
                id="access-admin-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AdminRoleValue)}
                className="h-9 !min-h-9 w-full rounded-[10px] py-0 text-sm"
              >
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
              </select>
            </div>
            <button
              type="submit"
              className="premium-button h-9 !min-h-9 rounded-[10px] px-4 py-0 text-sm whitespace-nowrap"
            >
              Add
            </button>
          </form>
          <p className="mt-3 text-xs leading-5 text-ink2">
            Find a Discord user ID: enable Developer Mode in Discord settings, then right-click
            the user and choose "Copy User ID".
          </p>
        </div>
      </div>
    </>
  );
}
