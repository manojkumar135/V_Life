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

export default function TDS() {
  const { user } = useVLife();
  const router = useRouter();
  const { query, setQuery, debouncedQuery } = useSearch();

  const [tdsData, setTDSData] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const [dateFilter, setDateFilter] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [downloading, setDownloading] = useState(false);
  

  const API_URL = "/api/tds-operations";

  /** ===========================
   *  DOWNLOAD XLSX
   ============================*/
 

   const handleDownloadClick = () => {
      handleDownload<any>({
        rows: selectedRows, // or selected rows if you want selection-based export
        fileName: "TDS Reports",
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
          "last_modified_by"
        ],
        onFinish: () => setDownloading(false),
      });
    };

  /** ===========================
   *  FETCH DATA
   ============================*/
  const fetchTDS = useCallback(async () => {
    try {
      setLoading(true);

      const params: any = {
        role: user?.role,
        search: debouncedQuery,
      };

      if (dateFilter?.type === "on") params.date = dateFilter.date;
      if (dateFilter?.type === "range") {
        params.from = dateFilter.from;
        params.to = dateFilter.to;
      }

      const { data } = await axios.get(API_URL, { params });
      // console.log("TDS Data:", data);

      setTDSData(data.data || []);
      setTotalItems(data.data?.length || 0);
    } catch (error) {
      console.error(error);
      ShowToast.error("Failed to load TDS report");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, dateFilter, user?.role]);

  useEffect(() => {
  fetchTDS();
}, [debouncedQuery, dateFilter, fetchTDS]);

useEffect(() => {
  if (tdsData.length > 0) {
    goToPage(1);
  }
}, [tdsData]);

  /** ===========================
   *  TABLE COLUMNS
   ============================*/
  const columns: GridColDef[] = [
    { field: "user_id", headerName: "User ID", flex: 0.7 },
    { field: "user_name", headerName: "Name", flex: 1 },

    {
      field: "wallet_id",
      headerName: "Wallet ID",
      flex: 0.7,
      renderCell: (params) =>
        params.value ? (
          <span className="font-semibold">{params.value}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },

    { field: "year", headerName: "Year", flex: 0.5 },
    { field: "month_name", headerName: "Month", flex: 0.7 },

    {
      field: "tds_type",
      headerName: "TDS Type",
      flex: 0.7,
      renderCell: (params) => (
        <span
          className={
            params.value === "PAN"
              ? "text-green-600 font-semibold"
              : "text-red-600 font-semibold"
          }
        >
          {params.value}
        </span>
      ),
    },

    {
      field: "pan_number",
      headerName: "PAN Number",
      flex: 1,
      renderCell: (params) =>
        params.value ? (
          <span className="text-green-700 font-medium">{params.value}</span>
        ) : (
          <span className="text-gray-500">—</span>
        ),
    },

    {
      field: "total_amount",
      headerName: "Total Amount (₹)",
      flex: 1,
      align: "right",
      renderCell: (params) => (
        <span className="pr-4">
          ₹ {Number(params.value || 0).toFixed(2)}
        </span>
      ),
    },

    {
      field: "tds_amount",
      headerName: "TDS (₹)",
      flex: 1,
      align: "right",
      renderCell: (params) => (
        <span className="pr-4 text-red-600 font-semibold">
          ₹ {Number(params.value || 0).toFixed(2)}
        </span>
      ),
    },

    {
      field: "count",
      headerName: "Payouts",
      flex: 0.7,
      align: "center",
    },
  ];

  /** ===========================
   *  PAGINATION
   ============================*/
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
  });

  /** ===========================
   *  UI
   ============================*/
  return (
    <Layout>
      <div className="max-md:px-4 p-4 w-full max-w-[99%] mx-auto -mt-5">
        {(loading || downloading) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        <HeaderWithActions
          title="TDS Summary"
          search={query}
          setSearch={setQuery}
          showBack
          onBack={() => router.push("/wallet")}
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

        {/* Filter Button */}
        <div className="fixed bottom-5 right-6 z-10">
          <button
            className="w-12 h-12 rounded-full bg-gradient-to-r from-[#0C3978] via-[#106187] to-[#16B8E4] text-white flex items-center justify-center shadow-lg"
            onClick={() => setShowModal(true)}
          >
            <FiFilter size={20} />
          </button>
        </div>

        <Table
          columns={columns}
          rows={tdsData}
          currentPage={currentPage}
          setCurrentPage={goToPage}
          rowIdField="_id"
          pageSize={12}
          checkboxSelection
          onRowClick={(row) => console.log(row)}
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
