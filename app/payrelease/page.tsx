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
const PAYOUT_TYPE_OPTIONS = [
  { label: "All",       value: "all"       },
  { label: "Daily",     value: "daily"     },
  { label: "Fortnight", value: "fortnight" },
];

const API_URL = "/api/payrelease";

/* ------------------------------------------------------------------ */
/* Cell helpers                                                         */
/* ------------------------------------------------------------------ */
const AmtCell = ({
  value,
  className = "",
}: {
  value: number | undefined | null;
  className?: string;
}) =>
  value != null ? (
    <span className={`pr-4 ${className}`}>₹ {Number(value).toFixed(2)}</span>
  ) : (
    <span className="text-gray-400 pr-4">—</span>
  );

export default function EligiblePayoutsPage() {
  const { user } = useVLife();
    const router = useRouter();


  const { query, setQuery, debouncedQuery } = useSearch();
  const [reportData, setReportData]         = useState<any[]>([]);
  const [totalItems, setTotalItems]         = useState(0);
  const [loading, setLoading]               = useState(false);
  const [downloading, setDownloading]       = useState(false);
  const [dateFilter, setDateFilter]         = useState<any>(null);
  const [showModal, setShowModal]           = useState(false);
  const [selectedRows, setSelectedRows]     = useState<any[]>([]);
  const [payoutTypeFilter, setPayoutTypeFilter] = useState("all");

  /* ── Fetch ─────────────────────────────────────────────────────── */
  const fetchReport = useCallback(
    async (search: string) => {
      try {
        setLoading(true);
        const params: any = {
          search: search || "",
          filter: payoutTypeFilter,
          ...(dateFilter?.type === "on"    && { date: dateFilter.date }),
          ...(dateFilter?.type === "range" && { from: dateFilter.from, to: dateFilter.to }),
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
    [payoutTypeFilter, dateFilter]
  );

  useEffect(() => {
    fetchReport(debouncedQuery);
    goToPage(1);
  }, [debouncedQuery, payoutTypeFilter, dateFilter]);

  /* ── Download ──────────────────────────────────────────────────── */
  const handleDownloadClick = () => {
    const rows = selectedRows.length > 0 ? selectedRows : reportData;

    const flatRows = rows.map((row: any) => ({
      user_id:        row.user_id,
      user_name:      row.user_name,
      contact:        row.contact,
      rank:           row.rank,
      pan_number:     row.pan_number,
      bank_name:      row.bank_name,
      account_number: row.account_number,
      ifsc_code:      row.ifsc_code,

      // Daily
      daily_original_amount: row.daily?.original_total ?? 0,
      daily_payable_amount:  row.daily?.payable        ?? 0,
      daily_payout_count:    row.daily?.payout_count   ?? 0,

      // Fortnight
      fortnight_original_amount: row.fortnight?.original_total ?? 0,
      fortnight_payable_amount:  row.fortnight?.payable        ?? 0,
      fortnight_payout_count:    row.fortnight?.payout_count   ?? 0,

      // Total
      combined_payable: row.combined_payable ?? 0,
    }));

    handleDownload<any>({
      rows: flatRows,
      fileName: "eligible_payouts_report",
      format: "xlsx",
      excludeHeaders: [],
      onStart:  () => setDownloading(true),
      onFinish: () => setDownloading(false),
    });
  };

  /* ── Pagination ────────────────────────────────────────────────── */
  const { currentPage, totalPages, nextPage, prevPage, startItem, endItem, goToPage } =
    usePagination({ totalItems, itemsPerPage: 12, onPageChange: () => {} });

  /* ── Columns ───────────────────────────────────────────────────── */
  const showDaily     = payoutTypeFilter !== "fortnight";
  const showFortnight = payoutTypeFilter !== "daily";

  const columns: GridColDef[] = [
    { field: "user_id",   headerName: "User ID",  flex: 1   },
    { field: "user_name", headerName: "Name",      flex: 1.2 },
    { field: "contact",   headerName: "Contact",   flex: 1   },
{
      field: "rank",
      headerName: "Rank",
      flex: 1,
      renderCell: (params: any) => {
        const value = params.value;

        if (
          value === null ||
          value === undefined ||
          value === "" ||
          value === "none" ||
          String(value).toLowerCase() === "null"
        ) {
          return "-";
        }

        const num = Number(value);

        // If number between 1–5
        if (!isNaN(num) && num >= 1 && num <= 5) {
          if (num === 1) return "1 Star";
          return "2 Star"; // for 2–5
        }

        // String case → capitalize only (no "Star")
        return (
          String(value).charAt(0).toUpperCase() +
          String(value).slice(1).toLowerCase()
        );
      },
    },
    /* ── Daily columns ──────────────────────────────────────────── */
    ...(showDaily
      ? ([
          {
            field: "daily_original",
            headerName: "Daily Original (₹)",
            flex: 1.1,
            align: "right" as const,
            renderCell: (p: GridRenderCellParams) => (
              <AmtCell value={p.row.daily?.original_total} className="text-gray-500" />
            ),
          },
          {
            field: "daily_payable",
            headerName: "Daily Payable (₹)",
            flex: 1.1,
            align: "right" as const,
            renderCell: (p: GridRenderCellParams) => (
              <AmtCell
                value={p.row.daily?.payable}
                className="font-semibold text-[#0C3978]"
              />
            ),
          },
          {
            field: "daily_count",
            headerName: "Daily Records",
            flex: 0.8,
            align: "center" as const,
            renderCell: (p: GridRenderCellParams) => (
              <span>{p.row.daily?.payout_count ?? "—"}</span>
            ),
          },
        ] as GridColDef[])
      : []),

    /* ── Fortnight columns ──────────────────────────────────────── */
    ...(showFortnight
      ? ([
          {
            field: "fortnight_original",
            headerName: "Fortnight Original (₹)",
            flex: 1.2,
            align: "right" as const,
            renderCell: (p: GridRenderCellParams) => (
              <AmtCell value={p.row.fortnight?.original_total} className="text-gray-500" />
            ),
          },
          {
            field: "fortnight_payable",
            headerName: "Fortnight Payable (₹)",
            flex: 1.2,
            align: "right" as const,
            renderCell: (p: GridRenderCellParams) => (
              <AmtCell
                value={p.row.fortnight?.payable}
                className="font-semibold text-[#0C3978]"
              />
            ),
          },
          {
            field: "fortnight_count",
            headerName: "Fortnight Records",
            flex: 0.9,
            align: "center" as const,
            renderCell: (p: GridRenderCellParams) => (
              <span>{p.row.fortnight?.payout_count ?? "—"}</span>
            ),
          },
        ] as GridColDef[])
      : []),

    /* ── Combined payable ───────────────────────────────────────── */
    {
      field: "combined_payable",
      headerName: "Total Payable (₹)",
      flex: 1,
      align: "right",
      renderCell: (p: GridRenderCellParams<any, number>) => (
        <span className="pr-4 font-bold text-green-700">
          ₹ {Number(p.value ?? 0).toFixed(2)}
        </span>
      ),
    },
  ];

  /* ── Summary totals ────────────────────────────────────────────── */
  const totalDailyOriginal     = reportData.reduce((s, r) => s + (r.daily?.original_total     || 0), 0);
  const totalDailyPayable      = reportData.reduce((s, r) => s + (r.daily?.payable            || 0), 0);
  const totalFortnightOriginal = reportData.reduce((s, r) => s + (r.fortnight?.original_total || 0), 0);
  const totalFortnightPayable  = reportData.reduce((s, r) => s + (r.fortnight?.payable        || 0), 0);
  const grandPayable           = totalDailyPayable + totalFortnightPayable;
  const totalDeducted          = (totalDailyOriginal + totalFortnightOriginal) - grandPayable;

  const summaryCards = [
    {
      label: "Eligible Users",
      value: reportData.length.toString(),
      sub: null,
      color: "from-[#0C3978] to-[#106187]",
      show: true,
    },
    {
      label: "Daily Original",
      value: `₹ ${totalDailyOriginal.toFixed(2)}`,
      sub: `Payable: ₹ ${totalDailyPayable.toFixed(2)}`,
      color: "from-[#106187] to-[#16B8E4]",
      show: showDaily,
    },
    {
      label: "Fortnight Original",
      value: `₹ ${totalFortnightOriginal.toFixed(2)}`,
      sub: `Payable: ₹ ${totalFortnightPayable.toFixed(2)}`,
      color: "from-[#0C3978] to-[#16B8E4]",
      show: showFortnight,
    },
    {
      label: "Total Deducted (Orders)",
      value: `₹ ${totalDeducted.toFixed(2)}`,
      sub: "Original − Payable",
      color: "from-orange-500 to-orange-400",
      show: true,
    },
    {
      label: "Grand Payable",
      value: `₹ ${grandPayable.toFixed(2)}`,
      sub: "Actual release amount",
      color: "from-green-600 to-green-500",
      show: true,
    },
  ].filter((c) => c.show);

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
            className="relative w-12 h-12 rounded-full bg-linear-to-r from-[#0C3978] via-[#106187] to-[#16B8E4]
              text-white flex items-center justify-center
              shadow-[0_4px_6px_rgba(0,0,0,0.3),0_8px_20px_rgba(0,0,0,0.25)] border border-gray-400
              hover:shadow-[0_6px_10px_rgba(0,0,0,0.35),0_10px_25px_rgba(0,0,0,0.3)]
              active:translate-y-0.5 active:shadow-[0_2px_4px_rgba(0,0,0,0.3)]
              transition-all duration-200 cursor-pointer"
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
          <span className="text-sm font-medium text-gray-600">Filter by type:</span>
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
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className={`bg-gradient-to-br ${card.color} text-white rounded-xl p-4 shadow`}
            >
              <p className="text-xs opacity-80 mb-1">{card.label}</p>
              <p className="text-base font-bold truncate">{card.value}</p>
              {card.sub && (
                <p className="text-xs opacity-70 mt-1 truncate">{card.sub}</p>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-3 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-gray-400" />
            Original = payout amount at creation time
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-[#0C3978]" />
            Payable = Score balance (original − points used on orders)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-green-600" />
            Total Payable = actual amount to release
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