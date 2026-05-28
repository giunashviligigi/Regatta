"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Championship } from "@/lib/types";

export default function AdminDashboard() {
  const router = useRouter();
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", date: "", location: "" });
  const [loading, setLoading] = useState(true);
  const [imagesLink, setImagesLink] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");

  const fetchChampionships = useCallback(async () => {
    const res = await fetch("/api/championships");
    const data = await res.json();
    setChampionships(data);
    setLoading(false);
  }, []);

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/settings");
    if (!res.ok) return;
    const data = await res.json();
    setImagesLink(data.images_link || "");
  }, []);

  useEffect(() => {
    fetchChampionships();
    fetchSettings();
  }, [fetchChampionships, fetchSettings]);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsMessage("");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images_link: imagesLink }),
    });
    setSettingsSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setSettingsMessage(data.error || "Failed to save settings");
      return;
    }
    const data = await res.json();
    setImagesLink(data.images_link || "");
    setSettingsMessage("Images link saved.");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      await fetch(`/api/championships/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/championships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setForm({ name: "", date: "", location: "" });
    setShowForm(false);
    setEditingId(null);
    fetchChampionships();
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this championship and all its events/results?"))
      return;
    await fetch(`/api/championships/${id}`, { method: "DELETE" });
    fetchChampionships();
  }

  async function handleDuplicate(id: number) {
    await fetch(`/api/championships/${id}/duplicate`, { method: "POST" });
    fetchChampionships();
  }

  async function handleToggleLive(c: Championship) {
    await fetch(`/api/championships/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_live: !c.is_live }),
    });
    fetchChampionships();
  }

  function startEdit(c: Championship) {
    setForm({ name: c.name, date: c.date, location: c.location });
    setEditingId(c.id);
    setShowForm(true);
  }

  function cancelForm() {
    setForm({ name: "", date: "", location: "" });
    setShowForm(false);
    setEditingId(null);
  }

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <Link
              href="/"
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              View Site
            </Link>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-gray-800">
            Site Settings
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Set the URL for the Images button on the home page. Leave empty to
            hide the button.
          </p>
          <form onSubmit={handleSaveSettings} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Images link
              </label>
              <input
                type="url"
                value={imagesLink}
                onChange={(e) => setImagesLink(e.target.value)}
                placeholder="https://example.com/photos"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <button
              type="submit"
              disabled={settingsSaving}
              className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-60"
            >
              {settingsSaving ? "Saving..." : "Save Link"}
            </button>
          </form>
          {settingsMessage ? (
            <p className="mt-3 text-sm text-primary-700">{settingsMessage}</p>
          ) : null}
        </section>

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            Championships
          </h2>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800"
            >
              + New Championship
            </button>
          )}
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 rounded-xl bg-white p-6 shadow-sm"
          >
            <h3 className="mb-4 font-semibold text-gray-800">
              {editingId ? "Edit Championship" : "New Championship"}
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="e.g. Dragon Boat Championship"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm({ ...form, date: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                  placeholder="e.g. Poti, Georgia"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800"
              >
                {editingId ? "Save Changes" : "Create"}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading...</div>
        ) : championships.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <p className="text-gray-500">
              No championships yet. Create your first one!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {championships.map((c) => (
              <div
                key={c.id}
                className="rounded-xl bg-white px-6 py-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-800">
                          {c.name}
                        </h3>
                        {c.is_live && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                            <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" />
                            LIVE
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatDate(c.date)} &middot; {c.location}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleToggleLive(c)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                        c.is_live
                          ? "bg-red-50 text-red-600 hover:bg-red-100"
                          : "border border-gray-300 text-gray-500 hover:bg-gray-50"
                      }`}
                      title={c.is_live ? "Turn off live mode" : "Turn on live mode"}
                    >
                      {c.is_live ? "Stop Live" : "Go Live"}
                    </button>
                    <Link
                      href={`/admin/championship/${c.id}`}
                      className="rounded-lg bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100"
                    >
                      Manage Events
                    </Link>
                    <button
                      onClick={() => handleDuplicate(c.id)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                      title="Duplicate championship as template"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => startEdit(c)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
