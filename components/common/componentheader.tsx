"use client";

import React from "react";
import { IoArrowBackOutline } from "react-icons/io5";
import {
  MdOutlineSearch,
  MdKeyboardArrowLeft,
  MdKeyboardArrowRight,
} from "react-icons/md";
import { MdOutlineMoreVert } from "react-icons/md";
import { useRouter } from "next/navigation";

interface HeaderWithActionsProps {
  title: string;
  search?: string;
  setSearch?: (e:React.ChangeEvent<HTMLInputElement>) => void;
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
    <div className="flex items-center sm:pt-0  h-9 mb-1 py-1">
      {/* Left: Back + Title */}
      <div className="flex flex-row justify-start items-center">
        {showBack && (
          <IoArrowBackOutline
            size={25}
            color="black"
            className="ml-0 mr-3 mt-1 max-sm:!mt-0 max-sm:mr-1 cursor-pointer z-20"
            onClick={handleBack}
          />
        )}
        <p className="text-[1.6rem] max-md:text-[1rem] font-medium text-green-900 m-0">
          {title}
        </p>
      </div>

      {/* Right: Search + Add + More + Pagination */}
      <div className="flex flex-1  justify-end items-center  h-full  gap-3">
        {/* Pagination Controls */}
        {showPagination && (
          <div className="flex items-center h-full gap-2">
            <h3 className="border-2 border-transparent px-2 py-1 rounded-lg cursor-default font-semibold text-sm">
              {`${startItem}-${endItem} of ${totalItems}`}
            </h3>
            <div className="flex items-center gap-2 text-xl">
              <button
                type="button"
                className={`cursor-pointer p-1 rounded-full hover:bg-yellow-300 ${
                  currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={onPrev}
                disabled={currentPage === 1}
              >
                <MdKeyboardArrowLeft />
              </button>
              <button
                type="button"
                className={`cursor-pointer p-1 rounded-full hover:bg-yellow-300 ${
                  currentPage === totalPages
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                onClick={onNext}
                disabled={currentPage === totalPages}
              >
                <MdKeyboardArrowRight />
              </button>
            </div>
          </div>
        )}
        {/* Search */}
        {setSearch && (
          <div className="relative max-w-xs h-full">
            <input
              type="text"
              value={search}
              onChange={setSearch}
              placeholder="Search"
              className="pl-10 pr-4 rounded-md h-full border border-gray-500 focus:outline-none w-full"
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
            className="bg-yellow-300 hover:bg-yellow-400 text-black px-4 py-1.5 font-semibold text-sm rounded-md whitespace-nowrap h-full"
          >
            {addLabel}
          </button>
        )}

        {/* More Options */}
        {showMoreOptions && (
          <div className="cursor-pointer border-[1.5px] border-black/30 rounded h-full flex items-center " onClick={onMore}>
            <MdOutlineMoreVert  size={24} className="text-gray-600" />
          </div>
        )}
      </div>
    </div>
  );
};

export default HeaderWithActions;
