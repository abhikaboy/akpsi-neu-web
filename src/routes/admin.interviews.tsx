import { createFileRoute } from "@tanstack/react-router";
import AdminGate from "../components/admin/AdminGate";
import EvalForm from "../components/admin/EvalForm";

export const Route = createFileRoute("/admin/interviews")({
	component: AdminInterviews,
});

function AdminInterviews() {
	return (
		<AdminGate>
			{(user) => (
				<EvalForm
					formType="interview"
					title="Interviews"
					description="Record interview ratings and notes. Your evaluation is saved under your name and can be edited any time."
					evaluatorEmail={user.email}
					onSessionExpired={() => window.location.reload()}
				/>
			)}
		</AdminGate>
	);
}

export default AdminInterviews;
