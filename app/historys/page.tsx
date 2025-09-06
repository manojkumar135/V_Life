"use client";
import React, { useCallback, useState } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import { FaPlusCircle, FaMinusCircle } from "react-icons/fa";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import { useVLife } from "@/store/context";
import axios from "axios";
import { useEffect } from "react";
import Loader from "@/components/common/loader";

interface User {
  _id: string;
  user_id: string;
  user_name: string;
  contact?: string;
  mail?: string;
  role?: string;
  user_status: "active" | "inactive" | string;
}

const transactionData = [
  {
    id: "TR000001",
    date: "15-06-2025",
    detail: "Joining Bonus",
    amount: 500,
    balance: 500,
    status: "credit",
  },
  {
    id: "TR000002",
    date: "16-06-2025",
    detail: "Referral Bonus - Level 1",
    amount: 1000,
    balance: 1500,
    status: "credit",
  },
  {
    id: "TR000003",
    date: "17-06-2025",
    detail: "Product Purchase",
    amount: 1200,
    balance: 300,
    status: "debit",
  },
  {
    id: "TR000004",
    date: "18-06-2025",
    detail: "Matching Bonus",
    amount: 2000,
    balance: 2300,
    status: "credit",
  },
  {
    id: "TR000005",
    date: "19-06-2025",
    detail: "Wallet Withdrawal",
    amount: 1000,
    balance: 1300,
    status: "debit",
  },
  {
    id: "TR000006",
    date: "20-06-2025",
    detail: "Leadership Bonus",
    amount: 3000,
    balance: 4300,
    status: "credit",
  },
  {
    id: "TR000007",
    date: "21-06-2025",
    detail: "Referral Bonus - Level 2",
    amount: 700,
    balance: 5000,
    status: "credit",
  },
  {
    id: "TR000008",
    date: "22-06-2025",
    detail: "Admin Deduction",
    amount: 200,
    balance: 4800,
    status: "debit",
  },
  {
    id: "TR000009",
    date: "23-06-2025",
    detail: "Commission Payout",
    amount: 1500,
    balance: 6300,
    status: "credit",
  },
  {
    id: "TR000010",
    date: "24-06-2025",
    detail: "Product Purchase",
    amount: 1000,
    balance: 5300,
    status: "debit",
  },
];

export default function TransactionHistory() {
  const { user } = useVLife();

  const API_URL = "/api/history-operations";

  const columns = [
    { field: "id", headerName: " ID", flex: 1 },
    { field: "date", headerName: "Date", flex: 1 },
    { field: "detail", headerName: "Detail", flex: 2 },
    {
      field: "amount",
      headerName: "Amount",
      flex: 1,
      renderCell: (params: any) => (
        <span
          className={
            params.row.status === "credit" ? "text-green-600" : "text-red-600"
          }
        >
          ₹ {params.value.toFixed(2)}
        </span>
      ),
    },
    {
      field: "balance",
      headerName: "Balance",
      flex: 1,
      renderCell: (params: any) => `₹ ${params.value.toFixed(2)}`,
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      renderCell: (params: any) =>
        params.value === "credit" ? (
          <FaPlusCircle className="text-green-600 text-lg" />
        ) : (
          <FaMinusCircle className="text-red-600 text-lg" />
        ),
    },
  ];

  const [historyData, setHistoryData] = useState(transactionData);
  const [loading, setLoading] = useState(false);
  const { query, setQuery, debouncedQuery } = useSearch();
  const [totalItems, setTotalItems] = useState(transactionData.length);
  const [currentBalance, setCurrentBalance] = useState(5300.0); // Initial balance from last transaction

  const handlePageChange = useCallback(
    (page: number, offset: number, limit: number) => {
      // Implement data fetching/pagination logic here if needed
    },
    [query]
  );

  // Fetch History
  // const fetchHistory = useCallback(
  //   async (search: string) => {
  //     if (!user?.user_id) return;
  //     try {
  //       setLoading(true);
  //       const { data } = await axios.get(API_URL, {
  //         params: { user_id: user.user_id, search },
  //       });
  //       const users: User[] = data.data || [];
  //       setHistoryData(users);
  //       setTotalItems(users.length);
  //     } catch (error) {
  //       console.error("Error fetching history:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   },
  //   [user?.user_id]
  // );

  // useEffect(() => {
  //   if (!user?.user_id) return;
  //   fetchHistory(debouncedQuery);
  // }, [debouncedQuery, user?.user_id]);

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
    itemsPerPage: 12,
    onPageChange: handlePageChange,
  });

  const handleRowClick = (row: any) => {
    console.log("Transaction clicked:", row);
  };

  return (
    <Layout>
      <div className="p-6 w-full max-w-[98%] mx-auto -mt-5">
        {/* {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )} */}

        {/* Balance Display */}
        <div className="bg-yellow-100 text-black px-6 py-3 rounded-xl shadow-md w-fit mb-6 mx-auto flex items-center gap-2">
          <span className="text-xl font-semibold">Available Balance</span>
          <span className="text-xl font-bold text-right text-green-800">
            ₹ {currentBalance.toFixed(2)}
          </span>
        </div>
        <HeaderWithActions
          title="Transaction History"
          search={query}
          setSearch={setQuery}
          // addLabel="+ ADD TRANSACTION"
          onAdd={() => console.log("Add transaction clicked")}
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

        {/* Table with transaction data */}
        <Table
          columns={columns}
          rows={transactionData.slice((currentPage - 1) * 12, currentPage * 12)}
          rowIdField="id"
          pageSize={12}
          onRowClick={handleRowClick}
          checkboxSelection
        />
      </div>
    </Layout>
  );
}
