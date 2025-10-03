"use client";
import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import { useRouter } from "next/navigation";
import axios from "axios";
import Loader from "@/components/common/loader";
import { useVLife } from "@/store/context";
import StatusModal from "@/components/common/userStatusModal";
import { handleDownload } from "@/utils/handleDownload";

// User type
interface User {
  _id: string;
  user_id: string;
  user_name: string;
  contact?: string;
  mail?: string;
  role?: string;
  user_status: "active" | "inactive" | string;
}

export default function RightTeam() {
  const { user } = useVLife();
  const team = "right";
  const router = useRouter();
  const { query, setQuery, debouncedQuery } = useSearch();
  const [selectedRows, setSelectedRows] = useState<User[]>([]);

  const [usersData, setUsersData] = useState<User[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const API_URL = "/api/team-operations";
  const STATUS_URL = "/api/status-operations";

  // ✅ modal states
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    status: string;
    row: User;
  } | null>(null);

  const [downloading, setDownloading] = useState(false);

  const handleDownloadClick = () => {
    handleDownload<User>({
      rows: selectedRows,
      fileName: "right-team",
      format: "xlsx",
      excludeHeaders: ["_id", "__v", "created_at", "last_modified_at"], // ✅ skip these
      onStart: () => setDownloading(true),
      onFinish: () => setDownloading(false),
    });
  };

  // Fetch users
  const fetchUsers = useCallback(
    async (search: string) => {
      if (!user?.user_id) return;
      try {
        setLoading(true);
        const { data } = await axios.get(API_URL, {
          params: {
            user_id: user.user_id,
            team,
            search: query,
          },
        });
        const users: User[] = data.data || [];
        setUsersData(users);
        setTotalItems(users.length);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    },
    [user?.user_id, query]
  );

  useEffect(() => {
    if (!user?.user_id) return;
    fetchUsers(debouncedQuery);
  }, [debouncedQuery, user?.user_id]);

  // Navigate to edit
  const handleEdit = (id: string) => {
    router.push(`/administration/users/tree/${id}`);
  };

  const onBack = () => {
    router.push("/administration/users");
  };

  // Ask before toggling status
  const handleStatusClick = (id: string, status: string, row: any) => {
    setSelectedUser({ id, status, row });
    setIsStatusModalOpen(true);
  };

  // Confirm status change
  const confirmStatusChange = async () => {
    if (!selectedUser) return;
    try {
      setLoading(true);

      const { id, status } = selectedUser;
      const res = await axios.put(STATUS_URL, { id, status });
      if (res.data.success) {
        setUsersData((prev) =>
          prev.map((u) =>
            u._id === id ? { ...u, user_status: res.data.data.user_status } : u
          )
        );
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setSelectedUser(null);
      setLoading(false);
    }
  };

  const allColumns = [
    { field: "user_id", headerName: "User ID", flex: 1 },
    { field: "user_name", headerName: "User Name", flex: 1 },
    { field: "contact", headerName: "Contact", flex: 1 },
    { field: "mail", headerName: "Email", flex: 2 },
    { field: "role", headerName: "Role", flex: 1 },
    { field: "user_status", headerName: "Status", flex: 1 },
  ];

  // assume logged-in user role
  const currentUserRole = user?.role; // e.g. "admin"

  const columns =
    currentUserRole === "admin"
      ? allColumns
      : allColumns.filter(
          (col) => col.field !== "contact" && col.field !== "mail"
        );

  const handlePageChange = useCallback(
    (page: number, offset: number, limit: number) => {
      // optional: implement server-side pagination
    },
    [query]
  );

  const { currentPage, totalPages, nextPage, prevPage, startItem, endItem } =
    usePagination({
      totalItems,
      itemsPerPage: 14,
      onPageChange: handlePageChange,
    });

  const handleAddUser = () => {
    router.push("/administration/users/adduser?team=right");
  };

  return (
    <Layout>
      <div className=" max-md:px-4 p-4 w-full max-w-[99%] mx-auto -mt-5">
        {(loading || downloading) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        <HeaderWithActions
          title="Right Team"
          search={query}
          setSearch={setQuery} // ✅ string setter
          addLabel="+ ADD USER"
          showAddButton
          showBack
          onBack={onBack}
          onAdd={handleAddUser}
          onMore={handleDownloadClick} // ✅ Now Download
          showPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          startItem={startItem}
          endItem={endItem}
          onNext={nextPage}
          onPrev={prevPage}
        />

        <Table
          columns={columns}
          rows={usersData.slice((currentPage - 1) * 14, currentPage * 14)}
          rowIdField="_id"
          pageSize={14}
          statusField="user_status"
          onIdClick={(id) => handleEdit(id)}
          onStatusClick={handleStatusClick} // ✅ added
          checkboxSelection
          onRowClick={(row) => console.log("User clicked:", row)}
          setSelectedRows={setSelectedRows}
        />

        {/* ✅ Status confirmation modal */}
        <StatusModal
          isOpen={isStatusModalOpen}
          setIsOpen={setIsStatusModalOpen}
          currentStatus={
            selectedUser?.status === "active" ? "active" : "inactive"
          }
          selectedUser={selectedUser}
          onConfirm={confirmStatusChange}
        />
      </div>
    </Layout>
  );
}
