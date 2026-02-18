// Dynamic sitemap.xml generator for Vercel serverless
const SITE_URL = 'https://nisargmaitri.in';

const staticPages = [
    { path: '/', changefreq: 'weekly', priority: '1.0' },
    { path: '/shop', changefreq: 'daily', priority: '0.9' },
    { path: '/about', changefreq: 'monthly', priority: '0.7' },
    { path: '/contact', changefreq: 'monthly', priority: '0.7' },
    { path: '/services', changefreq: 'monthly', priority: '0.7' },
    { path: '/waste-management', changefreq: 'monthly', priority: '0.7' },
    { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
    { path: '/terms-condition', changefreq: 'yearly', priority: '0.3' },
];

module.exports = (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    const urls = staticPages
        .map(
            (page) => `
  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
        )
        .join('');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=600');
    res.status(200).send(sitemap);
};
