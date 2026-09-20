import { createFileRoute } from "@tanstack/react-router";
import AdminGate from "../components/admin/AdminGate";
import EvalsSheet from "../components/admin/EvalsSheet";
import PasswordGate from "../components/admin/PasswordGate";

export const Route = createFileRoute("/admin/evals")({
	component: AdminRushEvalsSheet,
});

function AdminRushEvalsSheet() {
	return (
		<AdminGate>
			{() => (
				<PasswordGate password="courtofhonor" title="Rush Evals Sheet">
					<EvalsSheet
						formType="rushEval"
						title="Rush Evals Sheet"
						description="Every rush eval submitted by every brother this cycle."
					/>
				</PasswordGate>
			)}
		</AdminGate>
	);
}

export default AdminRushEvalsSheet;
