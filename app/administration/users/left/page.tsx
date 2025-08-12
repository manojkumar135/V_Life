"use client";
import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import { FaTrash, FaEdit } from "react-icons/fa";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function LeftTeam() {
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
      // console.log("Fetched users:", data);
      setUsersData(data.data || []);
      setTotalItems(data.data?.length || 0);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // console.log("Users data:", usersData);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Delete user
  const handleDelete = async (id: number) => {
    try {
      await axios.delete(`${API_URL}?user_id=${id}`);
      setUsersData((prev) => prev.filter((user: any) => user.id !== id));
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
    { field: "mail", headerName: "Email", flex: 1 },
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
            <FaEdit size={18} />
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
      // Here you could implement API pagination if backend supports it
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
          title="Left Team"
          search={query}
          setSearch={handleChange}
          addLabel="+ ADD USER"
          showAddButton
          showBack
          onAdd={handleAddUser}
          onMore={() => console.log("More options clicked")}
        />

        {/* Table with checkbox selection */}
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
