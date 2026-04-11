"use client";
import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import HeaderWithActions from "@/components/common/componentheader";
import usePagination from "@/hooks/usepagination";
import { useSearch } from "@/hooks/useSearch";
import axios from "axios";
import Loader from "@/components/common/loader";
import ShowToast from "@/components/common/Toast/toast";
import { useRouter } from "next/navigation";
import { FiDownload, FiEye } from "react-icons/fi";

const API_URL = "/api/payrelease/batches";

const STATUS_OPTIONS = [
  { label: "All",                 value: ""                    },
  { label: "Released",            value: "released"            },
  { label: "Partially Updated",   value: "partially_updated"   },
  { label: "Transaction Updated", value: "transaction_updated" },
];

const STATUS_STYLE: Record<string, string> = {
  released:            "bg-orange-100 text-orange-700",
  partially_updated:   "bg-yellow-100 text-yellow-700",
  transaction_updated: "bg-green-100  text-green-700",
};

const STATUS_LABEL: Record<string, string> = {
  released:            "Released",
  partially_updated:   "Partial UTR",
  transaction_updated: "UTR Done",
};

export default function BatchesPage() {
  const router = useRouter();

  const { query, setQuery, debouncedQuery } = useSearch();
  const [batches, setBatches]       = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading]       = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [redownloading, setRedownloading] = useState<string | null>(null); // batchId being downloaded

  const {
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    startItem,
    endItem,
    goToPage,
  } = usePagination({ totalItems, itemsPerPage: 15, onPageChange: () => {} });

  /* ── Fetch batches ── */
  const fetchBatches = useCallback(
    async (search: string, page: number) => {
      try {
        setLoading(true);
        const params: any = {
          page,
          limit: 15,
          ...(search.trim()    && { search: search.trim() }),
          ...(statusFilter     && { status: statusFilter }),
        };
        const { data } = await axios.get(API_URL, { params });
        setBatches(data.data   || []);
        setTotalItems(data.total || 0);
      } catch (err) {
        console.error("Error fetching batches:", err);
        ShowToast.error("Failed to load batches");
      } finally {
        setLoading(false);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    fetchBatches(debouncedQuery, currentPage);
  }, [debouncedQuery, statusFilter, currentPage]);

  useEffect(() => {
    goToPage(1);
  }, [debouncedQuery, statusFilter]);

  /* ── Re-download Excel for a batch ── */
  const handleRedownload = async (batchId: string, releaseDate: string) => {
    try {
      setRedownloading(batchId);
      const response = await fetch(
        `/api/payrelease/batches/${batchId}/excel`,
        { method: "GET" },
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        ShowToast.error(err.message || "Failed to re-download Excel");
        return;
      }

      // Stream the blob and trigger browser download
      const blob     = await response.blob();
      const url      = URL.createObjectURL(blob);
      const anchor   = document.createElement("a");
      anchor.href    = url;
      anchor.download = `payout_${batchId}_redownload.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      ShowToast.success(`Excel re-downloaded for ${batchId}`);
    } catch (err) {
      console.error("Re-download error:", err);
      ShowToast.error("Failed to re-download Excel");
    } finally {
      setRedownloading(null);
    }
  };

  const onBack = () => router.push("/reports");

  /* ── Render ── */
  return (
    <Layout>
      <div className="max-md:px-4 p-4 w-full max-w-[99%] mx-auto -mt-5">
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        <HeaderWithActions
          title="Payout Batches"
          showBack
          onBack={onBack}
          search={query}
          setSearch={setQuery}
          showAddButton={false}
          showMoreOptions={false}
          showPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          startItem={startItem}
          endItem={endItem}
          onNext={nextPage}
          onPrev={prevPage}
        />

        {/* Status filter pills */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer
                ${statusFilter === opt.value
                  ? "bg-[#0C3978] text-white border-[#0C3978]"
                  : "bg-white text-gray-600 border-gray-300 hover:border-[#0C3978]"
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Batches table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0C3978] text-white text-xs">
                  <th className="px-4 py-3 text-left font-semibold">Batch ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Released Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Time</th>
                  <th className="px-4 py-3 text-right font-semibold">Users</th>
                  <th className="px-4 py-3 text-right font-semibold">Payouts</th>
                  <th className="px-4 py-3 text-right font-semibold">Total Amount (₹)</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-center font-semibold">NEFT UTR</th>
                  <th className="px-4 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 && !loading && (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-400 text-sm">
                      No batches found
                    </td>
                  </tr>
                )}
                {batches.map((batch, i) => (
                  <tr
                    key={batch.batch_id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors
                      ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                  >
                    {/* Batch ID */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-[#0C3978] font-semibold">
                        {batch.batch_id}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {batch.released_date || "—"}
                    </td>

                    {/* Time */}
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {batch.released_time || "—"}
                    </td>

                    {/* Users */}
                    <td className="px-4 py-3 text-right text-gray-700 font-medium">
                      {batch.user_count ?? "—"}
                    </td>

                    {/* Payouts */}
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">
                      {batch.payout_count ?? "—"}
                    </td>

                    {/* Total Amount */}
                    <td className="px-4 py-3 text-right font-bold text-green-700">
                      ₹ {Number(batch.total_amount ?? 0).toFixed(2)}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold
                          ${STATUS_STYLE[batch.status] || "bg-gray-100 text-gray-600"}`}
                      >
                        {STATUS_LABEL[batch.status] || batch.status}
                      </span>
                    </td>

                    {/* NEFT UTR */}
                    <td className="px-4 py-3 text-center">
                      {batch.neft_utr ? (
                        <span className="font-mono text-xs text-green-700">
                          {batch.neft_utr}
                        </span>
                      ) : (
                        <span className="text-xs text-orange-500 italic">Pending</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {/* View detail */}
                        <button
                          title="View batch detail"
                          onClick={() =>
                            router.push(`/batches/${batch.batch_id}`)
                          }
                          className="p-1.5 rounded-lg text-[#0C3978] hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <FiEye size={16} />
                        </button>

                        {/* Re-download Excel */}
                        <button
                          title="Re-download Excel"
                          disabled={redownloading === batch.batch_id}
                          onClick={() =>
                            handleRedownload(batch.batch_id, batch.released_date)
                          }
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer
                            ${redownloading === batch.batch_id
                              ? "text-gray-300"
                              : "text-green-700 hover:bg-green-50"
                            }`}
                        >
                          <FiDownload size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}