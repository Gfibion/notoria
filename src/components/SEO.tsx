import { Helmet } from "react-helmet-async";

const SITE_URL = "https://notoria.lovable.app";
const DEFAULT_TITLE = "Novaryn — Organize Thoughts. Shape Decisions.";
const DEFAULT_DESC =
  "Novaryn is a private, local-first thinking instrument for executives, researchers, consultants, and entrepreneurs. Capture ideas, structure research, and shape decisions with clarity.";

interface SEOProps {
  title?: string;
  description?: string;
  path?: string; // route path, e.g. "/install"
  keywords?: string;
  ogType?: "website" | "article" | "product";
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export function SEO({
  title,
  description,
  path = "/",
  keywords,
  ogType = "website",
  noindex = false,
  jsonLd,
}: SEOProps) {
  const fullTitle = title ? `${title} — Novaryn` : DEFAULT_TITLE;
  const desc = description ?? DEFAULT_DESC;
  const url = `${SITE_URL}${path}`;

  const lds = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content="Novaryn" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />

      {lds.map((ld, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  );
}

export default SEO;
