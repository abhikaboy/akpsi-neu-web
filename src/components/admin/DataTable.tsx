import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_COLUMN_WIDTH = 180;
const MIN_COLUMN_WIDTH = 80;

export interface DataColumn<T> {
	key: string;
	label: string;
	render: (row: T) => string;
	renderCell?: (row: T) => React.ReactNode;
	sortValue: (row: T) => string | number;
	width?: number;
}

interface DataTableProps<T> {
	rows: T[];
	columns: DataColumn<T>[];
	rowKey: (row: T) => string;
	initialSort?: { key: string; dir: SortDir };
}

export type SortDir = "asc" | "desc";

/** Sortable, resizable spreadsheet-style table shared by the admin pages. */
export default function DataTable<T>({
	rows,
	columns,
	rowKey,
	initialSort,
}: DataTableProps<T>) {
	const [widths, setWidths] = useState<Record<string, number>>({});
	const resizing = useRef<{
		key: string;
		startX: number;
		startWidth: number;
	} | null>(null);
	const [sort, setSort] = useState<{ key: string; dir: SortDir }>(
		initialSort ?? { key: columns[0]?.key ?? "", dir: "asc" },
	);

	const getWidth = (col: DataColumn<T>) =>
		widths[col.key] ?? col.width ?? DEFAULT_COLUMN_WIDTH;

	useEffect(() => {
		const handleMove = (e: MouseEvent) => {
			const state = resizing.current;
			if (!state) return;
			const next = Math.max(
				MIN_COLUMN_WIDTH,
				state.startWidth + (e.clientX - state.startX),
			);
			setWidths((prev) => ({ ...prev, [state.key]: next }));
		};
		const handleUp = () => {
			resizing.current = null;
		};
		window.addEventListener("mousemove", handleMove);
		window.addEventListener("mouseup", handleUp);
		return () => {
			window.removeEventListener("mousemove", handleMove);
			window.removeEventListener("mouseup", handleUp);
		};
	}, []);

	const startResize = (col: DataColumn<T>) => (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		resizing.current = {
			key: col.key,
			startX: e.clientX,
			startWidth: getWidth(col),
		};
	};

	const toggleSort = (key: string) => {
		setSort((prev) =>
			prev.key === key
				? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
				: { key, dir: "asc" },
		);
	};

	const sorted = useMemo(() => {
		const col = columns.find((c) => c.key === sort.key);
		if (!col) return rows;
		const copy = [...rows];
		copy.sort((a, b) => {
			const av = col.sortValue(a);
			const bv = col.sortValue(b);
			const cmp =
				typeof av === "number" && typeof bv === "number"
					? av - bv
					: String(av).localeCompare(String(bv));
			return sort.dir === "asc" ? cmp : -cmp;
		});
		return copy;
	}, [rows, columns, sort]);

	return (
		<div className="border rounded-lg overflow-auto w-full">
			<table
				className="border-collapse text-sm w-full"
				style={{ tableLayout: "fixed" }}
			>
				<thead>
					<tr className="bg-muted/50">
						{columns.map((col) => {
							const active = sort.key === col.key;
							const Icon = active
								? sort.dir === "asc"
									? ArrowUp
									: ArrowDown
								: ArrowUpDown;
							return (
								<th
									key={col.key}
									className="relative text-left font-semibold px-3 py-2 border-b border-r last:border-r-0 align-top"
									style={{ width: getWidth(col), maxWidth: getWidth(col) }}
								>
									<button
										type="button"
										onClick={() => toggleSort(col.key)}
										className="flex items-center gap-1 w-full min-w-0 cursor-pointer hover:text-primary"
									>
										<span className="truncate">{col.label}</span>
										<Icon
											className={`size-3.5 shrink-0 ${active ? "" : "opacity-40"}`}
										/>
									</button>
									<div
										onMouseDown={startResize(col)}
										className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-primary/40"
									/>
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody>
					{sorted.map((row) => (
						<tr key={rowKey(row)} className="hover:bg-muted/30">
							{columns.map((col) => (
								<td
									key={col.key}
									className="px-3 py-2 border-b border-r last:border-r-0 align-top"
									style={{ width: getWidth(col), maxWidth: getWidth(col) }}
									title={col.render(row)}
								>
									{col.renderCell ? (
										col.renderCell(row)
									) : (
										<span className="block truncate">{col.render(row)}</span>
									)}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
