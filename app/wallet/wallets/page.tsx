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


const walletsData = [
  {
    id: "WA000003",
    name: "User Name",
    bankName: "State Bank of Hyderabad",
    accountNumber: "12345XXXXXX",
    ifscCode: "SBH00001234",
  },
  {
    id: "WA000003",
    name: "User Name",
    bankName: "State Bank of Hyderabad",
    accountNumber: "12345XXXXXX",
    ifscCode: "SBH00001234",
  },
  {
    id: "WA000003",
    name: "User Name",
    bankName: "State Bank of Hyderabad",
    accountNumber: "12345XXXXXX",
    ifscCode: "SBH00001234",
  },
];

export default function WalletsPage() {
  const router = useRouter();

  const columns = [
    { field: "id", headerName: "# ID", flex: 1 },
    { field: "name", headerName: "Name", flex: 1 },
    { field: "bankName", headerName: "Bank Name", flex: 2 },
    { field: "accountNumber", headerName: "Account Number", flex: 2 },
    { field: "ifscCode", headerName: "IFSC Code", flex: 2 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params: any) => (
        <div className="flex gap-2 items-center">
          <button className="text-green-600 cursor-pointer ml-5 mt-2 mr-5">
            <GoPencil size={18} />
          </button>
          <button className="text-red-600 cursor-pointer ml-5 mt-2 mr-5">
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
      // You can fetch paginated wallet data here
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

  const handleAddWallet = () => {
  router.push("/wallet/addwallet");
  };
  const onBack=()=>{
      router.push("/wallet");

  }

  return (
    <Layout>
      <div className="p-6 w-full max-w-[98%] mx-auto -mt-5">
        <HeaderWithActions
          title="Wallets"
          search={query}
          setSearch={handleChange}
          addLabel="+ ADD WALLET"
          showBack
          showAddButton
          onAdd={handleAddWallet}
          onBack={onBack}
        />

        <Table
          columns={columns}
          rows={walletsData}
          rowIdField="id"
          pageSize={10}
          checkboxSelection
          onRowClick={(row) => console.log("Wallet row clicked:", row)}
        />
      </div>
    </Layout>
  );
}
