type Props = {
  children?: React.ReactNode;
};

export default function TopBar({ children }: Props) {
  return (
    <header className="h-14 border-b border-slate-800 flex items-center px-4">
      <div className="flex items-center gap-2 w-full">
        {children ?? <span className="font-semibold">Table de marque</span>}
      </div>
    </header>
  );
}
