import { useState } from "react";
import { useEditerChrono } from "../../hooks/useMatchLive";

type Props = {
  numMatch: number;
  tempsActuel: number;
  token: string;
};

function secondsToInputValue(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function inputToSeconds(value: string): number | null {
  const parts = value.split(":");
  if (parts.length !== 2) return null;
  const m = parseInt(parts[0], 10);
  const s = parseInt(parts[1], 10);
  if (isNaN(m) || isNaN(s) || s < 0 || s > 59) return null;
  return m * 60 + s;
}

export default function ChronoEditForm({ numMatch, tempsActuel, token }: Props) {
  const [value, setValue] = useState(secondsToInputValue(tempsActuel));
  const { mutate, isPending } = useEditerChrono(numMatch);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const seconds = inputToSeconds(value);
    if (seconds === null) return;
    mutate({ tempsEcouleSecondes: seconds, token });
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <label className="text-xs text-slate-400">Ajuster le chrono</label>
      <input
        type="text"
        pattern="[0-9]{2}:[0-5][0-9]"
        placeholder="MM:SS"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-24 px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-100 font-mono text-sm"
      />
      <button
        type="submit"
        disabled={isPending}
        className="px-3 py-1 rounded bg-amber-700 hover:bg-amber-600 text-white text-xs font-medium disabled:opacity-50"
      >
        Appliquer
      </button>
    </form>
  );
}
