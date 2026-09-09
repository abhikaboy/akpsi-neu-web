import { Link } from "@tanstack/react-router";

interface RusheeLinkProps {
	name: string;
	email: string;
}

/**
 * A rushee's name, linked to their consolidated candidate page. Every table
 * that shows a name uses this so the URL convention — and the email encoding
 * it depends on — lives in one place.
 */
export default function RusheeLink({ name, email }: RusheeLinkProps) {
	if (!email) return <span className="block truncate">{name}</span>;

	return (
		<Link
			to="/admin/candidate/$email"
			params={{ email: encodeURIComponent(email) }}
			className="block truncate text-primary underline-offset-2 hover:underline"
			title={`Open ${name || email}'s candidate page`}
		>
			{name || email}
		</Link>
	);
}
