"use client";
import {
  DataGrid,
  GridRowSelectionModel,
  GridColDef,
  GridSortModel,
  GridColumnHeaderParams,
} from "@mui/x-data-grid";
import { useMemo, useState, useEffect, MouseEvent } from "react";
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
  sortModel?: GridSortModel;
  onSortModelChange?: (model: GridSortModel) => void;
  currentPage?: number;
  setCurrentPage?: (p: number) => void;
}

// status color types
type StatusColor = "green" | "red" | "orange" | "black";
type SortCycleStep = StatusColor | "default";

// cycle definition: 1→green, 2→red, 3→orange, 4→black, 5→default, 6→repeat
const SORT_CYCLE: SortCycleStep[] = ["green", "red", "orange", "black", "default"];

/**
 * Robust helper: normalize text
 */
function norm(s: any): string {
  return String(s ?? "").trim().toLowerCase();
}

/**
 * Determine the color of a row based on status and status_notes fields.
 * - GREEN → status ∈ {"active","available","paid","true","yes"}
 * - RED → otherwise
 * - ORANGE → GREEN + status_notes === "activated by admin"
 * - BLACK → RED + status_notes === "deactivated by admin"
 */
function getStatusColor(row: any, statusField?: string): StatusColor {
  const statusValue = norm(row?.[statusField ?? ""]);
  const statusNotes = norm(row?.status_notes);

  const isActive =
    statusValue === "active" ||
    statusValue === "available" ||
    statusValue === "paid" ||
    statusValue === "true" ||
    statusValue === "yes";

  if (isActive) {
    if (statusNotes === "activated by admin") return "orange";
    return "green";
  } else {
    if (statusNotes === "deactivated by admin") return "black";
    return "red";
  }
}

/**
 * Convert a prioritized color into a stable numeric weight for sorting.
 * When priorityColor === null/"default" -> uses baseline order: green, red, orange, black
 * When priorityColor is set -> that color is weight 0 (top), others follow in baseline order.
 */
