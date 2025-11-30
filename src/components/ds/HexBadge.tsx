import React from "react";
import clsx from "clsx";

type Props = {
  name: string;
  imageUrl?: string | null;
  size?: number;
};

export default function HexBadge({ name, imageUrl, size = 52 }: Props) {
  const fallbackSvg = React.useMemo(
    () =>
      `data:image/svg+xml;utf8,` +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#0f172a"/>
              <stop offset="100%" stop-color="#1e293b"/>
            </linearGradient>
          </defs>
          <polygon points="25,5 75,5 95,50 75,95 25,95 5,50" fill="url(#g)" stroke="#1f2937" stroke-width="4"/>
          <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="36" font-weight="700">${name
            .slice(0, 2)
            .toUpperCase()}</text>
        </svg>`,
      ),
    [name, size],
  );
  const normalizedUrl = React.useMemo(() => {
    if (!imageUrl) return undefined;
    const match = imageUrl.match(/\/file\/d\/([^/]+)\//);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    return imageUrl;
  }, [imageUrl]);
  const [errored, setErrored] = React.useState(false);

  const initials = React.useMemo(() => {
    if (!name) return "?";
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }, [name]);

  const dimension = `${size}px`;
  const imgSrc = normalizedUrl && !errored ? normalizedUrl : fallbackSvg;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: dimension, height: dimension }}
      data-logo-url={normalizedUrl ?? undefined}
      data-logo-loaded={!!normalizedUrl && !errored}
    >
      <div
        className={clsx(
          "absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/30 via-emerald-400/20 to-slate-700/40 blur-sm",
        )}
        style={{ clipPath: "polygon(25% 6%, 75% 6%, 94% 50%, 75% 94%, 25% 94%, 6% 50%)" }}
      />
      <div
        className="relative overflow-hidden ring-2 ring-slate-800"
        style={{
          width: dimension,
          height: dimension,
          clipPath: "polygon(25% 6%, 75% 6%, 94% 50%, 75% 94%, 25% 94%, 6% 50%)",
          background:
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.15), transparent), linear-gradient(135deg, #0f172a, #0b1323)",
        }}
      >
        <img
          src={imgSrc}
          alt={name}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setErrored(true)}
        />
        {!normalizedUrl && (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-100">
            {initials}
          </div>
        )}
      </div>
    </div>
  );
}
