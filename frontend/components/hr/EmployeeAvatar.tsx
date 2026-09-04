"use client";

import { useEffect, useState } from "react";

type AvatarSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<AvatarSize, { box: string; text: string; dot: string; dotBorder: string }> = {
  sm: { box: "h-9 w-9 rounded-xl", text: "text-[11px]", dot: "h-3.5 w-3.5", dotBorder: "border-[3px]" },
  md: { box: "h-12 w-12 rounded-2xl", text: "text-sm", dot: "h-4 w-4", dotBorder: "border-[3px]" },
  lg: { box: "h-20 w-20 rounded-[24px]", text: "text-2xl", dot: "h-5 w-5", dotBorder: "border-[4px]" },
};

function initials(value: string) {
  return String(value || "FH")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "FH";
}

export default function EmployeeAvatar({
  name,
  src,
  size = "md",
  showStatus = false,
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  showStatus?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const classes = SIZE_CLASSES[size];

  useEffect(() => setFailed(false), [src]);

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-visible bg-[linear-gradient(145deg,#173d68,#102b4b)] font-bold tracking-[-.04em] text-white shadow-[0_12px_28px_rgba(15,45,80,.16)] ${classes.box} ${classes.text} ${className}`}
      aria-label={`${name} profil fotoğrafı`}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`${name} profil fotoğrafı`}
          className={`absolute inset-0 h-full w-full object-cover ${classes.box}`}
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
      {showStatus && (
        <span
          className={`absolute -bottom-1 -right-1 rounded-full border-white bg-emerald-400 dark:border-slate-900 ${classes.dot} ${classes.dotBorder}`}
          aria-label="Aktif"
        />
      )}
    </div>
  );
}
