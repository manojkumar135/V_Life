"use client";

import { useState, useEffect, useRef } from "react";
import { FaApple, FaGooglePlay } from "react-icons/fa";
import {
  FaBoltLightning,
  FaShield,
  FaMobileScreen,
  FaChartLine,
} from "react-icons/fa6";
import { BiSupport } from "react-icons/bi";

import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

// ─── App Screenshot Carousel ────────────────────────────────────────────
const APP_SCREENSHOTS = [
  {
    id: 1,
    src: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1777290031/Screenshot_2026-04-27-17-08-11-35_f73b71075b1de7323614b647fe394240_dmptqe.jpg",
    alt: "Home Screen",
  },
  {
    id: 2,
    src: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1777291475/1000550122_d23ztz.jpg",
    alt: "Event Listing",
  },
  {
    id: 3,
    src: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1777373880/1000550124_v9b2tp.jpg",
    alt: "Ticket Booking",
  },
  {
    id: 4,
    src: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1777291677/1000550128_caefmp.jpg",
    alt: "Dashboard",
  },
  {
    id: 5,
    src: "https://res.cloudinary.com/dtb4vozhy/image/upload/v1777373989/Screenshot_20260427_172659_Expo_afnv8c.jpg",
    alt: "Analytics",
  },
];

function AppCarousel() {
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = APP_SCREENSHOTS.length;

  const prev = () => setActive((a) => (a - 1 + total) % total);
  const next = () => setActive((a) => (a + 1) % total);

  // ── Auto-slide every 3s, pauses on hover/drag ──
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setActive((a) => (a + 1) % total);
    }, 2500);
    return () => clearInterval(timer);
  }, [paused, total]);

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    setDragStartX(e.clientX);
    setPaused(true);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    const diff = e.clientX - dragStartX;
    if (diff < -40) next();
    else if (diff > 40) prev();
    // Resume after 6s of inactivity post-drag
    setTimeout(() => setPaused(false), 3000);
  };

  const rel = (i: number) => {
    let d = i - active;
    if (d > total / 2) d -= total;
    if (d < -total / 2) d += total;
    return d;
  };

  const visible = APP_SCREENSHOTS.map((s, i) => ({
    ...s,
    i,
    r: rel(i),
  })).filter((s) => Math.abs(s.r) <= 2);

  return (
    <div
      className="relative select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Progress bar ── */}
      {/* <div className="w-40 h-1 mx-auto mb-8 rounded-full overflow-hidden bg-slate-200">
        <div
          key={active} // re-mounts on slide change to restart animation
          className="h-full rounded-full"
          style={{
            background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
            animation: paused ? "none" : "progressBar 3s linear forwards",
          }}
        />
      </div> */}

      {/* ── Carousel stage ── */}
      <div
        className="relative mx-auto h-120 md:h-128 flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{ touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={(e) => {
          if (dragging) onPointerUp(e);
        }}
      >
        {visible.map(({ id, src, alt, i, r }) => {
          const isCenter = r === 0;
          const isAdjacent = Math.abs(r) === 1;
          const isFar = Math.abs(r) === 2;

          const translateX =
            r *
            (typeof window !== "undefined" && window.innerWidth < 640
              ? 160
              : 210);
          const scale = isCenter ? 1 : isAdjacent ? 0.75 : 0.6;
          const opacity = isCenter ? 1 : isAdjacent ? 0.5 : 0.2;
          const zIndex = isCenter ? 30 : isAdjacent ? 20 : 10;

          return (
            <div
              key={id}
              onClick={() => {
                if (!dragging) {
                  setActive(i);
                  setPaused(true);
                  setTimeout(() => setPaused(false), 6000);
                }
              }}
              className="absolute transition-all duration-500 ease-in-out"
              style={{
                transform: `translateX(${translateX}px) scale(${scale})`,
                opacity,
                zIndex,
                display: isFar
                  ? "none"
                  : isAdjacent
                    ? "var(--side-display)"
                    : "block",
              }}
            >
              {/* Phone frame */}
              <div
                className="rounded-[2.4rem] overflow-hidden shadow-2xl border-[3px] transition-all duration-500"
                style={{
                  width: isCenter
                    ? "clamp(210px, 23vw, 230px)"
                    : "clamp(185px, 20vw, 240px)",
                  height: isCenter
                    ? "clamp(440px, 42vw, 470px)"
                    : "clamp(380px, 37vw, 410px)",
                  borderColor: isCenter
                    ? "rgba(99,102,241,0.55)"
                    : "rgba(203,213,225,0.5)",
                  background: "#f1f5f9",
                  boxShadow: isCenter
                    ? "0 32px 64px rgba(99,102,241,0.25), 0 8px 24px rgba(0,0,0,0.12)"
                    : "0 8px 24px rgba(0,0,0,0.08)",
                }}
              >
                {/* Notch */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-black/80 rounded-full z-20 pointer-events-none" />

                {/* Screenshot */}
                <img
                  src={src}
                  alt={alt}
                  draggable={false}
                  className="w-full h-full "
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    target.style.display = "none";
                    const parent = target.parentElement!;
                    if (parent.querySelector(".placeholder-label")) return;
                    parent.style.cssText +=
                      ";display:flex;flex-direction:column;align-items:center;justify-content:center;";
                    parent.style.background = isCenter
                      ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                      : "#e2e8f0";
                    const label = document.createElement("div");
                    label.className = "placeholder-label";
                    label.style.cssText = `color:${isCenter ? "white" : "#94a3b8"};font-size:13px;font-weight:700;padding:16px;text-align:center;`;
                    label.textContent = alt;
                    parent.appendChild(label);
                  }}
                />
              </div>

              {/* Label under center */}
              {isCenter && (
                <div className="mt-4 text-sm font-semibold text-indigo-600 transition-all duration-300">
                  {alt}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Dot indicators ── */}
      <div className="flex justify-center gap-2 mt-4">
        {APP_SCREENSHOTS.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setActive(i);
              setPaused(true);
              setTimeout(() => setPaused(false), 6000);
            }}
            className="transition-all duration-300 rounded-full"
            style={{
              width: active === i ? "24px" : "8px",
              height: "8px",
              background: active === i ? "#6366f1" : "#cbd5e1",
            }}
            aria-label={`Go to screen ${i + 1}`}
          />
        ))}
      </div>

      {/* ── Arrow buttons ── */}
      {(["prev", "next"] as const).map((dir) => (
        <button
          key={dir}
          onClick={() => {
            dir === "prev" ? prev() : next();
            setPaused(true);
            setTimeout(() => setPaused(false), 6000);
          }}
          className="absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-40"
          style={{
            [dir === "prev" ? "left" : "right"]: "0px",
            background: "white",
            border: "1px solid #e2e8f0",
          }}
          aria-label={dir === "prev" ? "Previous" : "Next"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6366f1"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline
              points={dir === "prev" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"}
            />
          </svg>
        </button>
      ))}

      <style>{`
  @keyframes progressBar {
    from { width: 0%; }
    to   { width: 100%; }
  }
  :root { --side-display: block; }
  @media (max-width: 639px) {
    :root { --side-display: none; }
  }
`}</style>
    </div>
  );
}

