"use client";
import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import axios from "axios";
import Loader from "@/components/common/loader";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { useVLife } from "@/store/context";
import ShowToast from "@/components/common/Toast/toast";
import { FiFilter } from "react-icons/fi";
import DateFilterModal from "@/components/common/DateRangeModal/daterangemodal";
import { handleDownload } from "@/utils/handleDownload";
import { useRouter } from "next/navigation";

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

interface PvMonthBreakdown {
  month: string;
  pv_required: number;
  pv_fulfilled: number;
  pv_remaining: number;
  total_payout: number;
  cleared: boolean;
}

interface PvTrackerRow {
  user_id: string;
  user_name: string;
  contact: string;
  mail: string;
  totalPvRequired: number;
  totalPvFulfilled: number;
  totalPvRemaining: number;
  months: PvMonthBreakdown[];
}

// ─────────────────────────────────────────────────────────────────────────
// Month Breakdown Cell
// ─────────────────────────────────────────────────────────────────────────

const MonthBreakdownCell = ({ months }: { months: PvMonthBreakdown[] }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => !p);
        }}
        className="text-xs text-blue-600 underline hover:text-blue-800"
      >
        {open ? "Hide ▲" : `${months.length} month(s) ▼`}
      </button>

      {open && (
        <div className="mt-1 space-y-0.5">
          {months.map((m) => (
            <div
              key={m.month}
              className="flex justify-between text-xs gap-3 border-b pb-0.5"
            >
              <span className="text-gray-600 font-medium">{m.month}</span>
              <span
                className={
                  m.pv_remaining > 0
                    ? "text-red-600 font-semibold"
                    : "text-green-600"
                }
              >
                {m.pv_remaining > 0 ? `${m.pv_remaining} PV left` : "✅"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export default function PvTrackerPage() {
  const { user } = useVLife();
  const router = useRouter();

  const { query, setQuery, debouncedQuery } = useSearch();

  const [pvData, setPvData] = useState<PvTrackerRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dateFilter, setDateFilter] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  // ── Download ──────────────────────────────────────────────────────────
  const handleDownloadClick = () => {
    handleDownload<any>({
      rows: selectedRows,
      fileName: "pv-tracker",
      format: "xlsx",
      excludeHeaders: ["_id", "__v", "months", "mail"],
      onStart: () => setDownloading(true),
      onFinish: () => setDownloading(false),
    });
  };

  // ── Fetch ─────────────────────────────────────────────────────────────
  const fetchPvTracker = useCallback(
    async (search: string) => {
      try {
        setLoading(true);

        const params: any = {
          search: search || "",
          ...(dateFilter?.type === "on" && { date: dateFilter.date }),
          ...(dateFilter?.type === "range" && {
            from: dateFilter.from,
            to: dateFilter.to,
          }),
        };

        // No user_id passed → list view
        const { data } = await axios.get("/api/pv-tracker", { params });
        const rows = data.data || [];

        setPvData(rows);
        setTotalItems(rows.length);
      } catch (error) {
        console.error("PV Tracker fetch error:", error);
        ShowToast.error("Failed to load PV tracker data");
      } finally {
        setLoading(false);
      }
    },
    [dateFilter],
  );

  useEffect(() => {
    fetchPvTracker(debouncedQuery);
    goToPage(1);
  }, [debouncedQuery, dateFilter]);

  // ── Navigate to detail — pass user_id as search param ────────────────
  const handleViewDetail = (user_id: string) => {
    router.push(`/pvtracker/detailview?user_id=${user_id}`);
  };

  // ── Columns ───────────────────────────────────────────────────────────
  const columns: GridColDef[] = [
    { field: "user_id", headerName: "User ID", flex: 0.8 },
    { field: "user_name", headerName: "Name", flex: 1 },
    { field: "contact", headerName: "Contact", flex: 1 },
    {
      field: "totalPvRequired",
      headerName: "PV Required",
      flex: 0.8,
      align: "center",
      headerAlign: "center",
      renderCell: (params: GridRenderCellParams) => (
        <span className="font-semibold text-gray-700">{params.value ?? 0}</span>
      ),
    },
    {
      field: "totalPvFulfilled",
      headerName: "PV Fulfilled",
      flex: 0.8,
      align: "center",
      headerAlign: "center",
      renderCell: (params: GridRenderCellParams) => (
        <span className="font-semibold text-green-600">
          {params.value ?? 0}
        </span>
      ),
    },
    {
      field: "totalPvRemaining",
      headerName: "PV Remaining",
      flex: 0.8,
      align: "center",
      headerAlign: "center",
      renderCell: (params: GridRenderCellParams) => {
        const val = params.value ?? 0;
        return (
          <span
            className={`font-semibold ${
              val > 0 ? "text-red-500" : "text-green-600"
            }`}
          >
            {val > 0 ? `${val} PV` : "✅ Clear"}
          </span>
        );
      },
    },
    {
      field: "months",
      headerName: "Month Breakdown",
      flex: 1.5,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams) => (
        <MonthBreakdownCell months={params.value ?? []} />
      ),
    },
  ];

  // ── Pagination ────────────────────────────────────────────────────────
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
    onPageChange: useCallback(() => {}, []),
  });

  const onBack = () => router.push("/reports");

  return (
    <Layout>
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
          title="PV Tracker"
          search={query}
          setSearch={setQuery}
          showAddButton={false}
          showBack
          onBack={onBack}
          showMoreOptions
          onMore={handleDownloadClick}
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
          rows={pvData}
          currentPage={currentPage}
          setCurrentPage={goToPage}
          rowIdField="user_id"
          pageSize={12}
          checkboxSelection
          setSelectedRows={setSelectedRows}
          // ── clicking user_id cell navigates to detail ──
          onIdClick={(user_id) => handleViewDetail(user_id)}
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
    </Layout>
  );
}
