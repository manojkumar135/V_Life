"use client";
import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import { FaTrash } from "react-icons/fa";
import { GoPencil } from "react-icons/go";
import { useRouter } from "next/navigation";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";
import { useVLife } from "@/store/context";
import { hasAdvancePaid } from "@/services/hasAdvancePaid";
import { hasFirstOrder } from "@/services/hasFirstOrder";
import DateFilterModal from "@/components/common/DateRangeModal/daterangemodal";
import { FiFilter } from "react-icons/fi";
import { GridColDef } from "@mui/x-data-grid";
import { handleDownload } from "@/utils/handleDownload";
import AlertBox from "@/components/Alerts/advanceAlert";

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

interface PvMonthBreakdown {
  month: string;
  pv_required: number;
  pv_fulfilled: number;
  pv_remaining: number;
  cleared: boolean;
}

interface PvAlertSummary {
  hasAlert: boolean;
  totalPvRequired: number;
  totalPvFulfilled: number;
  totalPvRemaining: number;
  months: PvMonthBreakdown[];
  alertMessage: string;
}

export default function WithdrawPage() {
  const { user } = useVLife();
  const router = useRouter();
  const { query, setQuery, debouncedQuery } = useSearch();

  const [withdrawData, setWithdrawData] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  const [dateFilter, setDateFilter] = useState<any>(null);
  const [showModal, setShowModal] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  // ── PV Alert ──────────────────────────────────────────────────────────
  const [showPvAlert, setShowPvAlert] = useState(false);
  const [pvSummary, setPvSummary] = useState<PvAlertSummary | null>(null);

  const API_URL = "/api/weeklyPayout-operations";

  // ── Permission check ──────────────────────────────────────────────────
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
      } catch (err) {
        console.error("Permission check error:", err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user?.user_id]);

  // ── PV Alert fetch ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.user_id) return;

    let isMounted = true;

    (async () => {
      try {
        const res = await axios.get("/api/pv-alert", {
          params: { user_id: user.user_id },
        });

        if (!isMounted) return;

        if (res.data.success && res.data.data.hasAlert) {
          setPvSummary(res.data.data);
          setShowPvAlert(true);
        }
      } catch (err) {
        console.error("PV alert fetch error:", err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user?.user_id]);

  // ── Fetch withdrawals ─────────────────────────────────────────────────
  const fetchWithdrawals = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await axios.get(API_URL, {
        params: {
          role: user?.role,
          ...(user?.role === "user" && { user_id: user?.user_id }),
          search: query,
          ...(dateFilter?.type === "on" && { date: dateFilter.date }),
          ...(dateFilter?.type === "range" && {
            from: dateFilter.from,
            to: dateFilter.to,
          }),
        },
      });

      const withdrawals = data.data || [];
      setWithdrawData(withdrawals);
      setTotalItems(withdrawals.length);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      ShowToast.error("Failed to load withdrawals");
    } finally {
      setLoading(false);
    }
  }, [user?.role, user?.user_id, query, dateFilter]);

  useEffect(() => {
    if (!user?.user_id) return;
    fetchWithdrawals();
    goToPage(1);
  }, [debouncedQuery, user?.user_id, dateFilter]);

  // ── Download ──────────────────────────────────────────────────────────
  const handleDownloadClick = () => {
    handleDownload<any>({
      rows: selectedRows,
      fileName: "Daliy Payouts",
      format: "xlsx",
      excludeHeaders: [
        "_id",
        "__v",
        "created_at",
        "last_modified_at",
        "is_checked",
        "left_users",
        "right_users",
        "created_by",
        "last_modified_by",
      ],
      onFinish: () => setDownloading(false),
    });
  };

  // ── Delete ────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_URL}?withdraw_id=${id}`);
      setWithdrawData((prev) => prev.filter((item) => item._id !== id));
      setTotalItems((prev) => prev - 1);
      ShowToast.success("Withdrawal deleted successfully");
    } catch (error) {
      console.error("Error deleting withdrawal:", error);
      ShowToast.error("Failed to delete withdrawal");
    }
  };

  const handleEdit = (id: string) => {
    router.push(`/wallet/withdraw/detailview/${id}`);
  };

  // ── Columns ───────────────────────────────────────────────────────────
  const columns: GridColDef[] = [
    { field: "payout_id", headerName: "Transaction ID", flex: 1 },
    { field: "wallet_id", headerName: "Wallet ID", flex: 1 },
    { field: "user_id", headerName: "User ID", flex: 1 },
    ...(user?.role === "admin"
      ? [
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
        ]
      : []),
    { field: "date", headerName: "Date", flex: 1.5 },
    {
      field: "amount",
      headerName: "Amount ( ₹ )",
      align: "right",
      flex: 1,
      renderCell: (params) => (
        <span className="pr-5">
          ₹ {Number(params.value)?.toFixed(2) || "0.00"}
        </span>
      ),
    },
    {
      field: "withdraw_amount",
      headerName: "Withdraw ( ₹ )",
      align: "right",
      flex: 1,
      renderCell: (params) => (
        <span className="pr-5">
          ₹ {Number(params.value)?.toFixed(2) || "0.00"}
        </span>
      ),
    },
    {
      field: "reward_amount",
      headerName: "Reward ( ₹ )",
      align: "right",
      flex: 1,
      renderCell: (params) => (
        <span className="pr-5">
          ₹ {Number(params.value)?.toFixed(2) || "0.00"}
        </span>
      ),
    },
    {
      field: "admin_charge",
      headerName: "Admin ( ₹ )",
      align: "right",
      flex: 1,
      renderCell: (params) => (
        <span className="pr-5">
          ₹ {Number(params.value)?.toFixed(2) || "0.00"}
        </span>
      ),
    },
    {
      field: "tds_amount",
      headerName: "TDS ( ₹ )",
      align: "right",
      flex: 1,
      renderCell: (params) => (
        <span className="pr-5">
          ₹ {Number(params.value)?.toFixed(2) || "0.00"}
        </span>
      ),
    },
    { field: "status", headerName: "Status", flex: 1 },
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
    onPageChange: () => {},
  });

  const handlePayOut = () => router.push("/wallet/payout/addpayout");
  const onBack = () => router.push("/wallet/payout");

  // ── PV Alert message ──────────────────────────────────────────────────
  const pvAlertMessage = pvSummary ? (
    <>
      {pvSummary.alertMessage}
      <div className="mt-2 text-xs space-y-1">
        {pvSummary.months.map((m) => (
          <div key={m.month} className="flex justify-between gap-4">
            <span>{m.month}</span>
            <span>
              {m.cleared ? "✅ Cleared" : `${m.pv_remaining} PV remaining`}
            </span>
          </div>
        ))}
        <div className="flex justify-between gap-4 font-semibold border-t pt-1 mt-1">
          <span>Total Remaining</span>
          <span>{pvSummary.totalPvRemaining} PV</span>
        </div>
      </div>
    </>
  ) : null;

  return (
    <Layout>
      {/* ── PV Alert ── */}
      <AlertBox
        visible={showPvAlert}
        title="PV Order Required!"
        message={pvAlertMessage}
        buttonLabel="PLACE ORDER NOW"
        buttonAction={() => router.push("/orders/addorder")}
        onClose={() => setShowPvAlert(false)}
      />

      <div className="max-md:px-4 p-4 w-full max-w-[99%] mx-auto -mt-5">
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        <HeaderWithActions
          title="Weekly Payouts"
          search={query}
          setSearch={setQuery}
          showAddButton={user?.role === "jk"}
          showBack
          onBack={onBack}
          addLabel="Add Payout"
          onAdd={handlePayOut}
          showMoreOptions={user?.role === "admin"}
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

        {/* Floating Filter Icon */}
        <div title="Filter" className="fixed bottom-5 right-6 z-10">
          <button
            className="relative w-12 h-12 rounded-full bg-gradient-to-r from-[#0C3978] via-[#106187] to-[#16B8E4] text-white flex items-center justify-center
              shadow-[0_4px_6px_rgba(0,0,0,0.3),0_8px_20px_rgba(0,0,0,0.25)] border border-gray-400
              hover:shadow-[0_6px_10px_rgba(0,0,0,0.35),0_10px_25px_rgba(0,0,0,0.3)] active:translate-y-[2px]
              active:shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-all duration-200 cursor-pointer"
            onClick={() => setShowModal(true)}
          >
            <FiFilter size={20} />
          </button>
        </div>

        <Table
          columns={columns}
          rows={withdrawData}
          currentPage={currentPage}
          setCurrentPage={goToPage}
          rowIdField="_id"
          pageSize={12}
          statusField="pstatus"
          onIdClick={(id) => router.push(`/wallet/payout/detailview/${id}`)}
          checkboxSelection
          onRowClick={(row) => console.log("Payout clicked:", row)}
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
