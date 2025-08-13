"use client";
import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import { FaTrash } from "react-icons/fa";
import { GoPencil } from "react-icons/go";
import { useRouter } from "next/navigation";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import axios from "axios";

export default function RolesPage() {
  const router = useRouter();
  const { query, handleChange } = useSearch();
  const [rolesData, setRolesData] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const API_URL = "/api/roles-operations"; // Change this to your actual API route

  // Fetch roles
  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(API_URL);
      setRolesData(data.data || []);
      setTotalItems(data.data?.length || 0);
    } catch (error) {
      console.error("Error fetching roles:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Delete role
  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_URL}?role_id=${id}`);
      setRolesData((prev) => prev.filter((role: any) => role._id !== id));
      setTotalItems((prev) => prev - 1);
    } catch (error) {
      console.error("Error deleting role:", error);
    }
  };

  // Edit role
  const handleEdit = (id: string) => {
    router.push(`/administration/roles/editrole/${id}`);
  };

  const columns = [
    { field: "role_id", headerName: "Role ID", flex: 1 },
    { field: "role_name", headerName: "Role Name", flex: 1 },
    { field: "description", headerName: "Description", flex: 2 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params: any) => (
        <div className="flex gap-2 items-center">
          <button
            className="text-green-600 cursor-pointer ml-5 mt-2 mr-5"
            onClick={() => handleEdit(params.row._id)}
          >
            <GoPencil size={18} />
          </button>
          <button
            className="text-red-600 cursor-pointer ml-5 mt-2 mr-5"
            onClick={() => handleDelete(params.row._id)}
          >
            <FaTrash size={16} />
          </button>
        </div>
      ),
    },
  ];

  const handlePageChange = useCallback(
    (page: number, offset: number, limit: number) => {
      // Optional: Implement API pagination if backend supports it
    },
    [query]
  );

  const {
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    startItem,
    endItem,
    isFirstPage,
    isLastPage,
  } = usePagination({
    totalItems,
    itemsPerPage: 10,
    onPageChange: handlePageChange,
  });

  const handleAddRole = () => {
    router.push("/administration/roles/addrole");
  };

  const onBack = () => {
    router.push("/administration");
  };

  return (
    <Layout>
      <div className="p-6 w-full max-w-[98%] mx-auto -mt-5">
        <HeaderWithActions
          title="Roles"
          search={query}
          setSearch={handleChange}
          showAddButton
          showBack
          onBack={onBack}
          addLabel="+ ADD ROLE"
          onAdd={handleAddRole}
          onMore={() => console.log("More options clicked")}
        />

        {/* Table with checkbox selection */}
        <Table
          columns={columns}
          rows={rolesData}
          rowIdField="_id"
          pageSize={10}
          checkboxSelection
          // loading={loading}
          onRowClick={(row) => console.log("Role clicked:", row)}
        />
      </div>
    </Layout>
  );
}
