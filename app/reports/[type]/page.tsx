"use client";
import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";
import { useRouter, useParams } from "next/navigation";
import { useVLife } from "@/store/context";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import DateFilterModal from "@/components/common/DateRangeModal/daterangemodal";
import { FiFilter } from "react-icons/fi";
import { handleDownload } from "@/utils/handleDownload";

/* ─────────────────────────────────────────────────────────────────────
   Direction filter options  (labels match DB values: "in" / "out")
───────────────────────────────────────────────────────────────────── */
const DIRECTION_OPTIONS = [
  { label: "All", value: "" },
  { label: "In", value: "in" },
  { label: "Out", value: "out" },
];

/* ─────────────────────────────────────────────────────────────────────
   Helper: format number as Indian currency
───────────────────────────────────────────────────────────────────── */
const fmt = (v: number) =>
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(v ?? 0);

/* ─────────────────────────────────────────────────────────────────────
   Summary cards
───────────────────────────────────────────────────────────────────── */
function SummaryCards({
  earned,
  used,
  balance,
  loading,
}: {
  earned: number;
  used: number;
  balance: number;
  loading: boolean;
}) {
  const cards = [
    {
      label: "Total Earned",
      value: fmt(earned),
      icon: <TrendingUp size={22} />,
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-700",
      iconBg: "bg-green-100",
    },
    {
      label: "Total Used",
      value: fmt(used),
      icon: <TrendingDown size={22} />,
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-600",
      iconBg: "bg-red-100",
    },
    {
      label: "Current Balance",
      value: fmt(balance),
      icon: <Wallet size={22} />,
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      iconBg: "bg-blue-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`${c.bg} ${c.border} border rounded-xl p-4 flex items-center gap-4`}
        >
          <div className={`${c.iconBg} ${c.text} rounded-full p-2.5`}>
            {c.icon}
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">{c.label}</p>
            {loading ? (
              <div className="h-6 w-28 bg-gray-200 animate-pulse rounded mt-1" />
            ) : (
              <p className={`text-xl font-bold ${c.text}`}>₹ {c.value}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Main page component
───────────────────────────────────────────────────────────────────── */
export default function ReportTypePage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useVLife();

  const type = (params?.type as string) || "daily";
  const isAdmin = user?.role === "admin";

  const { query, setQuery, debouncedQuery } = useSearch();

  /* ── State ──────────────────────────────────────────────────────── */
  const [rows, setRows] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ earned: 0, used: 0, balance: 0 });
  const [direction, setDirection] = useState("");
  const [dateFilter, setDateFilter] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [downloading, setDownloading] = useState(false);

  /* ── Download selected rows as xlsx ────────────────────────────── */
  const handleDownloadClick = () => {
    handleDownload<any>({
      rows: selectedRows,
      fileName: `${type}-report`,
      format: "xlsx",
      excludeHeaders: ["_id", "__v"],
      onStart: () => setDownloading(true),
      onFinish: () => setDownloading(false),
    });
  };

  /* ── Pagination ─────────────────────────────────────────────────── */
  const handlePageChange = useCallback(() => {}, []);
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

  /* ── Fetch: Admin — all users list ─────────────────────────────── */
  const fetchAdminUsers = useCallback(
    async (search: string) => {
      try {
        setLoading(true);
        const { data } = await axios.get("/api/scores/users", {
          params: { type, search },
        });
        setRows(data.data ?? []);
        setTotalItems(data.total ?? 0);
      } catch {
        ShowToast.error("Failed to load users");
      } finally {
        setLoading(false);
      }
    },
    [type],
  );

  /* ── Fetch: User — own history ──────────────────────────────────── */
  const fetchUserHistory = useCallback(
    async (search: string) => {
      try {
        setLoading(true);

        const reqParams: any = {
          type,
          user_id: user?.user_id,
          direction,
          search,
        };

        // Date filter — single date
        if (dateFilter?.type === "on") {
          reqParams.date = dateFilter.date;
        }
        // Date filter — range
        if (dateFilter?.type === "range") {
          reqParams.from = dateFilter.from;
          reqParams.to = dateFilter.to;
        }

        const { data } = await axios.get("/api/scores", { params: reqParams });
        setSummary(data.summary ?? { earned: 0, used: 0, balance: 0 });
        setRows(data.history ?? []);
        setTotalItems(data.total ?? 0);
      } catch {
        ShowToast.error("Failed to load history");
      } finally {
        setLoading(false);
      }
    },
    [type, user, direction, dateFilter],
  );

  /* ── Trigger fetch on search / filter change ────────────────────── */
  useEffect(() => {
    if (!user) return;
    goToPage(1);
    if (isAdmin) fetchAdminUsers(debouncedQuery);
    else fetchUserHistory(debouncedQuery);
  }, [debouncedQuery, user, isAdmin, direction, dateFilter]);

  /* ── Admin columns: user list ───────────────────────────────────── */
  const adminColumns = [
    { field: "user_id", headerName: "User ID", flex: 1 },
    { field: "user_name", headerName: "Name", flex: 1.2 },
    { field: "contact", headerName: "Contact", flex: 1.1 },
    {
      field: "rank",
      headerName: "Rank",
      flex: 0.9,
      renderCell: (params: any) =>
        params.value && params.value !== "none"
          ? !isNaN(params.value)
            ? "Star"
            : `${params.value} Star`
          : "-",
    },
    { field: "club", headerName: "Club", flex: 0.7 },
    {
      field: "earned",
      headerName: "Earned (₹)",
      flex: 1,
      align: "right" as const,
      headerAlign: "right" as const,
      renderCell: (p: any) => (
        <span className="text-green-600 font-semibold pr-2">
          ₹ {fmt(p.value)}
        </span>
      ),
    },
    {
      field: "used",
      headerName: "Used (₹)",
      flex: 1,
      align: "right" as const,
      headerAlign: "right" as const,
      renderCell: (p: any) => (
        <span className="text-red-500 font-semibold pr-2">
          ₹ {fmt(p.value)}
        </span>
      ),
    },
    {
      field: "balance",
      headerName: "Balance (₹)",
      flex: 1,
      align: "right" as const,
      headerAlign: "right" as const,
      renderCell: (p: any) => (
        <span className="text-blue-700 font-bold pr-2">₹ {fmt(p.value)}</span>
      ),
    },
  ];

  /* ── User columns: history ──────────────────────────────────────── */
  const userColumns = [
    {
      field: "direction",
      headerName: "Type",
      flex: 0.8,
      renderCell: (p: any) =>
        p.value === "in" ? (
          <span className="flex items-center gap-1.5 text-green-600 font-semibold">
            <ArrowDownCircle size={15} /> In
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-red-500 font-semibold">
            <ArrowUpCircle size={15} /> Out
          </span>
        ),
    },
    {
      field: "source",
      headerName: "Source / Module",
      flex: 1.2,
      renderCell: (p: any) => (
        <span className="capitalize">
          {(p.row.source || p.row.module || "—").replace(/_/g, " ")}
        </span>
      ),
    },
    { field: "reference_id", headerName: "Reference ID", flex: 1.2 },
    {
      field: "points",
      headerName: "Points (₹)",
      flex: 0.9,
      align: "right" as const,
      headerAlign: "right" as const,
      renderCell: (p: any) => (
        <span
          className={`pr-2 ${p.row.direction === "in" ? "text-green-600 font-bold" : "text-red-500 font-bold"}`}
        >
          {p.row.direction === "in" ? "" : ""}₹ {fmt(p.value)}
        </span>
      ),
    },
    {
      field: "balance_after",
      headerName: "Balance After",
      flex: 1,
      align: "right" as const,
      headerAlign: "right" as const,
      renderCell: (p: any) =>
        p.value != null ? <span className="pr-2">₹ {fmt(p.value)}</span> : "—",
    },
    {
      field: "remarks",
      headerName: "Remarks",
      flex: 1.5,
      renderCell: (p: any) => (
        <span className="text-gray-500 text-xs truncate" title={p.value}>
          {p.value || "—"}
        </span>
      ),
    },
    {
      field: "created_at",
      headerName: "Date & Time",
      flex: 1.3,
      renderCell: (p: any) =>
        p.value ? new Date(p.value).toLocaleString("en-IN") : "—",
    },
  ];

  const label = type.charAt(0).toUpperCase() + type.slice(1);
  const onBack = () => router.push("/reports");

  return (
    <Layout>
      <div className="max-md:px-4 p-4 w-full max-w-[99%] mx-auto -mt-5">
        {/* Loading overlay */}
        {(loading || downloading) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        {/* ── Header ───────────────────────────────────────────────── */}
        <HeaderWithActions
          title={`${label} Report${isAdmin ? " — All Users" : ""}`}
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

        {/* ── USER VIEW: summary cards + direction filter ───────────── */}
        {!isAdmin && (
          <>
            <SummaryCards {...summary} loading={loading} />

            {/* Direction filter pills */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <span className="text-sm font-medium text-gray-600">Show:</span>
              {DIRECTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDirection(opt.value)}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                    direction === opt.value
                      ? "bg-[#0C3978] text-white border-[#0C3978]"
                      : "bg-white text-gray-600 border-gray-300 hover:border-[#0C3978] hover:text-[#0C3978]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}

              {/* Active date badge */}
              {dateFilter && (
                <span className="bg-yellow-100 border border-yellow-400 text-yellow-800 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ml-2">
                  {dateFilter.type === "on"
                    ? `📅 ${dateFilter.date}`
                    : `📅 ${dateFilter.from} → ${dateFilter.to}`}
                  <button
                    onClick={() => setDateFilter(null)}
                    className="ml-1 text-yellow-700 hover:text-red-600 font-bold"
                    title="Clear date filter"
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>
          </>
        )}

        {/* ── ADMIN VIEW: date filter badge ────────────────────────── */}
        {isAdmin && dateFilter && (
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-yellow-100 border border-yellow-400 text-yellow-800 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
              {dateFilter.type === "on"
                ? `📅 ${dateFilter.date}`
                : `📅 ${dateFilter.from} → ${dateFilter.to}`}
              <button
                onClick={() => setDateFilter(null)}
                className="ml-1 text-yellow-700 hover:text-red-600 font-bold"
                title="Clear date filter"
              >
                ✕
              </button>
            </span>
          </div>
        )}

        {/* ── Table ────────────────────────────────────────────────── */}
        <Table
          columns={isAdmin ? adminColumns : userColumns}
          rows={rows.slice((currentPage - 1) * 12, currentPage * 12)}
          rowIdField={isAdmin ? "user_id" : "reference_id"}
          pageSize={12}
          checkboxSelection
          setSelectedRows={setSelectedRows}
          onIdClick={
            isAdmin
              ? (_id: string, row: any) =>
                  router.push(`/reports/${type}/${row.user_id}`)
              : undefined
          }
          onRowClick={
            isAdmin
              ? (row: any) => router.push(`/reports/${type}/${row.user_id}`)
              : undefined
          }
        />

        {/* Floating date filter button */}
        <div title="Filter by Date" className="fixed bottom-5 right-6 z-10">
          <button
            onClick={() => setShowModal(true)}
            className="relative w-12 h-12 rounded-full bg-gradient-to-r from-[#0C3978] via-[#106187] to-[#16B8E4] text-white flex items-center justify-center
              shadow-[0_4px_6px_rgba(0,0,0,0.3),0_8px_20px_rgba(0,0,0,0.25)] border border-gray-400
              hover:shadow-[0_6px_10px_rgba(0,0,0,0.35),0_10px_25px_rgba(0,0,0,0.3)] active:translate-y-[2px]
              active:shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-all duration-200 cursor-pointer"
          >
            <FiFilter size={20} />
          </button>
        </div>

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
