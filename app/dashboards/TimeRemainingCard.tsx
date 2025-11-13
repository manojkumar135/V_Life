"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaRegClock } from "react-icons/fa";
import { useVLife } from "@/store/context";

const TimeRemainingCard = () => {
  const { user } = useVLife();
  const [teamData, setTeamData] = useState({
    leftTeam: 0,
    rightTeam: 0,
    timeRemaining: "00:00:00",
  });
  const [loading, setLoading] = useState(true);
  const [isCritical, setIsCritical] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0); // store remaining seconds

  // 🔁 Fetch team data with user_id
  const fetchTeamData = async () => {
    if (!user?.user_id) return;
    try {
      const res = await axios.get("/api/dashboard-operations/team-slot", {
        params: { user_id: user.user_id },
      });

      const data = res.data;
      // Convert timeRemaining (hh:mm:ss) to seconds
      const [h, m, s] = (data.timeRemaining || "00:00:00").split(":").map(Number);
      const totalSeconds = h * 3600 + m * 60 + s;

      setSecondsLeft(totalSeconds);
      setTeamData({
        leftTeam: data.leftTeam || 0,
        rightTeam: data.rightTeam || 0,
        timeRemaining: data.timeRemaining || "00:00:00",
      });

      setIsCritical(h < 1);
    } catch (err) {
      console.error("❌ Error fetching team data:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🧭 Fetch data on mount
  useEffect(() => {
    fetchTeamData();
    const interval = setInterval(fetchTeamData, 60000); // refresh every 1 minute for team data
    return () => clearInterval(interval);
  }, [user?.user_id]);

  // ⏳ Countdown every second
  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  // Format seconds into HH:mm:ss
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(
      2,
      "0"
    )}:${String(s).padStart(2, "0")}`;
  };

  const displayTime = formatTime(secondsLeft);

  return (
    <div
      className={`relative flex items-center justify-between shadow rounded-lg p-4 border transition-all duration-300 ${
        isCritical
          ? "border-red-300 bg-red-50"
          : "border-yellow-200 bg-yellow-50"
      }`}
    >
      {/* 👥 Left / Right Team section */}
      {loading ? (
        <p className="text-sm text-gray-500 animate-pulse">Loading...</p>
      ) : (
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center px-4">
            <p className="text-sm text-gray-500">Left Team</p>
            <p className="text-lg font-semibold text-green-600">
              {teamData.leftTeam}
            </p>
          </div>

          <div className="flex flex-col items-center">
            <p className="text-sm text-gray-500">Right Team</p>
            <p className="text-lg font-semibold text-pink-600">
              {teamData.rightTeam}
            </p>
          </div>
        </div>
      )}

      {/* 🕒 Time Remaining */}
      <div className="absolute bottom-2 right-4 flex items-center gap-1">
        <FaRegClock className="text-gray-700" size={16} />
        <p
          className={`text-sm font-semibold ml-1 ${
            isCritical ? "text-red-600" : "text-gray-800"
          }`}
        >
          {displayTime} hrs
        </p>
        <p className="text-sm text-gray-600">left</p>
      </div>
    </div>
  );
};

export default TimeRemainingCard;
