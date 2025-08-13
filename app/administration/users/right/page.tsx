"use client";
import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import { FaTrash } from "react-icons/fa";
import { GoPencil } from "react-icons/go";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function RightTeam() {
  const router = useRouter();
  const { query, handleChange } = useSearch();

  const [usersData, setUsersData] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const API_URL = "/api/users-operations"; // Next.js API route

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(API_URL);
      const users = data.data || [];
      setUsersData(users);
      setTotalItems(users.length);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Delete user
  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_URL}?user_id=${id}`);
      setUsersData((prev) => prev.filter((user: any) => user._id !== id));
      setTotalItems((prev) => prev - 1);
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  // Edit user (navigate)
  const handleEdit = (id: string) => {
    router.push(`/administration/users/edituser/${id}`);
  };

  const columns = [
    { field: "user_id", headerName: "User ID", flex: 1 },
    { field: "user_name", headerName: "User Name", flex: 1 },
    { field: "contact", headerName: "Contact", flex: 1 },
    { field: "mail", headerName: "Email", flex: 2 },
    { field: "role", headerName: "Role", flex: 1 },
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
      // Optional: implement server-side pagination here
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

  const handleAddUser = () => {
    router.push("/administration/users/adduser");
  };

  return (
    <Layout>
      <div className="p-6 w-full max-w-[98%] mx-auto -mt-5">
        <HeaderWithActions
          title="Right Team"
          search={query}
          setSearch={handleChange}
          addLabel="+ ADD USER"
          showAddButton
          showBack
          onAdd={handleAddUser}
          onMore={() => console.log("More options clicked")}
        />

        <Table
          columns={columns}
          rows={usersData}
          rowIdField="_id"
          pageSize={10}
          checkboxSelection
          // loading={loading}
          onRowClick={(row) => console.log("User clicked:", row)}
        />
      </div>
    </Layout>
  );
}
