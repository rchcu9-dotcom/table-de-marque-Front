import { useEffect, useRef, useState } from "react";

type Props = {
  tempsEcouleSecondes: number;
  chronoEnCours: boolean;
  chronoDerniereMajAt: string | null;
};

function formatChrono(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ChronoDisplay({
  tempsEcouleSecondes,
  chronoEnCours,
  chronoDerniereMajAt,
}: Props) {
  const [tickSeconds, setTickSeconds] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!chronoEnCours || !chronoDerniereMajAt) {
      return;
    }

    const majAt = new Date(chronoDerniereMajAt).getTime();

    const tick = () => {
      const elapsed = Math.floor((Date.now() - majAt) / 1000);
      setTickSeconds(Math.max(0, elapsed));
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [tempsEcouleSecondes, chronoEnCours, chronoDerniereMajAt]);

  const display = chronoEnCours
    ? tempsEcouleSecondes + tickSeconds
    : tempsEcouleSecondes;

  return (
    <span
      className={`font-mono text-xl tabular-nums ${
        chronoEnCours ? "text-emerald-400" : "text-slate-300"
      }`}
    >
      {formatChrono(display)}
    </span>
  );
}
