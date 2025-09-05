"use client";
import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import { FaTrash, FaEdit } from "react-icons/fa";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import { useRouter } from "next/navigation";
import axios from "axios";
import Loader from "@/components/common/loader";
import { GridColDef } from "@mui/x-data-grid";
import { useVLife } from "@/store/context";

export default function OrdersPage() {
  const { user } = useVLife();
  const router = useRouter();
  const { query, setQuery, debouncedQuery } = useSearch();
  const [ordersData, setOrdersData] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const API_URL = "/api/order-operations"; // Replace with your actual API endpoint

  // Fetch orders from API
  const fetchOrders = useCallback(async (search: string) => {
    try {
      setLoading(true);
      const { data } = await axios.get(API_URL,{
      params: { search: query }, 
    });
      const orders = data.data || [];
      setOrdersData(orders);
      setTotalItems(orders.length);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (!user?.user_id) return;
    fetchOrders(debouncedQuery);
  }, [debouncedQuery, user?.user_id]);

  // Delete order
  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_URL}?order_id=${id}`);
      // Remove from UI immediately
      setOrdersData((prev) => prev.filter((order: any) => order._id !== id));
      setTotalItems((prev) => prev - 1);
    } catch (error) {
      console.error("Error deleting order:", error);
    }
  };

  // Edit order (navigate)
  const handleEdit = (id: string) => {
    router.push(`/orders/orderDetailView/${id}`);
  };

  const columns: GridColDef[] = [
    { field: "order_id", headerName: "Order ID", flex: 1 },
    { field: "user_id", headerName: "User ID", flex: 1 },
    { field: "user_name", headerName: "Name", flex: 1 },
    { field: "contact", headerName: "Contact", flex: 1 },
    { field: "payment_id", headerName: "Transaction ID", flex: 1 },
    { field: "payment_date", headerName: "Order Date", flex: 1 },
    {
      field: "amount",
      headerName: "Amount ( ₹ )",
      align: "right",
      flex: 1,
      renderCell: (params) => (
        <span>₹ {Number(params.value)?.toFixed(2) || "0.00"}</span>
      ),
    },
    { field: "order_status", headerName: "Status", flex: 1 },
  ];

  const handlePageChange = useCallback(
    (page: number, offset: number, limit: number) => {
      // Optional: implement server-side pagination
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

  const handleRowClick = (row: any) => {
    console.log("Order clicked:", row);
    // handle navigation or modal etc.
  };

  const handleAddOrder = () => {
    router.push("/orders/addorder");
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
          title="Orders"
          search={query}
          setSearch={setQuery}
          addLabel="+ ADD ORDER"
          showAddButton
          onAdd={handleAddOrder}
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

        <Table
          columns={columns}
          rows={ordersData.slice((currentPage - 1) * 14, currentPage * 14)}
          rowIdField="_id"
          pageSize={14}
          statusField="order_status" // ← show icon & click
          onIdClick={(id) => handleEdit(id)}
          checkboxSelection
          // loading={loading}
          onRowClick={handleRowClick}
        />
      </div>
    </Layout>
  );
}
