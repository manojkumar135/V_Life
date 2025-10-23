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
import { hasAdvancePaid } from "@/utils/hasAdvancePaid";
import DateFilterModal from "@/components/common/DateRangeModal/daterangemodal";
import { FiFilter } from "react-icons/fi";
import { GridColDef } from "@mui/x-data-grid";

export default function DailyPayoutPage() {
  const { user } = useVLife();
  const router = useRouter();
  const { query, setQuery, debouncedQuery } = useSearch();

  const [withdrawData, setWithdrawData] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [advancePaid, setAdvancePaid] = useState<boolean>(false);

  // ✅ date filter state
  const [dateFilter, setDateFilter] = useState<any>(null);
  const [showModal, setShowModal] = useState(true); // open on first load

  const API_URL = "/api/dailyPayout-operations";

  // ✅ Check if advance is paid
  useEffect(() => {
    if (!user?.user_id) return;
    (async () => {
      const paid = await hasAdvancePaid(user.user_id, 10000);
      setAdvancePaid(paid.hasPermission);
    })();
  }, [user?.user_id]);

  // ✅ Fetch withdrawals
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
  }, [debouncedQuery, user?.user_id, dateFilter]);

  // ✅ Table columns
  const columns: GridColDef[] = [
    { field: "payout_id", headerName: "Transaction ID", flex: 1 },
    { field: "wallet_id", headerName: "Wallet ID", flex: 1.5 },
    { field: "user_id", headerName: "Withdraw Address", flex: 1.5 },
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
    { field: "status", headerName: "Status", flex: 1 },
  ];

  // ✅ Pagination hook
  const { currentPage, totalPages, nextPage, prevPage, startItem, endItem } =
    usePagination({
      totalItems,
      itemsPerPage: 14,
      onPageChange: () => {},
    });

  // ✅ Button actions
  const handlePayOut = () => {
    router.push("/wallet/payout/addpayout");
  };

  const onBack = () => {
    router.push("/wallet/payout");
  };

  return (
    <Layout>
      <div className=" max-md:px-4 p-4 w-full max-w-[99%] mx-auto -mt-5">
        {loading && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center
           bg-black/40 backdrop-blur-sm"
          >
            <Loader />
          </div>
        )}

        <HeaderWithActions
          title="Daily Payouts"
          search={query}
          setSearch={setQuery}
          showAddButton={user?.role === "jk"}
          showBack
          onBack={onBack}
          addLabel="Add Payout"
          onAdd={handlePayOut}
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
        <div title="Filter" className="fixed  bottom-5 right-6 z-10">
          <button
            className="
                    relative w-12 h-12 rounded-full 
                    bg-black text-yellow-300 flex items-center justify-center 
                    shadow-[0_4px_6px_rgba(0,0,0,0.3),0_8px_20px_rgba(0,0,0,0.25)]
                    border border-yellow-400
                    hover:shadow-[0_6px_10px_rgba(0,0,0,0.35),0_10px_25px_rgba(0,0,0,0.3)]
                    active:translate-y-[2px] active:shadow-[0_2px_4px_rgba(0,0,0,0.3)]
                    transition-all duration-200 cursor-pointer
                  "
            onClick={() => setShowModal(true)}
          >
            <FiFilter size={20} />
          </button>
        </div>

        <Table
          columns={columns}
          rows={withdrawData.slice((currentPage - 1) * 14, currentPage * 14)}
          rowIdField="_id"
          pageSize={14}
          statusField="pstatus"
          onIdClick={(id) => router.push(`/wallet/payout/detailview/${id}`)}
          checkboxSelection
          onRowClick={(row) => console.log("payout clicked:", row)}
        />

        {/* Date Filter Modal */}
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
