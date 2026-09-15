type Props = {
  violations: string[];
};

export default function PlanningViolationsBanner({ violations }: Props) {
  if (violations.length === 0) {
    return (
      <div className="text-emerald-400 text-xs px-3 py-2 rounded bg-emerald-900/30 border border-emerald-700">
        Aucune violation de contrainte.
      </div>
    );
  }

  return (
    <div className="px-3 py-2 rounded bg-red-900/30 border border-red-700 space-y-1">
      <p className="text-red-400 text-xs font-medium">
        {violations.length} violation(s)
      </p>
      <ul className="text-red-300 text-xs list-disc list-inside space-y-0.5">
        {violations.map((v) => (
          <li key={v}>{v}</li>
        ))}
      </ul>
    </div>
  );
}
