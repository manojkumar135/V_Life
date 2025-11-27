"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";

export default function LogoutConfirm({
  isOpen,
  setIsOpen,
  onLogout,
}: {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  onLogout: () => void;
}) {
  return (
    <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/50">
  <DialogPanel className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl border border-gray-200">
    <DialogTitle className="text-center text-[1.2rem] font-[500] text-gray-800">
  Are you sure you want to <span className="text-[1.2rem] font-[550] text-gray-800">Exit</span>?
    </DialogTitle>

    <div className="mt-6 flex justify-center gap-4">
      {/* Confirm */}
      <button
        onClick={() => {
          onLogout();
          setIsOpen(false);
        }}
        className="px-6 py-2 rounded-lg
         bg-gradient-to-r from-[#0C3978] to-[#16B8E4] text-white font-semibold shadow-lg 
          transition-all duration-200 cursor-pointer"
      >
        LOG OUT
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
