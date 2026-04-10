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
import ShowToast from "@/components/common/Toast/toast";
import { FiFilter } from "react-icons/fi";
import DateFilterModal from "@/components/common/DateRangeModal/daterangemodal";
import { useRouter } from "next/navigation";
import { useVLife } from "@/store/context";

const API_URL = "/api/withdraw";

const BONUS_TYPE_OPTIONS = [
  { label: "All Types", value: ""          },
  { label: "Daily",     value: "daily"     },
  { label: "Fortnight", value: "fortnight" },
  { label: "Referral",  value: "referral"  },
  { label: "Quickstar", value: "quickstar" },
];

export default function WithdrawPage() {
  const router      = useRouter();
  const { user }    = useVLife();

  const { query, setQuery, debouncedQuery } = useSearch();
  const [reportData, setReportData]     = useState<any[]>([]);
  const [totalItems, setTotalItems]     = useState(0);
  const [loading, setLoading]           = useState(false);
  const [dateFilter, setDateFilter]     = useState<any>(null);
  const [showModal, setShowModal]       = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [bonusType, setBonusType]       = useState("");

  const [summary, setSummary] = useState({
    total_records:  0,
    unique_users:   0,
    unique_batches: 0,
    total_original: 0,
    total_deducted: 0,
    grand_release:  0,
  });

  /* ── Pagination ── */
  const {
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    startItem,
    endItem,
    goToPage,
  } = usePagination({ totalItems, itemsPerPage: 12, onPageChange: () => {} });

  /* ── Fetch — passes role + user_id exactly like order-operations ── */
  const fetchRecords = useCallback(
    async (search: string, page: number) => {
      if (!user?.user_id) return;
      try {
        setLoading(true);
        const params: any = {
          role:    user.role,
          user_id: user.user_id,
          search:  search || "",
          page,
          limit:   12,
          ...(bonusType && { bonus_type: bonusType }),
          ...(dateFilter?.type === "on"    && { date: dateFilter.date }),
          ...(dateFilter?.type === "range" && {
            from: dateFilter.from,
            to:   dateFilter.to,
          }),
        };
        const { data } = await axios.get(API_URL, { params });
        setReportData(data.data || []);
        setTotalItems(data.total || 0);
        setSummary(
          data.summary || {
            total_records:  0,
            unique_users:   0,
            unique_batches: 0,
            total_original: 0,
            total_deducted: 0,
            grand_release:  0,
          },
        );
      } catch (error) {
        console.error("Error fetching withdraw records:", error);
        ShowToast.error("Failed to load withdraw records");
      } finally {
        setLoading(false);
      }
    },
    [dateFilter, bonusType, user?.role, user?.user_id],
  );

  useEffect(() => {
    if (!user?.user_id) return;
    fetchRecords(debouncedQuery, currentPage);
  }, [debouncedQuery, dateFilter, bonusType, currentPage, user?.user_id]);

  useEffect(() => {
    goToPage(1);
  }, [debouncedQuery, dateFilter, bonusType]);

  const isAdmin = user?.role === "admin";

  /* ── Columns ── */
  const columns: GridColDef[] = [
    {
      field: "released_date",
      headerName: "Date",
      flex: 0.8,
      renderCell: (p: any) => (
        <span className="text-gray-600 text-xs">{p.value || "—"}</span>
      ),
    },

    // Batch ID — admin only (users don't need to see/navigate batches)
    ...(isAdmin
      ? [{
          field: "batch_id",
          headerName: "Batch ID",
          flex: 1.2,
          renderCell: (p: any) => (
            <span
              className="text-[#0C3978] font-mono text-xs cursor-pointer hover:underline"
              onClick={() => router.push(`/batches/${p.value}`)}
            >
              {p.value || "—"}
            </span>
          ),
        } as GridColDef]
      : []),

    // User ID — admin only (users know who they are)
    ...(isAdmin
      ? [{ field: "user_id", headerName: "User ID", flex: 0.9 } as GridColDef]
      : []),

    {
      field: "account_holder_name",
      headerName: "Account Name",
      flex: 1.2,
    },
    { field: "bank_name", headerName: "Bank", flex: 1 },
    {
      field: "payout_name",
      headerName: "Payout",
      flex: 1,
      renderCell: (p: any) => (
        <span className="text-gray-600 text-xs">{p.value || "—"}</span>
      ),
    },
    {
      field: "original_amount",
      headerName: "Original (₹)",
      flex: 1,
      align: "right",
      renderCell: (p: GridRenderCellParams<any, number>) => (
        <span className="pr-4 text-gray-700">
          ₹ {Number(p.value ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      field: "released_amount",
      headerName: "Released (₹)",
      flex: 1,
      align: "right",
      renderCell: (p: GridRenderCellParams<any, number>) => (
        <span className="pr-4 font-bold text-green-700">
          ₹ {Number(p.value ?? 0).toFixed(2)}
        </span>
      ),
    },
    {
      field: "neft_utr",
      headerName: "NEFT UTR",
      flex: 0.8,
      renderCell: (p: any) =>
        p.value ? (
          <span className="font-mono text-xs text-[#0C3978]">{p.value}</span>
        ) : (
          <span className="text-xs text-orange-500 italic">Pending</span>
        ),
    },
    {
      field: "payout_id",
      headerName: "Action",
      flex: 0.7,
      sortable: false,
      renderCell: (p: any) => (
        <button
          className="text-xs text-[#0C3978] hover:underline cursor-pointer"
          onClick={() => router.push(`/withdrawal/detailview/${p.value}`)}
        >
          View
        </button>
      ),
    },
  ];

  /* ── Summary cards ── */
  const summaryCards = [
    {
      label: "Total Records",
      value: summary.total_records.toString(),
      sub:   isAdmin
        ? `${summary.unique_users} users · ${summary.unique_batches} batches`
        : `${summary.unique_batches} batches`,
      color: "from-[#0C3978] to-[#106187]",
    },
    {
      label: "Total Original Amount",
      value: `₹ ${Number(summary.total_original).toFixed(2)}`,
      sub:   "Net after TDS/admin",
      color: "from-[#106187] to-[#16B8E4]",
    },
    {
      label: "Total Deducted (Orders)",
      value: `₹ ${Number(summary.total_deducted).toFixed(2)}`,
      sub:   "Points used on orders",
      color: "from-orange-500 to-orange-400",
    },
    {
      label: "Grand Release Amount",
      value: `₹ ${Number(summary.grand_release).toFixed(2)}`,
      sub:   "Actual amount paid out",
      color: "from-green-600 to-green-500",
    },
  ];

  const onBack = () => router.push("/reports");

  /* ── Render ── */
  return (
    <Layout>
      <div className="max-md:px-4 p-4 w-full max-w-[99%] mx-auto -mt-5">
        {loading && (
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
          title="Withdraw Records"
          showBack
          onBack={onBack}
          search={query}
          setSearch={setQuery}
          showAddButton={false}
          showMoreOptions={false}
          showPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          startItem={startItem}
          endItem={endItem}
          onNext={nextPage}
          onPrev={prevPage}
        />

        {/* Bonus type filter pills */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {BONUS_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setBonusType(opt.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer
                ${bonusType === opt.value
                  ? "bg-[#0C3978] text-white border-[#0C3978]"
                  : "bg-white text-gray-600 border-gray-300 hover:border-[#0C3978]"
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className={`bg-linear-to-br ${card.color} text-white rounded-xl px-4 py-3 shadow`}
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
            <span className="inline-block w-3 h-3 rounded-full bg-orange-500" />
            Deducted = Daily/Fortnight points spent on orders
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-orange-400" />
            NEFT UTR "Pending" = released but bank UTR not yet recorded
          </span>
        </div>

        <Table
          columns={columns}
          rows={reportData}
          currentPage={currentPage}
          setCurrentPage={goToPage}
          rowIdField="payout_id"
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