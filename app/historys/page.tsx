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

export default function TransactionHistory() {
  const router = useRouter();
  const { user } = useVLife();
    const user_id = user?.user_id || "";

  const { query, setQuery, debouncedQuery } = useSearch();

  const [historyData, setHistoryData] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [advancePaid, setAdvancePaid] = useState<boolean>(false);

  const API_URL = "/api/history-operations";

  // ✅ Check if advance is paid (same as payout code)
  useEffect(() => {
    if (!user?.user_id) return;
    (async () => {
      const paid = await hasAdvancePaid(user.user_id, 10000);
      setAdvancePaid(paid);
      setShowAlert(!paid);
    })();
  }, [user?.user_id]);

  // ✅ Fetch transactions
  const fetchHistory = useCallback(
    async (search: string) => {
      if (!user?.user_id) return;
      try {
        setLoading(true);
        const { data } = await axios.get(API_URL, {
          params: { user_id: user.user_id, search },
        });
        const history = data.data || [];
        setHistoryData(history);
        setTotalItems(history.length);
      } catch (error) {
        console.error("Error fetching history:", error);
        ShowToast.error("Failed to load history");
      } finally {
        setLoading(false);
      }
    },
    [user?.user_id, query]
  );

  useEffect(() => {
    if (!user?.user_id) return;
    fetchHistory(debouncedQuery);
  }, [debouncedQuery, user?.user_id]);

  // ✅ Columns setup
  const columns = [
    { field: "transaction_id", headerName: "Transaction ID", flex: 1 },
    { field: "date", headerName: "Date", flex: 1 },
    { field: "details", headerName: "Detail", flex: 2 },
    {
      field: "amount",
      headerName: "Amount",
      flex: 1,
      renderCell: (params: any) => (
        <span
          className={
            params.row.status === "credit" ? "text-green-600" : "text-red-600"
          }
        >
          ₹ {Number(params.value).toFixed(2)}
        </span>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      renderCell: (params: any) =>
        params.value === "credit" ? (
          <FaPlusCircle className="text-green-600 text-lg mt-2" />
        ) : (
          <FaMinusCircle className="text-red-600 text-lg mt-2" />
        ),
    },
  ];

  const handlePageChange = useCallback(
    (page: number, offset: number, limit: number) => {
      // Optional: implement API pagination
    },
    [query]
  );

  const { currentPage, totalPages, nextPage, prevPage, startItem, endItem } =
    usePagination({
      totalItems,
      itemsPerPage: 14,
      onPageChange: handlePageChange,
    });

  const onBack = () => {
    router.push("/wallet");
  };

  // ✅ Navigate to Pay Advance (like payout page)
  const handlePayAdvance = () => {
    router.push("/historys/payAdvance");
  };

  return (
    <Layout>
      {/* 🔔 Right Side Alert */}
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
        buttonAction={() => router.push("/historys/payAdvance")}
        onClose={() => setShowAlert(false)}
      />

      <div className="p-6 w-full max-w-[98%] mx-auto -mt-5">
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        <HeaderWithActions
          title="History"
          search={query}
          setSearch={setQuery}
          showAddButton={!advancePaid} // ✅ show button only if advance not paid
          addLabel="Make Payment"
          onAdd={handlePayAdvance}
          showBack
          onBack={onBack}
          showPagination
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
          rows={historyData.slice((currentPage - 1) * 14, currentPage * 14)}
          rowIdField="_id"
          pageSize={14}
          onRowClick={(row) => console.log("Transaction clicked:", row)}
          checkboxSelection
        />
      </div>
    </Layout>
  );
}
