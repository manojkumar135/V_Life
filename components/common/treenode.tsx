"use client";

import React, { useState, useRef, useEffect } from "react";
import { FaUserCircle } from "react-icons/fa";
import { useVLife } from "@/store/context";
import { useRouter } from "next/navigation";
import StatusModal from "@/components/common/userStatusModal";
import axios from "axios";
import ShowToast from "@/components/common/Toast/toast";

export interface TreeNode {
  user_id: string;
  name: string;
  user_status: string;
  rank?: string;
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
  infinityLeft?: number;
  infinityRight?: number;
}

interface Props {
  node: TreeNode;
  getColor: (status: string) => string;
  highlightedId?: string | null;
  level?: number;
  maxLevel?: number;
  onUserClick?: (userId: string) => void;
  refreshTree?: (userId?: string) => void;
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

  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [hovered, setHovered] = useState(false);

  const isHighlighted = highlightedId === node.user_id;

  // ✅ Handle admin double-click or long press to change status
  const handleStatusClick = (id?: string, status?: string, row?: TreeNode) => {
    // ❌ Block if clicked user is same as logged-in user
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
          }`
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
      `/administration/users/tree/register?referBy=${user.user_id}&parent=${node.user_id}&position=${side}`
    );
  };

  // ✅ Tooltip hover logic
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setHovered(false), 100);
  };

  // ✅ Tooltip position calculation
  useEffect(() => {
    if (hovered && nodeRef.current && tooltipRef.current) {
      const nodeRect = nodeRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const LEFT_MARGIN = 80;

      let top = nodeRect.bottom + window.scrollY + 8;
      let left =
        nodeRect.left +
        nodeRect.width / 2 +
        window.scrollX -
        tooltipRect.width / 2;

      if (left + tooltipRect.width > window.innerWidth - 8)
        left = window.innerWidth - tooltipRect.width - 8;
      if (left < LEFT_MARGIN) left = LEFT_MARGIN;
      if (top + tooltipRect.height > window.scrollY + window.innerHeight - 8)
        top = nodeRect.top + window.scrollY - tooltipRect.height - 8;

      setTooltipPos({ top, left });
    }
  }, [hovered]);

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
    <div className="flex flex-col items-center relative w-full xl:w-14/15">
      {/* Node */}
      <div
        ref={nodeRef}
        className="flex flex-col items-center relative cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <FaUserCircle
          className={`${getColor(node.user_status)} ${
            isHighlighted ? "ring-4 ring-blue-700 rounded-full" : "mt-1"
          } cursor-pointer transition-transform active:scale-90`}
          size={35}
          onDoubleClick={() => {
            if (node.user_id !== user?.user_id) {
              handleStatusClick(node.user_id, node.user_status, node);
            }
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        />

        <span className="text-xs text-center mt-1 capitalize">{node.name}</span>

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
        >
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
            <span className={`${getColor(node.user_status)} capitalize`}>
              {node.user_status}
            </span>
          </div>

          {user?.role === "admin" && (
            <>
              {node.rank && (
                <div className="flex">
                  <strong className="w-20">Rank:</strong>
                  <span className="truncate font-semibold capitalize">
                    {node.rank}
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
          <div className="flex">
            <strong className="w-20">BV:</strong>
            <span>{node.bv ?? 0}</span>
          </div>
          <div className="flex">
            <strong className="w-20">SV:</strong>
            <span>{node.sv ?? 0}</span>
          </div>
          {node.infinityLeft!= null && (
            <div className="flex">
              <strong className="w-20">Left Infinity:</strong>
              <span>{node.infinityLeft?? 0}</span>
            </div>
          )}
          {node.infinityRight!= null && (
            <div className="flex">
              <strong className="w-20">Right Infinity:</strong>
              <span>{node.infinityRight ?? 0}</span>
            </div>
          )}
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
        />
      )}
    </div>
  );
};

export default BinaryTreeNode;
