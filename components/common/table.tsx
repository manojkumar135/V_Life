"use client";
import {
  DataGrid,
  GridRowSelectionModel,
  GridColDef,
  GridCallbackDetails,
} from "@mui/x-data-grid";
import { useMemo, useState } from "react";
import { GrStatusGood } from "react-icons/gr";
import { MdCancel } from "react-icons/md";
import { useVLife } from "@/store/context";

type Row = Record<string, any>;

interface TableProps<T extends Row> {
  columns: GridColDef[];
  rows: T[];
  rowIdField: string;
  pageSize?: number;
  className?: string;
  rowHeight?: number;
  checkboxSelection?: boolean;
  statusField?: string;
  onRowClick?: (row: T) => void;
  onIdClick?: (id: string, row: T) => void;
  onStatusClick?: (id: string, status: string, row: T) => void;
  rowSelectionModel?: GridRowSelectionModel;
  setRowSelectionModel?: (selected: GridRowSelectionModel) => void;
  setSelectedRows?: (rows: T[]) => void;
  processedRows?: T[];
}

export default function Table<T extends Row>({
  columns,
  rows,
  rowIdField,
  pageSize = 12,
  className = "",
  rowHeight = 36,
  checkboxSelection = false,
  statusField,
  onRowClick,
  onIdClick,
  onStatusClick,
  rowSelectionModel,
  setRowSelectionModel,
  setSelectedRows,
  processedRows = [],
}: TableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useVLife();

  const safeRows = Array.isArray(rows) ? rows : [];
  const paginatedRows = useMemo(
    () => safeRows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [safeRows, currentPage, pageSize]
  );

  // 🔹 NEW: Track top color for cycling on sort click
  const colorCycle: ("green" | "orange" | "red" | "black")[] = [
    "green",
    "orange",
    "red",
    "black",
  ];
  const [topColor, setTopColor] = useState<
    "green" | "orange" | "red" | "black"
  >("green");

  const handleStatusHeaderClick = () => {
    const currentIndex = colorCycle.indexOf(topColor);
    const nextIndex = (currentIndex + 1) % colorCycle.length;
    setTopColor(colorCycle[nextIndex]);
  };

  // ✅ Function to assign numeric weight for status sorting
  const getStatusWeight = (row: any, statusField?: string) => {
    const raw = String(row?.[statusField ?? ""] ?? "").toLowerCase();
    const statusNotes = String(row?.status_notes ?? "").toLowerCase();

    const isActive =
      raw === "active" ||
      raw === "available" ||
      raw === "paid" ||
      raw === "true" ||
      raw === "yes";

    let iconColor = isActive ? "green" : "red";

    if (user?.role === "admin") {
      if (isActive && statusNotes === "activated by admin")
        iconColor = "orange";
      else if (!isActive && statusNotes === "deactivated by admin")
        iconColor = "black";
    }

    // 🔹 Weight based on topColor
    if (iconColor === topColor) return -1; // bring topColor to top
    const groupOrder = ["orange", "black", "green", "red"];
    const index = groupOrder.indexOf(iconColor);
    return index !== -1 ? index : 5;
  };

  const enhancedColumns: GridColDef[] = useMemo(() => {
    return columns.map((col, idx) => {
      const isIdCol = col.field === rowIdField || idx === 0;
      const isStatusCol = statusField && col.field === statusField;

      // ✅ Default renderer for empty values
      const defaultRenderer = (params: any) => {
        const value = params.value;
        return value === null ||
          value === undefined ||
          value === "" ||
          value === "none"
          ? "-"
          : value;
      };

      // ✅ Apply default renderer to normal columns automatically
      if (!isIdCol && !isStatusCol) {
        return {
          ...col,
          renderCell: col.renderCell ?? defaultRenderer,
        };
      }

      // ✅ Custom render for ID column
      return {
        ...col,
        sortable: true, // 🔥 enable sorting
        renderCell: (params: any) => {
          const id = String(params.row?.[rowIdField] ?? "");
          const value = params.value;

          if (isIdCol) {
            return (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onIdClick?.(id, params.row);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color:
                    params.field === "transaction_id" ? "black" : "#0000EE",
                  textDecoration:
                    params.field === "transaction_id" ? "none" : "underline",
                  cursor:
                    params.field === "transaction_id" ? "default" : "pointer",
                }}
              >
                {value === null || value === undefined || value === ""
                  ? "-"
                  : value}
              </button>
            );
          }

          // ✅ Custom render for Status column
          if (isStatusCol) {
            const raw = String(value ?? "").toLowerCase();
            const isActive =
              raw === "active" ||
              raw === "available" ||
              raw === "paid" ||
              raw === "true" ||
              raw === "yes";

            const statusNotes = String(
              params.row?.status_notes ?? ""
            ).toLowerCase();
            const Icon = isActive ? GrStatusGood : MdCancel;

            let iconColor = isActive ? "green" : "red";
            if (user?.role === "admin") {
              if (isActive && statusNotes === "activated by admin")
                iconColor = "orange";
              else if (!isActive && statusNotes === "deactivated by admin")
                iconColor = "black";
            }

            return (
              <button
                type="button"
                title={
                  isActive ? statusNotes || "Active" : statusNotes || "Inactive"
                }
                onClick={(e) => {
                  if (user?.role !== "admin") return;
                  e.stopPropagation();
                  onStatusClick?.(id, raw, params.row);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: user?.role === "admin" ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  margin: "0 0 0 10px",
                  height: "100%",
                  width: "100%",
                }}
                disabled={user?.role !== "admin"}
              >
                <Icon size={20} color={iconColor} />
              </button>
            );
          }

          return value === null || value === undefined || value === ""
            ? "-"
            : value;
        },
        // ✅ Add status sort comparator
        sortComparator: (v1, v2, cell1, cell2) => {
          const row1 = cell1.api.getRow(cell1.id);
          const row2 = cell2.api.getRow(cell2.id);

          const w1 = getStatusWeight(row1, statusField);
          const w2 = getStatusWeight(row2, statusField);

          return w1 - w2; // always orange > black > green > red
        },
      };
    });
  }, [columns, rowIdField, statusField, onIdClick, onStatusClick, user?.role]);

  const handleSelectionChange = (newSelectionModel: any) => {
    // console.log("Raw selection model:", newSelectionModel);

    if (!checkboxSelection || !setSelectedRows) return;

    let selectedIds: string[] = [];

    // MUI v6+ selection model
    if (
      newSelectionModel &&
      typeof newSelectionModel === "object" &&
      "ids" in newSelectionModel
    ) {
      if (newSelectionModel.type === "exclude") {
        // All rows are selected except those in ids
        selectedIds = rows
          .map((row) => String(row[rowIdField]))
          .filter((id) => !newSelectionModel.ids.has(id));
      } else {
        // Only rows in ids are selected
        selectedIds = Array.from(newSelectionModel.ids).map(String);
      }
    }
    // MUI v5 selection model (array)
    else if (Array.isArray(newSelectionModel)) {
      selectedIds = (newSelectionModel as (string | number)[]).map(String);
    }

    const selectedData = rows.filter((row) =>
      selectedIds.includes(String(row[rowIdField]))
    );

    // console.log("Selected rows data:", selectedData);
    setSelectedRows(selectedData);
  };

  return (
    <div
      className={`flex flex-col w-[92vw]  md:w-full min-h-124 max-md:min-h-160 max-lg:min-h-280 2xl:min-h-[86vh] ${className}`}
    >
      <div className=" bg-white shadow-md rounded-lg min-h-[78vh] max-md:min-h-160 max-lg:min-h-280 2xl:min-h-[86vh]">
        <DataGrid
          rows={paginatedRows}
          columns={enhancedColumns}
          checkboxSelection={checkboxSelection}
          disableRowSelectionOnClick
          disableColumnMenu
          hideFooterPagination
          rowHeight={rowHeight}
          getRowId={(row) => String(row[rowIdField] ?? "")}
          localeText={{ noRowsLabel: "No Records Found" }}
          onRowSelectionModelChange={handleSelectionChange}
          rowSelectionModel={rowSelectionModel}
          onRowClick={(params) => onRowClick && onRowClick(params.row)}
          sx={{
            backgroundColor: "white",
            border: 0,
            zIndex: 1,
            position: "relative",

            "& .MuiDataGrid-overlay": {
              padding: "20px !important",
              fontSize: "1rem",
              color: "gray",
              marginBottom: "1.5rem",
            },

            "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-cell:focus-within":
              {
                outline: "none !important",
              },

            // Force full width for all grid containers on desktop
            "& .MuiDataGrid-main": {
              width: "100% !important",
              maxWidth: "100% !important",
            },
            "& .MuiDataGrid-virtualScroller": {
              width: "100% !important",
            },
            "& .MuiDataGrid-virtualScrollerContent": {
              width: "100% !important",
            },
            "& .MuiDataGrid-columnHeadersInner": {
              width: "100% !important",
            },

            "@media (max-width: 800px)": {
              width: "100% !important",
              overflowX: "auto",

              "& .MuiDataGrid-overlay": {
                padding: "20px !important",
                fontSize: "1rem",
                color: "gray",
                marginBottom: "1.5rem",
              },

              "& .MuiDataGrid-main": {
                width: "100% !important",
                maxWidth: "100% !important",
              },

              "& .MuiDataGrid-row": {
                maxHeight: "36px !important",
                minHeight: "36px !important",
              },
              "& .MuiDataGrid-cell": {
                maxHeight: "35px !important",
                minHeight: "35px !important",
                padding: "4px 4px !important",
                fontSize: "0.8rem !important",
                overflow: "visible !important",
              },

              "& .MuiDataGrid-columnHeaders": {
                minHeight: "30px !important",
                maxHeight: "30px !important",
                fontSize: "0.9rem !important",
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontSize: "0.9rem !important",
              },

              "& .MuiDataGrid-virtualScroller": {
                width: "max-content !important",
                overflowX: "auto !important",
              },
              "& .MuiDataGrid-virtualScrollerContent": {
                width: "max-content !important",
              },
              // "& .MuiDataGrid-main": {
              //   width: "max-content !important",
              // },
              '& .MuiDataGrid-columnHeader:not([data-field="__check__"]), & .MuiDataGrid-cell:not([data-field="__check__"])':
                {
                  minWidth: "150px !important",
                  maxWidth: "280px !important",
                },
              '& [data-field="__check__"]': {
                minWidth: "50px !important",
                maxWidth: "50px !important",
                padding: "0 !important",
                left: "0 !important",
                justifyContent: "center !important",
              },
              "& .MuiDataGrid-checkboxInput": {
                padding: "0 !important",
                margin: "0 auto !important",
              },
              // ✅ Make last column take more width
              "& .MuiDataGrid-columnHeader:last-of-type, & .MuiDataGrid-cell:last-of-type":
                {
                  minWidth: "160px !important", // adjust as needed
                  maxWidth: "auto !important",
                  // flexGrow: 1,
                },

              "& .MuiDataGrid-scrollbarFiller--header": {
                backgroundColor: "gray !important", // ✅ header filler gray
              },

              // ✅ Hide the empty "ghost" cells
              "& .MuiDataGrid-cellEmpty": {
                display: "none !important",
                width: 0,
                padding: 0,
                margin: 0,
              },
              "& .MuiDataGrid-columnHeader--empty": {
                display: "none !important",
              },
              "& .MuiDataGrid-cellContent": {
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              },
            },

            "& .MuiDataGrid-scrollbarFiller--header": {
              backgroundColor: "gray !important", // ✅ header filler gray
            },

            "& .MuiDataGrid-cell:focus-within": {
              outline: "none !important",
            },

            // "& .MuiDataGrid-virtualScroller": {
            //   scrollbarWidth: "none",
            //   msOverflowStyle: "none",
            // },
            "& .MuiDataGrid-virtualScroller::-webkit-scrollbar": {
              display: "none",
            },
            "& .MuiDataGrid-scrollbarContent": {
              display: "none",
            },

            "& .MuiDataGrid-row": {
              fontSize: "0.8rem",
              maxHeight: "35px !important",
              minHeight: "35px !important",
              // "&:hover": {
              //   backgroundColor: "#e0f7fa",
              // },
            },
            "& .MuiDataGrid-sortIcon": {
              color: "white",
              fontSize: "16px",
              transform: "rotate(180deg)",
            },
            "& .MuiDataGrid-row--borderBottom .MuiSvgIcon-fontSizeMedium": {
              color: "white",
              border: 0,
              outline: 0,
            },
            "& .MuiDataGrid-columnHeader .MuiCheckbox-root .MuiSvgIcon-root": {
              color: "white !important",
            },
            "& .MuiDataGrid-columnHeaderCheckbox .MuiSvgIcon-root": {
              color: "#ffffff !important",
            },
            "& .MuiSvgIcon-root .MuiSvgIcon-fontSizeMedium": {
              color: "white",
              border: 0,
              outline: 0,
            },
            "& .MuiDataGrid-columnHeader .MuiCheckbox-root": {
              color: "white",
            },
            "& .MuiDataGrid-columnHeader .Mui-checked": {
              color: "white",
            },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "gray !important",
              color: "white !important",
              fontWeight: "bold",
              fontSize: "0.8rem",
              height: "2.5rem",
              margin: "0",
              minHeight: "35px",
              maxHeight: "35px",
              // width: "100% !important",
              // border:"1px solid black",
            },
            "& .MuiDataGrid-columnHeaderCheckbox .MuiCheckbox-root .MuiSvgIcon-root":
              {
                color: "#ffffff !important",
              },
            "& .MuiDataGrid-columnHeaderCheckbox svg": {
              color: "white !important",
            },
            "& .MuiDataGrid-columnHeaderCheckbox .MuiCheckbox-root:not(.Mui-checked) .MuiSvgIcon-root":
              {
                color: "white !important",
              },

            "& .MuiDataGrid-columnHeader": {
              backgroundColor: "gray",
              color: "white",
              fontWeight: "bold",
              fontSize: "0.9rem",
              minHeight: "35px !important",
              maxHeight: "35px !important",
              // flex: 1,
              // border:"1px solid black",
            },
            "& .MuiDataGrid-cell": {
              maxHeight: "35px !important",
              minHeight: "35px !important",
              padding: "1px 8px !important",
              outline: "none",
              whiteSpace: "nowrap !important", // ✅ single line
              overflow: "hidden !important", // ✅ cut off extra
              textOverflow: "ellipsis !important", // ✅ ellipsis
            },
            "& .MuiDataGrid-cellContent": {
              fontSize: "0.8rem !important",
              whiteSpace: "nowrap !important", // ✅ same inside content span
              overflow: "hidden !important",
              textOverflow: "ellipsis !important",
              outline: "none",
            },
            "& .MuiDataGrid-columnHeader:focus-within": {
              outline: "none",
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: "bold",
              flex: 1,
            },
            "& .MuiDataGrid-row--borderBottom": {
              background: "gray !important",
              fontWeight: "bold",
              height: "2rem",
            },
            "& .MuiDataGrid-row:hover": {
              backgroundColor: "#e6e6e6",
              transform: "scale(1.005)",
              transition: "all 0.2s ease-in-out",
            },
            "& .MuiDataGrid-footerContainer": {
              display: "none",
              borderBottomLeftRadius: "1rem",
              borderBottomRightRadius: "1rem",
            },
            "& .MuiDataGrid-cell .MuiSvgIcon-root": {
              color: "gray",
            },
            "& .MuiCheckbox-root:not(.Mui-checked) .MuiSvgIcon-root": {
              color: "grey !important",
            },
            "& .MuiDataGrid-root": {
              zIndex: 1,
            },
            "& .MuiTooltip-popper": {
              zIndex: 999,
            },
            "& .MuiDataGrid-checkboxInput": {
              padding: "5px !important",
            },
            // "& .MuiDataGrid-cellContent": {
            //   fontSize: "0.8rem !important",
            //   outline: "none",
            // },
          }}
          className="
    w-full
    h-full
    [&_.MuiDataGrid-virtualScroller]:overflow-x-auto
    [&_.MuiDataGrid-columnHeader]:sticky
    [&_.MuiDataGrid-columnHeader]:top-0
    [&_.MuiDataGrid-columnHeader]:z-0
  "
        />
      </div>
    </div>
  );
}
