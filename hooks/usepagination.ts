import { useState } from "react";

interface UsePaginationProps {
  totalItems: number;
  itemsPerPage?: number;
  initialPage?: number;
  onPageChange: (page: number, offset: number, limit: number) => void;
}

const usePagination = ({
  totalItems,
  itemsPerPage = 20,
  initialPage = 1,
  onPageChange,
}: UsePaginationProps) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const updatePage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    const offset = (validPage - 1) * itemsPerPage;
    setCurrentPage(validPage);
    onPageChange(validPage, offset, itemsPerPage);
  };

  const nextPage = () => {
    if (currentPage < totalPages) updatePage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) updatePage(currentPage - 1);
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return {
    currentPage,
    totalPages,
    itemsPerPage,
    startItem,
    endItem,
    nextPage,
    prevPage,
    goToPage: updatePage,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages,
  };
};

export default usePagination;
