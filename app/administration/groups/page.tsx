"use client";
import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import { useRouter } from "next/navigation";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import axios from "axios";
import StatusModal from "@/components/common/statusModal"; 
import Loader from "@/components/common/loader";
import { useVLife } from "@/store/context";
import ShowToast from "@/components/common/Toast/toast"

interface Group {
  _id: string;
  group_id: string;
  group_name: string;
  roles?: string[];
  group_status: "active" | "inactive" | string;
}

export default function GroupsPage() {
  const { user } = useVLife();
  const router = useRouter();
  const { query, setQuery, debouncedQuery } = useSearch(); 

  const [groupsData, setGroupsData] = useState<Group[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const API_URL = "/api/groups-operations"; 

  // ✅ modal states
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selected, setSelected] = useState<{
    id: string;
    status: string;
    row: Group;
  } | null>(null);

  const fetchGroups = useCallback(async (search: string) => {
    try {
      setLoading(true);
      const { data } = await axios.get(API_URL, {
        params: { search },
      });
      setGroupsData(data.data || []);
      setTotalItems(data.data?.length || 0);
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.user_id) return;
    fetchGroups(debouncedQuery); 

        goToPage(1);

  }, [debouncedQuery, user?.user_id, fetchGroups]);

  // Ask before toggling status
  const handleStatusClick = (id: string, status: string, row: Group) => {
    setSelected({ id, status, row });
    setIsStatusModalOpen(true);
  };

  // Confirm status change
const confirmStatusChange = async () => {
  if (!selected) return;
  try {
    setLoading(true);

    const { id, status, row } = selected;
    const res = await axios.patch(API_URL, {
      id, // ObjectId
      group_id: row.group_id, // Business key
      group_status: status === "active" ? "inactive" : "active", // toggle
    });

    if (res.data.success) {
      // ✅ Update UI
      setGroupsData((prev) =>
        prev.map((g) =>
          g._id === id ? { ...g, group_status: res.data.data.group_status } : g
        )
      );

      // 🎉 Success toast
      ShowToast.success(`Group ${row.group_name} status updated to ${res.data.data.group_status}`);
    } else {
      // ⚠️ Fallback toast
      ShowToast.error(res.data.message || "Failed to update status");
    }
  } catch (error: any) {
    console.error("Error updating group status:", error);
    ShowToast.error( error.response?.data?.message || "Error updating group status");
  } finally {
    setSelected(null);
    setLoading(false);
  }
};



  const columns = [
    { field: "group_id", headerName: "Group ID", flex: 1 },
    { field: "group_name", headerName: "Group Name", flex: 1 },
    { field: "roles", headerName: "Roles", flex: 2 },
    { field: "group_status", headerName: "Status", flex: 1 },
  ];

  const {
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    startItem,
    endItem,
    goToPage,

  } = usePagination({
    totalItems,
    itemsPerPage: 12,
    onPageChange: () => {},
  });

  const handleAddGroup = () => {
    router.push("/administration/groups/addgroup");
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
          title="Groups"
          search={query}
          setSearch={setQuery}
          showAddButton
          showBack
          onBack={onBack}
          addLabel="+ ADD GROUP"
          onAdd={handleAddGroup}
          onMore={() => console.log("More options clicked")}
          showPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          startItem={startItem}
          endItem={endItem}
          onNext={nextPage}
          onPrev={prevPage}
        />

        {/* Table with checkbox selection */}
        <Table
          columns={columns}
          rows={groupsData.slice((currentPage - 1) *12, currentPage *12)}
          rowIdField="_id"
          pageSize={12}
          statusField="group_status"
          onIdClick={(id) => router.push(`/administration/groups/editgroup/${id}`)}
          onStatusClick={handleStatusClick}
          checkboxSelection
          onRowClick={(row) => console.log("Group clicked:", row)}
        />

        {/* ✅ Reusable Status confirmation modal */}
        <StatusModal
          isOpen={isStatusModalOpen}
          setIsOpen={setIsStatusModalOpen}
          currentStatus={selected?.status === "active" ? "active" : "inactive"}
          selected={selected}
          onConfirm={confirmStatusChange}
          idKey="group_id" // ✅ will display correct ID
        />
      </div>
    </Layout>
  );
}
