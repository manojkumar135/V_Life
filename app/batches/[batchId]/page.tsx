"use client";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import Layout from "@/layout/Layout";
import { IoIosArrowBack } from "react-icons/io";
import { FiDownload, FiEdit2, FiCheck, FiX } from "react-icons/fi";
import { MdOutlineSearch } from "react-icons/md";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";
import InputField from "@/components/InputFields/inputtype1";
import { useVLife } from "@/store/context";


/* ─── Types ─────────────────────────────────────────────────────────────────── */

interface BatchMeta {
  batch_id:              string;
  released_date:         string;
  released_time:         string;
  released_by:           string;
  user_count:            number;
  total_amount:          number;
  payout_count:          number;
  status:                string;
  neft_utr:              string | null;
  neft_transaction_date: string | null;
  neft_transaction_time: string | null;
  neft_bank_ref:         string | null;
  neft_remarks:          string | null;
}

interface WithdrawRow {
  payout_id:             string;
  user_id:               string;
  user_name:             string;
  account_holder_name:   string;
  bank_name:             string;
  account_number:        string;
  bonus_type:            string;
  payout_name:           string;
  released_amount:       number;
  neft_utr:              string | null;
  neft_transaction_date: string | null;
  _editing:              boolean;
  _utr:                  string;
  _date:                 string;
  _time:                 string;
  _saving:               boolean;
}

/* ─── Constants ─────────────────────────────────────────────────────────────── */

const STATUS_STYLE: Record<string, string> = {
  released:            "bg-orange-100 text-orange-700",
  partially_updated:   "bg-yellow-100 text-yellow-700",
  transaction_updated: "bg-green-100 text-green-700",
};

const STATUS_LABEL: Record<string, string> = {
  released:            "Released — UTR pending",
  partially_updated:   "Partially updated",
  transaction_updated: "All UTRs recorded",
};

const BONUS_COLORS: Record<string, string> = {
  daily:     "bg-blue-100 text-blue-700",
  fortnight: "bg-purple-100 text-purple-700",
  referral:  "bg-green-100 text-green-700",
  quickstar: "bg-amber-100 text-amber-700",
};

/* ─── Page ───────────────────────────────────────────────────────────────────── */

