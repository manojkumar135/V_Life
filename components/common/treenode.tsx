"use client";

import React, { useState, useRef, useEffect } from "react";
import { useVLife } from "@/store/context";
import { useRouter } from "next/navigation";
import StatusModal from "@/components/common/userStatusModal";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";
import Loader from "@/components/common/loader";

export interface TreeNode {
  user_id: string;
  name: string;
  user_status: string;
  status_notes?: string;

  rank?: string;
  club?: string;
  contact?: string;
  mail?: string;
  referBy?: string;
  parent?: string;
  left?: TreeNode | null;
  right?: TreeNode | null;
  leftCount?: string;
  rightCount?: string;
  referrals?: string;
  bv?: string;
  sv?: string;
  leftBV?: number;
  rightBV?: number;
  leftPV?: number;
  rightPV?: number;
  infinityLeft?: number;
  infinityRight?: number;
  infinity?: string;

  totalLeftBV?: number;
  totalRightBV?: number;
  totalLeftPV?: number;
  totalRightPV?: number;
}

interface Props {
  node: TreeNode;
  getColor: (status: string, statusNotes?: string) => string;
  highlightedId?: string | null;
  level?: number;
  maxLevel?: number;
  onUserClick?: (userId: string) => void;
  refreshTree?: (userId?: string) => void;
}

/** Convert rank to star label if it's a number or contains "star" */
const formatRank = (rank?: string): string => {
  if (!rank || rank === "none") return rank ?? "none";
  const lower = rank.toLowerCase().trim();
  if (lower.includes("star")) return "star";
  if (/^\d+$/.test(lower)) {
    const num = Number(lower);
    if (num === 1) return "1 Star";
    return "2 Star";
  }
  return rank;
};

/**
 * Resolve badge key from node fields.
 * Priority:
 * 1. inactive + status_notes contains "Deactivated by Admin" → blocked
 * 2. inactive (any other reason)                             → registered
 * 3. active, no rank                                         → associate
 * 4. club === "Star" OR numeric rank                         → star
 * 5. named rank (Bronze … Royal Crown Diamond)               → matching file
 */
function resolveBadge(node: TreeNode): string {
  const status = (node.user_status || "").toLowerCase();
  const notes = (node.status_notes || "").toLowerCase();
  const rank = node.rank || "";
  const club = node.club || "";

  if (status === "inactive" || status === "deactivated") {
    if (notes.includes("deactivated by admin")) return "blocked";
    return "registered";
  }

  if (!rank || rank === "none" || rank === "0") return "associate";

  if (club === "Star" || !isNaN(Number(rank))) return "star";

  const namedRanks: Record<string, string> = {
    Bronze: "bronze",
    Sliver: "sliver",
    Silver: "sliver",
    Gold: "gold",
    Emerald: "emerald",
    Platinum: "platinum",
    Diamond: "diamond",
    "Blue Diamond": "bluediamond",
    "Black Diamond": "blackdiamond",
    "Crown Diamond": "crowndiamond",
    "Royal Crown Diamond": "royalcrowndiamond",
    Royality: "royalcrowndiamond",
  };
  if (namedRanks[rank]) return namedRanks[rank];

  return "associate";
}

