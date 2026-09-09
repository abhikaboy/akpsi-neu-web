import { createFileRoute, Navigate } from "@tanstack/react-router";
import AdminGate from "../components/admin/AdminGate";

export const Route = createFileRoute("/admin/")({
	component: AdminIndex,
});

function AdminIndex() {
	return <AdminGate>{() => <Navigate to="/admin/applications" />}</AdminGate>;
}
