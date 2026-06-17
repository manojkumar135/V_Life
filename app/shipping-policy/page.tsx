"use client";
import ReactMarkdown from "react-markdown";
import PolicyLayout from "@/components/PolicyLayout";
import { SHIPPING_POLICY } from "@/constant/shippingPolicy";
 
export default function ShippingPolicyPage() {
  return (
    <PolicyLayout title="Shipping Policy">
      <ReactMarkdown>{SHIPPING_POLICY}</ReactMarkdown>
    </PolicyLayout>
  );
}