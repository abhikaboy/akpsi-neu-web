import { createFileRoute } from "@tanstack/react-router";
import AdminGate from "../components/admin/AdminGate";
import EvalForm from "../components/admin/EvalForm";

export const Route = createFileRoute("/admin/rush-evals")({
	component: AdminRushEvals,
});

function AdminRushEvals() {
	return (
		<AdminGate>
			{(user) => (
				<EvalForm
					formType="rushEval"
					title="Rush Evals"
					description="Score rushees you met during rush events. Your evaluation is saved under your name and can be edited any time."
					evaluatorEmail={user.email}
					onSessionExpired={() => window.location.reload()}
				/>
			)}
		</AdminGate>
	);
}

export default AdminRushEvals;