const BinaryTreeNode: React.FC<Props> = ({
  node,
  getColor,
  highlightedId,
  level = 1,
  maxLevel = 4,
  onUserClick,
  refreshTree,
}) => {
  const { user } = useVLife();
  const router = useRouter();
  const STATUS_URL = "/api/status-operations";

  const [currentPV, setCurrentPV] = useState<{
    leftPV: number;
    rightPV: number;
  } | null>(null);
  const [pvLoading, setPvLoading] = useState(false);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    status: string;
    row: TreeNode;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const nodeRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hoverDelayRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ Track clicks to distinguish single vs double click
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [hovered, setHovered] = useState(false);

  const isHighlighted = highlightedId === node.user_id;
  const badgeKey = resolveBadge(node);

  // ✅ Handle admin status modal open
  const handleStatusClick = (id?: string, status?: string, row?: TreeNode) => {
    if (id === user?.user_id) return;
    if (user?.role === "admin" && id && status && row) {
      setSelectedUser({ id, status, row });
      setIsStatusModalOpen(true);
    }
  };

  // ✅ Confirm status change
  const confirmStatusChange = async () => {
    if (!selectedUser) return;
    try {
      setLoading(true);
      const { id, status } = selectedUser;
      const res = await axios.put(STATUS_URL, { id, status });

      if (res.data.success) {
        const { user_id, new_status } = res.data.data;
        ShowToast.success(
          `User ${user_id} status changed to ${
            new_status.charAt(0).toUpperCase() + new_status.slice(1)
          }`,
        );
        setIsStatusModalOpen(false);
        refreshTree?.(user_id);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      ShowToast.error("Failed to update status");
    } finally {
      setSelectedUser(null);
      setLoading(false);
    }
  };

  // ✅ Empty slot click → Go to registration
  const handleEmptyClick = (side: "left" | "right") => {
    router.push(
      `/administration/users/tree/register?referBy=${user.user_id}&parent=${node.user_id}&position=${side}`,
    );
  };

  // ✅ Fetch PV and show tooltip
  const showTooltip = async () => {
    setHovered(true);
    if (!currentPV) {
      try {
        setPvLoading(true);
        const res = await axios.get("/api/dashboard-operations/team-slot", {
          params: { user_id: node.user_id },
        });
        setCurrentPV({
          leftPV: res.data.leftTeam || 0,
          rightPV: res.data.rightTeam || 0,
        });
      } catch (err) {
        console.error("Failed to fetch current PV:", err);
      } finally {
        setPvLoading(false);
      }
    }
  };

  // ✅ On mouse enter: wait 600ms, then show tooltip ONLY if no double-click happened
  const handleMouseEnter = () => {
    if (hoverDelayRef.current) clearTimeout(hoverDelayRef.current);
    hoverDelayRef.current = setTimeout(() => {
      if (clickCountRef.current < 2) {
        showTooltip();
      }
    }, 600);
  };

  const handleMouseLeave = () => {
    if (hoverDelayRef.current) clearTimeout(hoverDelayRef.current);
    setHovered(false);
  };

  // ✅ Click handler: counts clicks within 300ms window
  // Single click → tooltip will show via hover delay
  // Double click → cancel tooltip, open status modal
  const handleClick = () => {
    clickCountRef.current += 1;

    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

    clickTimerRef.current = setTimeout(() => {
      if (clickCountRef.current >= 2) {
        // Double click detected
        if (node.user_id !== user?.user_id) {
          // Cancel any pending tooltip
          if (hoverDelayRef.current) clearTimeout(hoverDelayRef.current);
          setHovered(false);
          handleStatusClick(node.user_id, node.user_status, node);
        }
      }
      clickCountRef.current = 0;
    }, 300);
  };

  // ---------------- Improved tooltip positioning ----------------
  useEffect(() => {
    if (!hovered) return;

    const updatePos = () => {
      if (!nodeRef.current || !tooltipRef.current) return;

      const nodeRect = nodeRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      const MARGIN = 8;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const scrollX = window.scrollX || window.pageXOffset || 0;

      let left =
        nodeRect.left + nodeRect.width / 2 + scrollX - tooltipRect.width / 2;
      left = Math.min(
        Math.max(left, MARGIN + scrollX),
        window.innerWidth - tooltipRect.width - MARGIN + scrollX,
      );

      const spaceBelow = window.innerHeight - nodeRect.bottom - MARGIN;
      const spaceAbove = nodeRect.top - MARGIN;

      let top: number;
      let preferAbove = false;

      if (spaceBelow >= tooltipRect.height) {
        top = nodeRect.bottom + MARGIN + scrollY;
      } else if (spaceAbove >= tooltipRect.height) {
        top = nodeRect.top - tooltipRect.height - MARGIN + scrollY;
        preferAbove = true;
      } else {
        const desiredBelow = nodeRect.bottom + MARGIN + scrollY;
        const minTop = scrollY + MARGIN;
        const maxTop =
          scrollY + window.innerHeight - tooltipRect.height - MARGIN;
        top = Math.min(Math.max(desiredBelow, minTop), maxTop);
        preferAbove = top < nodeRect.bottom + scrollY;
      }

      setTooltipPos({ top, left });

      if (tooltipRef.current) {
        tooltipRef.current.setAttribute(
          "data-above",
          preferAbove ? "true" : "false",
        );
      }
    };

    updatePos();

    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);

    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [hovered, node.user_id]);

  // ✅ Long press detection for mobile (Admin only)
  const handleTouchStart = () => {
    if (user?.role === "admin" && node.user_id !== user?.user_id) {
      longPressTimeoutRef.current = setTimeout(() => {
        handleStatusClick(node.user_id, node.user_status, node);
      }, 700);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
  };

  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Loader />
        </div>
      )}
      <div className="flex flex-col items-center relative w-full xl:w-14/15">
        {/* Node */}
        <div
          ref={nodeRef}
          className="flex flex-col items-center relative cursor-pointer"
        >
          {/* ── Badge image — no ring, no bg, just the badge ── */}
          <div
            className={`cursor-pointer transition-transform active:scale-90 ${
              isHighlighted ? "ring-4 ring-blue-700 rounded-full" : "mt-1"
            }`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={`/badges/${badgeKey}.png`}
              alt={badgeKey}
              className="w-14 h-14 object-contain drop-shadow-md"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
          </div>

          <span className="text-xs text-center mt-1 capitalize">
            {node.name}
          </span>

          <span
            className="text-xs text-center mt-1 font-semibold text-gray-800 hover:text-blue-600 hover:underline cursor-pointer transition-colors duration-200"
            onClick={() => onUserClick?.(node.user_id)}
          >
            {node.user_id}
          </span>
        </div>

        {/* Tooltip */}
        {hovered && (
          <div
            ref={tooltipRef}
            className="fixed z-50 bg-white border shadow-md rounded-md p-2 text-xs w-60 max-w-[90vw] space-y-1 transition-opacity duration-200"
            style={{ top: tooltipPos.top, left: tooltipPos.left }}
            onMouseEnter={() => {
              if (hoverTimeoutRef.current)
                clearTimeout(hoverTimeoutRef.current);
              setHovered(true);
            }}
            onMouseLeave={() => {
              hoverTimeoutRef.current = setTimeout(
                () => setHovered(false),
                100,
              );
            }}
          >
            {/* Badge preview in tooltip */}
            <div className="flex items-center gap-2 pb-1 border-b border-gray-100 mb-1">
              <img
                src={`/badges/${badgeKey}.png`}
                alt={badgeKey}
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="font-semibold capitalize text-gray-700">
                {(() => {
                  const rank = node.rank || "";
                  const num = Number(rank);
                  if (!isNaN(num) && num >= 1 && num <= 5) {
                    return num === 1 ? "1 Star" : "2 Star";
                  }
                  return badgeKey.replace(/([a-z])([A-Z])/g, "$1 $2");
                })()}
              </span>
            </div>

            <div className="flex">
              <strong className="w-20">ID:</strong>
              <span className="truncate">{node.user_id}</span>
            </div>
            <div className="flex">
              <strong className="w-20">Name:</strong>
              <span className="capitalize truncate">{node.name}</span>
            </div>
            <div className="flex">
              <strong className="w-20">Status:</strong>
              <span
                className={`${getColor(
                  node.user_status,
                  node.status_notes,
                )} capitalize`}
              >
                {node.user_status}
              </span>
            </div>

            {user?.role === "admin" && (
              <>
                {node.rank && (
                  <div className="flex">
                    <strong className="w-20">Rank:</strong>
                    <span className="truncate font-semibold capitalize">
                      {formatRank(node.rank)}
                    </span>
                  </div>
                )}
                {node.club && node.club !== "none" && (
                  <div className="flex">
                    <strong className="w-20">Club:</strong>
                    <span className="truncate font-semibold capitalize">
                      {node.club}
                    </span>
                  </div>
                )}
                {node.contact && (
                  <div className="flex">
                    <strong className="w-20">Contact:</strong>
                    <span className="truncate">{node.contact}</span>
                  </div>
                )}
                {node.mail && (
                  <div className="flex">
                    <strong className="w-20">Email:</strong>
                    <span className="truncate">{node.mail}</span>
                  </div>
                )}
              </>
            )}

            {node.referrals != null && (
              <div className="flex">
                <strong className="w-20">Referrals:</strong>
                <span className="truncate">{node.referrals}</span>
              </div>
            )}
            {node.referBy && (
              <div className="flex">
                <strong className="w-20">Sponsor:</strong>
                <span>{node.referBy}</span>
              </div>
            )}
            {node.infinity && (
              <div className="flex">
                <strong className="w-20">Infinity:</strong>
                <span>{node.infinity}</span>
              </div>
            )}
            {node.parent && (
              <div className="flex">
                <strong className="w-20">Parent:</strong>
                <span>{node.parent}</span>
              </div>
            )}
            <div className="flex">
              <strong className="w-20">Left Team:</strong>
              <span>{node.leftCount ?? 0}</span>
            </div>
            <div className="flex">
              <strong className="w-20">Right Team:</strong>
              <span>{node.rightCount ?? 0}</span>
            </div>
            {node.infinityLeft != null && (
              <div className="flex">
                <strong className="w-20">Left Infinity:</strong>
                <span>{node.infinityLeft ?? 0}</span>
              </div>
            )}
            {node.infinityRight != null && (
              <div className="flex">
                <strong className="w-20">Right Infinity:</strong>
                <span>{node.infinityRight ?? 0}</span>
              </div>
            )}
            <div className="flex">
              <strong className="w-20">Total BV:</strong>
              <span>{(node.totalLeftBV ?? 0) + (node.totalRightBV ?? 0)}</span>
            </div>
            <div className="flex">
              <strong className="w-20">Total PV:</strong>
              <span>{(node.totalLeftPV ?? 0) + (node.totalRightPV ?? 0)}</span>
            </div>
            <div className="flex">
              <strong className="w-20">Left BV:</strong>
              <span>{node.leftBV ?? 0}</span>
            </div>
            <div className="flex">
              <strong className="w-20">Right BV:</strong>
              <span>{node.rightBV ?? 0}</span>
            </div>
            <div className="flex">
              <strong className="w-20">Left PV:</strong>
              <span>{pvLoading ? "..." : (currentPV?.leftPV ?? 0)}</span>
            </div>
            <div className="flex">
              <strong className="w-20">Right PV:</strong>
              <span>{pvLoading ? "..." : (currentPV?.rightPV ?? 0)}</span>
            </div>
          </div>
        )}

        {/* Children */}
        {level < maxLevel && (
          <>
            <div className="relative flex justify-center mt-2 w-full max-lg:min-w-[250px]">
              <div className="absolute top-0 left-1/4 right-1/4 border-t border-gray-400" />
              <div className="absolute top-0 left-1/4 border-l border-gray-400 h-2" />
              <div className="absolute top-0 right-1/4 border-l border-gray-400 h-2" />
            </div>

            <div className="flex justify-center mt-2 w-full">
              {/* Left child */}
              <div className="flex flex-col items-center flex-1">
                {node.left ? (
                  <BinaryTreeNode
                    node={node.left}
                    getColor={getColor}
                    highlightedId={highlightedId}
                    level={level + 1}
                    maxLevel={maxLevel}
                    onUserClick={onUserClick}
                    refreshTree={refreshTree}
                  />
                ) : (
                  <div
                    onClick={() => handleEmptyClick("left")}
                    className="relative group w-10 h-10 border border-dashed border-gray-400 rounded-full flex items-center justify-center text-xs text-gray-400 mt-1 cursor-pointer hover:bg-gray-100 transition"
                  >
                    Empty
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      Add
                    </span>
                  </div>
                )}
              </div>

              {/* Right child */}
              <div className="flex flex-col items-center flex-1">
                {node.right ? (
                  <BinaryTreeNode
                    node={node.right}
                    getColor={getColor}
                    highlightedId={highlightedId}
                    level={level + 1}
                    maxLevel={maxLevel}
                    onUserClick={onUserClick}
                    refreshTree={refreshTree}
                  />
                ) : (
                  <div
                    onClick={() => handleEmptyClick("right")}
                    className="relative group w-10 h-10 border border-dashed border-gray-400 rounded-full flex items-center justify-center text-xs text-gray-400 mt-1 cursor-pointer hover:bg-gray-100 transition"
                  >
                    Empty
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      Add
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ✅ Status Modal */}
        {isStatusModalOpen && (
          <StatusModal
            isOpen={isStatusModalOpen}
            setIsOpen={setIsStatusModalOpen}
            currentStatus={
              selectedUser?.status === "active" ? "active" : "inactive"
            }
            selectedUser={selectedUser}
            onConfirm={confirmStatusChange}
            loading={loading}
          />
        )}
      </div>
    </>
  );
};

export default BinaryTreeNode;