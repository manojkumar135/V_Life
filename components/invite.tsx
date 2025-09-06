"use client";

import { useState } from "react";
import axios from "axios";
import { FaHandshake } from "react-icons/fa";
import ShowToast from "@/components/common/Toast/toast";
import SubmitButton from "@/components/common/submitbutton";
import { useVLife } from "@/store/context";
import Loader from "@/components/common/loader";

export default function InvitePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useVLife();

  const handleInvite = async () => {
    if (!email) {
      ShowToast.error("Please enter an email");
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post("/api/invite-operations", {
        email: email.toLowerCase(),
        user_id: user.user_id,
        user_name: user.user_name,
      });

      if (res.status === 200) {
        ShowToast.success("Invitation sent successfully!");
        setEmail("");
      } else {
        ShowToast.error(`Failed: ${res.data.error || "Unknown error"}`);
      }
    } catch (err: any) {
      ShowToast.error(`${err.response?.data?.error || "Something went wrong"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
     {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}
     <div className="flex flex-col gap-3 px-2 max-lg:px-0 mb-4">
      <div className="flex flex-col sm:flex-row gap-2 w-full lg:-mt-1">
        <input
          type="email"
          placeholder="Enter Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full sm:flex-1 px-3 max-md:px-2 py-2 border-[1.2px] border-gray-700 rounded-md lg:max-w-[500px]"
        />

        <SubmitButton
          onClick={handleInvite}
          //   loading={loading}
          className=" flex justify-center items-center max-md:w-[140px] gap-3 max-md:ml-auto max-md:mt-3"
        >
           {loading ? "Sending..." : "INVITE"} <FaHandshake size={20} />
        </SubmitButton>
      </div>
    </div>
    </>
   
  );
}
