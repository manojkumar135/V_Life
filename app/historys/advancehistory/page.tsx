"use client";
import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import HeaderWithActions from "@/components/common/componentheader";
import { useRouter } from "next/navigation";
import { useVLife } from "@/store/context";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import axios from "axios";
import Loader from "@/components/common/loader";
import ShowToast from "@/components/common/Toast/toast";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import DateFilterModal from "@/components/common/DateRangeModal/daterangemodal";
import { FiFilter } from "react-icons/fi";
import AlertBox from "@/components/Alerts/advanceAlert";
import { hasAdvancePaid } from "@/utils/hasAdvancePaid";
import { FaPlusCircle, FaMinusCircle, FaEye, FaDownload } from "react-icons/fa";
import { handleDownload } from "@/utils/handleDownload";
import dynamic from "next/dynamic";
import { dummyPreviewPDF, dummyDownloadPDF } from "@/lib/dummyInvoiceActions";

const PdfPreview = dynamic(() => import("@/components/PDF/PdfPreview"), {
  ssr: false,
});

export default function AdvanceHistoryPage() {
  const router = useRouter();
  const { user } = useVLife();

  const { query, setQuery, debouncedQuery } = useSearch();

  const [data, setData] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  const [showAlert, setShowAlert] = useState(false);
  const [advancePaid, setAdvancePaid] = useState(false);

  const [dateFilter, setDateFilter] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfScale, setPdfScale] = useState<number>(1);

  const API_URL = "/api/get-advance";

  // 🔹 Mobile responsive scaling PDF
  useEffect(() => {
    const isMobile = window.innerWidth < 700;
    setPdfScale(isMobile ? 0.56 : 1);
  }, []);

  // 🔹 Export
  const handleExport = () => {
    handleDownload({
      rows: selectedRows,
      fileName: "advance_payments",
      format: "xlsx",
      excludeHeaders: [
        "_id",
        "__v",
        "created_at",
        "created_by",
        "last_modified_at",
        "last_modified_by",
      ],
      onStart: () => setDownloading(true),
      onFinish: () => setDownloading(false),
    });
  };

  // 🔹 Check initial advance payment status
  useEffect(() => {
    if (!user?.user_id) return;
    (async () => {
      const paid = await hasAdvancePaid(user?.user_id, 10000);
      setAdvancePaid(paid.hasPermission);
      setShowAlert(!paid.hasPermission);
    })();
  }, [user?.user_id]);

  // 🔹 Fetch Advance payments
  const fetchHistory = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      setLoading(true);

      const { data } = await axios.get(API_URL, {
        params: {
          search: debouncedQuery || "",
          role: user?.role,
          user_id: user?.user_id,
          ...(dateFilter?.type === "on" && { date: dateFilter.date }),
          ...(dateFilter?.type === "range" && {
            from: dateFilter.from,
            to: dateFilter.to,
          }),
        },
      });

      //   console.log(data)
      const list = data.data || [];
      setData(list);
      setTotalItems(list.length);
    } catch (err) {
      ShowToast.error("Unable to load advance history.");
    } finally {
      setLoading(false);
    }
    goToPage(1);
  }, [debouncedQuery, user?.user_id, dateFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatTime = (value: string) => {
    // console.log("Formatting time:", value);
    if (!value) return "";

    // CASE 1: Already in 12-hour format (contains AM/PM)
    if (/am|pm/i.test(value)) {
      return value.toUpperCase();
    }

    // CASE 2: Convert 24-hour → 12-hour format
    const [hourStr, minuteStr] = value.split(":");
    let hour = Number(hourStr);
    const minute = minuteStr?.padStart(2, "0") || "00";

    const ampm = hour >= 12 ? "PM" : "AM";

    hour = hour % 12 || 12;

    return `${hour.toString().padStart(2, "0")}:${minute} ${ampm}`;
  };

  /** ======================== TABLE COLUMNS ========================= */

  const columns: GridColDef[] = [
    { field: "transaction_id", headerName: "Transaction ID", flex: 0.8 },

    user?.role === "admin" && {
      field: "user_id",
      headerName: "User ID",
      flex: 0.7,
    },
    user?.role === "admin" && {
      field: "user_name",
      headerName: "Name",
      flex: 1,
    },
    // { field: "contact", headerName: "Contact", flex: 0.7 },

    { field: "date", headerName: "Date", flex: 0.7 },
    {
      field: "time",
      headerName: "Time",
      flex: 0.6,
      renderCell: (params: any) => {
        const time = params?.row?.time;
        // console.log("Original time value:", time);
        return formatTime(time);
      },
    },

    {
      field: "amount",
      headerName: "Amount (₹)",
      align: "right",
      flex: 0.7,
      renderCell: (params: any) => (
        <span className="pr-5">₹ {Number(params.value ?? 0).toFixed(2)}</span>
      ),
    },

    // {
    //   field: "transaction_type",
    //   headerName: "Type",
    //   flex: 0.6,
    //   renderCell: (params: any) => {
    //     const type = String(params.value).toLowerCase();

    //     // 👇 flip values
    //     return type === "credit" ? "Debit" : "Credit";
    //   },
    // },

    {
      field: "invoice",
      headerName: "Invoice",
      flex: 0.7,
      renderCell: (params: any) => (
        <div className="flex gap-6 mt-1 items-center justify-center">
          {/* Preview */}
          <button
            className="text-[#106187] cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              dummyPreviewPDF(
                params.row._id,
                setLoading,
                setPreviewUrl
              );
              setShowPreview(true);
            }}
          >
            <FaEye size={16} />
          </button>

          {/* Download */}
          <button
            className="text-[#106187] cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              dummyDownloadPDF(params.row._id, setLoading);
            }}
          >
            <FaDownload size={15} />
          </button>
        </div>
      ),
    },
  ].filter(Boolean) as GridColDef[];

  /** ======================== PAGINATION ========================= */

  const {
    currentPage,
    totalPages,
    startItem,
    endItem,
    nextPage,
    prevPage,
    goToPage,
  } = usePagination({
    totalItems,
    itemsPerPage: 12,
  });

  /** ======================== UI ========================= */

  return (
    <Layout>
      {/* ALERT */}
      <AlertBox
        visible={showAlert}
        title="Prepaid Required"
        message={
            <>
              To activate your account, please place{" "}an order
            </>
          }
          buttonLabel="ORDER NOW"
        buttonAction={() => router.push("/historys/payAdvance")}
        onClose={() => setShowAlert(false)}
      />

      <div className="max-md:px-4 p-4 w-full max-w-[99%] mx-auto -mt-5 ">
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        {/* Header */}
        <HeaderWithActions
          title="Advances"
          search={query}
          setSearch={setQuery}
          showBack={user.role !== "user"}
          showPagination
          showMoreOptions
          showAddButton={!advancePaid}
          addLabel="Make Payment"
          onAdd={() => router.push("/historys/payAdvance")}
          onBack={() => router.push("/historys/adminhistory")}
          onMore={handleExport}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          startItem={startItem}
          endItem={endItem}
          onNext={nextPage}
          onPrev={prevPage}
        />

        {/* Floating Filter */}
        <div
          title="Filter"
          className="fixed bottom-5 right-6 z-10 cursor-pointer"
        >
          <button
            onClick={() => setShowModal(true)}
            className="w-12 h-12 rounded-full
            bg-gradient-to-r from-[#0C3978] via-[#106187] to-[#16B8E4]
            text-white flex items-center justify-center shadow-lg cursor-pointer"
          >
            <FiFilter size={20} />
          </button>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          rows={data}
          rowIdField="_id"
          currentPage={currentPage}
          setCurrentPage={goToPage}
          pageSize={12}
          checkboxSelection
          setSelectedRows={setSelectedRows}
          onRowClick={(row) => console.log("Advance Clicked:", row)}
        />

        {/* Date filter modal */}
        <DateFilterModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={(filter) => {
            setDateFilter(filter);
            setShowModal(false);
          }}
        />
      </div>

      {/* ===================== PDF PREVIEW ===================== */}
      {showPreview && previewUrl && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm">
          <button
            className="absolute top-5 right-5 text-white bg-black
            rounded-full w-7 h-7 border font-bold flex items-center justify-center"
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
