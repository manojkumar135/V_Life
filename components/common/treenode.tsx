"use client";
import React, { useState, useMemo } from "react";
import Tree from "react-d3-tree";
import { FaUserCircle } from "react-icons/fa";

export interface TreeNode {
  user_id: string;
  name: string;
  user_status: string;
  contact?: string;
  mail?: string;
  left?: TreeNode | null;
  right?: TreeNode | null;
}

interface Props {
  root: TreeNode;
  getColor: (status: string) => string;
  highlightedId?: string | null;
}

const BinaryTree: React.FC<Props> = ({ root, getColor, highlightedId }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // ✅ Convert custom binary tree → react-d3-tree format
  const convertToTree = (node: TreeNode | null): any => {
    if (!node) return null;

    const children: any[] = [];
    if (node.left) {
      children.push(convertToTree(node.left));
    } else {
      children.push({ name: "Empty", attributes: { empty: true } });
    }

    if (node.right) {
      children.push(convertToTree(node.right));
    } else {
      children.push({ name: "Empty", attributes: { empty: true } });
    }

    return {
      name: node.name,
      attributes: {
        user_id: node.user_id,
        user_status: node.user_status,
        contact: node.contact,
        mail: node.mail,
      },
      children,
    };
  };

  const treeData = useMemo(() => [convertToTree(root)], [root]);

  // ✅ Custom node renderer
  const renderNode = ({ nodeDatum }: any) => {
    const isEmpty = nodeDatum.attributes?.empty;
    const isHighlighted = highlightedId === nodeDatum.attributes?.user_id;

    return (
      <g
        onMouseEnter={() =>
          !isEmpty && setHoveredId(nodeDatum.attributes?.user_id)
        }
        onMouseLeave={() => setHoveredId(null)}
      >
        {isEmpty ? (
          <circle r={20} stroke="#ccc" strokeDasharray="4" fill="transparent" />
        ) : (
          <>
            <FaUserCircle
              color={getColor(nodeDatum.attributes?.user_status)}
              size={40}
              style={{
                filter: isHighlighted ? "drop-shadow(0 0 6px blue)" : "none",
              }}
            />
            <text
              dy="2.5em"
              textAnchor="middle"
              style={{ fontSize: "10px", textTransform: "capitalize" }}
            >
              {nodeDatum.name}
            </text>
            <text
              dy="4em"
              textAnchor="middle"
              style={{ fontSize: "10px", fontWeight: "600" }}
            >
              {nodeDatum.attributes?.user_id}
            </text>
          </>
        )}

        {/* ✅ Tooltip */}
        {hoveredId === nodeDatum.attributes?.user_id && (
          <foreignObject x={30} y={-20} width={200} height={120}>
            <div className="bg-white border shadow-md rounded-md p-2 text-xs">
              <p>
                <strong>ID:</strong> {nodeDatum.attributes?.user_id}
              </p>
              <p>
                <strong>Name:</strong> {nodeDatum.name}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span className={getColor(nodeDatum.attributes?.user_status)}>
                  {nodeDatum.attributes?.user_status}
                </span>
              </p>
              {nodeDatum.attributes?.contact && (
                <p>
                  <strong>Contact:</strong> {nodeDatum.attributes?.contact}
                </p>
              )}
              {nodeDatum.attributes?.mail && (
                <p>
                  <strong>Email:</strong> {nodeDatum.attributes?.mail}
                </p>
              )}
            </div>
          </foreignObject>
        )}
      </g>
    );
  };

  return (
    <div style={{ width: "100%", height: "600px" }}>
      <Tree
        data={treeData}
        orientation="vertical"
        renderCustomNodeElement={renderNode}
        collapsible={false}
        pathFunc="elbow"
        translate={{ x: 400, y: 50 }}
      />
    </div>
  );
};

export default BinaryTree;
