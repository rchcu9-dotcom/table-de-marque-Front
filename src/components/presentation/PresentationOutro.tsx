import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import type { ContentLang } from "../../utils/presentationContent";

type Props = {
  index: number;
  lang: ContentLang;
  onVisibleChange: (index: number, isVisible: boolean) => void;
};

export default function PresentationOutro({ index, lang, onVisibleChange }: Props) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => onVisibleChange(index, entry.isIntersecting),
      { threshold: 0.55 },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return (
    <section
      ref={sectionRef}
      id={`presentation-panneau-${index}`}
      data-testid="presentation-outro"
      className="presentation-panel presentation-outro"
    >
      <div className="presentation-content">
        <div className="presentation-rink-mark" aria-hidden="true">
          <span />
        </div>
        <h2 className="presentation-headline">
          {lang === "fr" ? "À vos crosses." : "Sticks up."}
        </h2>
        <p className="presentation-lede">
          {lang === "fr"
            ? "Engagez votre équipe et retrouvez tout le tournoi dans l'application."
            : "Enter your team and follow the whole tournament in the app."}
        </p>
        <Link to="/inscription" className="presentation-cta">
          {lang === "fr" ? "Inscrire mon équipe" : "Register my team"}
        </Link>
      </div>
    </section>
  );
}
