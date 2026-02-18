import React from "react";
import { IconX, IconTrash } from "./Icons";

const DeleteModal = ({
  deleteTarget,
  setDeleteTarget,
  handleDeleteProduct,
}) => {
  if (!deleteTarget) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={() => setDeleteTarget(null)}
      />

      <div className="relative bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden">
        <button
          onClick={() => setDeleteTarget(null)}
          className="absolute top-3 right-3 p-1 rounded-md hover:bg-gray-100 text-gray-400 transition"
        >
          <IconX />
        </button>

        <div className="px-6 pt-6 pb-4">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-500 mb-4">
            <IconTrash />
          </div>
          <h3 className="text-base font-semibold text-[#1A3329] mb-1.5">
            Delete product?
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            <span className="font-medium text-gray-700">
              "{deleteTarget.name}"
            </span>{" "}
            will be permanently removed. This can't be undone.
          </p>
        </div>

        <div className="flex items-center gap-2 px-6 pb-6">
          <button
            onClick={() => setDeleteTarget(null)}
            className="flex-1 h-9 text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => handleDeleteProduct(deleteTarget._id)}
            className="flex-1 h-9 text-sm font-medium rounded-lg bg-red-500 hover:bg-red-600 text-white transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
