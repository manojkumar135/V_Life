"use client";
import ReactMarkdown from "react-markdown";
import PolicyLayout from "@/components/PolicyLayout";
import { TERMS_AND_CONDITIONS } from "@/constant/termsAndConditions";
 
export default function TermsAndConditionsPage() {
  return (
    <PolicyLayout title="Terms and Conditions">
      <ReactMarkdown>{TERMS_AND_CONDITIONS}</ReactMarkdown>
    </PolicyLayout>
  );
}