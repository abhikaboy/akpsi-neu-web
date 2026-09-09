import { createFileRoute } from "@tanstack/react-router";
import AdminGate from "../components/admin/AdminGate";
import EvalForm from "../components/admin/EvalForm";

export const Route = createFileRoute("/admin/rush-evals")({
	component: AdminRushEvals,
});

const RUSH_EVAL_INSTRUCTIONS = [
	"Brothers are required to fill out this form for at least 4 RUSHEES per event for your attendance to count.",
	"Please fill out evals AFTER the event, not during. Get it done by NOON the next day.",
	"Do not fill out multiple evals for the same rushee, unless you initially had a positive experience and then had a negative experience.",
	"Please remember to be as objective as possible. These rushees are human beings, do NOT be disrespectful when documenting your interactions. A 1 should only be given for notable concerns, and if choosing 1 or 2 you MUST EXPLAIN.",
	"Please be honest about all positives and negatives so that scores can better reflect brotherhood sentiments. Don't be afraid to give a bad grade and don't give out 5s for meeting the bare minimum.",
];

function AdminRushEvals() {
	return (
		<AdminGate>
			{(user) => (
				<EvalForm
					formType="rushEval"
					title="Rush Evals"
					description={RUSH_EVAL_INSTRUCTIONS}
					evaluatorEmail={user.email}
					onSessionExpired={() => window.location.reload()}
				/>
			)}
		</AdminGate>
	);
}

export default AdminRushEvals;
