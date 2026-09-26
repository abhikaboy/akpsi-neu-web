import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	fetchChatMessages,
	sendChatMessage,
	type ChatMessage,
} from "../../lib/chat";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

function formatTime(value: string): string {
	return new Date(value).toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
	});
}

/**
 * A discussion thread scoped to one candidate + cycle, for brothers to argue
 * a rushee's case without leaving the deliberation view. The thread loads once
 * and refreshes on demand: an interval poll here fired per open tab and grew
 * into the bulk of the project's function invocations, crowding out the
 * queries that deliberation actually depends on.
 */
export default function CandidateChat({
	cycle,
	candidateEmail,
	viewerEmail,
}: {
	cycle: string;
	candidateEmail: string;
	viewerEmail: string;
}) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [draft, setDraft] = useState("");
	const [sending, setSending] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const listRef = useRef<HTMLDivElement>(null);

	const load = useCallback(
		() => fetchChatMessages(cycle, candidateEmail),
		[cycle, candidateEmail],
	);

	useEffect(() => {
		let cancelled = false;
		load()
			.then((next) => {
				if (!cancelled) setMessages(next);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [load]);

	const handleRefresh = async () => {
		setRefreshing(true);
		try {
			setMessages(await load());
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to refresh the thread.",
			);
		} finally {
			setRefreshing(false);
		}
	};

	useEffect(() => {
		listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
	}, []);

	const handleSend = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!draft.trim()) return;
		setSending(true);
		try {
			const message = await sendChatMessage(
				cycle,
				candidateEmail,
				draft.trim(),
			);
			setMessages((prev) => [...prev, message]);
			setDraft("");
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to send message.",
			);
		} finally {
			setSending(false);
		}
	};

	return (
		<div className="border rounded-md">
			<div className="flex items-center justify-between border-b px-3 py-2">
				<p className="text-xs text-muted-foreground">Discussion</p>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={handleRefresh}
					disabled={refreshing}
				>
					{refreshing ? "Refreshing..." : "Refresh"}
				</Button>
			</div>
			<div ref={listRef} className="max-h-64 overflow-y-auto p-3 space-y-3">
				{messages.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No discussion yet. Say something about this candidate.
					</p>
				) : (
					messages.map((message) => (
						<div
							key={message._id}
							className={
								message.senderEmail === viewerEmail.toLowerCase()
									? "text-right"
									: ""
							}
						>
							<p className="text-xs text-muted-foreground">
								{message.senderName} &middot; {formatTime(message.createdAt)}
							</p>
							<p className="text-sm whitespace-pre-wrap break-words">
								{message.body}
							</p>
						</div>
					))
				)}
			</div>
			<form onSubmit={handleSend} className="flex gap-2 border-t p-2">
				<Textarea
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							handleSend(e);
						}
					}}
					rows={1}
					placeholder="Add to the discussion..."
					className="min-h-9 resize-none"
				/>
				<Button type="submit" disabled={sending || !draft.trim()}>
					Send
				</Button>
			</form>
		</div>
	);
}
