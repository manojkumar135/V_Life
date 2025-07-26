import { GrFormPreviousLink, GrFormNextLink } from "react-icons/gr";

interface PaginationProps {
  totalEntries: number;
  entriesPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({
  totalEntries,
  entriesPerPage,
  currentPage,
  onPageChange,
}: PaginationProps) => {
  const totalPages = Math.ceil(totalEntries / entriesPerPage);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const renderPageNumbers = () => {
    const pages: React.ReactElement[] = [];  // Changed to React.ReactElement
    const maxButtons = 5;

    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <button
            key={i}
            onClick={() => handlePageChange(i)}
            className={`px-3 py-1 mx-1 !rounded-lg transition-colors ${
              currentPage === i
                ? "bg-yellow-500 text-black"
                : "bg-gray-200 hover:bg-gray-300 max-sm:mx-3"
            }`}
          >
            {i}
          </button>
        );
      }
    } else {
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      // First page button
      pages.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          className={`px-3 py-1 mx-1 rounded-md transition-colors ${
            currentPage === 1
              ? "bg-[#026902] text-white"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          1
        </button>
      );

      // Left ellipsis if needed
      if (start > 2) {
        pages.push(
          <span key="ellipsis-start" className="px-3 py-1 text-gray-500">
            ...
          </span>
        );
      }

      // Middle range buttons
      for (let i = start; i <= end; i++) {
        pages.push(
          <button
            key={i}
            onClick={() => handlePageChange(i)}
            className={`px-3 py-1 mx-1 rounded-md transition-colors ${
              currentPage === i
                ? "bg-[#026902] text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {i}
          </button>
        );
      }

      // Right ellipsis if needed
      if (end < totalPages - 1) {
        pages.push(
          <span key="ellipsis-end" className="px-3 py-1 text-gray-500">
            ...
          </span>
        );
      }

      // Last page button
      pages.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className={`px-3 py-1 mx-1 rounded-md transition-colors ${
            currentPage === totalPages
              ? "bg-[#026902] text-white"
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  const getDisplayedEntries = (): string => {
    const start = (currentPage - 1) * entriesPerPage + 1;
    const end = Math.min(currentPage * entriesPerPage, totalEntries);
    return `${start}-${end}`;
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-center w-full p-1 mt-auto gap-4 max-sm:gap-2 max-sm:p-0 max-sm:h-[4vh] h-[7vh]">
      <p className="max-sm:text-[0.8rem] text-base font-medium">
        Showing {getDisplayedEntries()} of {totalEntries} entries
      </p>
      <div className="flex items-center">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`flex items-center justify-center px-4 py-1 max-sm:px-1 max-sm:py-0 
            !rounded-md max-sm:w-2 w-24 mx-2 shadow-2xl
            transition-colors duration-200 text-sm font-medium
            ${
              currentPage === 1
                ? "bg-gray-200 opacity-50 cursor-not-allowed"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
        >
          <span className="md:hidden">
            <GrFormPreviousLink className="w-5 h-5 my-1" />
          </span>
          <span className="hidden md:inline">Previous</span>
        </button>

        {renderPageNumbers()}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`flex items-center justify-center px-4 py-1 max-sm:px-1 max-sm:py-0 
            !rounded-md max-sm:w-2 w-24 mx-2 shadow-2xl
            transition-colors duration-200 text-sm font-medium
            ${
              currentPage === totalPages
                ? "bg-gray-200 opacity-50 cursor-not-allowed"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
        >
          <span className="md:hidden">
            <GrFormNextLink className="w-5 h-5 my-1" />
          </span>
          <span className="hidden md:inline">Next</span>
        </button>
      </div>
    </div>
  );
};

export default Pagination;