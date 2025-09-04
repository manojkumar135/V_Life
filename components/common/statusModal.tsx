"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";

interface StatusConfirmProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  onConfirm: () => void;
  currentStatus: "active" | "inactive";
  selectedUser: { id: string; status: string; row: any } | null; // ✅ added
}

export default function StatusConfirm({
  isOpen,
  setIsOpen,
  onConfirm,
  currentStatus,
  selectedUser, // ✅ destructured
}: StatusConfirmProps) {
  const nextStatus = currentStatus === "active" ? "Inactive" : "Active";

  return (
    <Dialog
      open={isOpen}
      onClose={() => setIsOpen(false)}
      className="relative z-50"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm "
        aria-hidden="true"
      />

      <div className="fixed inset-0 flex items-center justify-center p-4 ">
        <DialogPanel className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-gray-200">
          {/* <DialogTitle className="text-center text-lg font-semibold text-gray-800">
            Change Status
          </DialogTitle> */}
          <p className="text-center text-gray-600 mt-2">
            Are you sure to set this user with User ID{" "}
            <span className="font-bold text-blue-600 ">
              "{selectedUser?.row.user_id}"
            </span>{" "}
            as{" "}
            <span
              className={`font-bold ${
                nextStatus === "Active" ? "text-green-600" : "text-red-600"
              }`}
            >
              {nextStatus}
            </span>
            ?
          </p>

          <div className="mt-6 flex justify-center gap-4">
            {/* Confirm */}
            <button
              onClick={() => {
                onConfirm();
                setIsOpen(false);
              }}
              className={`px-6 py-2 rounded-lg font-semibold shadow-lg transition-all duration-200 cursor-pointer
                ${
                  nextStatus === "Active"
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-500"
                    : "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-500"
                }`}
            >
              {nextStatus.toUpperCase()}
            </button>

            {/* Cancel */}
            <button
              onClick={() => setIsOpen(false)}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-gray-400 to-gray-300 text-gray-800 font-semibold shadow-lg
               hover:from-gray-300 hover:to-gray-400 transition-all duration-200 cursor-pointer"
            >
              CANCEL
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
