import { Download } from "lucide-react";
import { downloadCsv } from "../../lib/csv";
import { Button } from "../ui/button";
import type { DataColumn } from "./DataTable";

interface ExportCsvButtonProps<T> {
	/** Full download filename, including the .csv extension. */
	filename: string;
	rows: T[];
	columns: DataColumn<T>[];
}

/**
 * Exports exactly what the table shows — the same columns, the same filtered
 * and searched rows — so a spreadsheet matches the screen it came from.
 */
export default function ExportCsvButton<T>({
	filename,
	rows,
	columns,
}: ExportCsvButtonProps<T>) {
	const handleExport = () => {
		downloadCsv(
			filename,
			columns.map((column) => column.label),
			rows.map((row) => columns.map((column) => column.render(row))),
		);
	};

	return (
		<Button
			type="button"
			variant="outline"
			onClick={handleExport}
			disabled={rows.length === 0}
		>
			<Download className="size-4" />
			Export CSV
		</Button>
	);
}
