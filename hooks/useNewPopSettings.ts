"use client";

import { useEffect, useState } from "react";
import axios from "axios";

const DEFAULTS = {
  news_text: `🎉 Welcome to Maverick
💰 Payout cycle closes at 12 AM
🚀 Grow your left & right team
🏆 New ranks coming soon
📌 Stay active to earn more rewards`,
  popup_image:
    "https://res.cloudinary.com/dtb4vozhy/image/upload/v1767521863/ChatGPT_Image_Jan_4_2026_03_45_51_PM_wxxmqp.png",
  popup_enabled: true,
};

export const useNewPopSettings = () => {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get("/api/newpop-operations");
        const data = res.data?.data;

        setSettings({
          news_text:
            data?.news_text && data.news_text.trim()
              ? data.news_text
              : DEFAULTS.news_text,

          popup_image:
            data?.popup_image && data.popup_image.trim()
              ? data.popup_image
              : DEFAULTS.popup_image,

          popup_enabled:
            typeof data?.popup_enabled === "boolean"
              ? data.popup_enabled
              : DEFAULTS.popup_enabled,
        });
      } catch {
        setSettings(DEFAULTS);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { settings, loading };
};
