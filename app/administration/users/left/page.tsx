"use client";
import React, { useCallback, useState } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import { FaTrash, FaEdit } from "react-icons/fa";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import { useRouter } from "next/navigation";


const usersData = [
  {
    id: 1,
    name: "Aarav Sharma",
    contact: "1234567890",
    email: "aarav.sharma@example.com",
    role: "Manager",
  },
  {
    id: 2,
    name: "Neha Patel",
    contact: "2345678901",
    email: "neha.patel@example.com",
    role: "Admin",
  },
  {
    id: 3,
    name: "Rahul Gupta",
    contact: "3456789012",
    email: "rahul.gupta@example.com",
    role: "Developer",
  },
  {
    id: 4,
    name: "Priya Singh",
    contact: "4567890123",
    email: "priya.singh@example.com",
    role: "Designer",
  },
  {
    id: 5,
    name: "Vikram Joshi",
    contact: "5678901234",
    email: "vikram.joshi@example.com",
    role: "Manager",
  },
];

export default function LeftTeam() {
    const router = useRouter();

  const columns = [
    { field: "id", headerName: "User ID", flex: 1 },
    { field: "name", headerName: "User Name", flex: 2 },
    { field: "contact", headerName: "Contact", flex: 2 },
    { field: "email", headerName: "Email", flex: 3 },
    { field: "role", headerName: "Role", flex: 2 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params: any) => (
        <div className="flex gap-2 items-center">
          <button className="text-green-600 cursor-pointer ml-5 mt-2 mr-5">
            <FaEdit size={18} />
          </button>
          <button className="text-red-600 cursor-pointer ml-5 mt-2 mr-5">
            <FaTrash size={16} />
          </button>
        </div>
      ),
    },
  ];

  const { query, handleChange } = useSearch();
  const [totalItems, setTotalItems] = useState(usersData.length);

  const handlePageChange = useCallback(
    (page: number, offset: number, limit: number) => {
      // Implement data fetching/pagination logic here if needed
      // For now, we're using static data
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
      <div className="p-6 w-full max-w-6xl mx-auto -mt-5">
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
          rowIdField="id"
          pageSize={10}
          checkboxSelection
          onRowClick={(row) => console.log("User clicked:", row)}
        />
      </div>
    </Layout>
  );
}