// ── Two overlapping phone mockups ──────────────────────────────────────
function TwoPhoneMockup() {
  return (
    <div
      className="relative"
      style={{
        width: "clamp(260px, 30vw, 360px)",
        height: "clamp(400px, 50vw, 540px)",
      }}
    >
      {/* Glow */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(168,85,247,0.28) 0%, transparent 70%)",
          filter: "blur(28px)",
        }}
      />

      {/* ── Back phone (right, smaller, behind) ── */}
      <div
        className="absolute rounded-3xl overflow-hidden border-[2px] shadow-lg"
        style={{
          width: "clamp(160px, 18vw, 220px)",
          height: "clamp(310px, 40vw, 420px)",
          right: 0,
          top: "18%",
          borderColor: "rgba(168,85,247,0.2)",
          background: "#13103a",
          zIndex: 1,
          opacity: 0.72,
        }}
      >
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-12 h-3 bg-black/80 rounded-full z-10" />
        <img
          src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1777291475/1000550122_d23ztz.jpg"
          alt="App screen 2"
          className="w-full h-full object-cover"
          onError={(e) => {
            const t = e.currentTarget as HTMLImageElement;
            t.style.display = "none";
            const p = t.parentElement!;
            if (p.querySelector(".back-skeleton")) return;
            p.style.cssText += ";display:flex;flex-direction:column;";
            const sk = document.createElement("div");
            sk.className = "back-skeleton";
            sk.style.cssText =
              "display:flex;flex-direction:column;width:100%;height:100%;";
            sk.innerHTML = `
              <div style="height:28px;background:rgba(255,255,255,0.04);flex-shrink:0;"></div>
              <div style="flex:1;padding:12px;display:flex;flex-direction:column;gap:9px;background:#13103a;">
                <div style="height:9px;width:65%;background:rgba(255,255,255,0.08);border-radius:5px;"></div>
                <div style="height:9px;width:45%;background:rgba(255,255,255,0.06);border-radius:5px;"></div>
                <div style="height:46px;background:rgba(255,255,255,0.06);border-radius:11px;"></div>
                <div style="height:46px;background:rgba(255,255,255,0.05);border-radius:11px;"></div>
                <div style="height:46px;background:rgba(255,255,255,0.04);border-radius:11px;"></div>
                <div style="height:28px;width:55%;background:rgba(124,58,237,0.28);border-radius:8px;"></div>
              </div>`;
            p.appendChild(sk);
          }}
        />
      </div>

      {/* ── Front phone (left, larger, in front) ── */}
      <div
        className="absolute rounded-4xl overflow-hidden border-[3px] shadow-2xl"
        style={{
          width: "clamp(175px, 22vw, 230px)",
          height: "clamp(320px, 44vw, 460px)",
          left: 0,
          top: 0,
          borderColor: "rgba(228, 199, 255, 0.589)",
          background: "#0f0c2e",
          zIndex: 2,
        }}
      >
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-black rounded-full z-10" />
        <img
          src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1777290031/Screenshot_2026-04-27-17-08-11-35_f73b71075b1de7323614b647fe394240_dmptqe.jpg"
          alt="App screen 1"
          className="w-full h-full object-cover"
          onError={(e) => {
            const t = e.currentTarget as HTMLImageElement;
            t.style.display = "none";
            const p = t.parentElement!;
            if (p.querySelector(".front-skeleton")) return;
            p.style.cssText += ";display:flex;flex-direction:column;";
            const sk = document.createElement("div");
            sk.className = "front-skeleton";
            sk.style.cssText =
              "display:flex;flex-direction:column;width:100%;height:100%;";
            sk.innerHTML = `
              <div style="flex-shrink:0;padding:34px 16px 14px;background:linear-gradient(135deg,#7c3aed,#4f46e5 55%,#0891b2);">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:9px;">
                  <div style="width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,0.25);"></div>
                  <div><div style="height:7px;width:75px;background:rgba(255,255,255,0.4);border-radius:4px;margin-bottom:5px;"></div>
                  <div style="height:6px;width:50px;background:rgba(255,255,255,0.22);border-radius:4px;"></div></div>
                </div>
                <div style="height:11px;width:120px;background:rgba(255,255,255,0.48);border-radius:5px;margin-bottom:7px;"></div>
                <div style="height:8px;width:85px;background:rgba(255,255,255,0.22);border-radius:4px;margin-bottom:11px;"></div>
                <div style="display:flex;gap:7px;">
                  <div style="height:20px;width:65px;background:rgba(255,255,255,0.2);border-radius:20px;"></div>
                  <div style="height:20px;width:65px;background:rgba(255,255,255,0.2);border-radius:20px;"></div>
                </div>
              </div>
              <div style="flex:1;padding:13px 14px;display:flex;flex-direction:column;gap:9px;background:#0f0c2e;overflow:hidden;">
                <div style="height:5px;width:100%;background:rgba(255,255,255,0.08);border-radius:4px;">
                  <div style="height:100%;width:82%;background:linear-gradient(90deg,#7c3aed,#ec4899);border-radius:4px;"></div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">
                  ${[0, 1, 2]
                    .map(
                      () => `<div style="background:rgba(255,255,255,0.06);border-radius:9px;padding:7px;text-align:center;">
                    <div style="height:9px;width:75%;background:rgba(255,255,255,0.14);border-radius:3px;margin:0 auto 4px;"></div>
                    <div style="height:6px;width:55%;background:rgba(255,255,255,0.07);border-radius:3px;margin:0 auto;"></div>
                  </div>`,
                    )
                    .join("")}
                </div>
                ${[
                  "rgba(124,58,237,0.35)",
                  "#7c3aed",
                  "rgba(8,145,178,0.35)",
                  "#0891b2",
                  "rgba(236,72,153,0.35)",
                  "#ec4899",
                ].reduce((acc, _, idx, arr) => {
                  if (idx % 2 === 0)
                    acc += `<div style="background:rgba(255,255,255,0.05);border-radius:11px;padding:9px 11px;display:flex;align-items:center;gap:9px;">
                    <div style="width:24px;height:24px;border-radius:7px;background:${arr[idx]};flex-shrink:0;"></div>
                    <div style="flex:1;"><div style="height:7px;width:75px;background:rgba(255,255,255,0.11);border-radius:3px;margin-bottom:5px;"></div>
                    <div style="height:5px;width:45px;background:rgba(255,255,255,0.07);border-radius:3px;"></div></div>
                    <div style="height:16px;width:32px;background:${arr[idx + 1]};border-radius:18px;"></div>
                  </div>`;
                  return acc;
                }, "")}
                <div style="height:30px;background:linear-gradient(90deg,#7c3aed,#ec4899);border-radius:11px;margin-top:auto;"></div>
              </div>`;
            p.appendChild(sk);
          }}
        />
      </div>
    </div>
  );
}

