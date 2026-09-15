import type { ContentLang } from "../../utils/presentationContent";

type Props = {
  lang: ContentLang;
  onChange: (lang: ContentLang) => void;
};

export default function LanguageToggle({ lang, onChange }: Props) {
  return (
    <div className="presentation-lang" role="group" aria-label="Langue" data-testid="presentation-language-toggle">
      {(["fr", "en"] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={lang === value}
          data-testid={`presentation-language-${value}`}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
