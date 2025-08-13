import { toast } from 'sonner';
import type { ReactNode } from 'react';

function toastPromise<T>(
  promise: Promise<T>,
  messages: { loading: string; success: string; error: string }
) {
  return toast.promise(promise, messages);
}

export const showToast = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast.info(message),
  warning: (message: string) => toast.warning(message),
  loading: (message: string) => toast.loading(message),
  custom: (content: ReactNode) => toast(content),
  promise: toastPromise,
};

export default showToast; // 👈 now it has a default export