export default function BatchDetailPage() {
  const { user } = useVLife();

  const router  = useRouter();
  const params  = useParams();
  const batchId = params?.batchId as string;

  const [batch, setBatch]         = useState<BatchMeta | null>(null);
  const [rows, setRows]           = useState<WithdrawRow[]>([]);
  const [summary, setSummary]     = useState({ total: 0, updated: 0, pending: 0 });
  const [loading, setLoading]     = useState(false);
  const [redownloading, setRedownloading] = useState(false);

  const [tableSearch, setTableSearch] = useState("");

  const [batchMode, setBatchMode] = useState(false);
  const [batchForm, setBatchForm] = useState({
    neft_utr:              "",
    neft_transaction_date: "",
    neft_transaction_time: "",
    neft_bank_ref:         "",
    neft_remarks:          "",
  });
  const [savingBatch, setSavingBatch] = useState(false);

  const [filteredMode, setFilteredMode] = useState(false);
  const [filteredForm, setFilteredForm] = useState({
    neft_utr:              "",
    neft_transaction_date: "",
    neft_transaction_time: "",
  });
  const [savingFiltered, setSavingFiltered] = useState(false);

  /* ── Filtered rows — derived from search ── */
  const filteredRows = useMemo(() => {
    const term = tableSearch.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.user_id.toLowerCase().includes(term) ||
        r.user_name.toLowerCase().includes(term) ||
        r.account_holder_name.toLowerCase().includes(term) ||
        r.payout_id.toLowerCase().includes(term),
    );
  }, [rows, tableSearch]);

  const isSearchActive = tableSearch.trim().length > 0;

  /* ── Active summary — full batch when no search, filtered when searching ──
     Cards always show what's relevant to what admin is looking at:
       No search  → full batch totals (from API summary)
       Searching  → totals for matched rows only (computed from filteredRows)
  ─────────────────────────────────────────────────────────────────────────── */
  const activeSummary = useMemo(() => {
    if (!isSearchActive) {
      // Full batch — use API summary
      return {
        total:          summary.total,
        updated:        summary.updated,
        pending:        summary.pending,
        total_released: batch?.total_amount ?? 0,
        user_label:     `${batch?.user_count ?? 0} users · ${batch?.payout_count ?? 0} payouts`,
      };
    }

    // Filtered — compute from filteredRows
    const updated = filteredRows.filter((r) => r.neft_utr).length;
    const total   = filteredRows.length;
    const pending = total - updated;
    const totalReleased = filteredRows.reduce((s, r) => s + (r.released_amount || 0), 0);

    // Get unique users in filtered set
    const uniqueUsers = new Set(filteredRows.map((r) => r.user_id)).size;

    return {
      total,
      updated,
      pending,
      total_released: totalReleased,
      user_label:     `${uniqueUsers} user${uniqueUsers !== 1 ? "s" : ""} · ${total} payouts`,
    };
  }, [isSearchActive, summary, batch, filteredRows]);

  /* ── Fetch batch detail ── */
  const fetchDetail = useCallback(async () => {
    if (!batchId) return;
    try {
      setLoading(true);
const { data } = await axios.get(`/api/payrelease/batches/${batchId}`, {
  params: {
    role:    user?.role,
    user_id: user?.user_id,
  },
});      if (!data.success) {
        ShowToast.error(data.message || "Batch not found");
        return;
      }

      setBatch(data.batch);
      setSummary(data.summary || { total: 0, updated: 0, pending: 0 });

      if (data.batch.neft_utr) {
        setBatchForm({
          neft_utr:              data.batch.neft_utr              || "",
          neft_transaction_date: data.batch.neft_transaction_date || "",
          neft_transaction_time: data.batch.neft_transaction_time || "",
          neft_bank_ref:         data.batch.neft_bank_ref         || "",
          neft_remarks:          data.batch.neft_remarks          || "",
        });
      }

      const mapped: WithdrawRow[] = (data.withdraws || []).map((w: any) => ({
        payout_id:             w.payout_id,
        user_id:               w.user_id,
        user_name:             w.user_name,
        account_holder_name:   w.account_holder_name,
        bank_name:             w.bank_name,
        account_number:        w.account_number,
        bonus_type:            w.bonus_type,
        payout_name:           w.payout_name,
        released_amount:       w.released_amount ?? 0,
        neft_utr:              w.neft_utr             || null,
        neft_transaction_date: w.neft_transaction_date || null,
        _editing: false,
        _utr:     w.neft_utr             || "",
        _date:    w.neft_transaction_date || "",
        _time:    w.neft_transaction_time || "",
        _saving:  false,
      }));
      setRows(mapped);
    } catch (err) {
      console.error("Batch detail fetch error:", err);
      ShowToast.error("Failed to load batch detail");
    } finally {
      setLoading(false);
    }
  }, [batchId, user?.role, user?.user_id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  /* ── Re-download Excel ── */
  const handleRedownload = async () => {
    try {
      setRedownloading(true);
      const response = await fetch(`/api/payrelease/batches/${batchId}/excel`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        ShowToast.error(err.message || "Failed to re-download Excel");
        return;
      }
      const blob   = await response.blob();
      const url    = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href     = url;
      anchor.download = `payout_${batchId}_redownload.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      ShowToast.success("Excel re-downloaded successfully");
    } catch {
      ShowToast.error("Re-download failed");
    } finally {
      setRedownloading(false);
    }
  };

  /* ── Batch UTR update — ALL records ── */
  const handleBatchUTRSave = async () => {
    if (!batchForm.neft_utr.trim()) { ShowToast.error("NEFT UTR is required"); return; }
    try {
      setSavingBatch(true);
      const { data } = await axios.patch(`/api/payrelease/batches/${batchId}`, {
        mode:                  "batch",
        neft_utr:              batchForm.neft_utr.trim(),
        neft_transaction_date: batchForm.neft_transaction_date || null,
        neft_transaction_time: batchForm.neft_transaction_time || null,
        neft_bank_ref:         batchForm.neft_bank_ref         || null,
        neft_remarks:          batchForm.neft_remarks          || null,
        updated_by:            "admin",
      });
      if (data.success) {
        ShowToast.success("All records updated with UTR");
        setBatchMode(false);
        fetchDetail();
      } else {
        ShowToast.error(data.message || "Failed to update");
      }
    } catch { ShowToast.error("Failed to save batch UTR"); }
    finally { setSavingBatch(false); }
  };

  /* ── Filtered UTR update — searched rows only ── */
  const handleFilteredUTRSave = async () => {
    if (!filteredForm.neft_utr.trim()) { ShowToast.error("NEFT UTR is required"); return; }
    if (filteredRows.length === 0) { ShowToast.error("No rows to update — check your search"); return; }
    try {
      setSavingFiltered(true);
      const updates = filteredRows.map((r) => ({
        payout_id:             r.payout_id,
        neft_utr:              filteredForm.neft_utr.trim(),
        neft_transaction_date: filteredForm.neft_transaction_date || null,
        neft_transaction_time: filteredForm.neft_transaction_time || null,
      }));
      const { data } = await axios.patch(`/api/payrelease/batches/${batchId}`, {
        mode: "selective", updates, updated_by: "admin",
      });
      if (data.success) {
        ShowToast.success(`UTR updated for ${updates.length} record(s)`);
        setFilteredMode(false);
        setFilteredForm({ neft_utr: "", neft_transaction_date: "", neft_transaction_time: "" });
        fetchDetail();
      } else {
        ShowToast.error(data.message || "Failed to update");
      }
    } catch { ShowToast.error("Failed to save UTR for filtered records"); }
    finally { setSavingFiltered(false); }
  };

  /* ── Inline row helpers ── */
  const startEdit  = (id: string) => setRows((p) => p.map((r) => r.payout_id === id ? { ...r, _editing: true } : r));
  const cancelEdit = (id: string) => setRows((p) => p.map((r) => r.payout_id === id ? { ...r, _editing: false, _utr: r.neft_utr || "", _date: r.neft_transaction_date || "", _time: "" } : r));
  const updateField = (id: string, field: "_utr" | "_date" | "_time", val: string) =>
    setRows((p) => p.map((r) => r.payout_id === id ? { ...r, [field]: val } : r));

  const saveRowUTR = async (row: WithdrawRow) => {
    if (!row._utr.trim()) { ShowToast.error("UTR is required"); return; }
    setRows((p) => p.map((r) => r.payout_id === row.payout_id ? { ...r, _saving: true } : r));
    try {
      const { data } = await axios.patch(`/api/payrelease/batches/${batchId}`, {
        mode: "selective",
        updates: [{ payout_id: row.payout_id, neft_utr: row._utr.trim(), neft_transaction_date: row._date || null, neft_transaction_time: row._time || null }],
        updated_by: "admin",
      });
      if (data.success) { ShowToast.success(`UTR saved for ${row.payout_id}`); fetchDetail(); }
      else {
        ShowToast.error(data.message || "Save failed");
        setRows((p) => p.map((r) => r.payout_id === row.payout_id ? { ...r, _saving: false } : r));
      }
    } catch {
      ShowToast.error("Failed to save UTR");
      setRows((p) => p.map((r) => r.payout_id === row.payout_id ? { ...r, _saving: false } : r));
    }
  };

  /* ── Render ── */
  if (!batch && !loading) {
    return <Layout><div className="p-8 text-center text-gray-400">Batch not found.</div></Layout>;
  }

  return (
    <Layout>
      <div className="p-4 max-md:p-2">
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <IoIosArrowBack size={25} className="cursor-pointer" onClick={() => router.back()} />
            <div>
              <p className="text-xl font-semibold max-md:text-base">Batch Detail</p>
              <p className="text-xs text-gray-400 font-mono">{batchId}</p>
            </div>
            {batch && (
              <span className={`ml-2 px-3 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[batch.status] || "bg-gray-100 text-gray-600"}`}>
                {STATUS_LABEL[batch.status] || batch.status}
              </span>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={handleRedownload} disabled={redownloading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0C3978] text-white text-xs font-semibold hover:bg-[#106187] transition-colors cursor-pointer disabled:opacity-50">
              <FiDownload size={14} />
              {redownloading ? "Downloading..." : "Re-download Excel"}
            </button>
            <button
              onClick={() => { setBatchMode((v) => !v); setFilteredMode(false); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer border
                ${batchMode ? "bg-gray-100 text-gray-600 border-gray-300" : "bg-green-600 text-white border-green-600 hover:bg-green-700"}`}>
              <FiEdit2 size={14} />
              {batchMode ? "Cancel UTR Update" : "Update UTR (All)"}
            </button>
          </div>
        </div>

        {/* ── Summary cards — reactive to search ───────────────────────────────
            No search  → full batch: "13 users · 73 payouts", UTR progress for all
            Searching  → filtered:  "1 user · 7 payouts",    UTR progress for that user
        ─────────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {/* Card 1 — Users / Payouts */}
          <div className="bg-linear-to-br from-[#0C3978] to-[#106187] text-white rounded-xl px-4 py-3 shadow">
            <p className="text-xs opacity-80 mb-1">
              {isSearchActive ? "Filtered" : "Users / Payouts"}
            </p>
            <p className="text-sm font-bold truncate">{activeSummary.user_label}</p>
            {isSearchActive && (
              <p className="text-xs opacity-70 mt-1 truncate">
                Search: "{tableSearch}"
              </p>
            )}
          </div>

          {/* Card 2 — Released Date (static — never changes) */}
          <div className="bg-linear-to-br from-[#106187] to-[#16B8E4] text-white rounded-xl px-4 py-3 shadow">
            <p className="text-xs opacity-80 mb-1">Released Date</p>
            <p className="text-sm font-bold truncate">
              {batch?.released_date} {batch?.released_time}
            </p>
          </div>

          {/* Card 3 — UTR Progress — updates with search */}
          <div className={`bg-linear-to-br ${activeSummary.pending === 0 ? "from-green-600 to-green-500" : "from-orange-500 to-orange-400"} text-white rounded-xl px-4 py-3 shadow`}>
            <p className="text-xs opacity-80 mb-1">UTR Progress</p>
            <p className="text-sm font-bold">
              {activeSummary.updated} / {activeSummary.total} done
            </p>
            <p className="text-xs opacity-70 mt-1">{activeSummary.pending} pending</p>
          </div>

          {/* Card 4 — Total Released — updates with search */}
          <div className="bg-linear-to-br from-green-600 to-green-500 text-white rounded-xl px-4 py-3 shadow">
            <p className="text-xs opacity-80 mb-1">
              {isSearchActive ? "Filtered Released" : "Total Released"}
            </p>
            <p className="text-sm font-bold">
              ₹ {Number(activeSummary.total_released).toFixed(2)}
            </p>
          </div>
        </div>

        {/* ── Batch UTR form — update ALL records ── */}
        {batchMode && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
            <p className="text-sm font-semibold text-green-800 mb-3">
              Update UTR for ALL {rows.length} records in this batch
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <InputField label="NEFT UTR *" value={batchForm.neft_utr}
                onChange={(e: any) => setBatchForm((f) => ({ ...f, neft_utr: e.target.value }))}
                placeholder="e.g. HDFC0012345678" />
              <InputField label="Transaction Date" value={batchForm.neft_transaction_date}
                onChange={(e: any) => setBatchForm((f) => ({ ...f, neft_transaction_date: e.target.value }))}
                placeholder="DD-MM-YYYY" />
              <InputField label="Transaction Time" value={batchForm.neft_transaction_time}
                onChange={(e: any) => setBatchForm((f) => ({ ...f, neft_transaction_time: e.target.value }))}
                placeholder="HH:MM" />
              <InputField label="Bank Reference" value={batchForm.neft_bank_ref}
                onChange={(e: any) => setBatchForm((f) => ({ ...f, neft_bank_ref: e.target.value }))}
                placeholder="Optional" />
              <InputField label="Remarks" value={batchForm.neft_remarks}
                onChange={(e: any) => setBatchForm((f) => ({ ...f, neft_remarks: e.target.value }))}
                placeholder="Optional" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleBatchUTRSave} disabled={savingBatch}
                className="px-5 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50">
                {savingBatch ? "Saving..." : "Save UTR for All Records"}
              </button>
              <button onClick={() => setBatchMode(false)}
                className="px-5 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-300 transition-colors cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Filtered UTR form ── */}
        {filteredMode && isSearchActive && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
            <p className="text-sm font-semibold text-blue-800 mb-1">
              Update UTR for {filteredRows.length} filtered record(s)
            </p>
            <p className="text-xs text-blue-500 mb-3">
              Search: "<span className="font-medium">{tableSearch}</span>"
              {filteredRows[0] && ` · User: ${filteredRows[0].user_name} (${filteredRows[0].user_id})`}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputField label="NEFT UTR *" value={filteredForm.neft_utr}
                onChange={(e: any) => setFilteredForm((f) => ({ ...f, neft_utr: e.target.value }))}
                placeholder="e.g. HDFC0012345678" />
              <InputField label="Transaction Date" value={filteredForm.neft_transaction_date}
                onChange={(e: any) => setFilteredForm((f) => ({ ...f, neft_transaction_date: e.target.value }))}
                placeholder="DD-MM-YYYY" />
              <InputField label="Transaction Time" value={filteredForm.neft_transaction_time}
                onChange={(e: any) => setFilteredForm((f) => ({ ...f, neft_transaction_time: e.target.value }))}
                placeholder="HH:MM" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleFilteredUTRSave} disabled={savingFiltered}
                className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50">
                {savingFiltered ? "Saving..." : `Save UTR for ${filteredRows.length} Record(s)`}
              </button>
              <button onClick={() => { setFilteredMode(false); setFilteredForm({ neft_utr: "", neft_transaction_date: "", neft_transaction_time: "" }); }}
                className="px-5 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-300 transition-colors cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Withdraw records table ── */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-semibold text-gray-700">
              Withdraw Records ({rows.length})
              {isSearchActive && (
                <span className="ml-2 text-xs font-normal text-blue-600">
                  — {filteredRows.length} match{filteredRows.length !== 1 ? "es" : ""}
                </span>
              )}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => { setTableSearch(e.target.value); setFilteredMode(false); }}
                  placeholder="Search user ID, name, payout ID..."
                  className="pl-8 pr-6 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0C3978] w-56"
                />
                <MdOutlineSearch className="absolute left-2 top-1.5 text-gray-400" size={18} />
                {isSearchActive && (
                  <button onClick={() => { setTableSearch(""); setFilteredMode(false); }}
                    className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-600 cursor-pointer text-xs">
                    ✕
                  </button>
                )}
              </div>

              {isSearchActive && filteredRows.length > 0 && (
                <button
                  onClick={() => { setFilteredMode((v) => !v); setBatchMode(false); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border
                    ${filteredMode ? "bg-gray-100 text-gray-600 border-gray-300" : "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"}`}>
                  <FiEdit2 size={13} />
                  {filteredMode ? "Cancel" : `Update Filtered (${filteredRows.length})`}
                </button>
              )}

              <p className="text-xs text-gray-400 hidden md:block">
                Click ✏ on any row to set its UTR individually
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-200">
                  <th className="px-3 py-2 text-left">Payout ID</th>
                  <th className="px-3 py-2 text-left">User</th>
                  <th className="px-3 py-2 text-left">Bank</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Payout Name</th>
                  <th className="px-3 py-2 text-right">Released (₹)</th>
                  <th className="px-3 py-2 text-left">NEFT UTR</th>
                  <th className="px-3 py-2 text-left">NEFT Date</th>
                  <th className="px-3 py-2 text-center">Edit</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-gray-400">
                      {isSearchActive ? `No records match "${tableSearch}"` : "No records found"}
                    </td>
                  </tr>
                )}
                {filteredRows.map((row, i) => (
                  <tr key={row.payout_id}
                    className={`border-b border-gray-50 transition-colors
                      ${row._editing ? "bg-blue-50" : i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>

                    <td className="px-3 py-2">
                      <span className="font-mono text-xs text-gray-600">{row.payout_id}</span>
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-xs font-medium text-gray-800">{row.user_name}</p>
                      <p className="text-xs text-gray-400">{row.user_id}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-xs text-gray-700">{row.bank_name}</p>
                      <p className="text-xs text-gray-400 font-mono">{row.account_number}</p>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${BONUS_COLORS[row.bonus_type] || "bg-gray-100 text-gray-600"}`}>
                        {row.bonus_type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">{row.payout_name || "—"}</td>
                    <td className="px-3 py-2 text-right font-bold text-green-700 text-xs">
                      ₹ {Number(row.released_amount).toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      {row._editing ? (
                        <input type="text" value={row._utr}
                          onChange={(e) => updateField(row.payout_id, "_utr", e.target.value)}
                          placeholder="Enter UTR"
                          className="w-36 text-xs border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      ) : row.neft_utr ? (
                        <span className="font-mono text-xs text-green-700">{row.neft_utr}</span>
                      ) : (
                        <span className="text-xs text-orange-500 italic">Pending</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row._editing ? (
                        <div className="flex flex-col gap-1">
                          <input type="text" value={row._date}
                            onChange={(e) => updateField(row.payout_id, "_date", e.target.value)}
                            placeholder="DD-MM-YYYY"
                            className="w-28 text-xs border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                          <input type="text" value={row._time}
                            onChange={(e) => updateField(row.payout_id, "_time", e.target.value)}
                            placeholder="HH:MM"
                            className="w-20 text-xs border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">{row.neft_transaction_date || "—"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {row._editing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => saveRowUTR(row)} disabled={row._saving} title="Save"
                            className="p-1 rounded text-green-600 hover:bg-green-100 transition-colors cursor-pointer disabled:opacity-40">
                            <FiCheck size={15} />
                          </button>
                          <button onClick={() => cancelEdit(row.payout_id)} disabled={row._saving} title="Cancel"
                            className="p-1 rounded text-red-400 hover:bg-red-50 transition-colors cursor-pointer">
                            <FiX size={15} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(row.payout_id)} title="Edit UTR"
                          className="p-1 rounded text-[#0C3978] hover:bg-blue-50 transition-colors cursor-pointer">
                          <FiEdit2 size={14} />
                        </button>
                      )}
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