import React, { useState } from "react";
import { cls } from "./helpers";
import { IconPlus, IconEdit, IconTrash, IconSearch } from "./Icons";

const ICON_OPTIONS = [
  { value: "BarChart4", label: "Chart" },
  { value: "GraduationCap", label: "Education" },
  { value: "Leaf", label: "Leaf / Nature" },
  { value: "Building", label: "Building" },
  { value: "Users", label: "Community" },
  { value: "PenTool", label: "Pen / Creative" },
  { value: "FileCheck", label: "File / Document" },
];

/* ── Form Modal ── */
const ServiceForm = ({
  form,
  setForm,
  errors,
  saving,
  editing,
  onSave,
  onCancel,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">
          {editing ? "Edit Service" : "Add Service"}
        </h3>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="p-6 space-y-5">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Title *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Service title"
            className={cls(
              "w-full px-3 py-2.5 rounded-lg border text-sm transition",
              errors.title
                ? "border-red-300 focus:ring-red-200"
                : "border-gray-200 focus:ring-emerald-100 focus:border-emerald-400"
            )}
          />
          {errors.title && (
            <p className="text-xs text-red-500 mt-1">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Description *
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={5}
            placeholder="Service description..."
            className={cls(
              "w-full px-3 py-2.5 rounded-lg border text-sm transition resize-none",
              errors.description
                ? "border-red-300 focus:ring-red-200"
                : "border-gray-200 focus:ring-emerald-100 focus:border-emerald-400"
            )}
          />
          {errors.description && (
            <p className="text-xs text-red-500 mt-1">{errors.description}</p>
          )}
        </div>

        {/* Icon */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Icon
          </label>
          <select
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:ring-emerald-100 focus:border-emerald-400 transition"
          >
            {ICON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Active toggle */}
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-emerald-100 rounded-full peer peer-checked:bg-emerald-600 transition after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
          </label>
          <span className="text-sm text-gray-600">
            {form.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-5 py-2 text-sm font-medium text-white bg-[#1A3329] hover:bg-[#2F6844] rounded-lg transition disabled:opacity-50"
        >
          {saving ? "Saving…" : editing ? "Update" : "Create"}
        </button>
      </div>
    </div>
  </div>
);

/* ── Main Tab ── */
const ServicesTab = ({
  services,
  loading,
  showForm,
  setShowForm,
  editingService,
  serviceForm,
  setServiceForm,
  formErrors,
  saving,
  onSave,
  onResetForm,
  onEdit,
  onDelete,
  onSeed,
}) => {
  const [search, setSearch] = useState("");

  const displayed = services.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Services</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your service offerings shown on the website
          </p>
        </div>
        <div className="flex gap-2">
          {services.length === 0 && (
            <button
              onClick={onSeed}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1A3329] border border-[#1A3329]/20 hover:bg-[#1A3329]/5 rounded-lg transition"
            >
              Seed Data
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1A3329] hover:bg-[#2F6844] rounded-lg transition"
          >
            <IconPlus /> Add Service
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <IconSearch />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search services…"
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-emerald-400 focus:ring-emerald-100 transition"
        />
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-400 font-medium">No services found</p>
          <p className="text-gray-300 text-sm mt-1">
            Add your first service to get started
          </p>
        </div>
      ) : (
        /* Table */
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Icon
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map((service) => (
                  <tr
                    key={service._id}
                    className="hover:bg-gray-50/50 transition"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900 truncate max-w-xs">
                        {service.title}
                      </p>
                      <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5">
                        {service.description?.slice(0, 80)}…
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-block px-2 py-1 text-xs bg-emerald-50 text-emerald-700 rounded">
                        {
                          ICON_OPTIONS.find((o) => o.value === service.icon)
                            ?.label || service.icon
                        }
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cls(
                          "inline-block px-2 py-1 text-xs rounded font-medium",
                          service.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        )}
                      >
                        {service.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEdit(service)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition"
                          title="Edit"
                        >
                          <IconEdit />
                        </button>
                        <button
                          onClick={() => onDelete(service._id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                          title="Delete"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <ServiceForm
          form={serviceForm}
          setForm={setServiceForm}
          errors={formErrors}
          saving={saving}
          editing={!!editingService}
          onSave={onSave}
          onCancel={onResetForm}
        />
      )}
    </>
  );
};

export default ServicesTab;
