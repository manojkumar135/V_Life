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

export default function WalletsPage() {
  const router = useRouter();
  const { query, handleChange } = useSearch();
  const [walletsData, setWalletsData] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const API_URL = "/api/wallets-operations";

  // Fetch wallets
  const fetchWallets = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(API_URL);
      const wallets = data.data || [];
      setWalletsData(wallets);
      setTotalItems(wallets.length);
    } catch (error) {
      console.error("Error fetching wallets:", error);
      ShowToast.error("Failed to load wallets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

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
    { field: "account_holder_name", headerName: "Name", flex: 1 },
    { field: "bank_name", headerName: "Bank Name", flex: 2 },
    { field: "account_number", headerName: "Account Number", flex: 1.5 },
    { field: "ifsc_code", headerName: "IFSC Code", flex: 1.5 },
        { field: "wallet_status", headerName: "Status", flex: 1 },

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
    itemsPerPage: 10,
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
        <HeaderWithActions
          title="Wallets"
          search={query}
          setSearch={handleChange}
          showAddButton
          showBack
          onBack={onBack}
          addLabel="+ ADD WALLET"
          onAdd={handleAddWallet}
        />

        <Table
          columns={columns}
          rows={walletsData}
          rowIdField="_id"
          pageSize={10}
        statusField="wallet_status" // ← show icon & click
          onIdClick={(id) => handleEdit(id)}
          // onStatusClick={(id, status, row) => toggleStatus(id, status, row)}
          checkboxSelection
          // loading={loading}
          onRowClick={(row) => console.log("Wallet clicked:", row)}
        />
      </div>
    </Layout>
  );
}
