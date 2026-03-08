"use client";
import AdminUserListPage from "@/components/common/AdminUserListPage";

export default function AdminDeactivatedPage() {
  return (
    <AdminUserListPage
      title="Deactivated by Admin"
      apiUrl="/api/admin-deactivated"
      backPath="/administration/users"
      emptyMessage="No admin-deactivated users found"
    />
  );
}