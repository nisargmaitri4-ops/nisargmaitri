import React, { useState, useRef, useEffect } from "react";
import ProductForm from "./ProductForm";
import { money, cls } from "./helpers";
import {
  IconSearch,
  IconPlus,
  IconTrash,
  IconBox,
  IconEdit,
  IconEyeOff,
  IconEyeOn,
} from "./Icons";

const ProductsTab = ({
  products,
  displayProducts,
  productLoading,
  productSearch,
  setProductSearch,
  productFilter,
  setProductFilter,
  showProductForm,
  setShowProductForm,
  editingProduct,
  productForm,
  setProductForm,
  formErrors,
  savingProduct,
  handleSaveProduct,
  resetForm,
  openEditForm,
  handleToggleActive,
  setDeleteTarget,
  handleSeedProducts,
}) => {
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setOpenMenu(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (showProductForm) {
    return (
      <ProductForm
        editingProduct={editingProduct}
        productForm={productForm}
        setProductForm={setProductForm}
        formErrors={formErrors}
        savingProduct={savingProduct}
        handleSaveProduct={handleSaveProduct}
        resetForm={resetForm}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">
            <IconSearch />
          </span>
          <input
            type="text"
            placeholder="Search products…"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="w-full h-9 pl-10 pr-3 text-[13px] bg-white border border-gray-200 rounded-md focus:border-gray-400 outline-none transition placeholder:text-gray-300"
          />
        </div>

        <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5 text-[13px]">
          {[
            { val: "all", label: "All" },
            { val: "active", label: "Active" },
            { val: "inactive", label: "Hidden" },
            { val: "outofstock", label: "Out of stock" },
          ].map((f) => (
            <button
              key={f.val}
              onClick={() => setProductFilter(f.val)}
              className={cls(
                "px-3 py-1.5 rounded transition-all font-medium",
                productFilter === f.val
                  ? "bg-white text-[#1A3329] shadow-sm"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowProductForm(true);
          }}
          className="h-9 px-4 text-[13px] font-medium bg-[#1A3329] text-white rounded-md hover:bg-[#2F6844] inline-flex items-center gap-1.5 transition"
        >
          <IconPlus /> Add Product
        </button>

        {products.length === 0 && (
          <button
            onClick={handleSeedProducts}
            className="h-9 px-4 text-[13px] font-medium border border-gray-200 rounded-md hover:bg-gray-50 text-gray-500 transition"
          >
            Import Catalog
          </button>
        )}
      </div>

      {/* Count */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-gray-400">
          {displayProducts.length} product
          {displayProducts.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Loading */}
      {productLoading ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 last:border-0 animate-pulse"
            >
              <div className="w-12 h-12 bg-gray-100 rounded" />
              <div className="flex-1 space-y-1.5">
                <div className="bg-gray-100 rounded h-3.5 w-1/3" />
                <div className="bg-gray-100 rounded h-3 w-1/5" />
              </div>
              <div className="bg-gray-100 rounded h-3.5 w-14" />
            </div>
          ))}
        </div>
      ) : /* Empty */
      displayProducts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg py-20 text-center">
          <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-3 text-gray-300">
            <IconBox />
          </div>
          <p className="text-sm text-gray-500 mb-1">No products found</p>
          <p className="text-xs text-gray-300 mb-4">
            Add your first product to get started
          </p>
          <button
            onClick={() => {
              resetForm();
              setShowProductForm(true);
            }}
            className="text-[13px] font-medium text-[#1A3329] hover:underline"
          >
            + Add product
          </button>
        </div>
      ) : (
        /* Product Table */
        <div
          className="bg-white border border-gray-200 rounded-lg overflow-hidden"
          ref={menuRef}
        >
          {/* Desktop header - hidden on mobile */}
          <div className="hidden md:grid md:grid-cols-[minmax(0,2fr)_100px_80px_80px_100px] gap-4 px-4 py-2.5 border-b border-gray-100 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
            <span>Product</span>
            <span>Price</span>
            <span>Stock</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          {/* Rows */}
          {displayProducts.map((p, idx) => (
            <div
              key={p._id}
              className={cls(
                "group relative",
                idx !== displayProducts.length - 1 && "border-b border-gray-50",
                !p.isActive && "opacity-60",
              )}
            >
              {/* Desktop Row */}
              <div className="hidden md:grid md:grid-cols-[minmax(0,2fr)_100px_80px_80px_100px] gap-4 items-center px-4 py-3 hover:bg-gray-50/50 transition-colors">
                {/* Product info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded bg-gray-50 overflow-hidden border border-gray-100 shrink-0">
                    <img
                      src={p.image}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = "/placeholder.jpg";
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[#1A3329] truncate">
                      {p.name}
                    </p>
                    <p className="text-[12px] text-gray-400 truncate">
                      {p.category}
                      {p.sku ? ` · ${p.sku}` : ""}
                    </p>
                  </div>
                  {p.tag && (
                    <span className="ml-1 text-[10px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0">
                      {p.tag}
                    </span>
                  )}
                </div>

                {/* Price */}
                <div>
                  <p className="text-[13px] font-medium text-[#1A3329] tabular-nums">
                    {money(p.price)}
                  </p>
                  {p.comparePrice > 0 && (
                    <p className="text-[11px] text-gray-300 line-through tabular-nums">
                      {money(p.comparePrice)}
                    </p>
                  )}
                </div>

                {/* Stock */}
                <p
                  className={cls(
                    "text-[13px] tabular-nums",
                    p.stock === 0
                      ? "text-red-500 font-medium"
                      : "text-gray-600",
                  )}
                >
                  {p.stock}
                </p>

                {/* Status */}
                <span
                  className={cls(
                    "inline-flex w-fit text-[11px] font-medium px-2 py-0.5 rounded",
                    p.isActive
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-gray-100 text-gray-400",
                  )}
                >
                  {p.isActive ? "Active" : "Hidden"}
                </span>

                {/* Actions */}
                <div className="flex items-center justify-end gap-0.5">
                  <button
                    onClick={() => openEditForm(p)}
                    title="Edit"
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
                  >
                    <IconEdit />
                  </button>
                  <button
                    onClick={() => handleToggleActive(p)}
                    title={p.isActive ? "Hide" : "Show"}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
                  >
                    {p.isActive ? <IconEyeOff /> : <IconEyeOn />}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(p)}
                    title="Delete"
                    className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition"
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>

              {/* Mobile Card */}
              <div className="md:hidden px-4 py-3">
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded bg-gray-50 overflow-hidden border border-gray-100 shrink-0">
                    <img
                      src={p.image}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = "/placeholder.jpg";
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#1A3329] truncate">
                          {p.name}
                        </p>
                        <p className="text-[12px] text-gray-400">
                          {p.category}
                        </p>
                      </div>
                      <p className="text-[13px] font-medium text-[#1A3329] tabular-nums shrink-0">
                        {money(p.price)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cls(
                            "text-[11px] font-medium px-1.5 py-0.5 rounded",
                            p.isActive
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-gray-100 text-gray-400",
                          )}
                        >
                          {p.isActive ? "Active" : "Hidden"}
                        </span>
                        <span
                          className={cls(
                            "text-[11px]",
                            p.stock === 0 ? "text-red-500" : "text-gray-400",
                          )}
                        >
                          Stock: {p.stock}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => openEditForm(p)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 transition"
                        >
                          <IconEdit />
                        </button>
                        <button
                          onClick={() => handleToggleActive(p)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 transition"
                        >
                          {p.isActive ? <IconEyeOff /> : <IconEyeOn />}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductsTab;
