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
import { handleIDFCDownload } from "@/utils/handleIDFCDownload";
import { useRouter } from "next/navigation";

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
  const router   = useRouter();

  const { query, setQuery, debouncedQuery } = useSearch();
  const [reportData, setReportData]         = useState<any[]>([]);
  const [totalItems, setTotalItems]         = useState(0);
  const [loading, setLoading]               = useState(false);
  const [downloading, setDownloading]       = useState(false);
  const [dateFilter, setDateFilter]         = useState<any>(null);
  const [showModal, setShowModal]           = useState(false);
  const [selectedRows, setSelectedRows]     = useState<any[]>([]);

  /* ── Fetch ─────────────────────────────────────────────────────── */
  const fetchReport = useCallback(
    async (search: string) => {
      try {
        setLoading(true);
        const params: any = {
          search: search || "",
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
    [dateFilter]
  );

  useEffect(() => {
    fetchReport(debouncedQuery);
    goToPage(1);
  }, [debouncedQuery, dateFilter]);

  /* ── Download — IDFC Excel format ─────────────────────────────── */
  const handleDownloadClick = () => {
    const rows = selectedRows.length > 0 ? selectedRows : reportData;
    if (!rows.length) {
      ShowToast.error("No data to download.");
      return;
    }

    handleIDFCDownload({
      rows,
      fileName: "idfc_payout_upload",
      onStart:  () => setDownloading(true),
      onFinish: () => setDownloading(false),
    });
  };

  /* ── Pagination ────────────────────────────────────────────────── */
  const { currentPage, totalPages, nextPage, prevPage, startItem, endItem, goToPage } =
    usePagination({ totalItems, itemsPerPage: 12, onPageChange: () => {} });

  /* ── Columns ───────────────────────────────────────────────────── */
  const columns: GridColDef[] = [
    { field: "user_id",             headerName: "User ID",        flex: 1   },
    { field: "user_name",           headerName: "Username",       flex: 1   },
    { field: "account_holder_name", headerName: "Account Name",   flex: 1.2 },
    { field: "contact",             headerName: "Contact",        flex: 1   },
    {
      field: "rank",
      headerName: "Rank",
      flex: 0.8,
      renderCell: (params: any) => {
        const value = params.value;
        if (
          value === null ||
          value === undefined ||
          value === "" ||
          value === "none" ||
          String(value).toLowerCase() === "null"
        ) return "-";

        const num = Number(value);
        if (!isNaN(num) && num >= 1 && num <= 5) {
          return num === 1 ? "1 Star" : "2 Star";
        }
        return (
          String(value).charAt(0).toUpperCase() +
          String(value).slice(1).toLowerCase()
        );
      },
    },
    { field: "bank_name",      headerName: "Bank",           flex: 1   },
    { field: "account_number", headerName: "Account No.",    flex: 1.2 },
    { field: "ifsc_code",      headerName: "IFSC",           flex: 1   },
    {
      field: "total_release",
      headerName: "Amount to Release (₹)",
      flex: 1.2,
      align: "right",
      renderCell: (p: GridRenderCellParams<any, number>) => (
        <span className="pr-4 font-bold text-green-700">
          ₹ {Number(p.value ?? 0).toFixed(2)}
        </span>
      ),
    },
  ];

  /* ── Summary totals ────────────────────────────────────────────── */
  const grandRelease       = reportData.reduce((s, r) => s + (r.total_release        || 0), 0);
  const totalOriginal      = reportData.reduce((s, r) =>
    s + (r.daily?.original_total || 0) + (r.fortnight?.original_total || 0), 0);
  const totalDeducted      = totalOriginal - grandRelease;

  const summaryCards = [
    {
      label: "Eligible Users",
      value: reportData.length.toString(),
      sub: null,
      color: "from-[#0C3978] to-[#106187]",
    },
    {
      label: "Total Original Amount",
      value: `₹ ${totalOriginal.toFixed(2)}`,
      sub: "Before order deductions",
      color: "from-[#106187] to-[#16B8E4]",
    },
    {
      label: "Total Deducted (Orders)",
      value: `₹ ${totalDeducted.toFixed(2)}`,
      sub: "Points used on orders",
      color: "from-orange-500 to-orange-400",
    },
    {
      label: "Grand Release Amount",
      value: `₹ ${grandRelease.toFixed(2)}`,
      sub: "Actual amount to release",
      color: "from-green-600 to-green-500",
    },
  ];

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

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
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
            <span className="inline-block w-3 h-3 rounded-full bg-[#0C3978]" />
            Amount to Release = Score balance (original − points used on orders)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-green-600" />
            Download exports IDFC bank upload format directly
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