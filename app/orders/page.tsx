"use client";
import React, { useCallback, useState } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import { FaTrash, FaEdit } from "react-icons/fa";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";

const ordersData = [
  {
    id: "OR000001",
    userId: "US000001",
    name: "Aarav Sharma",
    deliveryType: "Home Delivery",
    invoiceNo: "INV001",
    orderDate: "2025-07-01",
    orderType: "Online",
    status: "Completed",
  },
  {
    id: "OR000002",
    userId: "US000002",
    name: "Meera Singh",
    deliveryType: "Store Pickup",
    invoiceNo: "INV002",
    orderDate: "2025-07-02",
    orderType: "In-Store",
    status: "Processing",
  },
  {
    id: "OR000003",
    userId: "US000003",
    name: "Rahul Verma",
    deliveryType: "Home Delivery",
    invoiceNo: "INV003",
    orderDate: "2025-07-03",
    orderType: "Online",
    status: "Shipped",
  },
  {
    id: "OR000004",
    userId: "US000004",
    name: "Sneha Iyer",
    deliveryType: "Courier",
    invoiceNo: "INV004",
    orderDate: "2025-07-04",
    orderType: "Bulk Order",
    status: "Pending",
  },
  {
    id: "OR000005",
    userId: "US000005",
    name: "Vikram Patel",
    deliveryType: "Home Delivery",
    invoiceNo: "INV005",
    orderDate: "2025-07-05",
    orderType: "Subscription",
    status: "Completed",
  },
  {
    id: "OR000006",
    userId: "US000006",
    name: "Priya Nair",
    deliveryType: "Express Delivery",
    invoiceNo: "INV006",
    orderDate: "2025-07-06",
    orderType: "Online",
    status: "Cancelled",
  },
  {
    id: "OR000007",
    userId: "US000007",
    name: "Karan Malhotra",
    deliveryType: "Store Pickup",
    invoiceNo: "INV007",
    orderDate: "2025-07-07",
    orderType: "In-Store",
    status: "Completed",
  },
  {
    id: "OR000008",
    userId: "US000008",
    name: "Divya Joshi",
    deliveryType: "Courier",
    invoiceNo: "INV008",
    orderDate: "2025-07-08",
    orderType: "Gift Order",
    status: "Shipped",
  },
  {
    id: "OR000009",
    userId: "US000009",
    name: "Anil Kumar",
    deliveryType: "Home Delivery",
    invoiceNo: "INV009",
    orderDate: "2025-07-09",
    orderType: "Online",
    status: "Processing",
  },
  {
    id: "OR000010",
    userId: "US000010",
    name: "Neha Gupta",
    deliveryType: "Express Delivery",
    invoiceNo: "INV010",
    orderDate: "2025-07-10",
    orderType: "Bulk Order",
    status: "Pending",
  },
];

export default function OrdersPage() {
  const columns = [
    { field: "id", headerName: "Order ID", flex: 1 },
    { field: "userId", headerName: "User ID", flex: 1 },
    { field: "name", headerName: "Name", flex: 1 },
    { field: "deliveryType", headerName: "Delivery Type", flex: 1 },
    { field: "invoiceNo", headerName: "Invoice No", flex: 1 },
    { field: "orderDate", headerName: "Order Date", flex: 1 },
    { field: "orderType", headerName: "Order Type", flex: 1 },
    { field: "status", headerName: "Status", flex: 1 },
    {
      field: "action",
      headerName: "Actions",
      //  width: 250, 
      flex: 1,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params: any) => (
        <div className="flex gap-2 items-center">
          <button className="text-green-600 cursor-pointer ml-5 mt-2 mr-5">
            <FaEdit size={18} />
          </button>
          <button className="text-red-600 cursor-pointer ml-2 mt-2 mr-5">
            <FaTrash size={16} />
          </button>
        </div>
      ),
    },
        // { field: "", headerName: "", flex: 1 },

        

  ];

  const { query, handleChange } = useSearch();
  const [totalItems, setTotalItems] = useState(ordersData.length);

  const handlePageChange = useCallback(
    (page: number, offset: number, limit: number) => {
      // Implement data fetching/pagination logic here if needed
      // For now, we're using static data
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

  const handleRowClick = (row: any) => {
    console.log("Order clicked:", row);
    // handle navigation or modal etc.
  };

  return (
    <Layout>
      <div className="p-6 w-full max-w-[98%] mx-auto -mt-5">

        {/* {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <Loader />
          </div>
        )} */}
        <HeaderWithActions
          title="Orders"
          search={query}
          setSearch={handleChange}
          addLabel="+ ADD ORDER"
          showAddButton
          onAdd={() => console.log("Add order clicked")}
          onMore={() => console.log("More options clicked")}
        />

        {/* Table with checkbox selection */}
        <Table
          columns={columns}
          rows={ordersData}
          rowIdField="id"
          pageSize={10}
          checkboxSelection
          onRowClick={handleRowClick}
        />
      </div>
    </Layout>
  );
}