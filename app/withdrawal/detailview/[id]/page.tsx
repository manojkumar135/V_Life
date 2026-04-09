"use client";

import React, { useEffect, useState } from "react";
import Layout from "@/layout/Layout";
import { IoIosArrowBack } from "react-icons/io";
import { useRouter, useParams } from "next/navigation";
import InputField from "@/components/InputFields/inputtype1";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";

const BONUS_COLORS: Record<string, string> = {
  daily:     "bg-blue-100 text-blue-700",
  fortnight: "bg-purple-100 text-purple-700",
  referral:  "bg-green-100 text-green-700",
  quickstar: "bg-amber-100 text-amber-700",
};

interface WithdrawRecord {
  payout_id:            string;
  transaction_id:       string;
  batch_id:             string;
  released_date:        string;
  released_time:        string;
  user_id:              string;
  user_name:            string;
  account_holder_name:  string;
  contact:              string;
  mail:                 string;
  rank:                 string;
  wallet_id:            string;
  pan_number:           string;
  bank_name:            string;
  account_number:       string;
  ifsc_code:            string;
  payout_name:          string;
  payout_title:         string;
  bonus_type:           string;
  original_amount:      string;
  tds_amount:           string;
  admin_charge:         string;
  reward_amount:        string;
  released_amount:      string;
  score_balance_before: string;
  score_balance_after:  string;
  neft_utr:             string;
  neft_transaction_date: string;
  neft_transaction_time: string;
  neft_bank_ref:        string;
  neft_remarks:         string;
  transaction_updated_at: string;
  transaction_updated_by: string;
  status:               string;
  remarks:              string;
}

const EMPTY: WithdrawRecord = {
  payout_id:            "",
  transaction_id:       "",
  batch_id:             "",
  released_date:        "",
  released_time:        "",
  user_id:              "",
  user_name:            "",
  account_holder_name:  "",
  contact:              "",
  mail:                 "",
  rank:                 "",
  wallet_id:            "",
  pan_number:           "",
  bank_name:            "",
  account_number:       "",
  ifsc_code:            "",
  payout_name:          "",
  payout_title:         "",
  bonus_type:           "",
  original_amount:      "",
  tds_amount:           "",
  admin_charge:         "",
  reward_amount:        "",
  released_amount:      "",
  score_balance_before: "",
  score_balance_after:  "",
  neft_utr:             "",
  neft_transaction_date: "",
  neft_transaction_time: "",
  neft_bank_ref:        "",
  neft_remarks:         "",
  transaction_updated_at: "",
  transaction_updated_by: "",
  status:               "",
  remarks:              "",
};

