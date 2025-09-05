"use client";
import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useVLife } from "@/store/context";
import StatusModal from "@/components/common/statusModal"; // ✅ confirm modal
import Loader from "@/components/common/loader";
import { handleDownload } from "@/utils/handleDownload";

// User type (adjust fields if your User model differs)
interface User {
  _id: string;
  user_id: string;
  user_name: string;
  contact?: string;
  mail?: string;
  role?: string;
  user_status: "active" | "inactive" | string;
}

export default function LeftTeam() {
  const router = useRouter();
  const { user } = useVLife();
  const team = "left";

  const { query, setQuery, debouncedQuery } = useSearch();
  const [selectedRows, setSelectedRows] = useState<User[]>([]);

  // ✅ typed states
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

  const handleDownloadClick = () => {
  handleDownload<User>({
    rows: selectedRows,
    fileName: "left-team",
    format: "csv", // or "json"
  });
};

  // Fetch users
  const fetchUsers = useCallback(
    async (search: string) => {
      if (!user?.user_id) return;
      try {
        setLoading(true);
        const { data } = await axios.get(API_URL, {
          params: { user_id: user.user_id, team, search },
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
    [user?.user_id]
  );

  useEffect(() => {
    if (!user?.user_id) return;
    fetchUsers(debouncedQuery);
  }, [debouncedQuery, user?.user_id]);

  // Edit user
  const handleEdit = (id: string) => {
    router.push(`/administration/users/edituser/${id}`);
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
        // ✅ Update UI
        setUsersData((prev: User[]) =>
          prev.map((u) =>
            u._id === id ? { ...u, user_status: res.data.data.user_status } : u
          )
        );
      }
    } catch (error) {
      console.error("Error updating status:", error);
      setLoading(false);
    } finally {
      setSelectedUser(null);
      setLoading(false);
    }
  };

  const columns = [
    { field: "user_id", headerName: "User ID", flex: 1 },
    { field: "user_name", headerName: "User Name", flex: 1 },
    { field: "contact", headerName: "Contact", flex: 1 },
    { field: "mail", headerName: "Email", flex: 2 },
    { field: "role", headerName: "Role", flex: 1 },
    { field: "user_status", headerName: "Status", flex: 1 },
  ];

  const handlePageChange = useCallback(() => {
    // optional server pagination
  }, [query]);

  const { currentPage, totalPages, nextPage, prevPage, startItem, endItem } =
    usePagination({
      totalItems,
      itemsPerPage: 10,
      onPageChange: handlePageChange,
    });

  const handleAddUser = () => {
    router.push("/administration/users/adduser?team=left");
  };

  return (
    <>
      <Layout>
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        <div className="p-6 w-full max-w-[98%] mx-auto -mt-5">
          <HeaderWithActions
            title="Left Team"
            search={query}
            setSearch={setQuery} // ✅ string setter
            addLabel="+ ADD USER"
            showAddButton
            showBack
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
            onStatusClick={handleStatusClick}
            checkboxSelection
            setSelectedRows={setSelectedRows}
            onRowClick={(row) => console.log("User clicked:", row)}
          />

          {/* ✅ Status confirmation modal */}
          <StatusModal
            isOpen={isStatusModalOpen}
            setIsOpen={setIsStatusModalOpen}
            currentStatus={
              selectedUser?.status === "active" ? "active" : "inactive"
            }
            selectedUser={selectedUser} // ✅ pass it here
            onConfirm={confirmStatusChange}
          />
        </div>
      </Layout>
    </>
  );
}
