import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { ArticleLink as ArticleLinkTarget } from "../../utils/presentationLinks";

type Props = {
  link: ArticleLinkTarget;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
  /**
   * Affiche l'URL après le libellé à l'impression (a[data-print-url]::after) : un PDF
   * imprimé reste exploitable. Ignoré pour les liens internes et les mailto:/tel:.
   */
  printUrl?: boolean;
};

/**
 * Seul endroit qui transforme un lien d'article résolu (resolveArticleLink) en élément :
 * même comportement garanti sur la présentation `/` et sur `/tournoi/infos`.
 */
export default function ArticleLink({ link, children, className, printUrl, ...rest }: Props) {
  const testId = rest["data-testid"];

  if (link.kind === "internal") {
    return (
      <Link to={link.to} className={className} data-testid={testId}>
        {children}
      </Link>
    );
  }

  if (link.kind === "plain") {
    return (
      <a href={link.href} className={className} data-testid={testId}>
        {children}
      </a>
    );
  }

  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      data-testid={testId}
      data-print-url={printUrl ? "true" : undefined}
    >
      {children}
    </a>
  );
}
