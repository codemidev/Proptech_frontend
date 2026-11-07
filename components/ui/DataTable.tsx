"use client";

import {
  useEffect,
  useMemo,
  useRef,
} from "react";

import type {
  DataTableColumn,
  DataTableProps,
  DataTableSort,
} from "../../types/ui";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function DataTable<T>(props: DataTableProps<T>) {
  const {
    columns,
    getRowId,
    data = [],
    state = "ready",
    ariaLabel = "Data table",
    caption,
    selectable = false,
    selection,
    sortable = false,
    sort,
    onSortChange,
    stickyHeader = false,
    className,
  } = props;
  const selectedIds = useMemo(
    () => selection?.selectedIds ?? [],
    [selection?.selectedIds],
  );

  const selectedRows = useMemo(
    () =>
      data.filter((row) =>
        selectedIds.includes(getRowId(row)),
      ),
    [data, getRowId, selectedIds],
  );

  const allSelected =
    data.length > 0 &&
    selectedRows.length === data.length;

  const someSelected =
    selectedRows.length > 0 &&
    selectedRows.length < data.length;

  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggleRow = (row: T) => {
    if (!selection) return;

    const id = getRowId(row);

    const nextIds = selectedIds.includes(id)
      ? selectedIds.filter((value) => value !== id)
      : [...selectedIds, id];

    const nextRows = data.filter((item) =>
      nextIds.includes(getRowId(item)),
    );

    selection.onSelectionChange(nextIds, nextRows);
  };

  const toggleAll = () => {
    if (!selection) return;

    const nextIds = allSelected
      ? []
      : data.map(getRowId);

    const nextRows = allSelected
      ? []
      : [...data];

    selection.onSelectionChange(nextIds, nextRows);
  };

  const handleSort = (column: DataTableColumn<T>) => {
    if (!sortable || !column.sortable || !onSortChange) {
      return;
    }

    const direction: DataTableSort["direction"] =
      sort?.columnId === column.id &&
      sort.direction === "asc"
        ? "desc"
        : "asc";

    onSortChange({
      columnId: column.id,
      direction,
    });
  };

  if (state === "loading") {
    return (
      <div
        className="overflow-hidden rounded-xl border border-neutral-200"
        aria-busy="true"
        aria-label={`Loading ${ariaLabel.toLowerCase()}`}
      >
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              aria-hidden="true"
              className="h-10 animate-pulse rounded bg-neutral-100 motion-reduce:animate-none"
            />
          ))}
        </div>
      </div>
    );
  }

  if (state === "error") {
    const tableError =
      "error" in props ? props.error : "Unable to load records.";

    const onRetry =
      "onRetry" in props ? props.onRetry : undefined;

    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        <div>{tableError}</div>

        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 font-medium underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
          >
            Try again
          </button>
        ) : null}
      </div>
    );
  }

  if (state === "empty" || data.length === 0) {
    const emptyMessage =
      state === "empty" && "emptyState" in props
        ? props.emptyState ?? "No records found."
        : "No records found.";

    return (
      <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-xl border border-neutral-200",
        className,
      )}
    >
      <table className="min-w-full border-collapse text-sm">
        {caption ? (
          <caption className="sr-only">
            {caption}
          </caption>
        ) : null}

        <thead
          className={cn(
            "bg-neutral-50",
            stickyHeader && "sticky top-0 z-10",
          )}
        >
          <tr>
            {selectable ? (
              <th
                scope="col"
                className="w-12 px-4 py-3"
              >
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  aria-label={`Select all rows in ${ariaLabel}`}
                  checked={allSelected}
                  onChange={toggleAll}
                />
              </th>
            ) : null}

            {columns.map((column) => {
              const isSorted =
                sort?.columnId === column.id;

              return (
                <th
                  key={column.id}
                  scope="col"
                  {...column.headerProps}
                  aria-sort={
                    isSorted
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : column.sortable && sortable
                        ? "none"
                        : undefined
                  }
                  style={{
                    width: column.width,
                    textAlign: column.align ?? "left",
                  }}
                  className={cn(
                    "px-4 py-3 font-semibold text-neutral-700",
                    column.hideOnMobile &&
                      "hidden md:table-cell",
                  )}
                >
                  {column.sortable && sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(column)}
                      className="inline-flex min-h-8 items-center gap-1 rounded-md text-left hover:text-neutral-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
                    >
                      {column.header}

                      <span
                        aria-hidden="true"
                        className="text-xs"
                      >
                        {isSorted
                          ? sort.direction === "asc"
                            ? "↑"
                            : "↓"
                          : "↕"}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody className="divide-y divide-neutral-100">
          {data.map((row, index) => {
            const id = getRowId(row);
            const selected =
              selectedIds.includes(id);

            return (
              <tr
                key={id}
                aria-selected={
                  selectable ? selected : undefined
                }
                className="hover:bg-neutral-50"
              >
                {selectable ? (
                  <td className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select row ${id}`}
                      checked={selected}
                      onChange={() =>
                        toggleRow(row)
                      }
                    />
                  </td>
                ) : null}

                {columns.map((column) => {
                  const value =
                    column.cell?.(row, index) ??
                    (column.accessor
                      ? String(
                          row[column.accessor] ?? "",
                        )
                      : null);

                  return (
                    <td
                      key={column.id}
                      className={cn(
                        "px-4 py-3 text-neutral-800",
                        column.hideOnMobile &&
                          "hidden md:table-cell",
                      )}
                      style={{
                        textAlign: column.align ?? "left",
                      }}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
