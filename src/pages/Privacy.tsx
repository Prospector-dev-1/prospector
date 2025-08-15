import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SEO from '@/components/SEO';
const Privacy = () => {
  return <>
      <SEO title="Prospector — Privacy Policy" description="Prospector Privacy Policy: what we collect, how we use data, and your rights." canonicalPath="/privacy" structuredData={{
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Privacy Policy",
      "description": "Prospector Privacy Policy: what we collect, how we use data, and your rights.",
      "url": `${window.location.origin}/privacy`,
      "isPartOf": {
        "@type": "WebSite",
        "name": "Prospector",
        "url": window.location.origin
      }
    }} />
      <div className="min-h-screen bg-background px-4 py-8 md:py-16">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 md:p-8 bg-card border-border">
            <header className="mb-6">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                Privacy Policy
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                <strong>Prospector</strong> ("we," "our," or "us") respects your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our mobile application.
              </p>
              <div className="text-muted-foreground text-sm mt-2">
                Last Updated: August 15, 2025
              </div>
            </header>

            <main className="space-y-8">
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border/30">
                  1) Information We Collect
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <Badge variant="secondary" className="mb-2 bg-primary/10 text-primary border-primary/20">
                      Contact Information
                    </Badge>
                    <p className="text-foreground leading-relaxed">
                      <strong>What:</strong> name, email address, phone number.<br />
                      <strong>Why:</strong> to create and manage your account, verify your identity, and send necessary updates or communications.<br />
                      <strong>Linked to you:</strong> Yes.
                    </p>
                  </div>

                  <div>
                    <Badge variant="secondary" className="mb-2 bg-primary/10 text-primary border-primary/20">
                      Audio (Microphone)
                    </Badge>
                    <p className="text-foreground leading-relaxed">
                      <strong>What:</strong> voice input during cold‑calling roleplay sessions.<br />
                      <strong>Why:</strong> to enable our core cold‑calling simulation feature.<br />
                      <strong>Linked to you:</strong> No — processed for functionality and not stored in a way that personally identifies you.
                    </p>
                  </div>

                  <div>
                    <Badge variant="secondary" className="mb-2 bg-primary/10 text-primary border-primary/20">
                      Usage Data
                    </Badge>
                    <p className="text-foreground leading-relaxed">
                      <strong>What:</strong> interactions within the app, features used, session activity.<br />
                      <strong>Why:</strong> to improve user experience, troubleshoot issues, and optimize features.<br />
                      <strong>Linked to you:</strong> No.
                    </p>
                  </div>

                  <p className="text-foreground leading-relaxed">
                    We do <strong>not</strong> collect: location data, photos/videos, contacts, health/fitness data, financial details (we use Stripe for payments), or advertising identifiers (IDFA/AAID).
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border/30">
                  2) Payments
                </h2>
                <p className="text-foreground leading-relaxed">
                  We do not store or process payment card data. Payments are handled by{' '}
                  <a href="https://stripe.com/privacy" target="_blank" rel="noopener" className="text-primary hover:underline">
                    Stripe
                  </a>
                  , and Stripe's privacy policy applies when processing your payments.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border/30">
                  3) How We Use Your Information
                </h2>
                <ul className="list-disc list-inside space-y-2 text-foreground leading-relaxed ml-4">
                  <li>Provide core app functionality (including microphone‑based roleplay).</li>
                  <li>Communicate important updates and respond to support requests.</li>
                  <li>Improve performance, reliability, and user experience.</li>
                  <li>Process payments securely via Stripe.</li>
                </ul>
                <p className="text-foreground leading-relaxed mt-4">
                  We do not sell or rent your personal information.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border/30">
                  4) Data Sharing
                </h2>
                <p className="text-foreground leading-relaxed mb-2">
                  We may share limited information with:
                </p>
                <ul className="list-disc list-inside space-y-2 text-foreground leading-relaxed ml-4">
                  <li><strong>Stripe</strong> — for secure payment processing.</li>
                </ul>
                <p className="text-foreground leading-relaxed mt-4">
                  No other third parties receive your data unless required by law.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border/30">
                  5) Data Storage & Security
                </h2>
                <ul className="list-disc list-inside space-y-2 text-foreground leading-relaxed ml-4">
                  <li>All data is encrypted in transit.</li>
                  <li>We use industry‑standard safeguards to protect your information.</li>
                  <li>You may request deletion of your account and associated data at any time (see <em>Contact Us</em>).</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border/30">
                  6) App Permissions
                </h2>
                <ul className="list-disc list-inside space-y-2 text-foreground leading-relaxed ml-4">
                  <li><strong>Microphone:</strong> required for cold‑calling roleplay.</li>
                  <li><strong>Email address:</strong> required for account creation and communications.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border/30">
                  7) Tracking
                </h2>
                <p className="text-foreground leading-relaxed">
                  We do not track users across apps or websites and do not use advertising identifiers.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border/30">
                  8) Children's Privacy
                </h2>
                <p className="text-foreground leading-relaxed">
                  Prospector is not directed to children under 13, and we do not knowingly collect personal information from children.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border/30">
                  9) Your Rights
                </h2>
                <p className="text-foreground leading-relaxed">
                  Subject to applicable law, you may request access, correction, or deletion of your personal information. We will respond within a reasonable time.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border/30">
                  10) Changes to This Policy
                </h2>
                <p className="text-foreground leading-relaxed">
                  We may update this Privacy Policy from time to time. Updates will be posted here with a new "Last Updated" date.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border/30">
                  11) Contact Us
                </h2>
                <p className="text-foreground leading-relaxed">
                  Questions or requests? Email us at{' '}
                  <a href="mailto:prospector@webnixo.net" className="text-primary hover:underline">
                    prospector@webnixo.net
                  </a>
                  .
                </p>
              </section>
            </main>

            <footer className="mt-8 pt-4 border-t border-border/30">
              
            </footer>
          </Card>
        </div>
      </div>
    </>;
};
export default Privacy;