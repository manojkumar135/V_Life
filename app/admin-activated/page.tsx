"use client";
import AdminUserListPage from "@/components/common/AdminUserListPage";

export default function AdminActivatedPage() {
  return (
    <AdminUserListPage
      title="Activated by Admin"
      apiUrl="/api/admin-activated"
      backPath="/administration/users"
      emptyMessage="No admin-activated users found"
    />
  );
}