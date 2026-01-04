"use client";

import React, { useState, useMemo } from "react";
import { useNewPopSettings } from "@/hooks/useNewPopSettings";

const NewsTicker = () => {
  const { settings } = useNewPopSettings();
  const [paused, setPaused] = useState(false);

  // 🔥 Split multiline text into items
  const items = useMemo(() => {
    return settings.news_text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }, [settings.news_text]);

  return (
    <div className="-mb-3 w-full">
      <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-3">
        {/* LABEL */}
        <span className="font-semibold text-sm whitespace-nowrap text-black">
          📢 Latest News:
        </span>

        {/* TICKER BAR */}
        <div
          className="w-full bg-[#106187] text-white rounded-lg overflow-hidden shadow px-2 py-0.5"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          <div className="relative overflow-hidden w-full h-[28px] flex items-center">
            <div
              className="flex whitespace-nowrap text-sm font-medium"
              style={{
                animation: "news-marquee 20s linear infinite",
                animationPlayState: paused ? "paused" : "running",
              }}
            >
              {/* STRIP 1 */}
              {items.map((text, i) => (
                <span key={`a-${i}`} className="mx-6 flex items-center gap-2">
                  <span>{text}</span>
                  <span className="opacity-70"></span>
                </span>
              ))}

              {/* STRIP 2 (CLONE) */}
              {items.map((text, i) => (
                <span key={`b-${i}`} className="mx-6 flex items-center gap-2">
                  <span>{text}</span>
                  <span className="opacity-70"></span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KEYFRAMES */}
      <style>
        {`
          @keyframes news-marquee {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
        `}
      </style>
    </div>
  );
};

export default NewsTicker;
