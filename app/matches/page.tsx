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


export default function MatchesPage() {
  const { user } = useVLife();
    const router = useRouter();
  

  const { query, setQuery, debouncedQuery } = useSearch();
  const [matchesData, setMatchesData] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dateFilter, setDateFilter] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  const API_URL = "/api/matches";

  const handleDownloadClick = () => {
    handleDownload<any>({
      rows: selectedRows,
      fileName: "matches",
      format: "xlsx",
      excludeHeaders: ["_id", "__v", "created_at"],
      onStart: () => setDownloading(true),
      onFinish: () => setDownloading(false),
    });
  };

  const fetchMatches = useCallback(async (search: string) => {
    try {
      setLoading(true);

      const params: any = {
        search: search || "",
        role: user?.role,
        ...(user?.user_id && { user_id: user.user_id }),
        ...(dateFilter?.type === "on" && { date: dateFilter.date }),
        ...(dateFilter?.type === "range" && {
          from: dateFilter.from,
          to: dateFilter.to,
        }),
      };

      const { data } = await axios.get(API_URL, { params });
      const matches = data.data || [];
    //   console.log(matches);

      setMatchesData(matches);
      setTotalItems(matches.length);
    } catch (error) {
      console.error("Error fetching matches:", error);
      ShowToast.error("Failed to load matches");
    } finally {
      setLoading(false);
    }
  }, [user?.role, user?.user_id, dateFilter]);

  useEffect(() => {
    if (!user?.user_id) return;
    fetchMatches(debouncedQuery);
    goToPage(1);
  }, [debouncedQuery, user?.user_id, dateFilter]);

  const columns: GridColDef[] = [
    // Admin-only: user details
    ...(user?.role === "admin"
      ? [
          { field: "user_id", headerName: "User ID", flex: 0.8 },
          { field: "user_name", headerName: "Name", flex: 1 },
          { field: "contact", headerName: "Contact", flex: 1 },
        ]
      : []),

    {
      field: "activation_date",
      headerName: "Activation Date",
      flex: 0.8,
    },
   
    {
      field: "cycleStart",
      headerName: "Cycle Start",
      flex: 0.8,
    },
    {
      field: "cycleEnd",
      headerName: "Cycle End",
      flex: 0.8,
    },
    {
      field: "matches",
      headerName: "Matches",
      flex: 0.8,
      align: "center",
      headerAlign: "center",
      renderCell: (params: GridRenderCellParams) => (
        <span className="font-semibold text-[#106187]">{params.value ?? 0}</span>
      ),
    },
   
    {
      field: "daysPassed",
      headerName: "Days Passed",
      flex: 0.8,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "remainingDays",
      headerName: "Days Left",
      flex: 0.8,
      align: "center",
      headerAlign: "center",
      renderCell: (params: GridRenderCellParams<any, number>) => {
        const val = params.value ?? 0;
        const color =
          val <= 5 ? "text-red-500" : val <= 15 ? "text-yellow-500" : "text-green-600";
        return <span className={`font-semibold ${color}`}>{val}</span>;
      },
    },
  ].filter(Boolean) as GridColDef[];

  const handlePageChange = useCallback(
    (_page: number, _offset: number, _limit: number) => {},
    [query]
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
          title="Matches"
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
          rows={matchesData}
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