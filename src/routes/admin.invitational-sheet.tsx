import { createFileRoute } from "@tanstack/react-router";
import AdminGate from "../components/admin/AdminGate";
import EvalsSheet from "../components/admin/EvalsSheet";

export const Route = createFileRoute("/admin/invitational-sheet")({
	component: AdminInvitationalSheet,
});

function AdminInvitationalSheet() {
	return (
		<AdminGate>
			{() => (
				<EvalsSheet
					formType="invitationalEval"
					title="Invitational Evals Sheet"
					description="Every invitational eval submitted by every brother this cycle."
				/>
			)}
		</AdminGate>
	);
}

export default AdminInvitationalSheet;
