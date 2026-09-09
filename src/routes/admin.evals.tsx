import { createFileRoute } from "@tanstack/react-router";
import AdminGate from "../components/admin/AdminGate";
import EvalsSheet from "../components/admin/EvalsSheet";

export const Route = createFileRoute("/admin/evals")({
	component: AdminRushEvalsSheet,
});

function AdminRushEvalsSheet() {
	return (
		<AdminGate>
			{() => (
				<EvalsSheet
					formType="rushEval"
					title="Rush Evals Sheet"
					description="Every rush eval submitted by every brother this cycle."
				/>
			)}
		</AdminGate>
	);
}

export default AdminRushEvalsSheet;
