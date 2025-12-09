"use client";

import { useState } from "react";
import axios from "axios";
import { FaHandshake } from "react-icons/fa";
import { IoIosSend } from "react-icons/io";

import ShowToast from "@/components/common/Toast/toast";
import SubmitButton from "@/components/common/submitbutton";
import { useVLife } from "@/store/context";
import Loader from "@/components/common/loader";

export default function InvitePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useVLife();

  const sendInvite = async (position: "left" | "right") => {
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
        position, // 👈 send left or right
      });

      if (res.status === 200) {
        ShowToast.success("Invitation sent successfully!");
        setEmail("");
      } else {
        ShowToast.error(`Failed: ${res.data.error || "Unknown error"}`);
      }
    } catch (err: any) {
      ShowToast.error(err.response?.data?.error || "Something went wrong");
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

      <div className="flex flex-col xl:flex-row gap-3 px-2 mb-4">
        <input
          type="email"
          placeholder="Enter Email to Invite"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full xl:w-[62%] px-3 py-2 border border-gray-700 rounded-md"
        />
        <div className="flex gap-4 items-center justify-center">
          {/* Left Team Invite */}
          <SubmitButton
            onClick={() => sendInvite("left")}
            className="flex justify-center items-center gap-2 max-md:text-[12px]  "
          >
            Left Team <IoIosSend  size={20} />
          </SubmitButton>

          {/* Right Team Invite */}
          <SubmitButton
            onClick={() => sendInvite("right")}
            className="flex justify-center items-center gap-2 max-md:text-[12px] "
          >
            Right Team <IoIosSend  size={20} />
          </SubmitButton>
        </div>
      </div>
    </>
  );
}
