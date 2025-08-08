"use client";
import React, { useCallback, useState } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import { FaTrash, FaEdit } from "react-icons/fa";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import { useRouter } from "next/navigation";

const rolesData = [
  {
    id: "RL000001",
    name: "Manager",
    description: "For Manager Section",
  },
  {
    id: "RL000002",
    name: "Direct Partner",
    description: "For Direct Partners sections",
  },
  {
    id: "RL000003",
    name: "Left",
    description: "For Left Section",
  },
  {
    id: "RL000004",
    name: "Right",
    description: "For Right Section",
  },
];

export default function RolesPage() {
  const router = useRouter();

  const columns = [
    { field: "id", headerName: "Role ID", flex: 1 },
    { field: "name", headerName: "Role Name", flex: 1 },
    { field: "description", headerName: "Description", flex: 2 },
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
  const [totalItems, setTotalItems] = useState(0);

  const handlePageChange = useCallback(
    (page: number, offset: number, limit: number) => {
      //   fetchData(offset, limit, query);
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
    itemsPerPage: 20,
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
          addLabel="+ ADD ROLE"
          showAddButton
          showBack
          onBack={onBack}
          onAdd={handleAddRole}
          onMore={() => console.log("More options clicked")}
        />

        {/* Table with checkbox selection */}
        <Table
          columns={columns}
          rows={rolesData}
          rowIdField="id"
          pageSize={10}
          checkboxSelection
          onRowClick={(row) => console.log("Row clicked:", row)}
        />
      </div>
    </Layout>
  );
}
