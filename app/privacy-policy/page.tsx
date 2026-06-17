"use client";
import ReactMarkdown from "react-markdown";
import PolicyLayout from "@/components/PolicyLayout";
import { PRIVACY_POLICY } from "@/constant/privacyPolicy";
 
export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout title="Privacy Policy">
      <ReactMarkdown>{PRIVACY_POLICY}</ReactMarkdown>
    </PolicyLayout>
  );
}