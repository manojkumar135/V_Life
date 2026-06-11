"use client";
import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import { FaTrash, FaEdit } from "react-icons/fa";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import { useRouter } from "next/navigation";
import axios from "axios";
import Loader from "@/components/common/loader";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { useVLife } from "@/store/context";
import { FiFilter } from "react-icons/fi";
import DateFilterModal from "@/components/common/DateRangeModal/daterangemodal";
import ShowToast from "@/components/common/Toast/toast";
import { handleDownload } from "@/utils/handleDownload";
import { FaDownload, FaEye } from "react-icons/fa";
import dynamic from "next/dynamic";
import { handlePreviewBookingPDF } from "@/lib/bookingInvoicePreview";
import { handleDownloadBookingPDF } from "@/lib/bookingInvoiceDownload";

const PdfPreview = dynamic(() => import("@/components/PDF/PdfPreview"), { ssr: false });

type TabType = "all" | "score" | "matching";

export default function BookingsPage() {
  const { user } = useVLife();
  const router   = useRouter();

  const { query, setQuery, debouncedQuery } = useSearch();
  const [bookingsData, setBookingsData]     = useState<any[]>([]);
  const [filteredData, setFilteredData]     = useState<any[]>([]);
  const [totalItems, setTotalItems]         = useState(0);
  const [loading, setLoading]               = useState(false);
  const [dateFilter, setDateFilter]         = useState<any>(null);
  const [showModal, setShowModal]           = useState(false);
  const [selectedRows, setSelectedRows]     = useState<any[]>([]);
  const [downloading, setDownloading]       = useState(false);
  const [activeTab, setActiveTab]           = useState<TabType>("all");

  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [pdfScale, setPdfScale]       = useState<number>(1);

  const API_URL = "/api/booking-operations";

  useEffect(() => {
    setPdfScale(window.innerWidth < 700 ? 0.56 : 1);
  }, []);

  const tabs: { label: string; value: TabType }[] = [
    { label: "All",      value: "all"      },
    { label: "Score",    value: "score"    },
    { label: "Matching", value: "matching" },
  ];

  useEffect(() => {
    if (activeTab === "all") {
      setFilteredData(bookingsData);
      setTotalItems(bookingsData.length);
    } else {
      const filtered = bookingsData.filter(b => b.type?.toLowerCase() === activeTab);
      setFilteredData(filtered);
      setTotalItems(filtered.length);
    }
  }, [activeTab, bookingsData]);

  // XLSX download — field names match handleDownload utility hyperlink logic
  const handleDownloadClick = () => {
    if (!selectedRows.length) {
      ShowToast.error("No rows selected to download.");
      return;
    }
    const bookingIds     = selectedRows.map((b: any) => b.booking_id).join(",");
    let downloadAllAdded = false;

    const expandedRows = selectedRows.map((booking: any) => {
      const row: any = {
        booking_id:            booking.booking_id,
        user_id:               booking.user_id,
        user_name:             booking.user_name,
        user_contact:          booking.user_contact,
        rank:                  booking.rank,
        type:                  booking.type,
        status:                booking.status,
        date:                  booking.date,
        used:                  booking.used,
        remain:                booking.remain,
        invoice_download:      `${window.location.origin}/api/booking-invoice/${booking.booking_id}`,
        download_all_invoices: !downloadAllAdded
          ? `${window.location.origin}/api/booking-invoices/download?bookings=${bookingIds}`
          : "",
      };
      downloadAllAdded = true;
      return row;
    });

    handleDownload({
      rows:           expandedRows,
      fileName:       "bookings",
      format:         "xlsx",
      excludeHeaders: [],
      onStart:        () => setDownloading(true),
      onFinish:       () => setDownloading(false),
    });
  };

  const onBack = () => router.push("/wallet/rewards");

  const fetchBookings = useCallback(async (search: string) => {
    try {
      setLoading(true);
      const params: any = {
        search:   search || "",
        role:     user?.role,
        ...(user?.role !== "admin" && { user_id: user?.user_id }),
        ...(dateFilter?.type === "on"    && { date: dateFilter.date }),
        ...(dateFilter?.type === "range" && { from: dateFilter.from, to: dateFilter.to }),
      };
      const { data } = await axios.get(API_URL, { params });
      if (data?.success) {
        const bookings = (data.data || []).map((b: any) => {
          const isMatching = b.type === "matching";
          return {
            ...b,
            used:   isMatching ? `${b.total_matches_used ?? 0} Matches` : `${b.total_score_used ?? 0} Score`,
            remain: isMatching ? `${b.remaining_matches ?? 0} Matches`  : `${b.remaining_score ?? 0} Score`,
          };
        });
        setBookingsData(bookings);
      } else {
        ShowToast.error("Failed to load bookings");
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
      ShowToast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [user?.role, user?.user_id, dateFilter]);

  useEffect(() => {
    if (!user) return;
    fetchBookings(debouncedQuery);
  }, [debouncedQuery, user, dateFilter]);

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_URL}?booking_id=${id}`);
      setBookingsData(prev => prev.filter(b => b._id !== id));
      ShowToast.success("Booking deleted successfully!");
    } catch (err) {
      ShowToast.error("Failed to delete booking");
    }
  };

  const handleEdit = (id: string) => router.push(`/wallet/rewards/BookingDetail/${id}`);

  const columns: GridColDef[] = [
    { field: "booking_id", headerName: "Booking ID", flex: 1 },
    user?.role === "admin" && { field: "user_id",      headerName: "User ID",  flex: 1 },
    user?.role === "admin" && { field: "user_name",    headerName: "Name",     flex: 1 },
    user?.role === "admin" && { field: "user_contact", headerName: "Contact",  flex: 1 },
    user?.role === "admin" &&{
  field: "rank",
  headerName: "Rank",
  flex: 1,
  renderCell: (params: any) => {
    const row = params.row;
    const pairStar = row?.pair_star;
    const status = (row?.user_status || row?.status || "").toLowerCase();
    const rank = params.value;

    // 1️⃣ If user has pair_star — show it (capitalize)
    if (pairStar && pairStar !== "none" && pairStar !== "") {
      return (
        <span className="capitalize text-xs font-medium">
          {String(pairStar)
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase())}
        </span>
      );
    }

    // 2️⃣ No pair_star — check rank + active status
    const isActive = status === "active";
    const rankNum = Number(rank);
    const hasRank =
      rank !== null &&
      rank !== undefined &&
      rank !== "" &&
      rank !== "none" &&
      String(rank).toLowerCase() !== "null" &&
      (!isNaN(rankNum) ? rankNum > 0 : true);

    if (isActive && hasRank) {
      return <span className="text-xs font-medium">Star</span>;
    }

    // 3️⃣ Fallback
    return <span className="text-gray-400">-</span>;
  },
},
    {
      field: "type", headerName: "Type", flex: 0.8,
      renderCell: (params: any) => {
        const type = params?.row?.type;
        return type ? type.charAt(0).toUpperCase() + type.slice(1) : "-";
      },
    },
    { field: "used",   headerName: "Used",        flex: 0.8 },
    { field: "remain", headerName: "Remain",       flex: 0.8 },
    { field: "date",   headerName: "Booking Date", flex: 1   },
    { field: "status", headerName: "Status",       flex: 0.7 },

    // Admin only — preview + download invoice per row
    user?.role === "admin" && {
      field: "invoice",
      headerName: "Invoice",
      flex: 0.8,
      renderCell: (params: GridRenderCellParams) => (
        <div className="flex max-lg:gap-8 max-lg:min-w-20 gap-6 xl:items-center xl:justify-center mt-2">
          <button
            title="Preview Invoice"
            className="text-[#106187] cursor-pointer"
            onClick={async e => {
              e.stopPropagation();
              await handlePreviewBookingPDF(
                params.row.booking_id,
                setLoading,
                (url) => { setPreviewUrl(url); setShowPreview(true); }
              );
            }}
          >
            <FaEye size={16} />
          </button>
          <button
            title="Download Invoice"
            className="text-[#106187] cursor-pointer"
            onClick={e => {
              e.stopPropagation();
              handleDownloadBookingPDF(params.row.booking_id, setLoading);
            }}
          >
            <FaDownload size={15} />
          </button>
        </div>
      ),
    },
  ].filter(Boolean) as GridColDef[];

  const handlePageChange = useCallback(
    (page: number, offset: number, limit: number) => {},
    [query]
  );

  const { currentPage, totalPages, nextPage, prevPage, startItem, endItem, goToPage } =
    usePagination({ totalItems, itemsPerPage: 12, onPageChange: handlePageChange });

  const handleRowClick   = (row: any) => handleEdit(row._id);
  const handleAddBooking = () => router.push("/wallet/rewards/addbooking");

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
            className="relative w-12 h-12 rounded-full bg-linear-to-r from-[#0C3978] via-[#106187] to-[#16B8E4]
             text-white flex items-center justify-center
             shadow-[0_4px_6px_rgba(0,0,0,0.3),0_8px_20px_rgba(0,0,0,0.25)] border border-gray-400
             hover:shadow-[0_6px_10px_rgba(0,0,0,0.35),0_10px_25px_rgba(0,0,0,0.3)]
             active:translate-y-0.5 active:shadow-[0_2px_4px_rgba(0,0,0,0.3)]
             transition-all duration-200 cursor-pointer"
            onClick={() => setShowModal(true)}
          >
            <FiFilter size={22} />
          </button>
        </div>

        <HeaderWithActions
          title="Bookings"
          search={query}
          setSearch={setQuery}
          onAdd={handleAddBooking}
          showPagination
          showBack
          onBack={onBack}
          onMore={handleDownloadClick}
          showMoreOptions={user?.role === "admin" && selectedRows.length > 0}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          startItem={startItem}
          endItem={endItem}
          onNext={nextPage}
          onPrev={prevPage}
        />

        {/* Filter Tabs */}
        <div className="flex gap-2 mt-3 mb-2 flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => { setActiveTab(tab.value); goToPage(1); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 cursor-pointer
                ${activeTab === tab.value
                  ? "bg-[#0C3978] text-white border-[#0C3978] shadow-md"
                  : "bg-white text-gray-600 border-gray-300 hover:border-[#0C3978] hover:text-[#0C3978]"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Table
          columns={columns}
          rows={filteredData}
          currentPage={currentPage}
          setCurrentPage={goToPage}
          rowIdField="_id"
          pageSize={12}
          onRowClick={handleRowClick}
          onIdClick={id => router.push(`/wallet/rewards/Bookings/detailview/${id}`)}
          checkboxSelection
          setSelectedRows={setSelectedRows}
        />

        <DateFilterModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={filter => { setDateFilter(filter); setShowModal(false); }}
        />
      </div>

      {/* PDF Preview Modal */}
      {showPreview && previewUrl && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm">
          <button
            className="absolute top-5 right-15 max-lg:right-3 text-white bg-black rounded-full
              w-7 h-7 cursor-pointer border-white border-2 font-bold flex items-center justify-center"
            onClick={() => {
              setShowPreview(false);
              URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
            }}
          >
            ✕
          </button>
          <PdfPreview url={previewUrl} scale={pdfScale} />
        </div>
      )}
    </Layout>
  );
}