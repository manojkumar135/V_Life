"use client";
import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import Loader from "@/components/common/loader";
import { GridColDef } from "@mui/x-data-grid";
import ShowToast from "@/components/common/Toast/toast";
import { FiFilter } from "react-icons/fi";
import DateFilterModal from "@/components/common/DateRangeModal/daterangemodal";
import { handleDownload } from "@/utils/handleDownload";
import { useRouter } from "next/navigation";

interface PairPVRow {
  user_id: string;
  user_name: string;
  own_pv: number;
  left_pv: number;
  right_pv: number;
  direct_left_pv: number;
  direct_right_pv: number;
  count: number;
  current_pair_star: string | null;
}

export default function AdminPairPVPage() {
  const router = useRouter();
  const { query, setQuery, debouncedQuery } = useSearch();

  const [rows, setRows] = useState<PairPVRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  const [dateFilter, setDateFilter] = useState<any>({ type: "all" });

  const API_URL = "/api/admin-pair-pv";

  const handleDownloadClick = () => {
    handleDownload<any>({
      rows: selectedRows,
      fileName: "pair-pv-report",
      format: "xlsx",
      excludeHeaders: ["_id", "__v", "created_at"],
      onStart: () => setDownloading(true),
      onFinish: () => setDownloading(false),
    });
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const params: Record<string, string> = {
        search: debouncedQuery || "",
      };

      if (dateFilter?.type === "on" && dateFilter.date) {
        params.from = dateFilter.date;
        params.to = dateFilter.date;
      }

      if (dateFilter?.type === "range" && dateFilter.from && dateFilter.to) {
        params.from = dateFilter.from;
        params.to = dateFilter.to;
      }

      if (dateFilter?.count !== undefined) {
        params.count = String(dateFilter.count);
      }

      const response = await axios.get(API_URL, { params });

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to load data");
      }

      const data = response.data.data || [];
      setRows(data);
      setTotalItems(data.length);
    } catch (error) {
      console.error("Failed to load pair PV report:", error);
      ShowToast.error("Failed to load pair PV report");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, dateFilter]);

  useEffect(() => {
    fetchData();
    goToPage(1);
  }, [debouncedQuery, dateFilter]);

  const columns: GridColDef[] = [
    { field: "user_id", headerName: "User ID", flex: 0.8 },
    { field: "user_name", headerName: "Name", flex: 1 },
    {
      field: "display_pair_star",
      headerName: "Pair Star",
      flex: 0.9,
      renderCell: (params) =>
        params.value ? (
          <span className="inline-flex items-center px-2 py-1 rounded-full  text-xs ">
            {params.value}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      field: "own_pv",
      headerName: "Self PV",
      flex: 0.7,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (params.value ?? 0).toLocaleString(),
    },
    
    {
      field: "direct_left_pv",
      headerName: "Direct Left PV",
      flex: 0.8,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (params.value ?? 0).toLocaleString(),
    },
    {
      field: "direct_right_pv",
      headerName: "Direct Right PV",
      flex: 0.8,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (params.value ?? 0).toLocaleString(),
    },
    {
      field: "left_pv",
      headerName: "Left PV",
      flex: 0.8,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (params.value ?? 0).toLocaleString(),
    },
    {
      field: "right_pv",
      headerName: "Right PV",
      flex: 0.8,
      align: "right",
      headerAlign: "right",
      renderCell: (params) => (params.value ?? 0).toLocaleString(),
    },
    {
      field: "count",
      headerName: "Pairs",
      flex: 0.6,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <span className="font-semibold text-[#106187]">
          {(params.value ?? 0).toLocaleString()}
        </span>
      ),
    },
  ];

  const handlePageChange = useCallback(
    (_page: number, _offset: number, _limit: number) => {},
    [query],
  );

  const onBack = () => {
    router.push("/reports");
  };

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

  return (
    <Layout>
      <div className="max-md:px-4 p-4 w-full max-w-[99%] mx-auto -mt-5">
        {(loading || downloading) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

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

        <HeaderWithActions
          title="Pair PV Report"
          search={query}
          setSearch={setQuery}
          showAddButton={false}
          showBack
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

        <Table
          columns={columns}
          rows={rows}
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
          showCountFilter
          countLabel="Min Pairs"
        />
      </div>
    </Layout>
  );
}
