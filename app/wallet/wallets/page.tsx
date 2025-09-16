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
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";
import { useVLife } from "@/store/context";

export default function WalletsPage() {
  const router = useRouter();
  const { query, setQuery, debouncedQuery } = useSearch();
  const [walletsData, setWalletsData] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user } = useVLife();

  const API_URL = "/api/wallets-operations";

  // Fetch wallets
  const fetchWallets = useCallback(
    async (search: string, walletId?: string, id?: string) => {
      try {
        setLoading(true);

        const params: any = {
          search: search || "",
        };

        // ✅ if not admin, include user_id
        if (user?.role !== "admin" && user?.user_id) {
          params.user_id = user.user_id;
        }

        // ✅ optionally include wallet_id and id if passed
        if (walletId) params.wallet_id = walletId;
        if (id) params.id = id;

        const { data } = await axios.get(API_URL, { params });
        const wallets = data.data || [];

        setWalletsData(wallets);
        setTotalItems(wallets.length);
      } catch (error) {
        console.error("Error fetching wallets:", error);
        ShowToast.error("Failed to load wallets");
      } finally {
        setLoading(false);
      }
    },
    [user?.role, user?.user_id]
  );

  useEffect(() => {
    if (!user) return;
    fetchWallets(debouncedQuery);
  }, [debouncedQuery, user, fetchWallets]);

  // Delete wallet
  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_URL}?wallet_id=${id}`);
      setWalletsData((prev) => prev.filter((wallet) => wallet._id !== id));
      setTotalItems((prev) => prev - 1);
      ShowToast.success("Wallet deleted successfully");
    } catch (error) {
      console.error("Error deleting wallet:", error);
      ShowToast.error("Failed to delete wallet");
    }
  };

  // Edit wallet
  const handleEdit = (id: string) => {
    router.push(`/wallet/wallets/editwallet/${id}`);
  };

  const columns = [
    { field: "wallet_id", headerName: "Wallet ID", flex: 1 },
    { field: "user_id", headerName: "User ID", flex: 1 },
    { field: "bank_name", headerName: "Bank Name", flex: 2 },
    { field: "account_number", headerName: "Account Number", flex: 1.5 },
    { field: "ifsc_code", headerName: "IFSC Code", flex: 1.5 },
    { field: "wallet_status", headerName: "Status", flex: 1 },
  ];

  const handlePageChange = useCallback(
    (page: number, offset: number, limit: number) => {
      // Optional: implement API-side pagination
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
    itemsPerPage: 14,
    onPageChange: handlePageChange,
  });

  const handleAddWallet = () => {
    router.push("/wallet/wallets/addwallet");
  };

  const onBack = () => {
    router.push("/wallet");
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
          title="Wallets"
          search={query}
          setSearch={setQuery}
          showAddButton={
            user.role === "admin" ||
            (user.role === "user" && walletsData.length === 0)
          }
          showBack
          onBack={onBack}
          addLabel="+ ADD WALLET"
          onAdd={handleAddWallet}
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
          rows={walletsData.slice((currentPage - 1) * 14, currentPage * 14)}
          rowIdField="_id"
          pageSize={14}
          statusField="wallet_status"
          onIdClick={(id) => handleEdit(id)}
          checkboxSelection
          onRowClick={(row) => console.log("Wallet clicked:", row)}
        />
      </div>
    </Layout>
  );
}
