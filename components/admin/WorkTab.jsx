import React, { useState, useRef } from "react";
import { cls } from "./helpers";
import { IconPlus, IconEdit, IconTrash, IconSearch, IconX } from "./Icons";

/* ── Image upload helper ── */
const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });

/* ── Work Form Modal ── */
const WorkForm = ({
  form,
  setForm,
  errors,
  saving,
  editing,
  onSave,
  onCancel,
}) => {
  const mainImageRef = useRef(null);
  const galleryRef = useRef(null);

  const handleMainImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }
    const base64 = await toBase64(file);
    setForm({ ...form, image: base64 });
  };

  const handleGalleryImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newImages = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) continue;
      newImages.push(await toBase64(file));
    }
    setForm({ ...form, gallery: [...(form.gallery || []), ...newImages] });
  };

  const removeGalleryImage = (idx) => {
    setForm({
      ...form,
      gallery: form.gallery.filter((_, i) => i !== idx),
    });
  };

  const handleTagInput = (e) => {
    if (e.key === "Enter" && e.target.value.trim()) {
      e.preventDefault();
      const tag = e.target.value.trim();
      if (!form.tags.includes(tag)) {
        setForm({ ...form, tags: [...form.tags, tag] });
      }
      e.target.value = "";
    }
  };

  const removeTag = (idx) => {
    setForm({ ...form, tags: form.tags.filter((_, i) => i !== idx) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100 rounded-t-xl">
          <h3 className="text-lg font-semibold text-gray-900">
            {editing ? "Edit Work" : "Add Work"}
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
              placeholder="Work title"
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
              Short Description
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Brief description…"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:ring-emerald-100 focus:border-emerald-400 transition"
            />
          </div>

          {/* Details */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Details
            </label>
            <textarea
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
              rows={4}
              placeholder="Detailed description of this work…"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:ring-emerald-100 focus:border-emerald-400 transition resize-none"
            />
          </div>

          {/* Results */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Impact & Results
            </label>
            <textarea
              value={form.results}
              onChange={(e) => setForm({ ...form, results: e.target.value })}
              rows={3}
              placeholder="Impact and results of this work…"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:ring-emerald-100 focus:border-emerald-400 transition resize-none"
            />
          </div>

          {/* Main Image */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Main Image
            </label>
            <input
              ref={mainImageRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleMainImage}
            />
            {form.image ? (
              <div className="relative group w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={form.image}
                  alt="Main"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                  <button
                    onClick={() => mainImageRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-white/20 rounded-lg hover:bg-white/30 transition"
                  >
                    Replace
                  </button>
                  <button
                    onClick={() => setForm({ ...form, image: "" })}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-red-500/50 rounded-lg hover:bg-red-500/70 transition"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => mainImageRef.current?.click()}
                className="w-full py-10 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-emerald-300 hover:text-emerald-600 transition flex flex-col items-center gap-2"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                Click to upload main image
              </button>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Or paste an image URL in the field below
            </p>
            <input
              type="text"
              value={
                form.image && !form.image.startsWith("data:") ? form.image : ""
              }
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              placeholder="https://... or /path/to/image.jpg"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-emerald-100 focus:border-emerald-400 transition"
            />
          </div>

          {/* Gallery */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Gallery Photos
            </label>
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleGalleryImages}
            />
            <div className="grid grid-cols-3 gap-2 mb-2">
              {(form.gallery || []).map((img, idx) => (
                <div
                  key={idx}
                  className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden"
                >
                  <img
                    src={img}
                    alt={`Gallery ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeGalleryImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                  >
                    <IconX />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => galleryRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-emerald-300 hover:text-emerald-600 transition"
            >
              + Add Gallery Photos
            </button>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(form.tags || []).map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-50 text-emerald-700 rounded-full"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(idx)}
                    className="text-emerald-400 hover:text-red-500 transition"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Type tag and press Enter"
              onKeyDown={handleTagInput}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-emerald-100 focus:border-emerald-400 transition"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-emerald-100 rounded-full peer peer-checked:bg-emerald-600 transition after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
            </label>
            <span className="text-sm text-gray-600">
              {form.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white flex justify-end gap-3 px-6 py-4 border-t border-gray-100 rounded-b-xl">
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
};

/* ── Main Tab ── */
const WorkTab = ({
  work,
  loading,
  showForm,
  setShowForm,
  editingWork,
  workForm,
  setWorkForm,
  formErrors,
  saving,
  onSave,
  onResetForm,
  onEdit,
  onDelete,
  onSeed,
}) => {
  const [search, setSearch] = useState("");

  const displayed = work.filter((w) =>
    w.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Work / Portfolio</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your project work and portfolio items
          </p>
        </div>
        <div className="flex gap-2">
          {work.length === 0 && (
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
            <IconPlus /> Add Work
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
          placeholder="Search work items…"
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
          <p className="text-gray-400 font-medium">No work items found</p>
          <p className="text-gray-300 text-sm mt-1">
            Add your first portfolio item to get started
          </p>
        </div>
      ) : (
        /* Card Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition group"
            >
              {/* Image */}
              <div className="aspect-video bg-gray-100 overflow-hidden">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">
                      {item.title}
                    </h4>
                    {item.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={cls(
                      "shrink-0 inline-block px-2 py-0.5 text-[10px] rounded font-medium",
                      item.isActive
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {item.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Tags */}
                {item.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-[10px] bg-emerald-50 text-emerald-700 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Gallery count */}
                {item.gallery?.length > 0 && (
                  <p className="text-[10px] text-gray-400 mt-2">
                    📷 {item.gallery.length} gallery photo
                    {item.gallery.length > 1 ? "s" : ""}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 mt-3 pt-2 border-t border-gray-50">
                  <button
                    onClick={() => onEdit(item)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <IconEdit /> Edit
                  </button>
                  <button
                    onClick={() => onDelete(item._id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <IconTrash /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <WorkForm
          form={workForm}
          setForm={setWorkForm}
          errors={formErrors}
          saving={saving}
          editing={!!editingWork}
          onSave={onSave}
          onCancel={onResetForm}
        />
      )}
    </>
  );
};

export default WorkTab;