function getStatusWeight(
  row: any,
  statusField?: string,
  priorityColor: SortCycleStep = "default"
): number {
  const color = getStatusColor(row, statusField);

  const baseline: StatusColor[] = ["green", "red", "orange", "black"];

  if (priorityColor === "default") {
    return baseline.indexOf(color);
  }

  // create order with priorityColor first, then the rest in baseline order preserving relative order
  const ordered: StatusColor[] = [
    priorityColor as StatusColor,
    ...baseline.filter((c) => c !== (priorityColor as StatusColor)),
  ];

  return ordered.indexOf(color);
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
  sortModel: sortModelProp,
  onSortModelChange,
  currentPage: currentPageProp,
  setCurrentPage: setCurrentPageProp,
}: TableProps<T>) {
  const { user } = useVLife();

  const [internalPage, setInternalPage] = useState(1);
  const currentPage =
    typeof currentPageProp === "number" ? currentPageProp : internalPage;
  const setCurrentPage = (p: number) => {
    if (typeof setCurrentPageProp === "function") setCurrentPageProp(p);
    else setInternalPage(p);
  };

  const safeRows = Array.isArray(rows) ? rows : [];

  // local sort model to show MUI indicator
  const [sortModelLocal, setSortModelLocal] = useState<GridSortModel>(
    sortModelProp ? [...sortModelProp] : []
  );
  useEffect(() => {
    if (sortModelProp) setSortModelLocal([...sortModelProp]);
  }, [sortModelProp]);

  // status cycle state
  const [statusSortCycle, setStatusSortCycle] = useState<SortCycleStep>("default");

  // enhance columns: status render + comparator (DataGrid comparator kept but we do global sort before pagination)
  const enhancedColumns: GridColDef[] = useMemo(() => {
    return columns.map((col, idx) => {
      const isIdCol = col.field === rowIdField || idx === 0;
      const isStatusCol = Boolean(statusField && col.field === statusField);

      const defaultRenderer = (params: any) => {
        const value = params.value;
        return value === null || value === undefined || value === "" || value === "none"
          ? "-"
          : value;
      };

      if (!isIdCol && !isStatusCol) {
        return {
          ...col,
          renderCell: col.renderCell ?? defaultRenderer,
        };
      }

      return {
        ...col,
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
                  color: params.field === "transaction_id" ? "black" : "#0000EE",
                  textDecoration:
                    params.field === "transaction_id" ? "none" : "underline",
                  cursor: params.field === "transaction_id" ? "default" : "pointer",
                }}
              >
                {value === null || value === undefined || value === "" ? "-" : value}
              </button>
            );
          }

          if (isStatusCol) {
            const raw = norm(value);
            const isActive =
              raw === "active" ||
              raw === "available" ||
              raw === "paid" ||
              raw === "true" ||
              raw === "yes";

            const statusNotes = norm(params.row?.status_notes);
            const Icon = isActive ? GrStatusGood : MdCancel;

            let iconColor = isActive ? "green" : "red";
            if (user?.role === "admin") {
              if (isActive && statusNotes === "activated by admin") iconColor = "orange";
              else if (!isActive && statusNotes === "deactivated by admin") iconColor = "black";
            }

            return (
              <button
                type="button"
                title={isActive ? statusNotes || "Active" : statusNotes || "Inactive"}
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

          return value === null || value === undefined || value === "" ? "-" : value;
        },
        // keep comparator defensive — unused for global sort but helpful for client behavior
        sortComparator: (v1, v2, cell1, cell2) => {
          try {
            const r1 = cell1.api.getRow(cell1.id);
            const r2 = cell2.api.getRow(cell2.id);
            const w1 = getStatusWeight(r1, statusField, statusSortCycle);
            const w2 = getStatusWeight(r2, statusField, statusSortCycle);
            return w1 - w2;
          } catch {
            return 0;
          }
        },
      };
    });
  }, [columns, rowIdField, statusField, onIdClick, onStatusClick, user?.role, statusSortCycle]);

  // Global sorting applied to full dataset BEFORE pagination
  const sortedRows = useMemo(() => {
    // if cycle is default -> honor non-status column sort if provided by user
    if (statusSortCycle === "default") {
      if (sortModelLocal && sortModelLocal.length > 0) {
        const item = sortModelLocal[0];
        const field = String(item.field);
        const dir = item.sort === "asc" ? 1 : -1;
        return [...safeRows].sort((a, b) => {
          const va = a[field];
          const vb = b[field];
          if (va == null && vb == null) return 0;
          if (va == null) return -1 * dir;
          if (vb == null) return 1 * dir;
          if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
          return String(va).localeCompare(String(vb)) * dir;
        });
      }
      return safeRows;
    }

    // When a priority color is active, build ordered list with that color first
    const ordered: StatusColor[] = [
      statusSortCycle as StatusColor,
      ...["green", "red", "orange", "black"].filter((c) => c !== statusSortCycle),
    ] as StatusColor[];

    // map color -> weight index
    const idxMap = new Map<StatusColor, number>();
    ordered.forEach((c, i) => idxMap.set(c, i));

    return [...safeRows].sort((a, b) => {
      const ca = getStatusColor(a, statusField);
      const cb = getStatusColor(b, statusField);
      const wa = idxMap.get(ca) ?? 99;
      const wb = idxMap.get(cb) ?? 99;
      if (wa !== wb) return wa - wb;
      // stable tie-breaker: use user_id or rowId to keep deterministic order
      const ida = String(a[rowIdField] ?? "");
      const idb = String(b[rowIdField] ?? "");
      return ida.localeCompare(idb);
    });
  }, [safeRows, statusSortCycle, sortModelLocal, statusField, rowIdField]);

  const paginatedRows = useMemo(
    () => sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sortedRows, currentPage, pageSize]
  );

  useEffect(() => {
    // reset to first page when source rows change
    setCurrentPage(1);
  }, [rows]);

  const handleSelectionChange = (newSelectionModel: any) => {
    if (!checkboxSelection || !setSelectedRows) return;
    let selectedIds: string[] = [];

    if (newSelectionModel && typeof newSelectionModel === "object" && "ids" in newSelectionModel) {
      if (newSelectionModel.type === "exclude") {
        selectedIds = rows.map((row) => String(row[rowIdField])).filter((id) => !newSelectionModel.ids.has(id));
      } else {
        selectedIds = Array.from(newSelectionModel.ids).map(String);
      }
    } else if (Array.isArray(newSelectionModel)) {
      selectedIds = (newSelectionModel as (string | number)[]).map(String);
    }

    const selectedData = rows.filter((row) => selectedIds.includes(String(row[rowIdField])));
    setSelectedRows(selectedData);
  };

  // Intercept header clicks to implement strict 5-step cycle for status column
  const handleColumnHeaderClick = (params: GridColumnHeaderParams, event: MouseEvent) => {
    if (!statusField) return;
    if (params.field === statusField) {
      event.preventDefault();
      const curr = SORT_CYCLE.indexOf(statusSortCycle);
      const next = (curr + 1) % SORT_CYCLE.length;
      const nextCycle = SORT_CYCLE[next];
      setStatusSortCycle(nextCycle);

      // update visible sort indicator: empty when default, else asc (we use a fixed asc indicator)
      const newSortModel: GridSortModel = nextCycle === "default" ? [] : [{ field: statusField!, sort: "asc" }];
      setSortModelLocal(newSortModel);
      onSortModelChange?.(newSortModel);
      setCurrentPage(1);
    }
  };

  // When user sorts other columns via DataGrid, reset the status cycle
  const handleSortModelChange = (model: GridSortModel) => {
    if (!model || model.length === 0) {
      setSortModelLocal([]);
      setStatusSortCycle("default");
      onSortModelChange?.(model);
      setCurrentPage(1);
      return;
    }
    const first = model[0];
    if (first.field !== statusField) {
      setSortModelLocal([...model]);
      setStatusSortCycle("default");
      onSortModelChange?.(model);
      setCurrentPage(1);
      return;
    }
    // if status-field model change originates from grid, just sync the local model
    setSortModelLocal([...model]);
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
          // disableColumnMenu={false}
          rowSelectionModel={rowSelectionModel}
          onRowClick={(params) => onRowClick && onRowClick(params.row)}
          sortingMode="client"
         sortModel={
            statusSortCycle !== "default" && statusField
              ? [{ field: statusField, sort: "asc" }]
              : []
          }
          onSortModelChange={handleSortModelChange}
          onColumnHeaderClick={handleColumnHeaderClick}
          
          sx={{
            backgroundColor: "white",
            border: 0,
            zIndex: 1,
            position: "relative",

            "& .MuiDataGrid-iconButtonContainer .MuiSvgIcon-root": {
              color: "#ffffff", // white dots
            },
            "& .MuiDataGrid-menuIconButton .MuiSvgIcon-root": {
              color: "#ffffff", // white dots on hover/focus
            },

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
