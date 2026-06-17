"use client";
import ReactMarkdown from "react-markdown";
import PolicyLayout from "@/components/PolicyLayout";
import { REFUND_POLICY } from "@/constant/refundPolicy";
 
export default function RefundPolicyPage() {
  return (
    <PolicyLayout title="Cancellation & Refund Policy">
      <ReactMarkdown>{REFUND_POLICY}</ReactMarkdown>
    </PolicyLayout>
  );
}