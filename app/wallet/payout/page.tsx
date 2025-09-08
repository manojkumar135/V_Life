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

export default function WithdrawPage() {
  const { user } = useVLife();
  const router = useRouter();
  const { query, setQuery, debouncedQuery } = useSearch();
  const [withdrawData, setWithdrawData] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const API_URL = "/api/withdraw-operations";

  // Fetch withdrawals
  const fetchWithdrawals = useCallback(
    async (search: string) => {
      try {
        setLoading(true);
        const { data } = await axios.get(API_URL, {
          params: { search: query },
        });
        const withdrawals = data.data || [];
        setWithdrawData(withdrawals);
        setTotalItems(withdrawals.length);
      } catch (error) {
        console.error("Error fetching withdrawals:", error);
        ShowToast.error("Failed to load withdrawals");
      } finally {
        setLoading(false);
      }
    },
    [query]
  );

  useEffect(() => {
    if (!user?.user_id) return;
    fetchWithdrawals(debouncedQuery);
  }, [debouncedQuery, user?.user_id]);

  // Delete withdrawal
  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_URL}?withdraw_id=${id}`);
      setWithdrawData((prev) => prev.filter((item) => item._id !== id));
      setTotalItems((prev) => prev - 1);
      ShowToast.success("Withdrawal deleted successfully");
    } catch (error) {
      console.error("Error deleting withdrawal:", error);
      ShowToast.error("Failed to delete withdrawal");
    }
  };

  // Edit withdrawal
  const handleEdit = (id: string) => {
    router.push(`/wallet/withdraw/detailview/${id}`);
  };

  const columns = [
    { field: "withdraw_id", headerName: "Transaction ID", flex: 1 },
    { field: "wallet_id", headerName: "Wallet ID", flex: 1.5 },
    { field: "user_id", headerName: "Withdraw Address", flex: 2 },
    { field: "date", headerName: "Date", flex: 1.5 },
    { field: "withdraw_amount", headerName: "Amount", flex: 1 },
    // { field: "status", headerName: "Payment", flex: 1 },
    { field: "withdraw_status", headerName: "Status", flex: 1 },

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
      // Optional: implement API pagination
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

  const handlePayAdvance = () => {
    router.push("/wallet/payout/payAdvance");
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
          title="Payouts"
          search={query}
          setSearch={setQuery}
          showAddButton
          showBack
          onBack={onBack}
          addLabel="Make Payment"
          onAdd={handlePayAdvance}
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
          rows={withdrawData.slice((currentPage - 1) * 14, currentPage * 14)}
          rowIdField="_id"
          pageSize={14}
          statusField="withdraw_status"
          onIdClick={(id) => handleEdit(id)}
          // onStatusClick={(id, status, row) => toggleStatus(id, status, row)}
          checkboxSelection
          // loading={loading}
          onRowClick={(row) => console.log("Withdraw clicked:", row)}
        />
      </div>
    </Layout>
  );
}
