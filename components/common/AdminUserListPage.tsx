"use client";
import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import { useRouter } from "next/navigation";
import axios from "axios";
import Loader from "@/components/common/loader";
import { GridColDef } from "@mui/x-data-grid";
import { useVLife } from "@/store/context";
import ShowToast from "@/components/common/Toast/toast";
import { FiFilter } from "react-icons/fi";
import DateFilterModal from "@/components/common/DateRangeModal/daterangemodal";
import { handleDownload } from "@/utils/handleDownload";

interface Props {
  title: string;
  apiUrl: string;
  backPath: string;
  emptyMessage?: string;
}

export default function AdminUserListPage({ title, apiUrl, backPath }: Props) {
  const { user } = useVLife();
  const router = useRouter();

  const { query, setQuery, debouncedQuery } = useSearch();
  const [usersData, setUsersData] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dateFilter, setDateFilter] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  // ── usePagination MUST be above fetchUsers so goToPage is defined ──
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
    onPageChange: useCallback(
      (_page: number, _offset: number, _limit: number) => {},
      []
    ),
  });

  const handleDownloadClick = () => {
    handleDownload<any>({
      rows: selectedRows,
      fileName: title.toLowerCase().replace(/\s+/g, "-"),
      format: "xlsx",
      excludeHeaders: ["_id", "__v"],
      onStart: () => setDownloading(true),
      onFinish: () => setDownloading(false),
    });
  };

  const fetchUsers = useCallback(
    async (search: string) => {
      try {
        setLoading(true);

        const params: any = {
          search: search || "",
          ...(dateFilter?.type === "on" && { date: dateFilter.date }),
          ...(dateFilter?.type === "range" && {
            from: dateFilter.from,
            to: dateFilter.to,
          }),
        };

        const { data } = await axios.get(apiUrl, { params });
        const users = data.data || [];

        setUsersData(users);
        setTotalItems(users.length);
      } catch (error) {
        console.error(`Error fetching ${title}:`, error);
        ShowToast.error(`Failed to load ${title}`);
      } finally {
        setLoading(false);
      }
    },
    [apiUrl, dateFilter, title]
  );

  useEffect(() => {
    fetchUsers(debouncedQuery);
    goToPage(1);
  }, [debouncedQuery, dateFilter, fetchUsers]);

  const columns: GridColDef[] = [
    { field: "user_id", headerName: "User ID", flex: 1 },
    { field: "user_name", headerName: "Name", flex: 1.2 },
    { field: "contact", headerName: "Contact", flex: 1 },
    { field: "activation_date", headerName: "Activation Date", flex: 1 },
  ];

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
          title={title}
          search={query}
          setSearch={setQuery}
          showAddButton={false}
          showBack
          onBack={() => router.push(backPath)}
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
          rows={usersData}
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