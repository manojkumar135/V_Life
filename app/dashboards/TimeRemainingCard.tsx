"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaRegClock } from "react-icons/fa";
import { useVLife } from "@/store/context";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const TimeRemainingCard = () => {
  const { user } = useVLife();

  const [teamData, setTeamData] = useState({
    leftTeam: 0,
    rightTeam: 0,
  });

  const [loading, setLoading] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isCritical, setIsCritical] = useState(false);

  // ✅ Get seconds left to next cycle (12 PM or 12 AM IST)
  const calculateSecondsLeft = () => {
    const now = dayjs().tz("Asia/Kolkata");

    let nextCycle;

    if (now.hour() < 12) {
      nextCycle = now.hour(12).minute(0).second(0).millisecond(0);
    } else {
      nextCycle = now.add(1, "day").hour(0).minute(0).second(0).millisecond(0);
    }

    const diff = nextCycle.diff(now, "second");
    return diff > 0 ? diff : 0;
  };

  // 📌 Fetch team data API
  const fetchTeamData = async () => {
    if (!user?.user_id) return;

    try {
      const res = await axios.get("/api/dashboard-operations/team-slot", {
        params: { user_id: user.user_id },
      });

      const data = res.data;

      setTeamData({
        leftTeam: data.leftTeam || 0,
        rightTeam: data.rightTeam || 0,
      });
    } catch (err) {
      console.error("❌ Error fetching team data:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🎯 On mount
  useEffect(() => {
    if (!user?.user_id) return; // wait until user loads

    fetchTeamData();
    setSecondsLeft(calculateSecondsLeft());

    const interval = setInterval(fetchTeamData, 60000);
    return () => clearInterval(interval);
  }, [user?.user_id]); // 👈 stable dependency (string), not whole user object

  // ⏳ Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) return calculateSecondsLeft();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // ❤️ Critical last hour warning
  useEffect(() => {
    setIsCritical(secondsLeft < 3600); // < 1 hour
  }, [secondsLeft]);

  // Format in HH:mm:ss
  const formatTime = (secs: number) => {
    const h = String(Math.floor(secs / 3600)).padStart(2, "0");
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-between  transition-all duration-300 bg-white rounded-2xl shadow-md p-6  border-[1.5px] border-gray-300 ${
        isCritical
          ? "border-red-200 bg-red-50"
          : "bg-blue-50 border-blue-150 "
      }`}
    >
      {/* Countdown */}
      <div className=" mx-auto  flex items-center gap-1 w-full justify-center py-2 max-md:pt-0 max-lg:mb-3">
        <FaRegClock className="text-gray-700" size={25} />
        <p
          className={`max-md:text-xl text-3xl font-semibold ml-1 ${
            isCritical ? "text-red-600" : "text-gray-800"
          }`}
        >
          {formatTime(secondsLeft)} hrs
        </p>
        <p className="text-sm text-gray-600 mt-2 font-semibold">left</p>
      </div>

      {/* Team Counts */}
      {loading ? (
        <p className="text-sm text-gray-500 animate-pulse">Loading...</p>
      ) : (
        <div className="flex  items-center gap-8 max-md:gap-6 w-full  lg:py-2">
          <div className="flex flex-col items-center px-1 w-1/2">
            <p className="text-sm text-gray-800 font-semibold font-sans">
              Left Team PV
            </p>

            <p className="text-xl font-semibold text-green-600">
              {Number(teamData.leftTeam || 0) }
            </p>
          </div>

          <div className="flex flex-col items-center w-1/2">
            <p className="text-sm text-gray-800 font-semibold font-sans">
              Right Team PV
            </p>

            <p className="text-xl font-semibold text-pink-600">
              {Number(teamData.rightTeam || 0)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeRemainingCard;
