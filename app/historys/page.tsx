"use client";
import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import { useRouter } from "next/navigation";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";
import { useVLife } from "@/store/context";
import { FaPlusCircle, FaMinusCircle } from "react-icons/fa";
import { hasAdvancePaid } from "@/utils/hasAdvancePaid";
import AlertBox from "@/components/Alerts/advanceAlert";
import DateFilterModal from "@/components/common/DateRangeModal/daterangemodal";
import { FiFilter } from "react-icons/fi";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { handleDownload } from "@/utils/handleDownload";
import { formatDate } from "@/components/common/formatDate";

export default function TransactionHistory() {
  const router = useRouter();
  const { user } = useVLife();
  const user_id = user?.user_id || "";

  const { query, setQuery, debouncedQuery } = useSearch();

  const [historyData, setHistoryData] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [advancePaid, setAdvancePaid] = useState<boolean>(false);
  const [dateFilter, setDateFilter] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const API_URL = "/api/history-operations";

  // ✅ handle download click
  const handleDownloadClick = () => {
    handleDownload<any>({
      rows: selectedRows,
      fileName: "transaction_history",
      format: "xlsx",
      excludeHeaders: [
        "_id",
        "__v",
        "created_at",
        "created_by",
        "last_modified_by",
        "last_modified_at",
      ],
      onStart: () => setDownloading(true),
      onFinish: () => setDownloading(false),
    });
  };

  // ✅ Check if advance is paid
  useEffect(() => {
    if (!user?.user_id) return;
    let isMounted = true;
    (async () => {
      const paid = await hasAdvancePaid(user.user_id, 10000);
      if (!isMounted) return;
      setAdvancePaid(paid.hasPermission);
      setShowAlert(!paid.hasPermission);
    })();
    return () => {
      isMounted = false;
    };
  }, [user?.user_id]);

  // ✅ Fetch transactions with date filters
  const fetchHistory = useCallback(async () => {
    if (!user?.user_id) return;
    let isMounted = true;
    try {
      setLoading(true);
      const { data } = await axios.get(API_URL, {
        params: {
          search: debouncedQuery || "",
          role: user?.role,
          user_id,
          ...(dateFilter?.type === "on" && { date: dateFilter.date }),
          ...(dateFilter?.type === "range" && {
            from: dateFilter.from,
            to: dateFilter.to,
          }),
        },
      });
      const history = data.data || [];
      if (isMounted) {
        setHistoryData(history);
        setTotalItems(history.length);
      }
    } catch (error) {
      if (isMounted) ShowToast.error("Failed to load history");
      console.error("Error fetching history:", error);
    } finally {
      if (isMounted) setLoading(false);
    }
    goToPage(1);

    return () => {
      isMounted = false;
    };
  }, [user?.user_id, debouncedQuery, dateFilter, user_id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatTime = (value: string) => {
    console.log("Formatting time:", value);
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

  // ✅ Columns setup
  const columns: GridColDef[] = [
    { field: "transaction_id", headerName: "Transaction ID", flex: 1 },

    // Admin only
    user?.role === "admin" && {
      field: "user_id",
      headerName: "User ID",
      flex: 1,
    },
    user?.role === "admin" && {
      field: "user_name",
      headerName: "Name",
      flex: 1,
    },

    { field: "date", headerName: "Date", flex: 0.6 },
    {
      field: "time",
      headerName: "Time",
      flex: 0.6,
      renderCell: (params: any) => {
        const time = params?.row?.time;
        console.log("Original time value:", time);
        return formatTime(time);
      },
    },

    { field: "details", headerName: "Detail", flex: 1.8 },

    {
      field: "amount",
      headerName: "Amount (₹)",
      flex: 0.8,
      align: "right",
      renderCell: (params: GridRenderCellParams<any, number>) => {
        const type = String(params.row.transaction_type ?? "").toLowerCase();
        const isUser = user?.role === "user";
        const isCredit = type === "credit";

        // ✅ Match color logic with role
        const textColor = isUser
          ? isCredit
            ? "text-green-600"
            : "text-red-600"
          : isCredit
          ? "text-red-600"
          : "text-green-600";

        return (
          <span className={`pr-5 ${textColor}`}>
            ₹ {Number(params.value ?? 0).toFixed(2)}
          </span>
        );
      },
    },

    {
      field: "transaction_type",
      headerName: "Status",
      flex: 0.6,
      renderCell: (params: GridRenderCellParams<any, string>) => {
        const type = String(params.value ?? "").toLowerCase();
        const isUser = user?.role === "user";
        const isCredit = type === "credit";

        // ✅ Invert icons & colors for admin
        const Icon = isUser
          ? isCredit
            ? FaPlusCircle
            : FaMinusCircle
          : isCredit
          ? FaMinusCircle
          : FaPlusCircle;

        const iconColor = isUser
          ? isCredit
            ? "text-green-600"
            : "text-red-600"
          : isCredit
          ? "text-red-600"
          : "text-green-600";

        return <Icon className={`${iconColor} text-lg ml-4 mt-2`} />;
      },
    },
  ].filter(Boolean) as GridColDef[];

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

  const onBack = () => router.push("/wallet");
  const handlePayAdvance = () => router.push("/historys/payAdvance");

  return (
    <Layout>
      <AlertBox
        visible={showAlert}
        title="Action Required!"
        message={
          <>
            To activate your account, please pay{" "}
            <span className="font-semibold text-lg">₹10,000</span> as prepaid.
            This will be adjusted in your first order.
          </>
        }
        buttonLabel="Pay Now"
        buttonAction={handlePayAdvance}
        onClose={() => setShowAlert(false)}
      />

      <div className=" max-md:px-4 p-4 w-full max-w-[99%] mx-auto -mt-5">
        {(loading || downloading) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        <HeaderWithActions
          title="History"
          search={query}
          setSearch={setQuery}
          showAddButton={!advancePaid}
          addLabel="Make Payment"
          onAdd={handlePayAdvance}
          onBack={onBack}
          onMore={handleDownloadClick}
          showPagination
          showMoreOptions
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          startItem={startItem}
          endItem={endItem}
          onNext={nextPage}
          onPrev={prevPage}
        />

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
          rows={historyData}
          currentPage={currentPage}
          setCurrentPage={goToPage}
          rowIdField="_id"
          pageSize={12}
          onRowClick={(row) => console.log("Transaction clicked:", row)}
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
