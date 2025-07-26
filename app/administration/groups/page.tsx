"use client";
import React, { useCallback, useState } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import { FaTrash } from "react-icons/fa";
import { GoPencil } from "react-icons/go";

import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";

const groupsData = [
  {
    id: "GP000001",
    name: "Group 1",
    roles: "Manager , Direct Partners",
  },
  {
    id: "GP000002",
    name: "Group 2",
    roles: "Admin , Staff",
  },
  {
    id: "GP000003",
    name: "Group 3",
    roles: "Manager , Admin",
  },
  {
    id: "GP000004",
    name: "Group 4",
    roles: "Direct Partners , Viewer",
  },
];

export default function GroupsPage() {
  const columns = [
    { field: "id", headerName: "Group ID", flex: 1 },
    { field: "name", headerName: "Group Name", flex: 1 },
    { field: "roles", headerName: "Roles", flex: 2 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params: any) => (
        <div className="flex gap-2 items-center">
          <button className="text-green-600 cursor-pointer ml-5 mt-2 mr-5">
            <GoPencil size={18} />
          </button>
          <button className="text-red-600 cursor-pointer ml-5 mt-2 mr-5">
            <FaTrash size={16}  />
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

  return (
    <Layout>
      <div className="p-6 w-full max-w-6xl mx-auto -mt-5">
        <HeaderWithActions
          title="Groups"
          search={query}
          setSearch={handleChange}
          showAddButton
          showBack
          addLabel="+ ADD GROUP"
          onAdd={() => console.log("Add group clicked")}
          onMore={() => console.log("More options clicked")}
        />

        {/* Table with checkbox selection */}
        <Table
          columns={columns}
          rows={groupsData}
          rowIdField="id"
          pageSize={10}
          checkboxSelection
          onRowClick={(row) => console.log("Row clicked:", row)}
        />
      </div>
    </Layout>
  );
}
