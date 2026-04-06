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
import { useRouter } from "next/navigation";
import { useVLife } from "@/store/context";
import { GrStatusGood } from "react-icons/gr";
import { MdCancel, MdOutlinePending } from "react-icons/md";
import DateFilterModal from "@/components/common/DateRangeModal/daterangemodal";
import { FiFilter } from "react-icons/fi";

/* ------------------------------------------------------------------ */
/* Status filter options — shown only to admin                         */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

export default function ChangeRequestsPage() {
  const router = useRouter();
  const { query, setQuery, debouncedQuery } = useSearch();
  const { user } = useVLife();

  const [requestsData, setRequestsData] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const [dateFilter, setDateFilter] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const isAdmin = user?.role === "admin";
  const API_URL = "/api/wallet-change-requests";

  /* ── Fetch change requests ──────────────────────────────────────── */
  const fetchRequests = useCallback(
    async (search: string) => {
      try {
        setLoading(true);

        const params: any = { search: search || "" };

        if (!isAdmin) {
          params.user_id = user?.user_id;
        } else if (statusFilter) {
          params.status = statusFilter;
        }

        if (dateFilter?.type === "on") {
          params.date = dateFilter.date;
        } else if (dateFilter?.type === "range") {
          params.from = dateFilter.from;
          params.to = dateFilter.to;
        }

        const { data } = await axios.get(API_URL, { params });
        const requests = data.data || [];

        setRequestsData(requests);
        setTotalItems(requests.length);
      } catch (error) {
        console.error(error);
        ShowToast.error("Failed to load change requests");
      } finally {
        setLoading(false);
      }
    },
    [user, isAdmin, dateFilter, statusFilter],
  );

  useEffect(() => {
    if (!user) return;
    fetchRequests(debouncedQuery);
  }, [debouncedQuery, user, fetchRequests]);

  /* ── Row click → open detail page ───────────────────────────────────
   * Always navigates to /wallet/change-requests/[request_id]
   * This page shows:
   *   - status badge + banner
   *   - old vs new comparison table (toggle button)
   *   - all wallet fields read-only (3 per row)
   *   - admin reject / review & update buttons
   * ------------------------------------------------------------------ */
  const handleRowClick = (row: any) => {
    router.push(`/wallet/change-requests/${row.request_id}`);
  };

  /* ── Status cell renderer ───────────────────────────────────────── */
  const renderStatus = (status: string) => {
    const normalized = status?.toLowerCase();
    if (normalized === "approved")
      return (
        <span className="flex items-center gap-1 text-green-600 font-semibold">
          <GrStatusGood size={17} /> Approved
        </span>
      );
    if (normalized === "rejected")
      return (
        <span className="flex items-center gap-1 text-red-500 font-semibold">
          <MdCancel size={18} /> Rejected
        </span>
      );
    return (
      <span className="flex items-center gap-1 text-yellow-600 font-semibold">
        <MdOutlinePending size={18} /> Pending
      </span>
    );
  };

  /* ── Table columns ──────────────────────────────────────────────── */
  const columns = [
    {
      field: "request_id",
      headerName: "Request ID",
      flex: 1,
    },
    {
      field: "wallet_id",
      headerName: "Wallet ID",
      flex: 1,
      renderCell: (params: any) => params.value || "—",
    },
    /* User ID column — admin only */
    ...(isAdmin ? [{ field: "user_id", headerName: "User ID", flex: 1 }] : []),
    {
      field: "user_name",
      headerName: "Name",
      flex: 1,
      renderCell: (params: any) => params.row?.old_values?.user_name || "—",
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      renderCell: (params: any) => renderStatus(params.value),
    },
    {
      field: "created_at",
      headerName: "Requested At",
      flex: 1.5,
      renderCell: (params: any) =>
        params.value ? new Date(params.value).toLocaleString() : "—",
    },
  ];

  /* ── Pagination ─────────────────────────────────────────────────── */
  const handlePageChange = useCallback(
    (_page: number, _offset: number, _limit: number) => {},
    [],
  );

  const { currentPage, totalPages, nextPage, prevPage, startItem, endItem } =
    usePagination({
      totalItems,
      itemsPerPage: 12,
      onPageChange: handlePageChange,
    });

  const onBack = () => router.push("/wallet/walletpage");

  return (
    <Layout>
      <div className="max-md:px-4 p-4 w-full max-w-[99%] mx-auto -mt-5">
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        <HeaderWithActions
          title={isAdmin ? "Requests" : "My Requests"}
          search={query}
          setSearch={setQuery}
          showAddButton={false}
          showBack
          onBack={onBack}
          showPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          startItem={startItem}
          endItem={endItem}
          onNext={nextPage}
          onPrev={prevPage}
        />

        {/* Status filter pills — admin only */}
        {isAdmin && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-sm font-medium text-gray-600">
              Filter by status:
            </span>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                  statusFilter === opt.value
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
          rows={requestsData.slice((currentPage - 1) * 12, currentPage * 12)}
          rowIdField="request_id"
          pageSize={12}
          checkboxSelection
          onIdClick={(_id, row) => handleRowClick(row)}
          onRowClick={(row) => handleRowClick(row)}
        />

        {/* Floating filter button */}
        <div title="Filter by Date" className="fixed bottom-5 right-6 z-10">
          <button
            onClick={() => setShowModal(true)}
            className="w-12 h-12 rounded-full
              bg-linear-to-r from-[#0C3978] via-[#106187] to-[#16B8E4]
              text-white flex items-center justify-center shadow-lg cursor-pointer"
          >
            <FiFilter size={20} />
          </button>
        </div>

        {/* Active date filter badge */}
        {dateFilter && (
          <div className="fixed bottom-18 right-4 z-10">
            <span className="bg-yellow-100 border border-yellow-400 text-yellow-800 text-xs font-semibold px-2 py-1 rounded-full shadow flex items-center gap-1">
              {dateFilter.type === "on"
                ? `📅 ${dateFilter.date}`
                : `📅 ${dateFilter.from} → ${dateFilter.to}`}
              <button
                onClick={() => setDateFilter(null)}
                className="ml-1 text-yellow-700 hover:text-red-600 font-bold"
                title="Clear filter"
              >
                ✕
              </button>
            </span>
          </div>
        )}

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
