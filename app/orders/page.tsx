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
import { hasAdvancePaid } from "@/services/hasAdvancePaid";
import { hasFirstOrder } from "@/services/hasFirstOrder";

import ShowToast from "@/components/common/Toast/toast";
import { FiFilter } from "react-icons/fi";
import DateFilterModal from "@/components/common/DateRangeModal/daterangemodal";
import { handleDownload } from "@/utils/handleDownload";
import { FaDownload } from "react-icons/fa";
import { FaEye } from "react-icons/fa";

import { handleDownloadPDF } from "@/lib/invoiceDownload";
import { handlePreviewPDF } from "@/lib/invoicePreview";
import dynamic from "next/dynamic";

const PdfPreview = dynamic(() => import("@/components/PDF/PdfPreview"), {
  ssr: false,
});

/* ------------------------------------------------------------------ */
/* Order type filter options                                            */
/* ------------------------------------------------------------------ */
const ORDER_TYPE_OPTIONS = [
  { label: "All", value: "" },
  { label: "Normal", value: "normal" },
  { label: "Advance Used", value: "advance" },
];

export default function OrdersPage() {
  const { user } = useVLife();
  const router = useRouter();
  const [showAlert, setShowAlert] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const user_id = user?.user_id || "";

  const { query, setQuery, debouncedQuery } = useSearch();
  const [ordersData, setOrdersData] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<any>(null);

  const [showModal, setShowModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfScale, setPdfScale] = useState<number>(1);

  /* ── NEW: order type filter ──────────────────────────────────────── */
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("");

  useEffect(() => {
    const isMobile = window.innerWidth < 700;
    setPdfScale(isMobile ? 0.56 : 1);
  }, []);

  const API_URL = "/api/order-operations";

  const handleDownloadClick = () => {
    const expandedRows: any[] = [];

    const orderIds = selectedRows.map((o: any) => o.order_id).join(",");

    let downloadAllAdded = false;

    selectedRows.forEach((order: any) => {
      let invoiceAdded = false;

      if (Array.isArray(order.items) && order.items.length > 0) {
        order.items.forEach((item: any) => {
          expandedRows.push({
            order_id: order.order_id,
            payment_id: order.payment_id,
            user_id: order.user_id,
            user_name: order.user_name,
            contact: order.contact,
            payment_date: order.payment_date,

            product_name: item.name,
            category: item.category,
            quantity: item.quantity,

            unit_price: item.unit_price,
            taxable_value: item.unit_price * item.quantity,

            gst_percent: item.gst,
            gst_amount: item.gst_amount,

            cgst: item.cgst,
            sgst: item.sgst,
            igst: item.igst,

            total_price: item.price_with_gst,

            invoice_download: invoiceAdded
              ? ""
              : `${window.location.origin}/api/invoice/${order.order_id}`,

            download_all_invoices:
              !downloadAllAdded && !invoiceAdded
                ? `${window.location.origin}/api/invoices/download?orders=${orderIds}`
                : "",
          });

          invoiceAdded = true;
          downloadAllAdded = true;
        });
      }
    });

    handleDownload<any>({
      rows: expandedRows,
      fileName: "orders",
      format: "xlsx",
      excludeHeaders: [],
      onStart: () => setDownloading(true),
      onFinish: () => setDownloading(false),
    });
  };

  useEffect(() => {
    if (!user?.user_id) return;

    let isMounted = true;

    (async () => {
      try {
        const firstOrderRes = await hasFirstOrder(user.user_id);
        const advanceRes = await hasAdvancePaid(user.user_id, 15000);

        if (!isMounted) return;

        const hasPermission =
          firstOrderRes.hasFirstOrder ||
          advanceRes.hasPermission ||
          firstOrderRes.activatedByAdmin;

        setHasPermission(hasPermission);
        setShowAlert(!hasPermission);
      } catch (err) {
        console.error("Permission check error:", err);
        if (isMounted) setShowAlert(true);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user?.user_id]);

  /* ── Fetch orders ────────────────────────────────────────────────── */
  const fetchOrders = useCallback(
    async (search: string, orderId?: string, id?: string) => {
      try {
        setLoading(true);

        const params: any = {
          search: search || "",
          role: user?.role,
          ...(user?.user_id && { user_id: user.user_id }),
          ...(dateFilter?.type === "on" && { date: dateFilter.date }),
          ...(dateFilter?.type === "range" && {
            from: dateFilter.from,
            to: dateFilter.to,
          }),
          /* ── pass advance filter to API ── */
          ...(orderTypeFilter === "advance" && { advance_used: true }),
          ...(orderTypeFilter === "normal" && { advance_used: false }),
        };

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
    [user?.role, user?.user_id, dateFilter, orderTypeFilter],
  );

  useEffect(() => {
    if (!user?.user_id) return;
    fetchOrders(debouncedQuery);
    goToPage(1);
  }, [debouncedQuery, user?.user_id, dateFilter, orderTypeFilter]);

  /* ── Delete ─────────────────────────────────────────────────────── */
  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_URL}?order_id=${id}`);
      setOrdersData((prev) => prev.filter((order: any) => order._id !== id));
      setTotalItems((prev) => prev - 1);
    } catch (error) {
      console.error("Error deleting order:", error);
    }
  };

  /* ── Edit ────────────────────────────────────────────────────────── */
  const handleEdit = (id: string) => {
    router.push(`/orders/orderDetailView/${id}`);
  };

  const columns: GridColDef[] = [
    { field: "order_id", headerName: "Order ID", flex: 1 },
    { field: "payment_id", headerName: "Transaction ID", flex: 1.5 },

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
      field: "total_amount",
      headerName: "Amount ( ₹ )",
      align: "right",
      flex: 1,
      renderCell: (params: GridRenderCellParams<any, number>) => (
        <span className="pr-5">
          ₹ {Number(params.value)?.toFixed(2) || "0.00"}
        </span>
      ),
    },
    { field: "order_status", headerName: "Status", flex: 1 },
    {
      field: "download",
      headerName: "Invoice",
      flex: 0.8,
      renderCell: (params: GridRenderCellParams) => (
        <div className="flex max-lg:gap-8 max-lg:min-w-38 gap-8 xl:items-center xl:justify-center mt-2">
          <button
            title="Preview Invoice"
            className="text-[#106187] cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handlePreviewPDF(params.row.order_id, setLoading, setPreviewUrl);
              setShowPreview(true);
            }}
          >
            <FaEye size={16} />
          </button>
          <button
            title="Download Invoice"
            className="text-[#106187] cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadPDF(params.row.order_id, setLoading);
            }}
          >
            <FaDownload size={15} />
          </button>
        </div>
      ),
    },
  ].filter(Boolean) as GridColDef[];

  const handlePageChange = useCallback(
    (page: number, offset: number, limit: number) => {},
    [query],
  );

  const {
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    startItem,
    endItem,
    goToPage,
  } = usePagination({
    totalItems,
    itemsPerPage: 12,
    onPageChange: handlePageChange,
  });

  const handleRowClick = (row: any) => {
    console.log("Order clicked:", row);
  };

  const handleAddOrder = async () => {
    if (!user?.user_id) {
      router.push("/orders/addorder");
      return;
    }

    try {
      const advanceRes = await hasAdvancePaid(user.user_id, 15000);

      if (advanceRes.hasAdvance && !advanceRes.advanceUsed) {
        router.push("/orders/order-mode");
        return;
      }

      router.push("/orders/addorder");
    } catch (err) {
      router.push("/orders/addorder");
    }
  };

  return (
    <Layout>
      {/* 🔔 Right Side Alert */}
      <AlertBox
        visible={showAlert}
        title="Action Required!"
        message={<>To activate your account, please place an order</>}
        buttonLabel="ORDER NOW"
        buttonAction={() => router.push("/historys/payAdvance")}
        onClose={() => setShowAlert(false)}
      />

      <div className="max-md:px-4 p-4 w-full max-w-[99%] mx-auto -mt-5">
        {(loading || downloading) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        {/* Floating Filter Icon */}
        <div title="Filter" className="fixed bottom-5 right-6 z-10">
          <button
            className="relative w-12 h-12 rounded-full bg-linear-to-r from-[#0C3978] via-[#106187] to-[#16B8E4] text-white flex items-center justify-center
             shadow-[0_4px_6px_rgba(0,0,0,0.3),0_8px_20px_rgba(0,0,0,0.25)] border border-gray-400 
             hover:shadow-[0_6px_10px_rgba(0,0,0,0.35),0_10px_25px_rgba(0,0,0,0.3)] active:translate-y-0.5 
             active:shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-all duration-200 cursor-pointer"
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
          showAddButton
          onAdd={handleAddOrder}
          onMore={handleDownloadClick}
          showPagination
          showMoreOptions={selectedRows.length > 0}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          startItem={startItem}
          endItem={endItem}
          onNext={nextPage}
          onPrev={prevPage}
        />

        {/* ── Order type filter pills — admin only ───────────────────────── */}
        {user?.role === "admin" && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-sm font-medium text-gray-600">
              Filter by type:
            </span>
            {ORDER_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setOrderTypeFilter(opt.value)}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                  orderTypeFilter === opt.value
                    ? "bg-[#0C3978] text-white border-[#0C3978]"
                    : "bg-white text-gray-600 border-gray-300 hover:border-[#0C3978] hover:text-[#0C3978]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        <Table
          columns={columns}
          rows={ordersData}
          currentPage={currentPage}
          setCurrentPage={goToPage}
          rowIdField="_id"
          pageSize={12}
          statusField="order"
          onIdClick={(id) => handleEdit(id)}
          checkboxSelection
          onRowClick={handleRowClick}
          setSelectedRows={setSelectedRows}
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

      {/* ==================== PDF PREVIEW MODAL ===================== */}
      {showPreview && previewUrl && (
        <div className="fixed inset-0 bg-black/60 z-100 flex items-center justify-center backdrop-blur-sm">
          <button
            className="absolute top-5 max-lg:top-5 right-15 max-lg:right-3 text-white bg-black rounded-full 
            w-7 h-7 cursor-pointer border-white border-2 font-bold"
            onClick={() => {
              setShowPreview(false);
              URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
            }}
          >
            ✕
          </button>

          <PdfPreview url={previewUrl} scale={pdfScale} />
        </div>
      )}
    </Layout>
  );
}
