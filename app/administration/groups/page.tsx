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
import Loader from "@/components/common/loader";

export default function GroupsPage() {
  const router = useRouter();
  const { query, handleChange } = useSearch();
  const [groupsData, setGroupsData] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const API_URL = "/api/groups-operations"; // Change this to your actual API route

  // Fetch groups
  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(API_URL);
      setGroupsData(data.data || []);
      setTotalItems(data.data?.length || 0);
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Delete group
  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_URL}?group_id=${id}`);
      setGroupsData((prev) => prev.filter((group: any) => group._id !== id));
      setTotalItems((prev) => prev - 1);
    } catch (error) {
      console.error("Error deleting group:", error);
    }
  };

  // Edit group
  const handleEdit = (id: string) => {
    // console.log("Editing group with id:", id);
    router.push(`/administration/groups/editgroup/${id}`);
  };

  const columns = [
    { field: "group_id", headerName: "Group ID", flex: 1 },
    { field: "group_name", headerName: "Group Name", flex: 1 },
    { field: "roles", headerName: "Roles", flex: 2 },
    { field: "group_status", headerName: "Status", flex: 1 },

    // {
    //   field: "actions",
    //   headerName: "Actions",
    //   flex: 1,
    //   sortable: false,
    //   disableColumnMenu: true,
    //   renderCell: (params: any) => (
    //     <div className="flex gap-2 items-center">
    //       <button
    //         className="text-green-600 cursor-pointer ml-5 mt-2 mr-5"
    //         onClick={() => handleEdit(params.row._id)}
    //       >
    //         <GoPencil size={18} />
    //       </button>
    //       <button
    //         className="text-red-600 cursor-pointer ml-5 mt-2 mr-5"
    //         onClick={() => handleDelete(params.row._id)}
    //       >
    //         <FaTrash size={16} />
    //       </button>
    //     </div>
    //   ),
    // },
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

  const handleAddGroup = () => {
    router.push("/administration/groups/addgroup");
  };

  const onBack = () => {
    router.push("/administration");
  };

  return (
    <Layout>
      <div className="p-6 w-full max-w-[98%] mx-auto -mt-5">

{loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        <HeaderWithActions
          title="Groups"
          search={query}
          setSearch={handleChange}
          showAddButton
          showBack
          onBack={onBack}
          addLabel="+ ADD GROUP"
          onAdd={handleAddGroup}
          onMore={() => console.log("More options clicked")}
        />

        {/* Table with checkbox selection */}
        <Table
          columns={columns}
          rows={groupsData}
          rowIdField="_id"
          pageSize={10}
          statusField="group_status" // ← show icon & click
          onIdClick={(id) => handleEdit(id)}
          // onStatusClick={(id, status, row) => toggleStatus(id, status, row)}
          checkboxSelection
          // loading={loading}
          onRowClick={(row) => console.log("Group clicked:", row)}
        />
      </div>
    </Layout>
  );
}
