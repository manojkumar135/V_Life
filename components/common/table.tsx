"use client";
import {
  DataGrid,
  GridRowSelectionModel,
  GridCallbackDetails,
} from "@mui/x-data-grid";
import Pagination from "@/components/common/pagination";
import { useState } from "react";

interface TableProps {
  columns: any[];
  rows: any[];
  rowIdField: string;
  pageSize?: number;
  className?: string;
  rowHeight?: number;
  onRowClick?: (row: any) => void;
  checkboxSelection?: boolean;
  rowSelectionModel?: GridRowSelectionModel;
  setRowSelectionModel?: (selected: GridRowSelectionModel) => void;
  setSelectedRows?: (rows: any[]) => void;
  processedRows?: any[];
}

export default function Table({
  columns,
  rows,
  rowIdField,
  pageSize = 10,
  className = "",
  rowHeight = 60,
  onRowClick,
  checkboxSelection = false,
  rowSelectionModel,
  setRowSelectionModel,
  setSelectedRows,
  processedRows = [],
}: TableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalEntries = rows.length;
  const paginatedRows = rows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSelectionChange = (
    newSelectionModel: GridRowSelectionModel,
    details: GridCallbackDetails<any>
  ) => {
    if (!checkboxSelection || !setRowSelectionModel || !setSelectedRows) return;

    setRowSelectionModel(newSelectionModel);

    // Safe conversion to string array
    const selectedIds: string[] = [];
    if (Array.isArray(newSelectionModel)) {
      newSelectionModel.forEach((id) => selectedIds.push(String(id)));
    }

    const selectedData = selectedIds
      .map((id) => processedRows.find((row) => String(row[rowIdField]) === id))
      .filter((row): row is any => row !== undefined);

    setSelectedRows(selectedData);
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* DataGrid */}
      <div className="overflow-x-auto bg-white shadow rounded-lg flex-grow h-[500px]">
        <DataGrid
          rows={paginatedRows}
          columns={columns}
          checkboxSelection={checkboxSelection}
          disableColumnFilter
          disableColumnMenu
          hideFooterPagination
          rowHeight={40}
          getRowId={(row) => String(row[rowIdField] ?? "")}
          localeText={{ noRowsLabel: "No records found" }}
          onRowSelectionModelChange={handleSelectionChange}
          rowSelectionModel={rowSelectionModel}
          onRowClick={(params) => onRowClick && onRowClick(params.row)}
          sx={{
            backgroundColor: "white",
            border: 0,
            zIndex: 1,
            position: "relative",
            "@media (max-width: 700px)": {
              width: "100%",
              minWidth: "100%",
              textOverflow: "ellipsis",
              "& .MuiDataGrid-virtualScroller": {
                minWidth: "100% !important",
                overflowX: "auto !important",
                ...(processedRows.length > 0 && { marginRight: "-8.8rem" }),
              },
              "& .MuiDataGrid-virtualScrollerContent": {
                width: "auto !important",
              },
              '& .MuiDataGrid-columnHeader:not([data-field="__check__"]), & .MuiDataGrid-cell:not([data-field="__check__"])':
                {
                  minWidth: "130px !important",
                  maxWidth: "250px !important",
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
            },
            "& .MuiDataGrid-virtualScroller": {
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            },
            "& .MuiDataGrid-virtualScroller::-webkit-scrollbar": {
              display: "none",
            },
            "& .MuiDataGrid-scrollbarContent": {
              display: "none",
            },
            "& .MuiDataGrid-row": {
              fontSize: "0.8rem",
              maxHeight: "40px !important",
              minHeight: "40px !important",
              "&:hover": {
                backgroundColor: "#e0f7fa",
              },
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
              backgroundColor: "#026902 !important",
              color: "white !important",
              fontWeight: "bold",
              fontSize: "0.8rem",
              height: "2.5rem",
              margin: "0",
              minHeight: "35px",
              maxHeight: "35px",
            },
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: "gray",
              color: "white",
              fontWeight: "bold",
              fontSize: "0.9rem",
              minHeight: "35px !important",
              maxHeight: "35px !important",
            },
            "& .MuiDataGrid-cell": {
              maxHeight: "35px !important",
              minHeight: "35px !important",
              padding: "5px 8px !important",
              outline: "none",
            },
            "& .MuiDataGrid-columnHeader:focus-within": {
              outline: "none",
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: "bold",
            },
            "& .MuiDataGrid-row--borderBottom": {
              background: "#026902 !important",
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
              color: "#026902",
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
            "& .MuiDataGrid-cellContent": {
              fontSize: "0.75rem !important",
              outline: "none",
            },
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

      {/* Pagination */}
      {/* <Pagination
        totalEntries={totalEntries}
        entriesPerPage={pageSize}
        currentPage={currentPage}
        onPageChange={handlePageChange}
      /> */}
    </div>
  );
}
