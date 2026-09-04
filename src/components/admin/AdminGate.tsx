import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
	adminLogin,
	adminLogout,
	checkAdminSession,
	type AdminUser,
} from "../../lib/adminApplications";
import AdminLayout from "./AdminLayout";

interface AdminGateProps {
	/** Rendered inside the admin shell once a brother is signed in. */
	children: (user: AdminUser) => ReactNode;
}

/**
 * Wraps every admin page: resolves the session, shows the login form when
 * there isn't one, and hands the signed-in brother down so eval forms can
 * attribute submissions.
 */
export default function AdminGate({ children }: AdminGateProps) {
	const [checkingSession, setCheckingSession] = useState(true);
	const [user, setUser] = useState<AdminUser | null>(null);

	useEffect(() => {
		checkAdminSession()
			.then(setUser)
			.finally(() => setCheckingSession(false));
	}, []);

	if (checkingSession) {
		return (
			<div className="admin-shell bg-white min-h-screen w-full flex items-center justify-center">
				<div className="w-full max-w-sm px-6 space-y-4">
					<div className="skeleton h-10 rounded" />
					<div className="skeleton h-10 rounded" />
				</div>
			</div>
		);
	}

	if (!user) return <LoginGate onLoggedIn={setUser} />;

	const handleLogout = async () => {
		await adminLogout();
		setUser(null);
	};

	return (
		<AdminLayout onLogout={handleLogout} user={user}>
			{children(user)}
		</AdminLayout>
	);
}

const STORED_IDENTITY_KEY = "akpsi_admin_identity";

function readStoredIdentity(): { name: string; email: string } {
	try {
		const raw = localStorage.getItem(STORED_IDENTITY_KEY);
		if (!raw) return { name: "", email: "" };
		const parsed = JSON.parse(raw);
		return { name: parsed?.name ?? "", email: parsed?.email ?? "" };
	} catch {
		return { name: "", email: "" };
	}
}

function LoginGate({ onLoggedIn }: { onLoggedIn: (user: AdminUser) => void }) {
	const stored = readStoredIdentity();
	const [name, setName] = useState(stored.name);
	const [email, setEmail] = useState(stored.email);
	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);
		try {
			const user = await adminLogin({ name, email, password });
			// Only the identity is remembered — never the chapter password.
			try {
				localStorage.setItem(STORED_IDENTITY_KEY, JSON.stringify(user));
			} catch {
				// Private browsing or a full quota: not worth failing the login over.
			}
			onLoggedIn(user);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Incorrect password.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="admin-shell bg-muted/40 min-h-screen w-full flex items-center justify-center px-6">
			<Card className="w-full max-w-sm">
				<CardHeader>
					<CardTitle className="text-2xl">Admin Access</CardTitle>
					<p className="text-sm text-muted-foreground">
						Sign in with your name so your evaluations are attributed to you.
					</p>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<Label htmlFor="admin-name" className="mb-2 block">
								Your name
							</Label>
							<Input
								id="admin-name"
								autoFocus
								autoComplete="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="admin-email" className="mb-2 block">
								Your email
							</Label>
							<Input
								id="admin-email"
								type="email"
								autoComplete="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="admin-password" className="mb-2 block">
								Chapter password
							</Label>
							<Input
								id="admin-password"
								type="password"
								autoComplete="current-password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>
						<Button
							type="submit"
							disabled={
								submitting || !password || !name.trim() || !email.trim()
							}
							className="w-full"
						>
							{submitting ? "Checking..." : "Enter"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
