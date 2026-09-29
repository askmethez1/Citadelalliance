"use client";

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  itemLabel?: string;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  itemLabel = "items",
  className = ""
}: PaginationProps) {
  if (totalPages <= 1 && totalItems === undefined) return null;

  const startItem = itemsPerPage && totalItems !== undefined ? (currentPage - 1) * itemsPerPage + 1 : null;
  const endItem = itemsPerPage && totalItems !== undefined ? Math.min(currentPage * itemsPerPage, totalItems) : null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 ${className}`}>
      {totalItems !== undefined && startItem !== null && endItem !== null ? (
        <div>
          Showing <b className="text-white">{startItem}</b> to <b className="text-white">{endItem}</b> of <b className="text-white">{totalItems}</b> {itemLabel}
        </div>
      ) : (
        <div>
          Page <b className="text-white">{currentPage}</b> of <b className="text-white">{totalPages}</b>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="p-2 bg-[#0B0E14] border border-white/10 rounded-lg text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Previous Page"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => (
            typeof page === 'number' ? (
              <button
                key={index}
                onClick={() => onPageChange(page)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                  currentPage === page
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-[#0B0E14] text-gray-400 hover:text-white border border-white/5'
                }`}
              >
                {page}
              </button>
            ) : (
              <span key={index} className="px-1 text-gray-600 select-none">
                ...
              </span>
            )
          ))}
        </div>

        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="p-2 bg-[#0B0E14] border border-white/10 rounded-lg text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Next Page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}