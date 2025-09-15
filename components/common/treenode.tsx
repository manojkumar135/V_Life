import React, { useState, useRef, useEffect } from "react";
import { FaUserCircle } from "react-icons/fa";

export interface TreeNode {
  user_id: string;
  name: string;
  user_status: string;
  contact?: string;
  mail?: string;
  referBy?: string;
  parent?: string;
  left?: TreeNode | null;
  right?: TreeNode | null;
  leftCount?: string;
  rightCount?: string;
}

interface Props {
  node: TreeNode;
  getColor: (status: string) => string;
  highlightedId?: string | null;
  level?: number; // depth tracker
  maxLevel?: number; // limit depth
}

const BinaryTreeNode: React.FC<Props> = ({
  node,
  getColor,
  highlightedId,
  level = 1,
  maxLevel = 4,
}) => {
  const [hovered, setHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const isHighlighted = highlightedId === node.user_id;

  useEffect(() => {
    if (hovered && nodeRef.current && tooltipRef.current) {
      const nodeRect = nodeRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      const LEFT_MARGIN = 80; // increased left margin

      let top = nodeRect.bottom + window.scrollY + 8; // default below
      let left =
        nodeRect.left +
        nodeRect.width / 2 +
        window.scrollX -
        tooltipRect.width / 2;

      // If tooltip goes beyond right edge → clamp
      if (left + tooltipRect.width > window.innerWidth - 8) {
        left = window.innerWidth - tooltipRect.width - 8;
      }

      // If tooltip goes beyond left edge → clamp
      if (left < LEFT_MARGIN) {
        left = LEFT_MARGIN;
      }

      // If tooltip goes beyond bottom → show above node
      if (top + tooltipRect.height > window.scrollY + window.innerHeight - 8) {
        top = nodeRect.top + window.scrollY - tooltipRect.height - 8;
      }

      setTooltipPos({ top, left });
    }
  }, [hovered]);

  return (
    <div className="flex flex-col items-center relative w-full xl:w-14/15 ">
      {/* Node */}
      <div
        ref={nodeRef}
        className="flex flex-col items-center relative cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <FaUserCircle
          className={`${getColor(node.user_status)} ${
            isHighlighted ? "ring-4 ring-blue-700 rounded-full" : "mt-1"
          }`}
          size={35}
        />
        <span className="text-xs text-center mt-1 capitalize">{node.name}</span>
        <span className="text-xs text-center mt-1 font-semibold">
          {node.user_id}
        </span>
      </div>

      {/* Tooltip */}
      {hovered && (
        <div
          ref={tooltipRef}
          className="fixed z-50 bg-white border shadow-md rounded-md p-2 text-xs w-60 max-w-[90vw] space-y-1"
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
            <span
              className={`${getColor(node.user_status)} capitalize truncate`}
            >
              {node.user_status}
            </span>
          </div>
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
          {node.referBy && (
            <div className="flex">
              <strong className="w-20">Refer By:</strong>
              <span className="truncate">{node.referBy}</span>
            </div>
          )}
          {node.parent && (
            <div className="flex">
              <strong className="w-20">Parent:</strong>
              <span className="truncate">{node.parent}</span>
            </div>
          )}

          {/* 👇 Team counts */}
          <div className="flex">
            <strong className="w-20">Left Team:</strong>
            <span>{node.leftCount ?? 0}</span>
          </div>
          <div className="flex">
            <strong className="w-20">Right Team:</strong>
            <span>{node.rightCount ?? 0}</span>
          </div>
        </div>
      )}

      {/* Show children only if within level limit */}
      {level < maxLevel && (
        <>
          {/* Connector lines */}
          <div className="relative flex justify-center mt-2 w-full max-lg:min-w-[250px]">
            <div className="absolute top-0 left-1/4  right-1/4  border-t border-gray-400 " />
            <div className="absolute top-0 left-1/4 border-l border-gray-400 h-2" />
            <div className="absolute top-0 right-1/4 border-l border-gray-400 h-2" />
          </div>

          {/* Children */}
          <div className="flex justify-center mt-2 w-full">
            {/* Left */}
            <div className="flex flex-col items-center flex-1">
              {node.left ? (
                <BinaryTreeNode
                  node={node.left}
                  getColor={getColor}
                  highlightedId={highlightedId}
                  level={level + 1}
                  maxLevel={maxLevel}
                />
              ) : (
                <div className="w-10 h-10 border border-dashed border-gray-400 rounded-full flex items-center justify-center text-xs text-gray-400 mt-1">
                  Empty
                </div>
              )}
            </div>

            {/* Right */}
            <div className="flex flex-col items-center flex-1">
              {node.right ? (
                <BinaryTreeNode
                  node={node.right}
                  getColor={getColor}
                  highlightedId={highlightedId}
                  level={level + 1}
                  maxLevel={maxLevel}
                />
              ) : (
                <div className="w-10 h-10 border border-dashed border-gray-400 rounded-full flex items-center justify-center text-xs text-gray-400 mt-1">
                  Empty
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BinaryTreeNode;
