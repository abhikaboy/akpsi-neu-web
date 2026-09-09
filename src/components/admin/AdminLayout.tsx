import { Link, useLocation } from "@tanstack/react-router";
import {
	ClipboardList,
	LogOut,
	Menu,
	MessageSquare,
	Scale,
	Sparkles,
	Table,
	UserCheck,
	UserPen,
	X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useActiveCycle } from "../../lib/activeCycle";
import type { AdminUser } from "../../lib/adminApplications";
import { Headshot } from "./Headshot";

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
	{ name: "Rush Sheet", path: "/admin/evals", icon: Table },
	{
		name: "Invitational Sheet",
		path: "/admin/invitational-sheet",
		icon: Table,
	},
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
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const closeMobileMenu = () => setIsMobileMenuOpen(false);

	return (
		<div className="admin-shell min-h-screen w-full bg-muted/40">
			{/* Mobile Top Bar */}
			<div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 border-b bg-card">
				<div>
					<p className="font-semibold text-sm">AKPsi Admin</p>
					<p className="text-xs text-muted-foreground">
						{cycleLabel || "Chi Sigma Chapter"}
					</p>
				</div>
				<button
					type="button"
					onClick={() => setIsMobileMenuOpen(true)}
					aria-label="Open menu"
					className="flex items-center justify-center size-9 rounded-md text-foreground/80 hover:bg-accent hover:text-accent-foreground cursor-pointer"
				>
					<Menu className="size-5" />
				</button>
			</div>

			{/* Mobile Full-Screen Menu Overlay */}
			{isMobileMenuOpen && (
				<div className="md:hidden fixed inset-0 z-50 flex flex-col bg-card">
					<div className="flex items-center justify-between px-4 py-3 border-b">
						<div>
							<p className="font-semibold text-sm">AKPsi Admin</p>
							<p className="text-xs text-muted-foreground">
								{cycleLabel || "Chi Sigma Chapter"}
							</p>
						</div>
						<button
							type="button"
							onClick={closeMobileMenu}
							aria-label="Close menu"
							className="flex items-center justify-center size-9 rounded-md text-foreground/80 hover:bg-accent hover:text-accent-foreground cursor-pointer"
						>
							<X className="size-5" />
						</button>
					</div>

					<nav className="flex-1 p-4 space-y-1 overflow-y-auto">
						{NAV_ITEMS.map((item) => {
							const Icon = item.icon;
							const active = location.pathname === item.path;
							return (
								<Link
									key={item.path}
									to={item.path}
									onClick={closeMobileMenu}
									className={cn(
										"flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium transition-colors",
										active
											? "bg-primary text-primary-foreground"
											: "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
									)}
								>
									<Icon className="size-5 shrink-0" />
									{item.name}
								</Link>
							);
						})}
					</nav>

					<div className="p-4 border-t">
						{user && (
							<div className="flex items-center gap-2 px-3 pb-3">
								<Headshot src={user.pictureUrl} name={user.name} size={32} />
								<div className="min-w-0">
									<p className="text-xs font-medium truncate">{user.name}</p>
									<p className="text-xs text-muted-foreground truncate">
										{user.email}
									</p>
								</div>
							</div>
						)}
						<button
							type="button"
							onClick={() => {
								closeMobileMenu();
								onLogout();
							}}
							className="flex w-full items-center gap-2 rounded-md px-3 py-3 text-base font-medium text-foreground/80 hover:bg-accent hover:text-accent-foreground cursor-pointer"
						>
							<LogOut className="size-5 shrink-0" />
							Log out
						</button>
					</div>
				</div>
			)}

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
						<div className="flex items-center gap-2 px-3 pb-2">
							<Headshot src={user.pictureUrl} name={user.name} size={32} />
							<div className="min-w-0">
								<p className="text-xs font-medium truncate">{user.name}</p>
								<p className="text-xs text-muted-foreground truncate">
									{user.email}
								</p>
							</div>
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

			<main className="md:pl-64 min-h-screen pt-14 md:pt-0">
				<div className="px-6 sm:px-8 py-8">{children}</div>
			</main>
		</div>
	);
}
