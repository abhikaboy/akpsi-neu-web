import { createFileRoute } from "@tanstack/react-router";
import AdminGate from "../components/admin/AdminGate";
import EvalForm from "../components/admin/EvalForm";

export const Route = createFileRoute("/admin/invitational-evals")({
	component: AdminInvitationalEvals,
});

function AdminInvitationalEvals() {
	return (
		<AdminGate>
			{(user) => (
				<EvalForm
					formType="invitationalEval"
					title="Invitational Evals"
					description="Evaluate rushees from the invitational round. Your evaluation is saved under your name and can be edited any time."
					evaluatorEmail={user.email}
					onSessionExpired={() => window.location.reload()}
				/>
			)}
		</AdminGate>
	);
}

export default AdminInvitationalEvals;
