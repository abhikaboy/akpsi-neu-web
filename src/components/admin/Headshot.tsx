const IMAGE_URL_RE = /^https?:\/\/.*\.(jpe?g|png|webp|gif|avif)(\?|$)/i;

export function isImageUrl(value: string): boolean {
	return IMAGE_URL_RE.test(value);
}

/**
 * Applicants have no profile record, so their picture is whichever image they
 * uploaded on the application (a headshot question, typically).
 */
export function findImageAnswer(
	answers: { label: string; value: string }[] | undefined,
): string | undefined {
	return answers?.find((a) => isImageUrl(a.value))?.value;
}

export function initialsFor(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

interface HeadshotProps {
	src?: string | null;
	/** Used for the initials fallback and the alt text. */
	name?: string;
	size?: number;
}

/** Widths declared under `images.sizes` in vercel.json. */
const OPTIMIZER_WIDTHS = [64, 96, 128, 256, 384];

/**
 * Headshots are uploaded at full camera resolution (up to 10MB) but displayed
 * at 44-64px, so serving the originals burned through the Blob data transfer
 * allowance. Routing them through Vercel's image optimizer returns a resized
 * webp of a few KB instead, cached at the edge for a year.
 *
 * The optimizer only exists on Vercel, so local dev falls back to the original.
 */
export function optimizedImageUrl(src: string, size: number): string {
	if (!import.meta.env.PROD) return src;
	// Request 2x for retina, rounded up to the nearest declared width.
	const target = size * 2;
	const width =
		OPTIMIZER_WIDTHS.find((w) => w >= target) ??
		OPTIMIZER_WIDTHS[OPTIMIZER_WIDTHS.length - 1];
	return `/_vercel/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}

/** Circular applicant picture, falling back to initials when there's no image. */
export function Headshot({ src, name = "", size = 40 }: HeadshotProps) {
	if (src) {
		return (
			<img
				src={optimizedImageUrl(src, size)}
				alt={name ? `${name}'s headshot` : "Headshot"}
				loading="lazy"
				decoding="async"
				className="rounded-full object-cover border shrink-0"
				style={{ width: size, height: size }}
			/>
		);
	}

	return (
		<div
			aria-hidden="true"
			className="rounded-full border shrink-0 bg-muted text-muted-foreground flex items-center justify-center font-semibold"
			style={{ width: size, height: size, fontSize: Math.round(size / 2.75) }}
		>
			{initialsFor(name)}
		</div>
	);
}

export default Headshot;
