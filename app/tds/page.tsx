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
import DateFilterModal from "@/components/common/DateRangeModal/daterangemodal";
import { FiFilter } from "react-icons/fi";
import { GridColDef } from "@mui/x-data-grid";
import { handleDownload } from "@/utils/handleDownload";

export default function DailyPayoutPage() {
  const { user } = useVLife();
  const router = useRouter();
  const { query, setQuery, debouncedQuery } = useSearch();

  const [withdrawData, setWithdrawData] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const [dateFilter, setDateFilter] = useState<any>(null);
  const [showModal, setShowModal] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  const API_URL = "/api/tds-operations";

  const handleDownloadClick = () => {
    handleDownload<any>({
      rows: selectedRows,
      fileName: "TDS Reports",
      format: "xlsx",
      onFinish: () => setDownloading(false),
    });
  };

  // FETCH TDS DATA
  const fetchWithdrawals = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(API_URL);

      console.log("Fetched TDS:", data);

      const items = data.data || [];
      setWithdrawData(items);
      setTotalItems(items.length);
    } catch (error) {
      console.error("Error fetching TDS:", error);
      ShowToast.error("Failed to load TDS report");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWithdrawals();
    goToPage(1);
  }, []);

  // ================================
  // 🚨 UPDATED TDS COLUMNS
  // ================================
  const columns: GridColDef[] = [
    { field: "user_id", headerName: "User ID", flex: 1 },
    { field: "wallet_id", headerName: "Wallet ID", flex: 1 },
    { field: "month", headerName: "Month", flex: 1 },
    {
      field: "tds_type",
      headerName: "TDS Category",
      flex: 1,
      renderCell: (params) => (
        <span className={params.value === "PAN" ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
          {params.value}
        </span>
      ),
    },
    {
      field: "total_amount",
      headerName: "Total Earnings (₹)",
      flex: 1,
      align: "right",
      renderCell: (params) => (
        <span className="pr-4">₹ {Number(params.value).toFixed(2)}</span>
      ),
    },
    {
      field: "tds_amount",
      headerName: "TDS Amount (₹)",
      flex: 1,
      align: "right",
      renderCell: (params) => (
        <span className="pr-4 text-red-600 font-semibold">
          ₹ {Number(params.value).toFixed(2)}
        </span>
      ),
    },
    {
      field: "count",
      headerName: "No. of Payouts",
      flex: 1,
      align: "center",
    },
  ];

  // Pagination
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

  return (
    <Layout>
      <div className="max-md:px-4 p-4 w-full max-w-[99%] mx-auto -mt-5">
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        <HeaderWithActions
          title="TDS Summary"
          search={query}
          setSearch={setQuery}
          showBack
          onMore={handleDownloadClick}
          showMoreOptions={user?.role === "admin"}
          addLabel="Add Payout"
          showPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          startItem={startItem}
          endItem={endItem}
          onNext={nextPage}
          onPrev={prevPage}
          onBack={() => router.push("/wallet")}
        />

        {/* Floating Filter Icon */}
        <div title="Filter" className="fixed bottom-5 right-6 z-10">
          <button
            className="relative w-12 h-12 rounded-full bg-gradient-to-r from-[#0C3978] via-[#106187] to-[#16B8E4] text-white flex items-center justify-center shadow-lg"
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
          checkboxSelection
          onRowClick={(row) => console.log("Row clicked:", row)}
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
