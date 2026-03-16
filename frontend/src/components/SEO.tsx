import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogType?: 'website' | 'article' | 'profile';
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  /** For article pages: author name */
  articleAuthor?: string;
  /** For article pages: ISO 8601 published date */
  articlePublishedTime?: string;
  /** For article pages: ISO 8601 modified date */
  articleModifiedTime?: string;
  /** For article pages: tags/keywords array */
  articleTags?: string[];
  /** If true, adds noindex,nofollow (for authenticated pages) */
  noIndex?: boolean;
}

const SITE_NAME = 'BusBook - Premium Bus Booking Platform';
const SITE_URL = 'https://busbook.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/icons/og-image.jpg`;
const DEFAULT_KEYWORDS = 'bus booking, online bus tickets, luxury bus, sleeper bus, volvo bus, intercity bus, book bus online, cheap bus tickets India';

export default function SEO({
  title,
  description,
  keywords = DEFAULT_KEYWORDS,
  canonical,
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  twitterCard = 'summary_large_image',
  articleAuthor,
  articlePublishedTime,
  articleModifiedTime,
  articleTags,
  noIndex = false,
}: SEOProps) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const canonicalUrl = canonical ?? (typeof window !== 'undefined' ? window.location.href : SITE_URL);

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'BusBook',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/search?from={from_city}&to={to_city}`,
      'query-input': 'required name=from_city required name=to_city',
    },
  };

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'BusBook',
    url: SITE_URL,
    logo: `${SITE_URL}/icons/icon-512x512.png`,
    sameAs: [
      'https://twitter.com/busbook',
      'https://www.facebook.com/busbook',
      'https://www.instagram.com/busbook',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+91-1800-123-4567',
      contactType: 'customer service',
      areaServed: 'IN',
      availableLanguage: ['English', 'Hindi'],
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'IN',
    },
  };

  const articleSchema = ogType === 'article' ? {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image: ogImage,
    author: {
      '@type': 'Person',
      name: articleAuthor ?? 'BusBook Editorial',
    },
    publisher: {
      '@type': 'Organization',
      name: 'BusBook',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/icons/icon-512x512.png` },
    },
    url: canonicalUrl,
    datePublished: articlePublishedTime,
    dateModified: articleModifiedTime ?? articlePublishedTime,
    keywords: articleTags?.join(', ') ?? keywords,
  } : null;

  return (
    <Helmet>
      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
      {articleSchema && (
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
      )}

      {/* Standard Meta */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={noIndex ? 'noindex,nofollow' : 'index,follow'} />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <meta name="theme-color" content="#4f46e5" />
      <meta name="author" content="BusBook" />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="BusBook" />
      <meta property="og:locale" content="en_IN" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />
      <meta property="og:url" content={canonicalUrl} />

      {/* Article-specific Open Graph */}
      {ogType === 'article' && articleAuthor && (
        <meta property="article:author" content={articleAuthor} />
      )}
      {ogType === 'article' && articlePublishedTime && (
        <meta property="article:published_time" content={articlePublishedTime} />
      )}
      {ogType === 'article' && articleModifiedTime && (
        <meta property="article:modified_time" content={articleModifiedTime} />
      )}
      {ogType === 'article' && articleTags?.map((tag) => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}

      {/* Twitter Card */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content="@busbook" />
      <meta name="twitter:creator" content="@busbook" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={title} />
    </Helmet>
  );
}
