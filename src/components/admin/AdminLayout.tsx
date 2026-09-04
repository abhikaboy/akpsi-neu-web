import { Link, useLocation } from "@tanstack/react-router";
import {
	ClipboardList,
	LogOut,
	MessageSquare,
	Scale,
	Sparkles,
	Table,
	UserCheck,
	UserPen,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useActiveCycle } from "../../lib/activeCycle";
import type { AdminUser } from "../../lib/adminApplications";

interface AdminNavItem {
	name: string;
	path: string;
	icon: typeof ClipboardList;
}

const NAV_ITEMS: AdminNavItem[] = [
	{ name: "Applications", path: "/admin/applications", icon: ClipboardList },
	{ name: "Rush Evals", path: "/admin/rush-evals", icon: UserCheck },
	{
		name: "Invitational Evals",
		path: "/admin/invitational-evals",
		icon: Sparkles,
	},
	{ name: "Interviews", path: "/admin/interviews", icon: MessageSquare },
	{ name: "My Evals", path: "/admin/my-evals", icon: UserPen },
	{ name: "Evals Sheet", path: "/admin/evals", icon: Table },
	{ name: "Deliberate", path: "/admin/deliberate", icon: Scale },
];

interface AdminLayoutProps {
	children: ReactNode;
	onLogout: () => void;
	user?: AdminUser | null;
}

export default function AdminLayout({
	children,
	onLogout,
	user,
}: AdminLayoutProps) {
	const location = useLocation();
	const { label: cycleLabel } = useActiveCycle();

	return (
		<div className="admin-shell min-h-screen w-full bg-muted/40">
			<aside className="hidden md:flex fixed left-4 top-4 bottom-4 w-60 flex-col rounded-xl border bg-card shadow-xs z-40">
				<div className="px-4 py-4 border-b">
					<p className="font-semibold text-sm">AKPsi Admin</p>
					<p className="text-xs text-muted-foreground">
						{cycleLabel || "Chi Sigma Chapter"}
					</p>
				</div>

				<nav className="flex-1 p-2 space-y-1 overflow-y-auto">
					{NAV_ITEMS.map((item) => {
						const Icon = item.icon;
						const active = location.pathname === item.path;
						return (
							<Link
								key={item.path}
								to={item.path}
								className={cn(
									"flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
									active
										? "bg-primary text-primary-foreground"
										: "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
								)}
							>
								<Icon className="size-4 shrink-0" />
								{item.name}
							</Link>
						);
					})}
				</nav>

				<div className="p-2 border-t">
					{user && (
						<div className="px-3 pb-2">
							<p className="text-xs font-medium truncate">{user.name}</p>
							<p className="text-xs text-muted-foreground truncate">
								{user.email}
							</p>
						</div>
					)}
					<button
						type="button"
						onClick={onLogout}
						className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-accent-foreground cursor-pointer"
					>
						<LogOut className="size-4 shrink-0" />
						Log out
					</button>
				</div>
			</aside>

			<main className="md:pl-64 min-h-screen">
				<div className="px-6 sm:px-8 py-8">{children}</div>
			</main>
		</div>
	);
}
