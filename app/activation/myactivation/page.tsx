"use client";

import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import { useRouter } from "next/navigation";
import axios from "axios";
import Loader from "@/components/common/loader";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { useVLife } from "@/store/context";
import { FiFilter } from "react-icons/fi";
import DateFilterModal from "@/components/common/DateRangeModal/daterangemodal";
import ShowToast from "@/components/common/Toast/toast";
import { handleDownload } from "@/utils/handleDownload";

import { FaEye, FaDownload } from "react-icons/fa";
import dynamic from "next/dynamic";
import { handleDownloadPDF } from "@/lib/invoiceDownload";
import { handlePreviewPDF } from "@/lib/invoicePreview";

const PdfPreview = dynamic(() => import("@/components/PDF/PdfPreview"), {
  ssr: false,
});

export default function MyActivationsPage() {
  const { user } = useVLife();
  const router = useRouter();

  const { query, setQuery, debouncedQuery } = useSearch();

  const [rows, setRows] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [dateFilter, setDateFilter] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  // PDF preview
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfScale, setPdfScale] = useState(1);

  const API_URL = "/api/get-activations";

  /* ---------------- PDF SCALE ---------------- */
  useEffect(() => {
    const isMobile = window.innerWidth < 700;
    setPdfScale(isMobile ? 0.56 : 1);
  }, []);

  /* ---------------- FETCH ACTIVATIONS ---------------- */
  const fetchActivations = useCallback(
    async (search: string) => {
      if (!user) return;

      try {
        setLoading(true);

        const params: any = {
          search: search || "",
          role: user.role,
          user_id: user.user_id,
        };

        if (dateFilter?.type === "on") params.date = dateFilter.date;
        if (dateFilter?.type === "range") {
          params.from = dateFilter.from;
          params.to = dateFilter.to;
        }

        const { data } = await axios.get(API_URL, { params });

        if (data?.success) {
          setRows(data.data || []);
          setTotalItems(data.data.length);
        } else {
          ShowToast.error("Failed to load activations");
        }
      } catch (err) {
        console.error(err);
        ShowToast.error("Failed to load activations");
      } finally {
        setLoading(false);
      }
    },
    [user, dateFilter]
  );

  useEffect(() => {
    fetchActivations(debouncedQuery);
    goToPage(1);
  }, [debouncedQuery, dateFilter]);

  const onBack = () => {
    router.push("/activation/activationform");
  };

  /* ---------------- BULK DOWNLOAD ---------------- */
  const handleDownloadClick = () => {
    handleDownload({
      rows: selectedRows,
      fileName: "my-activations",
      format: "xlsx",
      excludeHeaders: [
        "_id",
        "__v",
        "items",
        "created_at",
        "last_modified_at",
        "bonus_checked",
      ],
      onStart: () => setDownloading(true),
      onFinish: () => setDownloading(false),
    });
  };

  const handleEdit = (id: string) => {
    router.push(`/activation/activationview/${id}`);
  };

   const handleRowClick = (row: any) => {
    console.log("Order clicked:", row);
    // handle navigation or modal etc.
  };

  /* ---------------- COLUMNS ---------------- */
  const columns: GridColDef[] = [
    {
      field: "order_id",
      headerName: "Order ID",
      flex: 0.8,
    },

    /* ================= ADMIN ================= */
    user?.role === "admin" && {
      field: "activated_user",
      headerName: "Activated User",
      flex: 1,
      renderCell: (params: any) => {
        const b = params.row.beneficiary;
        return b ? `${b.user_id} - ${b.name}` : "-";
      },
    },

    user?.role === "admin" && {
      field: "placed_by",
      headerName: "Placed By",
      flex: 1,
      renderCell: (params: any) => {
        const p = params.row.placed_by;
        return p ? `${p.user_id} - ${p.name}` : "-";
      },
    },

    /* ================= NORMAL USER ================= */
    user?.role !== "admin" && {
      field: "activated_user",
      headerName: "Activated User",
      flex: 1,
      renderCell: (params: any) => {
        const b = params.row.beneficiary;
        return b ? `${b.user_id} - ${b.name}` : "-";
      },
    },

    /* ================= COMMON ================= */
    {
      field: "total_amount",
      headerName: "Amount (₹)",
      align: "right",
      flex: 1,
      renderCell: (params: GridRenderCellParams<any, number>) => (
        <span className="pr-5">₹ {Number(params.value || 0).toFixed(2)}</span>
      ),
    },

    {
      field: "payment_date",
      headerName: "Date",
      flex: 0.8,
    },

    {
      field: "payment_time",
      headerName: "Time",
      flex: 0.8,
    },

    {
      field: "order_status",
      headerName: "Status",
      flex: 0.8,
      renderCell: (p: any) => <span className="capitalize">{p.value}</span>,
    },

    /* ================= INVOICE ================= */
    {
      field: "invoice",
      headerName: "Invoice",
      flex: 0.9,
      sortable: false,
      filterable: false,
      renderCell: (params: any) => (
        <div className="flex gap-8 items-center justify-center mt-2">
          <button
            title="Preview Invoice"
            className="text-[#106187]"
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
            className="text-[#106187]"
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

  /* ---------------- PAGINATION ---------------- */
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
  });

  return (
    <Layout>
      <div className="max-md:px-4 p-4 w-full max-w-[99%] mx-auto -mt-5">
        {(loading || downloading) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        {/* Floating Filter */}
        <div className="fixed bottom-5 right-6 z-10">
          <button
            className="relative w-12 h-12 rounded-full bg-gradient-to-r 
            from-[#0C3978] via-[#106187] to-[#16B8E4] 
            text-white flex items-center justify-center shadow-lg"
            onClick={() => setShowModal(true)}
          >
            <FiFilter size={20} />
          </button>
        </div>

        <HeaderWithActions
          title="My Activations"
          search={query}
          setSearch={setQuery}
          showBack
          onBack={onBack}
          onMore={handleDownloadClick}
          showMoreOptions
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
          rows={rows}
          columns={columns}
          rowIdField="_id"
          pageSize={12}
          currentPage={currentPage}
          setCurrentPage={goToPage}
          checkboxSelection
          setSelectedRows={setSelectedRows}
          onIdClick={(id) => handleEdit(id)}
                    onRowClick={handleRowClick}

        />

        <DateFilterModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={(filter) => {
            setDateFilter(filter);
            setShowModal(false);
          }}
        />
      </div>

      {/* ================= PDF PREVIEW MODAL ================= */}
      {showPreview && previewUrl && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm">
          <button
            className="absolute top-5 right-5 text-white bg-black rounded-full 
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
