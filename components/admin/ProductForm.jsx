import React, { useRef, useState } from "react";
import { cls } from "./helpers";
import { IconChevronLeft, IconTrash } from "./Icons";

/* ── Field wrapper — defined OUTSIDE so React doesn't remount on every keystroke ── */
const Field = ({ label, required, error, hint, children, className = "" }) => (
  <div className={className}>
    {label && (
      <label className="block text-[13px] font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
    )}
    {children}
    {hint && !error && <p className="text-[11px] text-gray-300 mt-1">{hint}</p>}
    {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
  </div>
);

const INP_CLS =
  "w-full h-9 px-3 text-[13px] bg-white border border-gray-200 rounded-md outline-none focus:border-gray-400 transition placeholder:text-gray-300";

const ProductForm = ({
  editingProduct,
  productForm,
  setProductForm,
  formErrors,
  savingProduct,
  handleSaveProduct,
  resetForm,
}) => {
  const categories = ["Bamboo", "Steel", "Menstrual", "Zero Waste", "Other"];
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  /* ── Image helpers ── */
  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) =>
      setProductForm((f) => ({ ...f, image: e.target.result }));
    reader.readAsDataURL(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };
  const onDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = () => setDragging(false);
  const removeImage = () => setProductForm((f) => ({ ...f, image: "" }));

  /* ── Per-field updater (uses callback form to avoid stale closures) ── */
  const update = (key) => (e) =>
    setProductForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="max-w-[720px]">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <button
            onClick={resetForm}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
          >
            <IconChevronLeft />
          </button>
          <h2 className="text-[15px] font-semibold text-[#1A3329]">
            {editingProduct ? "Edit product" : "New product"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetForm}
            className="h-8 px-3 text-[13px] font-medium border border-gray-200 rounded-md hover:bg-gray-50 text-gray-500 transition"
          >
            Discard
          </button>
          <button
            onClick={handleSaveProduct}
            disabled={savingProduct}
            className="h-8 px-4 text-[13px] font-medium bg-[#1A3329] text-white rounded-md hover:bg-[#2F6844] transition disabled:opacity-50"
          >
            {savingProduct
              ? "Saving…"
              : editingProduct
                ? "Save changes"
                : "Add product"}
          </button>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start">
        {/* ─── Left column ─── */}
        <div className="space-y-4">
          {/* Product details */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3.5">
            <Field label="Product name" required error={formErrors.name}>
              <input
                type="text"
                value={productForm.name}
                onChange={update("name")}
                className={cls(INP_CLS, formErrors.name && "border-red-300")}
                placeholder="e.g. Bamboo Toothbrush"
              />
            </Field>

            <Field label="Description" required error={formErrors.description}>
              <textarea
                rows={4}
                value={productForm.description}
                onChange={update("description")}
                className={cls(
                  "w-full px-3 py-2 text-[13px] bg-white border border-gray-200 rounded-md outline-none focus:border-gray-400 transition resize-none placeholder:text-gray-300",
                  formErrors.description && "border-red-300",
                )}
                placeholder="Write a short description about the product…"
              />
            </Field>
          </div>

          {/* Photo */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-[13px] font-medium text-gray-700 mb-3">
              Photo
              {!productForm.image && (
                <span className="text-red-400 ml-0.5">*</span>
              )}
            </p>

            {productForm.image ? (
              <div className="relative group w-full rounded-md overflow-hidden border border-gray-100 bg-gray-50">
                <img
                  src={productForm.image}
                  alt="Product preview"
                  className="w-full h-52 object-contain bg-gray-50"
                  onError={(e) => {
                    e.target.src = "/placeholder.jpg";
                  }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="h-8 px-3 text-[12px] font-medium bg-white rounded-md shadow-sm hover:bg-gray-50 text-gray-700 transition"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="h-8 w-8 flex items-center justify-center bg-white rounded-md shadow-sm hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => fileRef.current?.click()}
                className={cls(
                  "w-full h-44 border-2 border-dashed rounded-md flex flex-col items-center justify-center gap-2 cursor-pointer transition",
                  dragging
                    ? "border-gray-400 bg-gray-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50",
                  formErrors.image && "border-red-300",
                )}
              >
                <svg
                  className="w-8 h-8 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 16V4m0 0l-4 4m4-4l4 4M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4"
                  />
                </svg>
                <p className="text-[13px] text-gray-400">
                  <span className="font-medium text-gray-600">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="text-[11px] text-gray-300">
                  PNG, JPG or JPEG (max 5 MB)
                </p>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                handleFile(e.target.files[0]);
                e.target.value = "";
              }}
            />
            {formErrors.image && !productForm.image && (
              <p className="text-[11px] text-red-500 mt-1.5">
                {formErrors.image}
              </p>
            )}
          </div>

          {/* Pricing */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-[13px] font-medium text-gray-700 mb-3">
              Pricing
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (₹)" required error={formErrors.price}>
                <input
                  type="number"
                  min="1"
                  value={productForm.price}
                  onChange={update("price")}
                  className={cls(INP_CLS, formErrors.price && "border-red-300")}
                  placeholder="0"
                />
              </Field>
              <Field label="Compare at price (₹)" hint="Show as strikethrough">
                <input
                  type="number"
                  min="0"
                  value={productForm.comparePrice}
                  onChange={update("comparePrice")}
                  className={INP_CLS}
                  placeholder="Optional"
                />
              </Field>
            </div>
          </div>

          {/* Inventory */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-[13px] font-medium text-gray-700 mb-3">
              Inventory
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Stock quantity" required error={formErrors.stock}>
                <input
                  type="number"
                  min="0"
                  value={productForm.stock}
                  onChange={update("stock")}
                  className={cls(INP_CLS, formErrors.stock && "border-red-300")}
                  placeholder="0"
                />
              </Field>
              <Field label="SKU" hint="Optional identifier">
                <input
                  type="text"
                  value={productForm.sku}
                  onChange={update("sku")}
                  className={INP_CLS}
                  placeholder="e.g. BT-001"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* ─── Right column ─── */}
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-[13px] font-medium text-gray-700 mb-3">Status</p>
            <div className="space-y-2">
              <label
                className={cls(
                  "flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer transition",
                  productForm.isActive
                    ? "border-[#1A3329] bg-[#1A3329]/5"
                    : "border-gray-200 hover:border-gray-300",
                )}
              >
                <input
                  type="radio"
                  name="visibility"
                  checked={productForm.isActive}
                  onChange={() =>
                    setProductForm((f) => ({ ...f, isActive: true }))
                  }
                  className="accent-[#1A3329]"
                />
                <div>
                  <p className="text-[13px] font-medium text-gray-800">
                    Active
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Visible on the shop
                  </p>
                </div>
              </label>
              <label
                className={cls(
                  "flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer transition",
                  !productForm.isActive
                    ? "border-[#1A3329] bg-[#1A3329]/5"
                    : "border-gray-200 hover:border-gray-300",
                )}
              >
                <input
                  type="radio"
                  name="visibility"
                  checked={!productForm.isActive}
                  onChange={() =>
                    setProductForm((f) => ({ ...f, isActive: false }))
                  }
                  className="accent-[#1A3329]"
                />
                <div>
                  <p className="text-[13px] font-medium text-gray-800">Draft</p>
                  <p className="text-[11px] text-gray-400">
                    Hidden from customers
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Category */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <Field label="Category" required error={formErrors.category}>
              <select
                value={productForm.category}
                onChange={update("category")}
                className={cls(
                  INP_CLS,
                  "cursor-pointer",
                  formErrors.category && "border-red-300",
                )}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Tag */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <Field label="Tag" hint="e.g. Bestseller, New">
              <input
                type="text"
                value={productForm.tag}
                onChange={update("tag")}
                className={INP_CLS}
                placeholder="Optional"
              />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
