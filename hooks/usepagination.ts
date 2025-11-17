import { useState } from "react";

interface UsePaginationProps {
  totalItems: number;
  itemsPerPage?: number;
  initialPage?: number;
  onPageChange?: (page: number, offset: number, limit: number) => void;
}

const usePagination = ({
  totalItems,
  itemsPerPage = 12,
  initialPage = 1,
  onPageChange,
}: UsePaginationProps) => {
  const [currentPage, setCurrentPage] = useState(initialPage);

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const updatePage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    const offset = (validPage - 1) * itemsPerPage;

    setCurrentPage(validPage);

    if (onPageChange) {
      onPageChange(validPage, offset, itemsPerPage);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) updatePage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) updatePage(currentPage - 1);
  };

  const goToPage = (page: number) => updatePage(page);

  const startItem =
    totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;

  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  return {
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    startItem,
    endItem,
    isFirstPage,
    isLastPage,
  };
};

export default usePagination;
