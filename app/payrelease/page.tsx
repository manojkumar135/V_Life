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


/* ------------------------------------------------------------------ */
/* Filter options                                                       */
/* ------------------------------------------------------------------ */
const PAYOUT_TYPE_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Daily", value: "daily" },
  { label: "Fortnight", value: "fortnight" },
];

const API_URL = "/api/payrelease";

/* ------------------------------------------------------------------ */
/* Amount cell helper                                                   */
/* ------------------------------------------------------------------ */
const AmtCell = ({
  value,
  fallback = "—",
}: {
  value: number | undefined | null;
  fallback?: string;
}) =>
  value != null ? (
    <span className="pr-4">₹ {Number(value).toFixed(2)}</span>
  ) : (
    <span className="text-gray-400 pr-4">{fallback}</span>
  );

const PtsCell = ({ value }: { value: number | undefined | null }) =>
  value != null ? (
    <span className="pr-4 font-medium text-[#0C3978]">
      {Number(value).toLocaleString()}
    </span>
  ) : (
    <span className="text-gray-400 pr-4">—</span>
  );

export default function EligiblePayoutsPage() {
  const { user } = useVLife();
    const router = useRouter();
  

  const { query, setQuery, debouncedQuery } = useSearch();
  const [reportData, setReportData] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dateFilter, setDateFilter] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [payoutTypeFilter, setPayoutTypeFilter] = useState<string>("all");

  /* ── Fetch ─────────────────────────────────────────────────────── */
  const fetchReport = useCallback(
    async (search: string) => {
      try {
        setLoading(true);
        const params: any = {
          search: search || "",
          filter: payoutTypeFilter,
          ...(dateFilter?.type === "on" && { date: dateFilter.date }),
          ...(dateFilter?.type === "range" && {
            from: dateFilter.from,
            to: dateFilter.to,
          }),
        };
        const { data } = await axios.get(API_URL, { params });
        const rows = data.data || [];
        setReportData(rows);
        setTotalItems(rows.length);
      } catch (error) {
        console.error("Error fetching eligible payouts:", error);
        ShowToast.error("Failed to load eligible payouts");
      } finally {
        setLoading(false);
      }
    },
    [payoutTypeFilter, dateFilter],
  );

  useEffect(() => {
    fetchReport(debouncedQuery);
    goToPage(1);
  }, [debouncedQuery, payoutTypeFilter, dateFilter]);

  /* ── Download ──────────────────────────────────────────────────── */
  const handleDownloadClick = () => {
    const rows = selectedRows.length > 0 ? selectedRows : reportData;
    const flatRows = rows.map((row: any) => ({
      user_id: row.user_id,
      user_name: row.user_name,
      contact: row.contact,
      rank: row.rank,
      pan_number: row.pan_number,
      bank_name: row.bank_name,
      account_number: row.account_number,
      ifsc_code: row.ifsc_code,

      // Payout (money pending release)
      daily_payout_amount: row.daily?.payout_total ?? 0,
      daily_payout_count: row.daily?.payout_count ?? 0,
      fortnight_payout_amount: row.fortnight?.payout_total ?? 0,
      fortnight_payout_count: row.fortnight?.payout_count ?? 0,
      combined_payout_total: row.combined_payout_total ?? 0,

      // Score (live points balance)
      daily_score_balance: row.score?.daily_balance ?? 0,
      daily_score_earned: row.score?.daily_earned ?? 0,
      daily_score_used: row.score?.daily_used ?? 0,
      fortnight_score_balance: row.score?.fortnight_balance ?? 0,
      fortnight_score_earned: row.score?.fortnight_earned ?? 0,
      fortnight_score_used: row.score?.fortnight_used ?? 0,
    }));

    handleDownload<any>({
      rows: flatRows,
      fileName: "eligible_payouts_report",
      format: "xlsx",
      excludeHeaders: [],
      onStart: () => setDownloading(true),
      onFinish: () => setDownloading(false),
    });
  };

  /* ── Pagination ────────────────────────────────────────────────── */
  const {
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    startItem,
    endItem,
    goToPage,
  } = usePagination({ totalItems, itemsPerPage: 12, onPageChange: () => {} });

  /* ── Columns ───────────────────────────────────────────────────── */
  const showDaily = payoutTypeFilter !== "fortnight";
  const showFortnight = payoutTypeFilter !== "daily";

  const columns: GridColDef[] = [
    { field: "user_id", headerName: "User ID", flex: 1 },
    { field: "user_name", headerName: "Name", flex: 1.2 },
    { field: "contact", headerName: "Contact", flex: 1 },
    { field: "rank", headerName: "Rank", flex: 0.7 },

    /* ── Daily payout (money pending) ──────────────────────────── */
    ...(showDaily
      ? ([
          {
            field: "daily_payout",
            headerName: "Daily Payout (₹)",
            flex: 1.1,
            align: "right" as const,
            renderCell: (params: GridRenderCellParams) => (
              <AmtCell value={params.row.daily?.payout_total} />
            ),
          },
          {
            field: "daily_payout_count",
            headerName: "Daily Records",
            flex: 0.8,
            align: "center" as const,
            renderCell: (params: GridRenderCellParams) => (
              <span>{params.row.daily?.payout_count ?? "—"}</span>
            ),
          },
        ] as GridColDef[])
      : []),

    /* ── Daily score balance (live points) ─────────────────────── */
    ...(showDaily
      ? ([
          {
            field: "daily_score_balance",
            headerName: "Daily Score Bal",
            flex: 1,
            align: "right" as const,
            renderCell: (params: GridRenderCellParams) => (
              <PtsCell value={params.row.score?.daily_balance} />
            ),
          },
        ] as GridColDef[])
      : []),

    /* ── Fortnight payout (money pending) ──────────────────────── */
    ...(showFortnight
      ? ([
          {
            field: "fortnight_payout",
            headerName: "Fortnight Payout (₹)",
            flex: 1.1,
            align: "right" as const,
            renderCell: (params: GridRenderCellParams) => (
              <AmtCell value={params.row.fortnight?.payout_total} />
            ),
          },
          {
            field: "fortnight_payout_count",
            headerName: "Fortnight Records",
            flex: 0.8,
            align: "center" as const,
            renderCell: (params: GridRenderCellParams) => (
              <span>{params.row.fortnight?.payout_count ?? "—"}</span>
            ),
          },
        ] as GridColDef[])
      : []),

    /* ── Fortnight score balance (live points) ──────────────────── */
    ...(showFortnight
      ? ([
          {
            field: "fortnight_score_balance",
            headerName: "Fortnight Score Bal",
            flex: 1,
            align: "right" as const,
            renderCell: (params: GridRenderCellParams) => (
              <PtsCell value={params.row.score?.fortnight_balance} />
            ),
          },
        ] as GridColDef[])
      : []),

    /* ── Combined payout total ──────────────────────────────────── */
    {
      field: "combined_payout_total",
      headerName: "Total Payout (₹)",
      flex: 1,
      align: "right",
      renderCell: (params: GridRenderCellParams<any, number>) => (
        <span className="pr-4 font-semibold text-[#0C3978]">
          ₹ {Number(params.value ?? 0).toFixed(2)}
        </span>
      ),
    },
  ];

  /* ── Summary totals ────────────────────────────────────────────── */
  const totalDailyPayout = reportData.reduce(
    (s, r) => s + (r.daily?.payout_total || 0),
    0,
  );
  const totalFortnightPayout = reportData.reduce(
    (s, r) => s + (r.fortnight?.payout_total || 0),
    0,
  );
  const totalDailyScore = reportData.reduce(
    (s, r) => s + (r.score?.daily_balance || 0),
    0,
  );
  const totalFortnightScore = reportData.reduce(
    (s, r) => s + (r.score?.fortnight_balance || 0),
    0,
  );

  const summaryCards = [
    {
      label: "Eligible Users",
      value: reportData.length,
      color: "from-[#0C3978] to-[#106187]",
      isPoints: false,
    },
    {
      label: "Total Daily Payout",
      value: `₹ ${totalDailyPayout.toFixed(2)}`,
      color: "from-[#106187] to-[#16B8E4]",
      isPoints: false,
    },
    {
      label: "Total Fortnight Payout",
      value: `₹ ${totalFortnightPayout.toFixed(2)}`,
      color: "from-[#0C3978] to-[#16B8E4]",
      isPoints: false,
    },
    {
      label: "Grand Payout Total",
      value: `₹ ${(totalDailyPayout + totalFortnightPayout).toFixed(2)}`,
      color: "from-[#106187] to-[#0C3978]",
      isPoints: false,
    },
    {
      label: "Daily Score Balance",
      value: totalDailyScore.toLocaleString() + " pts",
      color: "from-[#0C3978] to-[#106187]",
      isPoints: true,
    },
    {
      label: "Fortnight Score Bal",
      value: totalFortnightScore.toLocaleString() + " pts",
      color: "from-[#106187] to-[#16B8E4]",
      isPoints: true,
    },
  ].filter((c) => {
    if (payoutTypeFilter === "daily")
      return !c.label.toLowerCase().includes("fortnight");
    if (payoutTypeFilter === "fortnight")
      return !c.label.toLowerCase().includes("daily");
    return true;
  });

  const onBack = () => router.push("/reports");

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <Layout>
      <div className="max-md:px-4 p-4 w-full max-w-[99%] mx-auto -mt-5">
        {(loading || downloading) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        {/* Floating Filter */}
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
          title="Eligible Payouts"
          showBack
          onBack={onBack}
          search={query}
          setSearch={setQuery}
          showAddButton={false}
          onMore={handleDownloadClick}
          showMoreOptions={true}
          showPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          startItem={startItem}
          endItem={endItem}
          onNext={nextPage}
          onPrev={prevPage}
        />

        {/* Filter pills */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-sm font-medium text-gray-600">
            Filter by type:
          </span>
          {PAYOUT_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPayoutTypeFilter(opt.value)}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                payoutTypeFilter === opt.value
                  ? "bg-[#0C3978] text-white border-[#0C3978]"
                  : "bg-white text-gray-600 border-gray-300 hover:border-[#0C3978] hover:text-[#0C3978]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className={`bg-gradient-to-br ${card.color} text-white rounded-xl p-4 shadow`}
            >
              <p className="text-xs opacity-80 mb-1">{card.label}</p>
              <p className="text-base font-bold truncate">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-3 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-[#0C3978]" />
            Score Balance = live points remaining (earned − used on orders)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-[#16B8E4]" />
            Payout Amount = pending money to be released
          </span>
        </div>

        <Table
          columns={columns}
          rows={reportData}
          currentPage={currentPage}
          setCurrentPage={goToPage}
          rowIdField="user_id"
          pageSize={12}
          checkboxSelection
          setSelectedRows={setSelectedRows}
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
