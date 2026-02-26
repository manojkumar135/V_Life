"use client";

import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import Table from "@/components/common/table";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";
import { useRouter } from "next/navigation";
import { useVLife } from "@/store/context";

export default function ChangeRequestsPage() {

  const router = useRouter();

  const { query, setQuery, debouncedQuery } = useSearch();

  const { user } = useVLife();

  const [requestsData, setRequestsData] = useState<any[]>([]);

  const [totalItems, setTotalItems] = useState(0);

  const [loading, setLoading] = useState(false);

  const API_URL = "/api/wallet-change-requests";

  // Fetch change requests
  const fetchRequests = useCallback(
    async (search: string) => {

      try {

        setLoading(true);

        const params: any = {
          search: search || "",
        };

        // optional filter for non-admin
        if (user?.role !== "admin") {

          params.user_id = user.user_id;

        }

        const { data } =
          await axios.get(API_URL, { params });

        const requests = data.data || [];

        setRequestsData(requests);

        setTotalItems(requests.length);

      }
      catch (error) {

        console.error(error);

        ShowToast.error(
          "Failed to load change requests"
        );

      }
      finally {

        setLoading(false);

      }

    },
    [user]
  );

  useEffect(() => {

    if (!user) return;

    fetchRequests(debouncedQuery);

  }, [debouncedQuery, user, fetchRequests]);

  // Navigate to edit page
  const handleEdit = (walletId: string) => {

  router.push(`/wallet/wallets/editwallet/${walletId}`)

};

  // Table columns
  const columns = [

    {
      field: "request_id",
      headerName: "Request ID",
      flex: 1,
    },

    {
      field: "wallet_id",
      headerName: "Wallet ID",
      flex: 1,
    },

    {
      field: "user_id",
      headerName: "User ID",
      flex: 1,
    },

    {
      field: "status",
      headerName: "Status",
      flex: 1,
    },

    {
      field: "created_at",
      headerName: "Requested At",
      flex: 1.5,
      renderCell: (params: any) => {

        return new Date(
          params.value
        ).toLocaleString();

      },
    },

  ];

  // pagination
  const handlePageChange =
    useCallback(
      (page: number, offset: number, limit: number) => {},
      []
    );

  const {
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    startItem,
    endItem,
    isFirstPage,
    isLastPage,
  } = usePagination({
    totalItems,
    itemsPerPage: 12,
    onPageChange: handlePageChange,
  });

  const onBack = () => {

    router.push("/wallet");

  };

  return (

    <Layout>

      <div className="max-md:px-4 p-4 w-full max-w-[99%] mx-auto -mt-5">

        {loading && (

          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">

            <Loader />

          </div>

        )}

        <HeaderWithActions

          title="Wallet Change Requests"

          search={query}

          setSearch={setQuery}

          showAddButton={false}

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

          rows={
            requestsData.slice(
              (currentPage - 1) * 12,
              currentPage * 12
            )
          }

          rowIdField="request_id"

          pageSize={12}

          statusField="status"

        onIdClick={(id, row) => handleEdit(row.wallet_id)}
          checkboxSelection

          onRowClick={(row) =>
            console.log("Request clicked:", row)
          }

        />

      </div>

    </Layout>

  );

}