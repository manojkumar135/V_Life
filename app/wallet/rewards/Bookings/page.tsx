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
import { GridColDef } from "@mui/x-data-grid";
import { useVLife } from "@/store/context";
import { FiFilter } from "react-icons/fi";
import DateFilterModal from "@/components/common/DateRangeModal/daterangemodal";
import ShowToast from "@/components/common/Toast/toast";

export default function BookingsPage() {
  const { user } = useVLife();
  const router = useRouter();

  const { query, setQuery, debouncedQuery } = useSearch();
  const [bookingsData, setBookingsData] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  const API_URL = "/api/booking-operations";

  const onBack = () => {
    router.push("/wallet/rewards");
  };

  // Fetch bookings from API
  const fetchBookings = useCallback(
    async (search: string) => {
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
        const bookings = data.data || [];
        setBookingsData(bookings);
        setTotalItems(bookings.length);
      } catch (err) {
        console.error("Error fetching bookings:", err);
        ShowToast.error("Failed to load bookings");
      } finally {
        setLoading(false);
      }
    },
    [user?.role, user?.user_id, dateFilter]
  );

  useEffect(() => {
    if (!user?.user_id) return;
    fetchBookings(debouncedQuery);
  }, [debouncedQuery, user?.user_id, dateFilter]);

  // Delete booking
  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_URL}?booking_id=${id}`);
      setBookingsData((prev) => prev.filter((b) => b._id !== id));
      setTotalItems((prev) => prev - 1);
      ShowToast.success("Booking deleted successfully!");
    } catch (err) {
      console.error("Error deleting booking:", err);
      ShowToast.error("Failed to delete booking");
    }
  };

  // Edit booking
  const handleEdit = (id: string) => {
    router.push(`/wallet/rewards/BookingDetail/${id}`);
  };

  const columns: GridColDef[] = [
    { field: "booking_id", headerName: "Booking ID", flex: 1 },
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
    user?.role === "admin" && {
      field: "user_contact",
      headerName: "Contact",
      flex: 1,
    },

    { field: "total_score_used", headerName: "Total Score Used", flex: 1 },
    { field: "remaining_score", headerName: "Remaining Score", flex: 1 },
    { field: "date", headerName: "Booking Date", flex: 1 },

    { field: "status", headerName: "Status", flex: 1 },
  ].filter(Boolean) as GridColDef[];

  const handlePageChange = useCallback(
    (page: number, offset: number, limit: number) => {},
    [query]
  );

  const { currentPage, totalPages, nextPage, prevPage, startItem, endItem } =
    usePagination({
      totalItems,
      itemsPerPage: 14,
      onPageChange: handlePageChange,
    });

  const handleRowClick = (row: any) => {
    handleEdit(row._id);
  };

  const handleAddBooking = () => {
    router.push("/wallet/rewards/addbooking");
  };

  return (
    <Layout>
      <div className="max-md:px-4 p-4 w-full max-w-[99%] mx-auto -mt-5">
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        {/* Floating Filter Icon */}
        <div title="Filter" className="fixed bottom-5 right-6 z-10">
          <button
            className="relative w-12 h-12 rounded-full bg-black text-yellow-300 flex items-center justify-center shadow-lg border border-yellow-400 hover:shadow-xl active:translate-y-[2px] transition-all duration-200 cursor-pointer"
            onClick={() => setShowModal(true)}
          >
            <FiFilter size={20} />
          </button>
        </div>

        <HeaderWithActions
          title="Bookings"
          search={query}
          setSearch={setQuery}
          // addLabel="+ ADD BOOKING"
          // showAddButton={true}
          onAdd={handleAddBooking}
          showPagination
          showBack
          onBack={onBack}
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
          rows={bookingsData.slice((currentPage - 1) * 14, currentPage * 14)}
          rowIdField="_id"
          pageSize={14}
          onRowClick={handleRowClick}
          onIdClick={(id) =>
            router.push(`/wallet/rewards/Bookings/detailview/${id}`)
          }
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
