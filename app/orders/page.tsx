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
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { useVLife } from "@/store/context";
import { IoClose } from "react-icons/io5";
import AlertBox from "@/components/Alerts/advanceAlert";
import { hasAdvancePaid } from "@/utils/hasAdvancePaid";
import ShowToast from "@/components/common/Toast/toast";
import { FiFilter } from "react-icons/fi";
import DateFilterModal from "@/components/common/DateRangeModal/daterangemodal";
import { handleDownload } from "@/utils/handleDownload";
import { FaDownload } from "react-icons/fa";
import { handleDownloadPDF } from "@/lib/invoiceDownload";

export default function OrdersPage() {
  const { user } = useVLife();
  const router = useRouter();
  const [showAlert, setShowAlert] = useState(false);
  const [hasPaidAdvance, setHasPaidAdvance] = useState(false);

  const user_id = user?.user_id || "";

  const { query, setQuery, debouncedQuery } = useSearch();
  const [ordersData, setOrdersData] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<any>(null);

  const [showModal, setShowModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  const API_URL = "/api/order-operations"; // Replace with your actual API endpoint

  const handleDownloadClick = () => {
    handleDownload<any>({
      rows: selectedRows, // or selected rows if you want selection-based export
      fileName: "orders",
      format: "xlsx",
      excludeHeaders: [
        "_id",
        "__v",
        "created_at",
        "last_modified_at",
        "items", // items array may not be needed in export
      ],
      onStart: () => setDownloading(true),
      onFinish: () => setDownloading(false),
    });
  };

  useEffect(() => {
    const checkAdvancePayment = async () => {
      const paid = await hasAdvancePaid(user_id, 10000);
      setHasPaidAdvance(paid.hasPermission);

      if (!paid.hasPermission) {
        setShowAlert(true);
      }
    };

    if (user_id) checkAdvancePayment();
  }, [user_id]);

  // Fetch orders from API
  const fetchOrders = useCallback(
    async (search: string, orderId?: string, id?: string) => {
      try {
        setLoading(true);

        const params: any = {
          search: search || "",
          role: user?.role,
          ...(user?.user_id && { user_id: user.user_id }), // ✅ include user_id if available
          ...(dateFilter?.type === "on" && { date: dateFilter.date }), // ✅ single date filter
          ...(dateFilter?.type === "range" && {
            from: dateFilter.from,
            to: dateFilter.to,
          }), // ✅ date range filter
        };

        // ✅ optionally include order_id / id
        if (orderId) params.order_id = orderId;
        if (id) params.id = id;

        const { data } = await axios.get(API_URL, { params });
        const orders = data.data || [];

        setOrdersData(orders);
        setTotalItems(orders.length);
      } catch (error) {
        console.error("Error fetching orders:", error);
        ShowToast.error("Failed to load orders");
      } finally {
        setLoading(false);
      }
    },
    [user?.role, user?.user_id, dateFilter]
  );

  useEffect(() => {
    if (!user?.user_id) return;
    fetchOrders(debouncedQuery);
  }, [debouncedQuery, user?.user_id, dateFilter]);

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
    { field: "payment_id", headerName: "Transaction ID", flex: 1.5 },

    // conditional columns (filter later)
    user?.role === "admin" && {
      field: "user_id",
      headerName: "User ID",
      flex: 1,
    },
    user?.role === "admin" && {
      field: "contact",
      headerName: "Contact",
      flex: 1,
    },

    { field: "payment_date", headerName: "Order Date", flex: 1 },
    {
      field: "final_amount",
      headerName: "Amount ( ₹ )",
      align: "right",
      flex: 1,
      renderCell: (params: GridRenderCellParams<any, number>) => (
        <span className="pr-5">
          ₹ {Number(params.value)?.toFixed(2) || "0.00"}
        </span>
      ),
    },
    { field: "payment", headerName: "Status", flex: 1 },

    ...(user?.role === "admin"
      ? [
          {
            field: "download",
            headerName: "Invoice",
            flex: 1,
            sortable: false,
            filterable: false,
            renderCell: (params: GridRenderCellParams) => (
              <button
                title="Download Invoice"
                className="text-blue-600 hover:text-blue-800 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadPDF(params.row.order_id, setLoading);
                }}
              >
                <FaDownload size={15} />
              </button>
            ),
          },
        ]
      : []),
  ].filter(Boolean) as GridColDef[]; // 👈 removes false and fixes typing

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
    itemsPerPage: 12,
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
      {/* 🔔 Right Side Alert */}
      <AlertBox
        visible={showAlert}
        title="Action Required!"
        message={
          <>
            To activate your account, please pay{" "}
            <span className="font-semibold text-lg">₹10,000</span> as prepaid.
            This will be adjusted in your first order.
          </>
        }
        buttonLabel="Pay Now"
        buttonAction={() => router.push("/historys/payAdvance")}
        onClose={() => setShowAlert(false)}
      />
      <div className=" max-md:px-4 p-4 w-full max-w-[99%] mx-auto -mt-5">
        {(loading || downloading) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        {/* Floating Filter Icon */}
        <div title="Filter" className="fixed  bottom-5 right-6 z-10">
          <button
            className="relative w-12 h-12 rounded-full bg-black text-yellow-300 flex items-center justify-center shadow-[0_4px_6px_rgba(0,0,0,0.3),0_8px_20px_rgba(0,0,0,0.25)] border border-yellow-400 hover:shadow-[0_6px_10px_rgba(0,0,0,0.35),0_10px_25px_rgba(0,0,0,0.3)] active:translate-y-[2px] active:shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-all duration-200 cursor-pointer"
            onClick={() => setShowModal(true)}
          >
            <FiFilter size={20} />
          </button>
        </div>

        <HeaderWithActions
          title="Orders"
          search={query}
          setSearch={setQuery}
          addLabel="+ ADD ORDER"
          showAddButton={
            user?.role === "admin"
              ? true
              : user?.role === "user" && user?.status === "active"
              ? hasPaidAdvance
              : false
          }
          onAdd={handleAddOrder}
          onMore={handleDownloadClick}
          showPagination
          showMoreOptions
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
          rows={ordersData.slice((currentPage - 1) *12, currentPage *12)}
          rowIdField="_id"
          pageSize={12}
          statusField="order_status" // ← show icon & click
          onIdClick={(id) => handleEdit(id)}
          checkboxSelection
          // loading={loading}
          onRowClick={handleRowClick}
          setSelectedRows={setSelectedRows} // ✅ add this
        />

        {/* Date Filter Modal */}
        <DateFilterModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={(filter) => {
            setDateFilter(filter);
            setShowModal(false);
          }}
        />
      </div>
    </Layout>
  );
}
