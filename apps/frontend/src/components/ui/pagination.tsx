'use client';

import { Button } from './button';
import type { PaginationMeta } from '@/lib/types';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  if (meta.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
      <p className="text-sm text-gray-700">
        Page {meta.page} of {meta.totalPages} ({meta.totalItems} total)
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!meta.hasPreviousPage}
          onClick={() => onPageChange(meta.page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!meta.hasNextPage}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