export default function WithdrawDetailView() {
  const router   = useRouter();
  const params   = useParams();
  const payoutId = params?.id as string;

  const [record, setRecord]   = useState<WithdrawRecord>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!payoutId) return;

    const fetchRecord = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`/api/withdraw/${payoutId}`);

        if (data?.data) {
          const d = data.data;
          setRecord({
            payout_id:            d.payout_id            || "",
            transaction_id:       d.transaction_id       || "",
            batch_id:             d.batch_id             || "",
            released_date:        d.released_date        || "",
            released_time:        d.released_time        || "",
            user_id:              d.user_id              || "",
            user_name:            d.user_name            || "",
            account_holder_name:  d.account_holder_name  || "",
            contact:              d.contact              || "",
            mail:                 d.mail                 || "",
            rank:                 d.rank                 || "",
            wallet_id:            d.wallet_id            || "",
            pan_number:           d.pan_number           || "",
            bank_name:            d.bank_name            || "",
            account_number:       d.account_number       || "",
            ifsc_code:            d.ifsc_code            || "",
            payout_name:          d.payout_name          || "",
            payout_title:         d.payout_title         || "",
            bonus_type:           d.bonus_type           || "",
            original_amount:      d.original_amount?.toString()      || "0",
            tds_amount:           d.tds_amount?.toString()           || "0",
            admin_charge:         d.admin_charge?.toString()         || "0",
            reward_amount:        d.reward_amount?.toString()        || "0",
            released_amount:      d.released_amount?.toString()      || "0",
            score_balance_before: d.score_balance_before?.toString() || "0",
            score_balance_after:  d.score_balance_after?.toString()  || "0",
            neft_utr:             d.neft_utr             || "",
            neft_transaction_date: d.neft_transaction_date || "",
            neft_transaction_time: d.neft_transaction_time || "",
            neft_bank_ref:        d.neft_bank_ref        || "",
            neft_remarks:         d.neft_remarks         || "",
            transaction_updated_at: d.transaction_updated_at
              ? new Date(d.transaction_updated_at).toLocaleString("en-IN")
              : "",
            transaction_updated_by: d.transaction_updated_by || "",
            status:               d.status               || "",
            remarks:              d.remarks              || "",
          });
        } else {
          ShowToast.error("Withdraw record not found.");
        }
      } catch (error) {
        console.error("Error fetching withdraw record:", error);
        ShowToast.error("Failed to fetch withdraw details.");
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [payoutId]);

  const neftPending = !record.neft_utr;
  const bonusCls    = BONUS_COLORS[record.bonus_type] || "bg-gray-100 text-gray-600";

  return (
    <Layout>
      <div className="p-4 max-md:p-2">
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 max-md:mb-2">
          <IoIosArrowBack
            size={25}
            className="cursor-pointer"
            onClick={() => router.back()}
          />
          <p className="text-xl max-md:text-[1rem] font-semibold">
            Withdraw Detail View
          </p>

          {/* Bonus type badge */}
          {record.bonus_type && (
            <span className={`px-3 py-0.5 rounded-full text-xs font-semibold ${bonusCls}`}>
              {record.bonus_type.charAt(0).toUpperCase() + record.bonus_type.slice(1)}
            </span>
          )}
        </div>

        {/* NEFT pending banner */}
        {neftPending && (
          <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 px-5 py-3">
            <p className="text-sm font-semibold text-orange-700">
              ⏳ NEFT / UTR details not yet recorded for this record
            </p>
            <p className="text-xs text-orange-600 mt-1">
              Amount was released via batch{" "}
              <span
                className="font-mono font-semibold cursor-pointer underline"
                onClick={() => router.push(`/reports/batches/${record.batch_id}`)}
              >
                {record.batch_id}
              </span>
              . UTR can be updated from the batch detail page.
            </p>
          </div>
        )}

        {/* NEFT confirmed banner */}
        {!neftPending && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-5 py-3">
            <p className="text-sm font-semibold text-green-700">
              ✅ NEFT transfer confirmed
            </p>
            <p className="text-xs text-green-600 mt-1">
              UTR: <span className="font-mono font-semibold">{record.neft_utr}</span>
              {record.neft_transaction_date && (
                <> · {record.neft_transaction_date} {record.neft_transaction_time}</>
              )}
            </p>
          </div>
        )}

        {/* Detail Form */}
        <div className="rounded-xl px-6 max-md:p-4 bg-white">
          {/* ── Section: Release Info ── */}
          <p className="text-sm font-semibold text-gray-500 mt-4 mb-3 uppercase tracking-wide">
            Release Info
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <InputField label="Payout ID"    value={record.payout_id}    readOnly disabled />
            <InputField label="Batch ID"     value={record.batch_id}     readOnly disabled />
            <InputField label="Released Date" value={record.released_date} readOnly disabled />
            <InputField label="Released Time" value={record.released_time} readOnly disabled />
            <InputField label="Status"       value={record.status}       readOnly disabled />
            <InputField label="Remarks"      value={record.remarks}      readOnly disabled />
          </div>

          {/* ── Section: User & Bank ── */}
          <p className="text-sm font-semibold text-gray-500 mt-6 mb-3 uppercase tracking-wide">
            User & Bank Details
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <InputField label="User ID"          value={record.user_id}             readOnly disabled />
            <InputField label="User Name"        value={record.user_name}           readOnly disabled />
            <InputField label="Account Holder"   value={record.account_holder_name} readOnly disabled />
            <InputField label="Contact"          value={record.contact}             readOnly disabled />
            <InputField label="Email"            value={record.mail}                readOnly disabled />
            <InputField label="Rank"             value={record.rank || "—"}         readOnly disabled />
            <InputField label="Wallet ID"        value={record.wallet_id}           readOnly disabled />
            <InputField label="PAN"              value={record.pan_number}          readOnly disabled />
            <InputField label="Bank Name"        value={record.bank_name}           readOnly disabled />
            <InputField label="Account Number"   value={record.account_number}      readOnly disabled />
            <InputField label="IFSC Code"        value={record.ifsc_code}           readOnly disabled />
          </div>

          {/* ── Section: Payout & Amounts ── */}
          <p className="text-sm font-semibold text-gray-500 mt-6 mb-3 uppercase tracking-wide">
            Payout & Amounts
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <InputField label="Payout Name"     value={record.payout_name}          readOnly disabled />
            <InputField label="Payout Title"    value={record.payout_title}         readOnly disabled />
            <InputField label="Bonus Type"      value={record.bonus_type}           readOnly disabled />
            <InputField prefix="₹" label="Original Amount"      value={record.original_amount}      readOnly disabled />
            <InputField prefix="₹" label="TDS Amount"           value={record.tds_amount}           readOnly disabled />
            <InputField prefix="₹" label="Admin Charge"         value={record.admin_charge}         readOnly disabled />
            <InputField prefix="₹" label="Reward Amount"        value={record.reward_amount}        readOnly disabled />
            <InputField prefix="₹" label="Score Balance Before" value={record.score_balance_before} readOnly disabled />
            <InputField prefix="₹" label="Score Balance After"  value={record.score_balance_after}  readOnly disabled />
            <InputField
              prefix="₹"
              label="Released Amount"
              value={record.released_amount}
              readOnly
              disabled
            />
          </div>

          {/* ── Section: NEFT / Bank Transaction ── */}
          <p className="text-sm font-semibold text-gray-500 mt-6 mb-3 uppercase tracking-wide">
            NEFT / Bank Transaction
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
            <InputField
              label="NEFT UTR"
              value={record.neft_utr || "—"}
              readOnly
              disabled
            />
            <InputField
              label="Transaction Date"
              value={record.neft_transaction_date || "—"}
              readOnly
              disabled
            />
            <InputField
              label="Transaction Time"
              value={record.neft_transaction_time || "—"}
              readOnly
              disabled
            />
            <InputField
              label="Bank Reference"
              value={record.neft_bank_ref || "—"}
              readOnly
              disabled
            />
            <InputField
              label="NEFT Remarks"
              value={record.neft_remarks || "—"}
              readOnly
              disabled
            />
            <InputField
              label="Updated By"
              value={record.transaction_updated_by || "—"}
              readOnly
              disabled
            />
            <InputField
              label="Updated At"
              value={record.transaction_updated_at || "—"}
              readOnly
              disabled
            />
          </div>

          {/* ── Go to Batch button ── */}
          {record.batch_id && (
            <div className="flex justify-end pb-6">
              <button
                onClick={() => router.push(`/reports/batches/${record.batch_id}`)}
                className="px-5 py-2 rounded-lg bg-[#0C3978] text-white text-sm font-semibold
                  hover:bg-[#106187] transition-colors cursor-pointer"
              >
                View Batch → {record.batch_id}
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}