// ─── SVG Icon Components ───────────────────────────────────────────────
const CalendarIcon = ({ size = 16, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const CheckCircleIcon = ({ size = 16, color = "#3B82F6" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const CheckIcon = ({ size = 14, color = "#3B82F6" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const MenuIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const XIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const BellIcon = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="2.5"
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────
type FeatureColor = {
  bg: string;
  tagBg: string;
  tagText: string;
  iconBg: string;
  titleColor: string;
  descColor: string;
  hoverBorder: string;
};

// ─── Color Map ────────────────────────────────────────────────────────────
const featureColorMap: Record<string, FeatureColor> = {
  blue: {
    bg: "bg-[#E6F1FB]",
    tagBg: "bg-[#B5D4F4]",
    tagText: "text-[#0C447C]",
    iconBg: "bg-[#B5D4F4]",
    titleColor: "text-[#0C447C]",
    descColor: "text-[#185FA5]",
    hoverBorder: "hover:border-[#85B7EB]",
  },
  green: {
    bg: "bg-[#EAF3DE]",
    tagBg: "bg-[#C0DD97]",
    tagText: "text-[#27500A]",
    iconBg: "bg-[#C0DD97]",
    titleColor: "text-[#27500A]",
    descColor: "text-[#3B6D11]",
    hoverBorder: "hover:border-[#97C459]",
  },

  amber: {
    bg: "bg-[#FAEEDA]",
    tagBg: "bg-[#FAC775]",
    tagText: "text-[#633806]",
    iconBg: "bg-[#FAC775]",
    titleColor: "text-[#633806]",
    descColor: "text-[#854F0B]",
    hoverBorder: "hover:border-[#EF9F27]",
  },
  purple: {
    bg: "bg-[#EEEDFE]",
    tagBg: "bg-[#CECBF6]",
    tagText: "text-[#3C3489]",
    iconBg: "bg-[#CECBF6]",
    titleColor: "text-[#3C3489]",
    descColor: "text-[#534AB7]",
    hoverBorder: "hover:border-[#AFA9EC]",
  },
  pink: {
    bg: "bg-[#FBEAF0]",
    tagBg: "bg-[#F4C0D1]",
    tagText: "text-[#72243E]",
    iconBg: "bg-[#F4C0D1]",
    titleColor: "text-[#72243E]",
    descColor: "text-[#993556]",
    hoverBorder: "hover:border-[#ED93B1]",
  },
  teal: {
    bg: "bg-[#E1F5EE]",
    tagBg: "bg-[#9FE1CB]",
    tagText: "text-[#085041]",
    iconBg: "bg-[#9FE1CB]",
    titleColor: "text-[#085041]",
    descColor: "text-[#0F6E56]",
    hoverBorder: "hover:border-[#5DCAA5]",
  },
};

// ─── Feature Card ────────────────────────────────────────────────────────
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  tag: string;
  colorClass: string;
}

const FeatureCard = ({
  icon,
  title,
  description,
  tag,
  colorClass,
}: FeatureCardProps) => {
  const c = featureColorMap[colorClass] ?? featureColorMap.blue;

  return (
    <div
      className={`relative ${c.bg} border border-transparent ${c.hoverBorder} rounded-2xl p-6 text-left hover:-translate-y-1 transition-all duration-300`}
    >
      {/* Tag — top-right */}
      <span
        className={`absolute top-4 right-4 text-[10px] font-semibold px-2.5 py-1 rounded-full ${c.tagBg} ${c.tagText}`}
      >
        {tag}
      </span>

      {/* Icon */}
      <div
        className={`w-11 h-11 rounded-xl ${c.iconBg} flex items-center justify-center mb-5 mt-1`}
      >
        {icon}
      </div>

      {/* Text */}
      <h3 className={`text-[15px] font-bold ${c.titleColor} mb-2`}>{title}</h3>
      <p className={`${c.descColor} text-sm leading-relaxed`}>{description}</p>
    </div>
  );
};

// ─── Role Card ──────────────────────────────────────────────────────────
interface RoleCardProps {
  icon: React.ReactNode;
  title: string;
  items: string[];
}
const RoleCard = ({ icon, title, items }: RoleCardProps) => (
  <div className="bg-white/10 rounded-2xl p-7 text-left hover:-translate-y-1 transition-all duration-300">
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white">{title}</h3>
    </div>
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-center gap-3 text-gray-300 text-sm"
        >
          <CheckCircleIcon size={16} />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

// ─── App Phone Mockup ───────────────────────────────────────────────────
const AppPhoneMockup = () => (
  <div className="relative">
    {/* Glow */}
    <div
      className="absolute inset-10 rounded-full pointer-events-none"
      style={{
        background:
          "radial-gradient(ellipse, rgba(99,102,241,0.25) 0%, transparent 70%)",
        filter: "blur(24px)",
      }}
    />

    {/* Phone frame */}
    <div
      className="relative rounded-[2.8rem] overflow-hidden shadow-2xl border-[3px]"
      style={{
        width: "clamp(220px, 30vw, 300px)",
        height: "clamp(420px, 60vw, 580px)",
        borderColor: "rgba(99,102,241,0.35)",
        background: "#0f0c2e",
      }}
    >
      {/* Notch */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-10" />

      <div className="w-full h-full flex flex-col">
        {/* Status bar */}
        <div className="h-8 bg-linear-to-r from-violet-700 to-indigo-700 shrink-0" />

        {/* App header */}
        <div
          className="px-4 py-3 shrink-0"
          style={{
            background:
              "linear-gradient(135deg, #7c3aed 0%, #4f46e5 60%, #0891b2 100%)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/70 text-[9px] font-bold tracking-widest uppercase">
              WON Events
            </span>
            <span className="flex items-center gap-1 bg-white/20 text-white text-[9px] px-2 py-0.5 rounded-full font-semibold">
              <span className="w-1 h-1 rounded-full bg-green-300 animate-pulse" />
              Live
            </span>
          </div>
          <div className="text-white font-extrabold text-sm leading-tight">
            Grand Music Festival
          </div>
          <div className="text-white/60 text-[9px] mt-0.5">
            Apr 28 · Hyderabad · 8:00 PM
          </div>
          <div className="mt-2 flex gap-1.5">
            <span className="bg-white/20 text-white/80 text-[9px] px-2 py-0.5 rounded-full">
              🎸 Live Music
            </span>
            <span className="bg-white/20 text-white/80 text-[9px] px-2 py-0.5 rounded-full">
              🎭 Performers
            </span>
          </div>
        </div>

        {/* App body */}
        <div
          className="flex-1 px-4 py-3 space-y-3 overflow-hidden"
          style={{ background: "#0f0c2e" }}
        >
          <div>
            <div className="flex justify-between text-[9px] text-gray-400 mb-1">
              <span>Tickets Sold</span>
              <span className="text-purple-300 font-bold">2,481 / 3,000</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10">
              <div
                className="h-full rounded-full w-[82%]"
                style={{ background: "linear-gradient(90deg,#7c3aed,#ec4899)" }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {[
              ["₹12.4L", "Revenue"],
              ["18s", "Checkout"],
              ["4.9★", "Rating"],
            ].map(([v, l]) => (
              <div
                key={l}
                className="rounded-xl p-2 text-center"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div className="text-[11px] font-extrabold text-white">{v}</div>
                <div className="text-[8px] text-gray-500">{l}</div>
              </div>
            ))}
          </div>

          {[
            { title: "Night Concert", date: "May 3", color: "#7c3aed" },
            { title: "Corporate Meet", date: "May 10", color: "#0891b2" },
            { title: "Food Festival", date: "May 18", color: "#ec4899" },
          ].map(({ title, date, color }) => (
            <div
              key={title}
              className="flex items-center gap-2.5 rounded-xl p-2.5"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <div
                className="w-6 h-6 rounded-lg shrink-0"
                style={{
                  background: `${color}33`,
                  border: `1px solid ${color}55`,
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-white truncate">
                  {title}
                </div>
                <div className="text-[8px] text-gray-500">{date}</div>
              </div>
              <div
                className="text-[8px] font-bold px-2 py-0.5 rounded-full text-white"
                style={{ background: color }}
              >
                Book
              </div>
            </div>
          ))}

          <button
            className="w-full py-2 rounded-xl text-[11px] font-bold text-white"
            style={{ background: "linear-gradient(90deg,#7c3aed,#ec4899)" }}
          >
            🎟 Get Tickets Now
          </button>
        </div>
      </div>
    </div>

    {/* Badge – just booked */}
    {/* <div className="absolute -bottom-3 -left-6 bg-white rounded-2xl shadow-2xl px-3.5 py-2 flex items-center gap-2 z-20">
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center text-sm shrink-0"
        style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}
      >
        🔥
      </div>
      <div>
        <div className="text-[9px] text-gray-400 leading-none">Just Booked</div>
        <div className="text-xs font-extrabold text-gray-900">
          +24 this minute
        </div>
      </div>
    </div> */}

    {/* Badge – attendees */}
    {/* <div
      className="absolute -top-3 -right-6 rounded-2xl shadow-xl px-3 py-2 flex items-center gap-2 z-20 border"
      style={{
        background: "rgba(15,12,46,0.92)",
        borderColor: "rgba(99,102,241,0.35)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex -space-x-1.5">
        {["#7c3aed", "#0891b2", "#ec4899", "#f59e0b"].map((c, i) => (
          <div
            key={i}
            className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[9px] font-bold text-white shrink-0"
            style={{ background: c, borderColor: "#0f0c2e" }}
          >
            {["R", "S", "A", "M"][i]}
          </div>
        ))}
      </div>
      <div>
        <div className="text-[9px] text-gray-400 leading-none">Attendees</div>
        <div className="text-[11px] font-extrabold text-white">2.4k+ going</div>
      </div>
    </div> */}
  </div>
);

// ─── Contact / Book Demo Form ────────────────────────────────────────────
function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [values, setValues] = useState({
    name: "",
    email: "",
    contact: "",
    countryCode: "+91",
    designation: "",
    organization: "",
    time: "10:00",
    source: "",
    matter: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!values.name) e.name = "* Name is required";
    if (!values.email || !/\S+@\S+\.\S+/.test(values.email))
      e.email = "* Valid email required";
    if (!values.contact || values.contact.length < 10)
      e.contact = "* Valid contact number required";
    if (!values.designation) e.designation = "* Designation is required";
    if (!values.organization)
      e.organization = "* Organization name is required";
    if (!values.time) e.time = "* Preferred time is required";
    // if (!values.matter) e.matter = "* Please describe what you are looking for";
    return e;
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setValues((v) => ({ ...v, [e.target.name]: e.target.value }));
  };

  const handleBlur = (
    e: React.FocusEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setTouched((t) => ({ ...t, [e.target.name]: true }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const allTouched = Object.fromEntries(
      Object.keys(values).map((k) => [k, true]),
    );
    setTouched(allTouched);

    const errs = validate();
    setErrors(errs);

    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/request-demo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (data.success) {
        setSubmitted(true);
      } else {
        alert("Failed to send request");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-6xl mb-5">🎉</div>
        <h3 className="text-2xl font-extrabold text-blue-400 mb-3">
          Request Submitted!
        </h3>
        <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
          Our team will reach out within 24 hours at your preferred time.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-6 px-6 py-2.5 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 transition-colors"
        >
          Submit Another
        </button>
      </div>
    );
  }

  const inputBase =
    "w-full rounded-xl px-4 py-2.5 text-sm bg-white/5 border text-white placeholder-gray-500 outline-none transition-all duration-200 focus:bg-white/10";
  const inputNormal = `${inputBase} border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`;
  const inputError = `${inputBase} border-red-500/50 focus:border-red-400`;

  const fi = (name: string) => ({
    name,
    value: (values as any)[name],
    onChange: handleChange,
    onBlur: handleBlur,
    className: touched[name] && errors[name] ? inputError : inputNormal,
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Full Name *
          </label>
          <input {...fi("name")} type="text" placeholder="John Doe" />
          {touched.name && errors.name && (
            <span className="text-xs text-red-400">{errors.name}</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Email *
          </label>
          <input {...fi("email")} type="email" placeholder="john@company.com" />
          {touched.email && errors.email && (
            <span className="text-xs text-red-400">{errors.email}</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Phone *
          </label>
          <div
            style={{
              borderRadius: 12,
              border: `1.5px solid ${touched.contact && errors.contact ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`,
              background: "rgba(255,255,255,0.05)",
              transition: "border-color 0.2s",
              position: "relative",
            }}
          >
            <PhoneInput
              country="in"
              value={values.contact}
              onChange={(val) => setValues((v) => ({ ...v, contact: val }))}
              onBlur={() => setTouched((t) => ({ ...t, contact: true }))}
              countryCodeEditable={true}
              containerStyle={{ width: "100%" }}
              inputStyle={{
                width: "100%",
                height: "42px",
                border: "none",
                borderRadius: 0,
                background: "transparent",
                fontSize: 14,
                color: "#fff",
                paddingLeft: "40px",
              }}
              buttonStyle={{
                border: "none",
                background: "transparent",
                borderRight: "1.5px solid rgba(255,255,255,0.1)",
              }}
              // dropdownStyle={{
              //   maxHeight: 200,
              //   overflowY: "auto",
              //   zIndex: 9999,
              //   borderRadius: 12,
              //   boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              //   background: "#1e1b4b",
              //   color: "#fff",
              // }}
            />
          </div>
          {touched.contact && errors.contact && (
            <span className="text-xs text-red-400">{errors.contact}</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Designation *
          </label>
          <input
            {...fi("designation")}
            type="text"
            placeholder="Event Manager / Director"
          />
          {touched.designation && errors.designation && (
            <span className="text-xs text-red-400">{errors.designation}</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Organization *
          </label>
          <input
            {...fi("organization")}
            type="text"
            placeholder="ABC Events Co."
          />
          {touched.organization && errors.organization && (
            <span className="text-xs text-red-400">{errors.organization}</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Preferred Time *
          </label>
          <input {...fi("time")} type="time" />
          {touched.time && errors.time && (
            <span className="text-xs text-red-400">{errors.time}</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            How did you hear about us?
          </label>
          <select
            name="source"
            value={values.source}
            onChange={handleChange}
            className="w-full rounded-xl px-4 py-2.5 text-sm bg-white/5 border border-white/10 text-gray-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          >
            <option value="" className="bg-gray-900">
              Select an option
            </option>
            <option value="Google Search" className="bg-gray-900">
              Google Search
            </option>
            <option value="Social Media" className="bg-gray-900">
              Social Media
            </option>
            <option value="Referral" className="bg-gray-900">
              Referral
            </option>
            <option value="Other" className="bg-gray-900">
              Other
            </option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            What are you looking for ?
          </label>
          <textarea
            name="matter"
            value={values.matter}
            onChange={handleChange}
            onBlur={handleBlur}
            rows={4}
            placeholder="Tell us about your event needs, current challenges, or specific features you'd like to explore..."
            className={`resize-none font-sans ${touched.matter && errors.matter ? inputError : inputNormal}`}
          />
          {touched.matter && errors.matter && (
            <span className="text-xs text-red-400">{errors.matter}</span>
          )}
        </div>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 flex items-center gap-2.5 px-7 py-3 bg-linear-to-r from-blue-500 to-violet-600 text-white text-sm font-bold rounded-xl hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
      >
        {isSubmitting ? (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ animation: "spin 1s linear infinite" }}
            >
              <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            Submitting...
          </>
        ) : (
          <>
            Request Free Demo
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </>
        )}
      </button>
      <style>{`
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  .react-tel-input .country-list {
    background: #1e1b4b !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    border-radius: 12px !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important;
  }
  .react-tel-input .country-list .country {
    color: #e2e8f0 !important;
    background: transparent !important;
    padding: 8px 12px !important;
  }
  .react-tel-input .country-list .country:hover {
    background: rgba(168,85,247,0.2) !important;
    color: #fff !important;
  }
  .react-tel-input .country-list .country.highlight {
    background: rgba(168,85,247,0.3) !important;
    color: #fff !important;
  }
  .react-tel-input .country-list .country .country-name {
    color: inherit !important;
  }
  .react-tel-input .country-list .country .dial-code {
    color: #a78bfa !important;
  }
  .react-tel-input .country-list .search {
    background: #1e1b4b !important;
    padding: 8px !important;
  }
  .react-tel-input .country-list .search-box {
    background: rgba(255,255,255,0.08) !important;
    border: 1px solid rgba(255,255,255,0.15) !important;
    border-radius: 8px !important;
    color: #fff !important;
    padding: 6px 10px !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }
  .react-tel-input .country-list .search-box::placeholder {
    color: rgba(255,255,255,0.4) !important;
  }
  .react-tel-input .flag-dropdown {
    background: transparent !important;
    border: none !important;
  }
  .react-tel-input .selected-flag {
    background: transparent !important;
    border-radius: 12px 0 0 12px !important;
  }
  .react-tel-input .selected-flag:hover,
  .react-tel-input .selected-flag:focus {
    background: rgba(255,255,255,0.05) !important;
  }
`}</style>{" "}
    </form>
  );
}

// ─── NAV LINKS ──────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Solutions", href: "#solutions" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "#contact" },
];

const FEATURES = [
  {
    tag: "Manage Event",
    colorClass: "green",
    title: "3X Faster Event Launch",
    description:
      "Create events, publish instantly, and start selling tickets faster.",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#3B6D11"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14" />
        <path d="M12 5l7 7-7 7" />
      </svg>
    ),
  },
  {
    tag: "Administration",
    colorClass: "blue",
    title: "60% Less Admin Work",
    description:
      "Manage tickets, stalls, staff, and attendees in one platform.",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#185FA5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M9 9h6M9 13h6M9 17h4" />
      </svg>
    ),
  },
  {
    tag: "Finance",
    colorClass: "amber",
    title: "2X More Revenue",
    description:
      "Boost ticket sales, sponsor deals, stalls, and premium upgrades.",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#854F0B"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="12" y1="2" x2="12" y2="22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    tag: "Smart Entry",
    colorClass: "purple",
    title: "70% Faster Check-In",
    description: "QR scanning and badge printing for smooth guest entry.",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#534AB7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="6" height="6" />
        <rect x="15" y="3" width="6" height="6" />
        <rect x="3" y="15" width="6" height="6" />
        <path d="M15 15h3v3h-3zM18 18h3v3h-3z" />
      </svg>
    ),
  },
  {
    tag: "User Experience",
    colorClass: "pink",
    title: "50% Better Engagement",
    description: "Seat bookings, updates, networking, and instant feedback.",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#993556"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      </svg>
    ),
  },
  {
    tag: "Analytics",
    colorClass: "teal",
    title: "Real-Time Revenue Dashboard",
    description: "Track sales, bookings, attendance, and growth live.",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#0F6E56"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 3v18h18" />
        <path d="M7 15l4-4 3 3 5-7" />
      </svg>
    ),
  },
];

const ROLES = [
  {
    title: "Attendees",
    items: [
      "Instant bookings",
      "Secure payments",
      "QR ticket entry",
      "Seat selection",
      "Live updates",
      "Feedback & ratings",
    ],
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    title: "Organisers",
    items: [
      "Event creation",
      "Ticketing & revenue",
      "QR check-in/out",
      "Partner live chat",
      "Vehicle management",
      "Reports & insights",
    ],
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    title: "Partners",
    items: [
      "Booth bookings",
      "Brand visibility",
      "Lead generation",
      "Live chat access",
      "Payments & invoices",
      "Performance reports",
    ],
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

// ─── useActiveSection hook ──────────────────────────────────────────────
function useActiveSection(sectionIds: string[]) {
  const [activeSection, setActiveSection] = useState<string>("#home");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const el = document.querySelector(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id);
          }
        },
        { threshold: 0.3, rootMargin: "-64px 0px -30% 0px" },
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return activeSection;
}

// ─── Main Page Component ────────────────────────────────────────────────
export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const PRICING = [
    {
      name: "Starter Plan",
      price: "Free",
      period: "",
      features: [
        "Create up to 3 events",
        "Up to 100 guests per event",
        "Full platform access",
        "Standard 3% online payment fee",
        "Setup guidance & basic support",
        "Ticketing, check-ins & badges included",
      ],
      type: "basic",
      buttonText: "Start Free",
      href: "#", // for now
    },
    {
      name: "Growth Plan",
      price: billing === "monthly" ? "₹9,999" : "₹7,999",
      period: "/ month",
      yearlyNote: billing === "yearly" ? "save upto 10%" : "",
      features: [
        "Unlimited event creation",
        "Up to 5,000 guests",
        "Full platform access",
        "Standard 3% online payment fee",
        "Priority support & onboarding help",
        "Reports, branding & growth tools",
      ],
      type: "pro",
      buttonText: "Upgrade Now",
      badge: "MOST POPULAR",
      href: "#", // later replace with payment link
    },
    {
      name: "Enterprise Plan",
      price: "Custom",
      period: "",
      features: [
        "Unlimited events & large audiences",
        "Dedicated account management",
        "Custom onboarding & training",
        "Negotiated payment fee structure",
        "White-label & premium support",
        "Tailored service solutions",
      ],
      type: "enterprise",
      buttonText: "Contact Sales",
      href: "#contact",
    },
  ];

  const activeSection = useActiveSection([
    "#home",
    "#solutions",
    "#pricing",
    "#contact",
  ]);

  const handleComingSoon = () => alert("Coming Soon 🚀");

  const scrollTo = (href: string) => {
    setMobileMenuOpen(false);
    if (href === "#") return;
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="w-full font-sans text-gray-900 overflow-x-hidden pt-16">
      {/* ── NAVBAR ─────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2.5"
          >
            <img
              src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1777351879/Untitled_design_35_zignpq.png"
              alt="WON Events Logo"
              className="w-12 h-12 rounded-lg object-contain"
            />
            <span className="font-bold text-gray-900 text-[17px]">
              WON Events
            </span>
          </a>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.href;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollTo(link.href);
                  }}
                  className={`text-sm  lg:text-[14px] font-medium transition-colors cursor-pointer relative pb-0.5 ${
                    isActive
                      ? "text-blue-600 font-semibold"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute -bottom-[1px] left-0 right-0 h-[2px] rounded-full bg-blue-500" />
                  )}
                </a>
              );
            })}
          </div>

          {/* CTA + Hamburger */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleComingSoon}
              className="hidden md:flex items-center gap-0 bg-gray-900 text-white text-sm font-semibold pl-5 pr-1.5 py-1 rounded-full hover:bg-gray-800 transition-all duration-200 hover:shadow-lg hover:shadow-gray-900/20"
            >
              Download App
              <span className="ml-3 w-7 h-7 bg-white rounded-full flex items-center justify-center shrink-0">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#111"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <XIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => {
              const isActive = activeSection === link.href;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollTo(link.href);
                  }}
                  className={`block text-sm font-medium py-2.5 px-3 rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? "bg-blue-50 text-blue-600 font-semibold"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
            <button
              onClick={handleComingSoon}
              className="w-full mt-2 flex items-center justify-between bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-full"
            >
              Download App
              <span className="w-7 h-7 bg-white rounded-full flex items-center justify-center">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#111"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
            </button>
          </div>
        )}
      </nav>

      {/* ══ HERO SECTION ══════════════════════════════════════════════════ */}
      <section
        id="home"
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(150deg, #0a0118 0%, #12002a 30%, #0d0826 60%, #060d1f 100%)",
        }}
      >
        {/* ── Glow orbs ── */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-20 right-[8%] w-[480px] h-[480px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(168,85,247,0.45) 0%, rgba(168,85,247,0.06) 55%, transparent 72%)",
            }}
          />
          <div
            className="absolute bottom-[-60px] left-[2%] w-[380px] h-[380px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(6,182,212,0.35) 0%, rgba(6,182,212,0.04) 55%, transparent 72%)",
            }}
          />
          <div
            className="absolute top-[35%] left-[38%] w-[300px] h-[300px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(236,72,153,0.18) 0%, transparent 65%)",
            }}
          />

          {[
            { e: "🎉", t: "5%", l: "2%", s: "1.6rem", d: "0s", r: "6s" },
            { e: "🎊", t: "10%", l: "78%", s: "1.4rem", d: "1.2s", r: "7s" },
            { e: "🎶", t: "65%", l: "3%", s: "1.2rem", d: "0.4s", r: "8s" },
            { e: "✨", t: "75%", l: "85%", s: "1.5rem", d: "2s", r: "5s" },
            { e: "🎈", t: "80%", l: "18%", s: "1.3rem", d: "1.7s", r: "7.5s" },
            { e: "🥂", t: "85%", l: "58%", s: "1.2rem", d: "2.4s", r: "7s" },
          ].map(({ e, t, l, s, d, r }, i) => (
            <div
              key={i}
              className="absolute select-none"
              style={{
                top: t,
                left: l,
                fontSize: s,
                animation: `floatP ${r} ease-in-out ${d} infinite`,
                opacity: 0.55,
              }}
            >
              {e}
            </div>
          ))}

          {[...Array(18)].map((_, i) => (
            <div
              key={`s${i}`}
              className="absolute rounded-full"
              style={{
                width: i % 3 === 0 ? "3px" : "2px",
                height: i % 3 === 0 ? "3px" : "2px",
                top: `${6 + ((i * 41) % 88)}%`,
                left: `${4 + ((i * 57) % 93)}%`,
                background: ["#f0abfc", "#67e8f9", "#fbbf24", "#a78bfa"][i % 4],
                opacity: 0.35 + (i % 3) * 0.2,
                animation: `twinkleS ${3 + (i % 4)}s ease-in-out ${(i * 0.35) % 2}s infinite`,
              }}
            />
          ))}
        </div>

        {/* ── Main content ── */}
        <div className="relative w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          {/* ══ DESKTOP (lg+): full viewport height, store buttons at bottom ══ */}
          <div
            className="hidden lg:flex flex-col"
            style={{ height: "calc(100vh - 64px)" }}
          >
            {/* Left + Right — fills remaining space */}
            <div className="flex-1 grid grid-cols-2 gap-12 min-h-0">
              {/* LEFT: justify-between keeps store buttons at bottom */}
              <div className="flex flex-col justify-between py-8">
                {/* Top content */}
                <div>
                  <div
                    className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full border w-fit text-xs font-semibold"
                    style={{
                      background: "rgba(168,85,247,0.12)",
                      borderColor: "rgba(168,85,247,0.35)",
                      color: "#e879f9",
                    }}
                  >
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span
                        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                        style={{ background: "#e879f9" }}
                      />
                      <span
                        className="relative inline-flex rounded-full h-1.5 w-1.5"
                        style={{ background: "#e879f9" }}
                      />
                    </span>
                    All-in-One Event &amp; Celebration Platform
                  </div>

                  <h1
                    className="font-extrabold leading-[1.1] tracking-tight mb-4 text-white"
                    style={{
                      fontSize: "clamp(1.8rem, 3.2vw, 3rem)",
                      wordBreak: "keep-all",
                    }}
                  >
                    <span className="block">Turn Every Event Into </span>
                    <span
                      className="block bg-clip-text text-transparent"
                      style={{
                        backgroundImage:
                          "linear-gradient(90deg, #f0abfc 0%, #c084fc 30%, #818cf8 60%, #67e8f9 100%)",
                      }}
                    >
                      a Success Story
                    </span>
                  </h1>

                  <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-126">
                    From corporate conferences to personal celebrations, run
                    high-impact events with seamless ticketing, smart check-ins,
                    partner management, attendee engagement, and real-time
                    feedback—all in one powerful platform.
                  </p>

                  <button
                    onClick={() => scrollTo("#contact")}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 hover:scale-105"
                    style={{
                      background: "rgba(168,85,247,0.15)",
                      border: "1.5px solid rgba(240,171,252,0.35)",
                      color: "#f0abfc",
                    }}
                  >
                    Start Free Trial
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Store buttons — at bottom via justify-between */}
                <div className="flex gap-3 pb-14">
                  {/* App Store */}
                  <a
                    href="#"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all duration-200 hover:scale-105"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1.5px solid rgba(255,255,255,0.25)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <FaApple size={18} />
                    <div className="text-left leading-tight">
                      <div className="text-[9px] opacity-60">
                        Download on the
                      </div>
                      <div className="font-bold text-sm">App Store</div>
                    </div>
                  </a>

                  {/* Google Play */}
                  <a
                    href="#"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white transition-all duration-200 hover:scale-105"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1.5px solid rgba(255,255,255,0.25)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <FaGooglePlay size={16} />
                    <div className="text-left leading-tight">
                      <div className="text-[9px] opacity-60">GET IT ON</div>
                      <div className="font-bold text-sm">Google Play</div>
                    </div>
                  </a>
                </div>
              </div>

              {/* RIGHT */}
              <div className="flex justify-end items-center py-8">
                <TwoPhoneMockup />
              </div>
            </div>
          </div>

          {/* ══ MOBILE (< lg): stacked, natural scroll height ══ */}
          <div className="flex flex-col lg:hidden pt-14 pb-10">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full border w-fit text-xs font-semibold"
              style={{
                background: "rgba(168,85,247,0.12)",
                borderColor: "rgba(168,85,247,0.35)",
                color: "#e879f9",
              }}
            >
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ background: "#e879f9" }}
                />
                <span
                  className="relative inline-flex rounded-full h-1.5 w-1.5"
                  style={{ background: "white" }}
                />
              </span>
              All-in-One Event &amp; Celebration Platform
            </div>

            {/* Headline */}
            <h1
              className="font-extrabold leading-[1.1] tracking-tight mb-4 text-white"
              style={{
                fontSize: "clamp(1.9rem, 8vw, 2.6rem)",
                wordBreak: "keep-all",
              }}
            >
              <span className="block">Turn Every Event Into</span>
              <span
                className="block bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, #f0abfc 0%, #c084fc 30%, #818cf8 60%, #67e8f9 100%)",
                }}
              >
                a Success Story
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              From corporate conferences to personal celebrations, run
              high-impact events with seamless ticketing, smart check-ins,
              partner management, attendee engagement, and real-time
              feedback—all in one powerful platform.
            </p>

            {/* Book Free Demo */}
            <div className="mb-8">
              <button
                onClick={() => scrollTo("#contact")}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-2xl text-sm font-semibold transition-all duration-200 hover:scale-105"
                style={{
                  background: "rgba(168,85,247,0.15)",
                  border: "1.5px solid rgba(240,171,252,0.35)",
                  color: "white",
                }}
              >
                Start Free Trial
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Phone mockup — centred */}
            <div className="flex justify-center mb-0">
              <TwoPhoneMockup />
            </div>

            {/* Store buttons — stacked on mobile, row on sm+ */}
            <div className="flex flex-row gap-3 items-center justify-center">
              <button
                onClick={handleComingSoon}
                className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-semibold text-white w-full sm:w-auto transition-all duration-200 hover:scale-105"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1.5px solid rgba(255,255,255,0.25)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <FaApple size={18} />
                <div className="text-left leading-tight">
                  <div className="text-[9px] opacity-60">Download on the</div>
                  <div className="font-bold text-sm">App Store</div>
                </div>
              </button>
              <button
                onClick={handleComingSoon}
                className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-semibold text-white w-full sm:w-auto transition-all duration-200 hover:scale-105"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1.5px solid rgba(255,255,255,0.25)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <FaGooglePlay size={16} />
                <div className="text-left leading-tight">
                  <div className="text-[9px] opacity-60">GET IT ON</div>
                  <div className="font-bold text-sm">Google Play</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom wave — relative, never overlaps content */}
        <div
          className="relative pointer-events-none"
          style={{ marginTop: "-2px" }}
        >
          <svg
            viewBox="0 0 1440 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
            style={{
              width: "100%",
              height: "clamp(40px,5vw,80px)",
              display: "block",
            }}
          >
            <path
              d="M0 80 L0 45 Q360 5 720 38 Q1080 70 1440 30 L1440 80 Z"
              fill="#f8fafc"
            />
          </svg>
        </div>

        <style>{`
          @keyframes floatP {
            0%,100%{ transform:translateY(0) rotate(0deg); opacity:.55; }
            40%    { transform:translateY(-15px) rotate(6deg); opacity:.8; }
            70%    { transform:translateY(-6px) rotate(-3deg); opacity:.7; }
          }
          @keyframes twinkleS {
            0%,100%{ opacity:.25; transform:scale(1); }
            50%    { opacity:.85; transform:scale(1.7); }
          }
        `}</style>
      </section>

      {/* ── FEATURE CARDS — outside hero, seamlessly below wave ── */}
      <div className="bg-slate-50 pt-6 pb-2 px-6 sm:px-5 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                icon: <FaBoltLightning size={14} color="#fbbf24" />,
                label: "High Performance",
                bg: "rgba(251,191,36,0.08)",
                border: "rgba(251,191,36,0.2)",
                text: "#d97706",
                sub: "Lightning fast ticketing",
              },
              {
                icon: <FaShield size={14} color="#10b981" />,
                label: "Secure Payments",
                bg: "rgba(16,185,129,0.08)",
                border: "rgba(16,185,129,0.2)",
                text: "#059669",
                sub: "Bank-grade encryption",
              },
              {
                icon: <FaMobileScreen size={14} color="#6366f1" />,
                label: "Role & Access Management",
                bg: "rgba(99,102,241,0.08)",
                border: "rgba(99,102,241,0.2)",
                text: "#6366f1",
                sub: "Control user roles and permissions",
              },
              {
                icon: <FaChartLine size={14} color="#8b5cf6" />,
                label: "Real-time Analytics",
                bg: "rgba(139,92,246,0.08)",
                border: "rgba(139,92,246,0.2)",
                text: "#7c3aed",
                sub: "Live event insights",
              },
            ].map(({ icon, label, bg, border, text, sub }) => (
              <div
                key={label}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border shadow-sm"
                style={{ borderColor: border }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: bg }}
                >
                  {icon}
                </div>
                <div className="text-left">
                  <div
                    className="text-[14px] font-bold"
                    style={{ color: text }}
                  >
                    {label}
                  </div>
                  <div className="text-[12px] text-gray-400">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FEATURES GRID ──────────────────────────────────────────────── */}
      <section id="solutions" className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Everything You Need to Power
            <br />
            Unforgettable Events{" "}
          </h2>
          <p className="text-gray-500 text-base sm:text-lg max-w-2xl mx-auto mb-14">
            From launch to growth, create, manage, and scale extraordinary event
            experiences with one powerful platform.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((item, i) => (
              <FeatureCard
                key={i}
                icon={item.icon}
                title={item.title}
                description={item.description}
                tag={item.tag}
                colorClass={item.colorClass}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES SECTION ──────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-900 rounded-3xl mx-4 sm:mx-6 lg:mx-8 my-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Built for Every Role in Your Event
            <br />
            Ecosystem
          </h2>
          <p className="text-gray-400 text-base max-w-xl mx-auto mb-14">
            Tailored experiences for everyone involved, ensuring a smooth and
            successful event.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ROLES.map((role, i) => (
              <RoleCard
                key={i}
                title={role.title}
                items={role.items}
                icon={role.icon}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── EXPERIENCE THE PLATFORM ────────────────────────────────────── */}
      <section className="py-12 bg-slate-50 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Experience the Platform
          </h2>
          <p className="text-gray-500 text-base max-w-xl mx-auto mb-8">
            A beautiful, intuitive interface designed to make event management
            feel effortless.
          </p>

          <AppCarousel />
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────────────── */}
      <section className="py-14 bg-white" id="pricing">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Choose Your Growth Plan
          </h2>
          <p className="text-gray-500 text-base max-w-xl mx-auto mb-10">
            Start free, choose monthly or yearly billing, and scale with plans
            backed by expert service and support for every event journey.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-10">
            <div className="flex bg-gray-100 rounded-full p-1 gap-1">
              <button
                onClick={() => setBilling("monthly")}
                className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  billing === "monthly"
                    ? "bg-linear-to-r from-blue-500 to-violet-600 text-white shadow"
                    : "text-gray-500 hover:text-gray-700 bg-transparent"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("yearly")}
                className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  billing === "yearly"
                    ? "bg-linear-to-r from-blue-500 to-violet-600 text-white shadow"
                    : "text-gray-500 hover:text-gray-700 bg-transparent"
                }`}
              >
                Yearly
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {PRICING.map((plan, i) => {
              const isPro = plan.type === "pro";
              const isEnterprise = plan.type === "enterprise";

              return (
                <div
                  key={i}
                  className={`${
                    isPro
                      ? "bg-gray-900 text-white relative hover:shadow-2xl"
                      : "bg-white border border-gray-200 hover:shadow-xl"
                  } rounded-2xl p-8 text-left flex flex-col hover:-translate-y-1 transition-all duration-300`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-blue-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="flex-1">
                    {/* Title */}
                    <p
                      className={`text-sm font-semibold mb-2 ${
                        isPro ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      {plan.name}
                    </p>

                    {/* Price */}
                    <div className="flex items-baseline gap-1 mb-1">
                      <span
                        className={`text-4xl font-extrabold ${
                          isPro ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span
                          className={`text-sm ${
                            isPro ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          {plan.period}
                        </span>
                      )}
                    </div>

                    {/* Yearly note */}
                    <div className="mb-2 h-5">
                      {"yearlyNote" in plan && plan.yearlyNote ? (
                        <p
                          className={`text-xs font-medium ${isPro ? "text-emerald-400" : "text-emerald-600"}`}
                        >
                          {plan.yearlyNote}
                        </p>
                      ) : null}
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className={`flex items-center gap-3 text-sm ${
                            isPro ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          <CheckIcon color={isPro ? "white" : undefined} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Button */}
                  <a
                    href={plan.href}
                    onClick={(e) => {
                      if (plan.href.startsWith("#")) {
                        e.preventDefault();
                        const el = document.querySelector(plan.href);
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className={`w-full py-3 rounded-xl text-sm font-semibold transition-all text-center ${
                      isPro
                        ? "bg-linear-to-r from-blue-500 to-violet-600 text-white hover:opacity-90"
                        : isEnterprise
                          ? "border border-gray-200 text-blue-600 hover:bg-blue-50"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {plan.buttonText}
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CONTACT / BOOK DEMO ────────────────────────────────────────── */}
      <section
        id="contact"
        className="py-24 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
        }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 65%)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 65%)",
            }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left — Info */}
            <div>
              <div className="inline-flex items-center gap-2 border border-blue-500/30 bg-blue-500/10 rounded-full px-4 py-1.5 text-sm text-blue-300 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                FREE DEMO
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight mb-5">
                Book a Free
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(90deg, #60a5fa, #a78bfa)",
                  }}
                >
                  Product Demo
                </span>
              </h2>
              <p className="text-gray-400 text-base leading-relaxed mb-10 max-w-md">
                Find out why WON Events is the right platform for your
                organization. Our team will walk you through every feature
                tailored to your needs.
              </p>

              <div className="space-y-4">
                {[
                  {
                    icon: (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#60a5fa"
                        strokeWidth="2.5"
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    ),
                    label: "Call us",
                    value: "+91 7893536373",
                  },
                  {
                    icon: (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#60a5fa"
                        strokeWidth="2.5"
                      >
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    ),
                    label: "Email us",
                    value: "sales@nowitservices.com",
                  },
                  {
                    icon: (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#60a5fa"
                        strokeWidth="2.5"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    ),
                    label: "Response time",
                    value: "Within 24 hours",
                  },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                      {icon}
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">{label}</div>
                      <div className="text-sm font-semibold text-gray-200">
                        {value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Form */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── 24/7 SUPPORT ───────────────────────────────────────────────── */}
      <section className="py-20 bg-white text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="w-12 h-12 mx-auto mb-6 rounded-full border-2 border-blue-200 flex items-center justify-center">
            <BiSupport size={25} color="#3B82F6" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-5">
            24/7 Support &amp; Seamless Experience
          </h2>
          <p className="text-gray-500 text-base leading-relaxed mb-12">
            Our dedicated team is here around the clock to ensure your events
            run without a hitch. Accessible across all your devices.
          </p>
          <div className="flex justify-center gap-10 sm:gap-16 text-sm text-gray-500">
            {[
              {
                label: "iOS App",
                icon: (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#374151"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                ),
              },
              {
                label: "Android App",
                icon: (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#374151"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                ),
              },
              
              {
                label: "Web Platform",
                icon: (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#374151"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                ),
              },
            ].map(({ label, icon }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                {icon}
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer style={{ background: "#0a0f1e" }} className="py-0">
        <div className="relative overflow-hidden">
          {/* Diagonal pattern overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(135deg, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 60px)",
            }}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-8 relative">
            {/* Main grid */}
            <div className="grid grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_1fr] gap-8 md:gap-12 pb-10 border-b border-white/8">
              {/* Brand */}
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-3 mb-4 ">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                    <img
                      src="https://res.cloudinary.com/dtb4vozhy/image/upload/v1777351879/Untitled_design_35_zignpq.png"
                      alt="WON Events Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <span className="font-black text-[17px] text-white tracking-wide">
                    WON Events
                  </span>
                </div>

                <p className="text-[14px] text-white/50 leading-relaxed max-w-90 mb-5">
                  The most powerful all-in-one ecosystem for managing events,
                  selling tickets, handling payments, and growing your audience.
                </p>

                {/* Social icons */}
                <div className="flex gap-2">
                  {[
                    {
                      title: "Instagram",
                      link: "https://www.instagram.com/_nowitservices_/",
                      d: "M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zM17.5 6.5h.01M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5z",
                    },
                    {
                      title: "LinkedIn",
                      link: "https://www.linkedin.com/company/nowitservices/",
                      d: "M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z",
                    },
                    {
                      title: "YouTube",
                      link: "https://www.youtube.com/@nowitservicesltd",
                      d: "M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z",
                    },
                    {
                      title: "Facebook",
                      link: "https://www.facebook.com/p/NOWIT-Services-61559601166623/",
                      d: "M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z",
                    },
                  ].map((s, i) => (
                    <a
                      key={i}
                      href={s.link} // ✅ dynamic link here
                      target="_blank" // ✅ open in new tab
                      rel="noopener noreferrer"
                      title={s.title}
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:-translate-y-1 hover:bg-white/20"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.12)",
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="rgba(255,255,255,0.75)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={s.d} />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>

              {/* Site Map */}
              <div>
                <p className="text-sm font-extrabold text-white mb-2">
                  Site Map
                </p>
                <div className="w-10 h-[3px] bg-indigo-500 rounded mb-4" />
                <ul className="space-y-1.5">
                  {[
                    { label: "Home", href: "#home" },
                    { label: "Solutions", href: "#solutions" },
                    { label: "Pricing", href: "#pricing" },
                    { label: "Contact Us", href: "#contact" },
                  ].map((item) => (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        onClick={(e) => {
                          e.preventDefault();
                          scrollTo(item.href);
                        }}
                        className="text-[14px]  text-white/60 hover:text-white transition-colors duration-200 cursor-pointer"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Resources */}
              <div>
                <p className="text-sm font-extrabold text-white mb-2">
                  Resources
                </p>
                <div className="w-10 h-[3px] bg-violet-500 rounded mb-4" />
                <ul className="space-y-1.5">
                  {[
                    { label: "Help Center", href: "https://nowitservices.com" },
                    { label: "Terms & Conditions", href: "/wonevent/terms" },
                    { label: "Refund Policy", href: "/wonevent/refund" },
                    { label: "Privacy Policy", href: "/wonevent/privacy" },
                  ].map((item) => (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        className="text-[14px] text-white/60 hover:text-white transition-colors duration-200"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* ISO badge — desktop only */}
              <div className="hidden md:flex items-start justify-start">
                <img
                  src="https://res.cloudinary.com/dca9sij3n/image/upload/f_auto,q_auto/fuubxxty3ih0f9wmjkdr"
                  alt="ISO 20000-1:2018 Certified"
                  className="w-30 h-30 object-contain"
                  // onError={(e) => (e.target.style.display = "none")}
                />
              </div>
            </div>

            {/* Bottom bar */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-white/40 tracking-wide">
                © {new Date().getFullYear()}{" "}
                <span className="font-semibold text-white/60">WON Events</span>.
                All rights reserved.
              </p>
              {/* <div className="flex gap-6">
                <a
                  href="#"
                  className="text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  Privacy Policy
                </a>
                <a
                  href="#"
                  className="text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  Terms of Service
                </a>
                <a
                  href="#"
                  className="text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  Refund Policy
                </a>
              </div> */}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
