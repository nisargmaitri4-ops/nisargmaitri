import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://nisargmaitri.in';

/**
 * Reusable SEO head component for per-page meta tags.
 * Usage: <SEOHead title="Page Title" description="Page desc" path="/page" />
 */
const SEOHead = ({
  title = 'Nisargmaitri — Eco-Friendly Products for a Greener Planet',
  description = 'Shop sustainable, eco-friendly products at Nisargmaitri. Bamboo toothbrushes, menstrual cups, steel bottles, zero-waste kits & more.',
  path = '/',
  image = '/earth.png',
  type = 'website',
  noindex = false,
}) => {
  const url = `${SITE_URL}${path}`;
  const imageUrl = image.startsWith('http') ? image : `${SITE_URL}${image}`;

  return (
    <Helmet>
      {/* Primary */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content="Nisargmaitri" />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
    </Helmet>
  );
};

export default SEOHead;
