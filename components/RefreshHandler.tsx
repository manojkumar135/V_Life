"use client";

import Cookies from "js-cookie";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useVLife } from "@/store/context";
import { useRouter } from "next/navigation";
import Loader from "@/components/common/loader";

export default function RefreshHandler() {
  const { setUser, clearUser } = useVLife();
  const router = useRouter();
  const hasRun = useRef(false);

  const [loading, setLoading] = useState(true); // ✅ start with true until first refresh completes

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const refresh = async () => {
      setLoading(true); // show loader while calling API
      try {
        const res = await axios.post(
          "/api/refresh",
          {},
          { withCredentials: true }
        );
        // console.log("Token refreshed successfully:", res.data);

        if (res.data?.accessToken) {
          setUser({
            token: res.data.accessToken,
            ...res.data.user,
          });
          Cookies.set("accessToken", res.data.accessToken, {
            expires: 1 / 144, // 10 min
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
          });
        }
      } catch (err) {
        console.error("Token refresh failed:", err);
        clearUser();
        router.push("/auth/login");
      } finally {
        setLoading(false); // ✅ hide loader after API finishes
      }
    };

    refresh();

    // 🔁 auto-refresh every 5 minutes
    const interval = setInterval(refresh, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [setUser, clearUser, router]);

  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}
    </>
  );
}
