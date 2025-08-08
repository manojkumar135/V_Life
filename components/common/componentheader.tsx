"use client";

import React from "react";
import { IoIosArrowBack } from "react-icons/io";
import {
  MdOutlineSearch,
  MdKeyboardArrowLeft,
  MdKeyboardArrowRight,
} from "react-icons/md";
import { MdOutlineMoreVert } from "react-icons/md";
import { IoMdAdd } from "react-icons/io";

import { useRouter } from "next/navigation";

interface HeaderWithActionsProps {
  title: string;
  search?: string;
  setSearch?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showAddButton?: boolean;
  addLabel?: string;
  onAdd?: () => void;
  showMoreOptions?: boolean;
  onMore?: () => void;
  showBack?: boolean;
  onBack?: () => void;

  // Pagination
  showPagination?: boolean;
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  startItem?: number;
  endItem?: number;
  onNext?: () => void;
  onPrev?: () => void;
}

const HeaderWithActions: React.FC<HeaderWithActionsProps> = ({
  title,
  search = "",
  setSearch,
  showAddButton,
  addLabel = "+ ADD",
  onAdd,
  showMoreOptions = true,
  onMore,
  showBack,
  onBack,

  showPagination = true,
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  startItem = 0,
  endItem = 0,
  onNext,
  onPrev,
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  return (
 <div className="flex flex-col md:flex-row w-full gap-2 mb-2">
  {/* Row 1: Back + Title + Pagination */}
  <div className="flex justify-between items-center w-full">
    {/* Left: Back + Title */}
    <div className="flex items-center gap-2">
      {showBack && (
        <IoIosArrowBack 
          size={22}
          color="black"
          className="cursor-pointer"
          onClick={handleBack}
        />
      )}
      <p className="text-[1.6rem] max-md:text-[1.2rem] font-medium text-green-900 m-0">
        {title}
      </p>
    </div>

    {/* Right: Pagination */}
    {showPagination && (
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold whitespace-nowrap">
          {`${startItem}-${endItem} of ${totalItems}`}
        </h3>
        <button
          type="button"
          className={`p-1 rounded-full hover:bg-yellow-300 ${
            currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={onPrev}
          disabled={currentPage === 1}
        >
          <MdKeyboardArrowLeft size={20} />
        </button>
        <button
          type="button"
          className={`p-1 rounded-full hover:bg-yellow-300 ${
            currentPage === totalPages ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={onNext}
          disabled={currentPage === totalPages}
        >
          <MdKeyboardArrowRight size={20} />
        </button>
      </div>
    )}
  </div>

  {/* Row 2: Search + Add + More Options */}
  <div className="flex justify-end items-center flex-wrap gap-2 w-full xl:w-[70%]">
    {/* Search */}
    {setSearch && (
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <input
          type="text"
          value={search}
          onChange={setSearch}
          placeholder="Search"
          className="pl-10 pr-4 rounded-md h-8 border border-gray-500 focus:outline-none w-full"
        />
        <MdOutlineSearch
          className="absolute left-3 top-2 text-gray-500"
          size={20}
        />
      </div>
    )}

    {/* Add Button */}
    {showAddButton && (
      <button
        onClick={onAdd}
        className="bg-yellow-300 hover:bg-yellow-400 text-black px-4 max-lg:px-2 py-1.5 max-lg:py-1 font-semibold text-sm rounded-md h-8 flex items-center justify-center"
      >
        <span className="block lg:hidden">
          <IoMdAdd size={18} />
        </span>
        <span className="hidden lg:block">{addLabel}</span>
      </button>
    )}

    {/* More Options */}
    {showMoreOptions && (
      <div
        className="cursor-pointer border-[1.5px] border-black/30 rounded h-8 w-8 flex items-center justify-center"
        onClick={onMore}
      >
        <MdOutlineMoreVert size={20} className="text-gray-600" />
      </div>
    )}
  </div>
</div>





  );
};

export default HeaderWithActions;
