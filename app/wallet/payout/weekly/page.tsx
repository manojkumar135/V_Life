"use client";
import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import { FaTrash } from "react-icons/fa";
import { GoPencil } from "react-icons/go";
import { useRouter } from "next/navigation";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";
import { useVLife } from "@/store/context";
// import { hasAdvancePaid } from "@/utils/hasAdvancePaid";
import { hasFirstOrder } from "@/services/hasFirstOrder";
import DateFilterModal from "@/components/common/DateRangeModal/daterangemodal";
import { FiFilter } from "react-icons/fi";
import { GridColDef } from "@mui/x-data-grid";
import { handleDownload } from "@/utils/handleDownload";

export default function WithdrawPage() {
  const { user } = useVLife();
  const router = useRouter();
  const { query, setQuery, debouncedQuery } = useSearch();

  const [withdrawData, setWithdrawData] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
const [hasPermission, setHasPermission] = useState<boolean>(false);

  // ✅ date filter state
  const [dateFilter, setDateFilter] = useState<any>(null);
  const [showModal, setShowModal] = useState(true); // open modal on page load
  const [downloading, setDownloading] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  const API_URL = "/api/weeklyPayout-operations";

  // ✅ Check if advance is paid
 useEffect(() => {
  if (!user?.user_id) return;

  (async () => {
    try {
      const res = await hasFirstOrder(user.user_id);
      setHasPermission(res.hasPermission);
    } catch (err) {
      console.error("Error checking first order status:", err);
      setHasPermission(false);
    }
  })();
}, [user?.user_id]);


  // ✅ Fetch withdrawals with search + date filter
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

    goToPage(1);
  }, [debouncedQuery, user?.user_id, dateFilter]);

  const handleDownloadClick = () => {
    handleDownload<any>({
      rows: selectedRows, // or selected rows if you want selection-based export
      fileName: "Daliy Payouts",
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
        "last_modified_by",
      ],
      onFinish: () => setDownloading(false),
    });
  };

  // ✅ Delete withdrawal
  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${API_URL}?withdraw_id=${id}`);
      setWithdrawData((prev) => prev.filter((item) => item._id !== id));
      setTotalItems((prev) => prev - 1);
      ShowToast.success("Withdrawal deleted successfully");
    } catch (error) {
      console.error("Error deleting withdrawal:", error);
      ShowToast.error("Failed to delete withdrawal");
    }
  };

  // ✅ Edit withdrawal
  const handleEdit = (id: string) => {
    router.push(`/wallet/withdraw/detailview/${id}`);
  };

  // ✅ Table columns
  const columns: GridColDef[] = [
    { field: "payout_id", headerName: "Transaction ID", flex: 1 },
    { field: "wallet_id", headerName: "Wallet ID", flex: 1 },
    { field: "user_id", headerName: "User ID", flex: 1 },
    ...(user?.role === "admin"
      ? [
          {
            field: "rank",
            headerName: "Rank",
            flex: 1,
              renderCell: (params: any) => {
  return params.value && params.value !== "none"
    ? `${params.value} Star`
    : "-"
}
          },
        ]
      : []),
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
    {
      field: "withdraw_amount",
      headerName: "Withdraw ( ₹ )",
      align: "right",
      flex: 1,
      renderCell: (params) => (
        <span className="pr-5">
          ₹ {Number(params.value)?.toFixed(2) || "0.00"}
        </span>
      ),
    },
    {
      field: "reward_amount",
      headerName: "Reward ( ₹ )",
      align: "right",
      flex: 1,
      renderCell: (params) => (
        <span className="pr-5">
          ₹ {Number(params.value)?.toFixed(2) || "0.00"}
        </span>
      ),
    },
    {
      field: "admin_charge",
      headerName: "Admin ( ₹ )",
      align: "right",
      flex: 1,
      renderCell: (params) => (
        <span className="pr-5">
          ₹ {Number(params.value)?.toFixed(2) || "0.00"}
        </span>
      ),
    },
    {
      field: "tds_amount",
      headerName: "TDS ( ₹ )",
      align: "right",
      flex: 1,
      renderCell: (params) => (
        <span className="pr-5">
          ₹ {Number(params.value)?.toFixed(2) || "0.00"}
        </span>
      ),
    },
    { field: "status", headerName: "Status", flex: 1 },
    // {
    //   field: "actions",
    //   headerName: "Actions",
    //   flex: 1,
    //   sortable: false,
    //   disableColumnMenu: true,
    //   renderCell: (params: any) => (
    //     <div className="flex gap-2 items-center">
    //       <button
    //         className="text-green-600 cursor-pointer ml-2"
    //         onClick={() => handleEdit(params.row._id)}
    //       >
    //         <GoPencil size={18} />
    //       </button>
    //       <button
    //         className="text-red-600 cursor-pointer ml-2"
    //         onClick={() => handleDelete(params.row._id)}
    //       >
    //         <FaTrash size={16} />
    //       </button>
    //     </div>
    //   ),
    // },
  ];

  // ✅ Pagination hook
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

  // ✅ Navigation actions
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        <HeaderWithActions
          title="Weekly Payouts"
          search={query}
          setSearch={setQuery}
          showAddButton={user?.role === "jk"}
          showBack
          onBack={onBack}
          addLabel="Add Payout"
          onAdd={handlePayOut}
          showMoreOptions={user?.role === "admin"}
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

        {/* Floating Filter Icon */}
        <div title="Filter" className="fixed  bottom-5 right-6 z-10">
          <button
            className="
                         relative w-12 h-12 rounded-full bg-gradient-to-r from-[#0C3978] via-[#106187] to-[#16B8E4] text-white flex items-center justify-center
             shadow-[0_4px_6px_rgba(0,0,0,0.3),0_8px_20px_rgba(0,0,0,0.25)] border border-gray-400 
             hover:shadow-[0_6px_10px_rgba(0,0,0,0.35),0_10px_25px_rgba(0,0,0,0.3)] active:translate-y-[2px] 
             active:shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-all duration-200 cursor-pointer
                         "
            onClick={() => setShowModal(true)}
          >
            <FiFilter size={20} />
          </button>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          rows={withdrawData}
          currentPage={currentPage}
          setCurrentPage={goToPage}
          rowIdField="_id"
          pageSize={12}
          statusField="pstatus"
          onIdClick={(id) => router.push(`/wallet/payout/detailview/${id}`)}
          checkboxSelection
          onRowClick={(row) => console.log("Payout clicked:", row)}
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
