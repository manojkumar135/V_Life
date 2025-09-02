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

export default function RightTeam() {
  const { user } = useVLife();
  const team = "right";
  const router = useRouter();
  const { query, handleChange } = useSearch();
  const [usersData, setUsersData] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const API_URL = "/api/team-operations"; // Update if endpoint differs

  // Fetch users
  const fetchUsers = useCallback(async () => {
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

  // Navigate to edit
  const handleEdit = (id: string) => {
    router.push(`/administration/users/edituser/${id}`);
  };

  const columns = [
    { field: "user_id", headerName: "User ID", flex: 1 },
    { field: "user_name", headerName: "User Name", flex: 1 },
    { field: "contact", headerName: "Contact", flex: 1 },
    { field: "mail", headerName: "Email", flex: 2 },
    { field: "role", headerName: "Role", flex: 1 },
    { field: "user_status", headerName: "Status", flex: 1 }, // ✅ new status column
  ];

  const handlePageChange = useCallback(
    (page: number, offset: number, limit: number) => {
      // optional: implement server-side pagination
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
    router.push("/administration/users/adduser?team=right");
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
          statusField="user_status" // ✅ tells table to use status column
          onIdClick={(id) => handleEdit(id)} // ✅ clicking ID goes to edit
          checkboxSelection
          onRowClick={(row) => console.log("User clicked:", row)}
        />
      </div>
    </Layout>
  );
}
