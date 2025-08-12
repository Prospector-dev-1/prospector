import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  canonicalPath?: string; // e.g. "/help"
  structuredData?: Record<string, any>;
}

const SEO = ({ title, description, canonicalPath, structuredData }: SEOProps) => {
  useEffect(() => {
    // Title
    document.title = title;

    // Description
    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', description);
    }

    // Canonical
    if (canonicalPath) {
      const canonicalHref = `${window.location.origin}${canonicalPath}`;
      let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!linkCanonical) {
        linkCanonical = document.createElement('link');
        linkCanonical.setAttribute('rel', 'canonical');
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.setAttribute('href', canonicalHref);
    }

    // Structured data (JSON-LD)
    let scriptEl = document.getElementById('seo-structured-data') as HTMLScriptElement | null;
    if (structuredData) {
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = 'seo-structured-data';
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      scriptEl.text = JSON.stringify(structuredData);
    } else if (scriptEl) {
      // Remove if none provided
      scriptEl.remove();
    }
  }, [title, description, canonicalPath, structuredData]);

  return null;
};

export default SEO;
