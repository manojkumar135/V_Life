"use client";
import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import { useRouter } from "next/navigation";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import axios from "axios";
import Loader from "@/components/common/loader";
import { useVLife } from "@/store/context";
import StatusModal from "@/components/common/statusModal"; // ✅ same as groups
import ShowToast from "@/components/common/Toast/toast"


interface Role {
  _id: string;
  role_id: string;
  role_name: string;
  description?: string;
  role_status: "active" | "inactive" | string;
}

export default function RolesPage() {
  const { user } = useVLife();
  const router = useRouter();
  const { query, setQuery, debouncedQuery } = useSearch();
  const [rolesData, setRolesData] = useState<Role[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const API_URL = "/api/roles-operations";

  // ✅ modal states
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selected, setSelected] = useState<{
    id: string;
    status: string;
    row: Role;
  } | null>(null);

  // Fetch roles
  const fetchRoles = useCallback(
    async (search: string) => {
      try {
        setLoading(true);
        const { data } = await axios.get(API_URL, {
          params: { search },
        });
        setRolesData(data.data || []);
        setTotalItems(data.data?.length || 0);
      } catch (error) {
        console.error("Error fetching roles:", error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!user?.user_id) return;
    fetchRoles(debouncedQuery);
  }, [debouncedQuery, user?.user_id, fetchRoles]);

  // Ask before toggling status
  const handleStatusClick = (id: string, status: string, row: Role) => {
    setSelected({ id, status, row });
    setIsStatusModalOpen(true);
  };

  // Confirm status change
 const confirmStatusChange = async () => {
  if (!selected) return;
  try {
    setLoading(true);

    const { id, status, row } = selected;
    const res = await axios.put(API_URL, {
      id, // Mongo ObjectId
      role_id: row.role_id, // business key
      role_status: status === "active" ? "inactive" : "active", // toggle
    });

    if (res.data.success) {
      setRolesData((prev) =>
        prev.map((r) =>
          r._id === id ? { ...r, role_status: res.data.data.role_status } : r
        )
      );

      // 🎉 Success toast
      ShowToast.success(
        `Role ${row.role_name} status updated to ${res.data.data.role_status}`
      );
    } else {
      // ⚠️ Fallback toast
      ShowToast.error(res.data.message || "Failed to update role status");
    }
  } catch (error: any) {
    console.error("Error updating role status:", error);
    ShowToast.error(
      error.response?.data?.message || "Error updating role status"
    );
  } finally {
    setSelected(null);
    setLoading(false);
  }
};

  const columns = [
    { field: "role_id", headerName: "Role ID", flex: 1 },
    { field: "role_name", headerName: "Role Name", flex: 1 },
    { field: "description", headerName: "Description", flex: 2 },
    { field: "role_status", headerName: "Status", flex: 1 },
  ];

  const {
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    startItem,
    endItem,
  } = usePagination({
    totalItems,
    itemsPerPage: 14,
    onPageChange: () => {},
  });

  const handleAddRole = () => {
    router.push("/administration/roles/addrole");
  };

  const onBack = () => {
    router.push("/administration");
  };

  return (
    <Layout>
      <div className=" max-md:px-4 p-4 w-full max-w-[99%] mx-auto -mt-5">
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        <HeaderWithActions
          title="Roles"
          search={query}
          setSearch={setQuery}
          showAddButton
          showBack
          onBack={onBack}
          addLabel="+ ADD ROLE"
          onAdd={handleAddRole}
          showPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          startItem={startItem}
          endItem={endItem}
          onNext={nextPage}
          onPrev={prevPage}
        />

        {/* Table */}
        <Table
          columns={columns}
          rows={rolesData.slice((currentPage - 1) * 14, currentPage * 14)}
          rowIdField="_id"
          pageSize={14}
          statusField="role_status"
          onIdClick={(id) => router.push(`/administration/roles/editrole/${id}`)}
          onStatusClick={handleStatusClick}
          checkboxSelection
          onRowClick={(row) => console.log("Role clicked:", row)}
        />

        {/* ✅ Reusable Status Modal */}
        <StatusModal
          isOpen={isStatusModalOpen}
          setIsOpen={setIsStatusModalOpen}
          currentStatus={selected?.status === "active" ? "active" : "inactive"}
          selected={selected}
          onConfirm={confirmStatusChange}
          idKey="role_id" // ✅ will display role_id in modal
        />
      </div>
    </Layout>
  );
}
