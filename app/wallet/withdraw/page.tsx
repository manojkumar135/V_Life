"use client";
import React, { useState, useCallback } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import { FaTrash } from "react-icons/fa";
import { GoPencil } from "react-icons/go";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import { useRouter } from "next/navigation";

const withdrawData = [
  {
    id: "TR000003",
    walletId: "WA000003",
    address: "User Name",
    date: "18-06-2025",
    amount: "₹ 1000.00",
    status: "Successful",
  },
  {
    id: "TR000003",
    walletId: "WA000003",
    address: "User Name",
    date: "18-06-2025",
    amount: "₹ 1000.00",
    status: "Successful",
  },
  {
    id: "TR000003",
    walletId: "WA000003",
    address: "User Name",
    date: "18-06-2025",
    amount: "₹ 1000.00",
    status: "Successful",
  },
  {
    id: "TR000003",
    walletId: "WA000003",
    address: "User Name",
    date: "18-06-2025",
    amount: "₹ 1000.00",
    status: "Successful",
  },
  {
    id: "TR000003",
    walletId: "WA000003",
    address: "User Name",
    date: "18-06-2025",
    amount: "₹ 1000.00",
    status: "Successful",
  },
];

export default function WithdrawPage() {
  const router = useRouter();

  const columns = [
    { field: "id", headerName: "# ID", flex: 1 },
    { field: "walletId", headerName: "Wallet ID", flex: 1.5 },
    { field: "address", headerName: "Withdraw Address", flex: 2 },
    { field: "date", headerName: "Date", flex: 1.5 },
    { field: "amount", headerName: "Amount", flex: 1.5 },
    { field: "status", headerName: "Status", flex: 1.5 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params: any) => (
        <div className="flex gap-2 items-center">
          <button className="text-green-600 cursor-pointer">
            <GoPencil size={18} />
          </button>
          <button className="text-red-600 cursor-pointer">
            <FaTrash size={16} />
          </button>
        </div>
      ),
    },
  ];

  const { query, handleChange } = useSearch();
  const [totalItems, setTotalItems] = useState(0);

  const handlePageChange = useCallback(
    (page: number, offset: number, limit: number) => {
      // Fetch data here if using backend
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

  const handleMakeWithdraw = () => {
    router.push("/wallet/withdraw/makewithdraw");
  };

  const onBack = () => {
    router.push("/wallet");
  };

  return (
    <Layout>
      <div className="p-6 w-full max-w-[98%] mx-auto -mt-5">
        <HeaderWithActions
          title="Withdraw Transactions"
          search={query}
          setSearch={handleChange}
          addLabel="Make Withdrawal"
          showAddButton
          showBack
          onAdd={handleMakeWithdraw}
          onBack={onBack}
        />

        <Table
          columns={columns}
          rows={withdrawData}
          rowIdField="id"
          pageSize={10}
          checkboxSelection
          onRowClick={(row) => console.log("Withdraw clicked:", row)}
        />
      </div>
    </Layout>
  );
}
