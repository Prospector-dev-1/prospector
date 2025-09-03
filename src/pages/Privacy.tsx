import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import SEO from '@/components/SEO';
const Privacy = () => {
  const navigate = useNavigate();
  const { goBack } = useSmartNavigation();

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
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => goBack()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <Card className="p-6 md:p-8 bg-card border-border">
            <header className="mb-6">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                Privacy Policy
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                <strong>Prospector</strong> ("we," "our," or "us") respects your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our mobile application.
              </p>
              <div className="text-muted-foreground text-sm mt-2">
                Last Updated: September 3, 2025
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
                      Audio & Voice Processing
                    </Badge>
                    <p className="text-foreground leading-relaxed">
                      <strong>What:</strong> voice input during cold‑calling roleplay sessions, uploaded call recordings, real-time voice conversation data.<br />
                      <strong>Why:</strong> to enable AI-powered conversation analysis, coaching feedback, call simulation, and voice-based interactions.<br />
                      <strong>Linked to you:</strong> Yes — stored for analysis and coaching purposes. You can delete recordings at any time.
                    </p>
                  </div>

                  <div>
                    <Badge variant="secondary" className="mb-2 bg-primary/10 text-primary border-primary/20">
                      Business & Professional Data
                    </Badge>
                    <p className="text-foreground leading-relaxed">
                      <strong>What:</strong> business type, prospect role, call objectives, custom instructions, industry context, sales targets.<br />
                      <strong>Why:</strong> to generate personalized sales scripts, customize AI interactions, and provide relevant coaching.<br />
                      <strong>Linked to you:</strong> Yes.
                    </p>
                  </div>

                  <div>
                    <Badge variant="secondary" className="mb-2 bg-primary/10 text-primary border-primary/20">
                      Performance Analytics
                    </Badge>
                    <p className="text-foreground leading-relaxed">
                      <strong>What:</strong> call scores, conversation transcripts, AI feedback, performance metrics, behavioral patterns, strengths/weaknesses analysis.<br />
                      <strong>Why:</strong> to provide personalized coaching, track progress, and improve our AI models.<br />
                      <strong>Linked to you:</strong> Yes.
                    </p>
                  </div>

                  <div>
                    <Badge variant="secondary" className="mb-2 bg-primary/10 text-primary border-primary/20">
                      Profile & Media Content
                    </Badge>
                    <p className="text-foreground leading-relaxed">
                      <strong>What:</strong> profile pictures, avatars, file uploads, custom AI prospect profiles you create.<br />
                      <strong>Why:</strong> to personalize your experience and enable advanced features like custom prospect interactions.<br />
                      <strong>Linked to you:</strong> Yes.
                    </p>
                  </div>

                  <div>
                    <Badge variant="secondary" className="mb-2 bg-primary/10 text-primary border-primary/20">
                      Gamification Data
                    </Badge>
                    <p className="text-foreground leading-relaxed">
                      <strong>What:</strong> challenge participation, leaderboard scores, daily statistics, progress tracking, achievement data.<br />
                      <strong>Why:</strong> to provide competitive features and track your development over time. Leaderboard participation is optional.<br />
                      <strong>Linked to you:</strong> Yes (but you control visibility).
                    </p>
                  </div>

                  <div>
                    <Badge variant="secondary" className="mb-2 bg-primary/10 text-primary border-primary/20">
                      Usage Data
                    </Badge>
                    <p className="text-foreground leading-relaxed">
                      <strong>What:</strong> app interactions, feature usage, session duration, conversation flow patterns.<br />
                      <strong>Why:</strong> to improve user experience, troubleshoot issues, and optimize AI performance.<br />
                      <strong>Linked to you:</strong> Partially — aggregated for analytics, detailed data for personalization.
                    </p>
                  </div>

                  <p className="text-foreground leading-relaxed">
                    We do <strong>not</strong> collect: precise location data, contacts, health/fitness data, financial details (we use Stripe for payments), or advertising identifiers (IDFA/AAID).
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border/30">
                  2) Third-Party Services
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Payment Processing</h3>
                    <p className="text-foreground leading-relaxed">
                      We do not store or process payment card data. Payments are handled by{' '}
                      <a href="https://stripe.com/privacy" target="_blank" rel="noopener" className="text-primary hover:underline">
                        Stripe
                      </a>
                      , and Stripe's privacy policy applies when processing your payments.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Voice Processing (VAPI)</h3>
                    <p className="text-foreground leading-relaxed">
                      Real-time voice conversations and AI interactions are processed through VAPI. Voice data is transmitted to their servers for real-time processing and conversation management. This enables our advanced voice-based roleplay features.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-foreground mb-2">AI Processing</h3>
                    <p className="text-foreground leading-relaxed">
                      We use OpenAI and Anthropic services to analyze conversations, generate coaching feedback, create custom sales scripts, and provide AI-powered insights. Conversation data may be processed by these services to deliver personalized recommendations.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-foreground mb-2">File Storage</h3>
                    <p className="text-foreground leading-relaxed">
                      Call recordings, profile images, and other uploaded files are securely stored using Supabase storage infrastructure with appropriate access controls and encryption.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border/30">
                  3) How We Use Your Information
                </h2>
                <ul className="list-disc list-inside space-y-2 text-foreground leading-relaxed ml-4">
                  <li><strong>Core Functionality:</strong> Enable voice-based roleplay, AI conversation analysis, and personalized coaching.</li>
                  <li><strong>AI-Powered Features:</strong> Generate custom sales scripts, provide conversation insights, analyze performance patterns, and create personalized coaching recommendations.</li>
                  <li><strong>Performance Tracking:</strong> Calculate scores, track progress over time, identify strengths and areas for improvement.</li>
                  <li><strong>Gamification:</strong> Enable leaderboards, challenges, and competitive features (with your consent).</li>
                  <li><strong>Content Creation:</strong> Generate AI prospect profiles, simulate realistic sales scenarios, and create custom training materials.</li>
                  <li><strong>Communication:</strong> Send important updates, respond to support requests, and deliver coaching notifications.</li>
                  <li><strong>Product Improvement:</strong> Analyze usage patterns to enhance features, improve AI models, and optimize user experience.</li>
                  <li><strong>Security:</strong> Monitor for unauthorized access, prevent fraud, and maintain account security.</li>
                </ul>
                <p className="text-foreground leading-relaxed mt-4">
                  <strong>We do not sell or rent your personal information.</strong> We may use aggregated, anonymized data to improve our services and AI models.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border/30">
                  4) Data Sharing
                </h2>
                <p className="text-foreground leading-relaxed mb-2">
                  We may share limited information with trusted third-party services:
                </p>
                <ul className="list-disc list-inside space-y-2 text-foreground leading-relaxed ml-4">
                  <li><strong>Stripe</strong> — for secure payment processing and subscription management.</li>
                  <li><strong>VAPI</strong> — for real-time voice processing and AI conversation functionality.</li>
                  <li><strong>OpenAI/Anthropic</strong> — for AI analysis, conversation insights, and script generation (conversation data only, not personal identifiers).</li>
                  <li><strong>Supabase</strong> — for secure data storage, user authentication, and backend infrastructure.</li>
                </ul>
                <p className="text-foreground leading-relaxed mt-4">
                  <strong>Public Data:</strong> If you opt into leaderboards, your display name and performance scores may be visible to other users. You can control this visibility in your profile settings.
                </p>
                <p className="text-foreground leading-relaxed mt-2">
                  We do not sell personal information to data brokers or advertisers. Data sharing is limited to service providers necessary for app functionality.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border/30">
                  5) Data Storage, Retention & Security
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Security Measures</h3>
                    <ul className="list-disc list-inside space-y-1 text-foreground leading-relaxed ml-4">
                      <li>All data is encrypted in transit and at rest using industry-standard protocols.</li>
                      <li>Access controls and authentication prevent unauthorized data access.</li>
                      <li>Regular security audits and monitoring for suspicious activity.</li>
                      <li>Secure file storage with appropriate permissions and access logging.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Data Retention</h3>
                    <ul className="list-disc list-inside space-y-1 text-foreground leading-relaxed ml-4">
                      <li><strong>Call Recordings:</strong> Stored until you delete them or close your account.</li>
                      <li><strong>Conversation Analytics:</strong> Retained for coaching and improvement purposes while your account is active.</li>
                      <li><strong>Performance Data:</strong> Kept to track long-term progress and provide historical insights.</li>
                      <li><strong>Profile Images:</strong> Stored until replaced or account deletion.</li>
                      <li><strong>Deleted Accounts:</strong> All personal data is permanently deleted within 30 days.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Data Control</h3>
                    <p className="text-foreground leading-relaxed">
                      You can delete individual call recordings, export your data, or request complete account deletion at any time through the app or by contacting support.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border/30">
                  6) App Permissions
                </h2>
                <ul className="list-disc list-inside space-y-2 text-foreground leading-relaxed ml-4">
                  <li><strong>Microphone:</strong> Required for voice-based roleplay, real-time conversation analysis, and call recording features.</li>
                  <li><strong>File Storage:</strong> Used to save call recordings, upload audio files for analysis, and store profile pictures.</li>
                  <li><strong>Camera (Optional):</strong> For taking profile pictures and avatar uploads.</li>
                  <li><strong>Internet Access:</strong> Essential for AI processing, cloud storage, and real-time features.</li>
                  <li><strong>Notifications (Optional):</strong> To alert you about coaching insights, challenge updates, and important app communications.</li>
                </ul>
                <p className="text-foreground leading-relaxed mt-4">
                  You can manage these permissions in your device settings. Some features may not work without required permissions.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border/30">
                  7) Gamification & Social Features
                </h2>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Leaderboards</h3>
                    <p className="text-foreground leading-relaxed">
                      Participation in leaderboards is <strong>optional</strong>. You control whether your performance appears on public leaderboards through your profile settings. When enabled, only your display name and scores are visible to other users.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Challenges</h3>
                    <p className="text-foreground leading-relaxed">
                      Challenge participation and progress are tracked to provide rewards and motivation. Your challenge history helps personalize future challenges and coaching recommendations.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Privacy Controls</h3>
                    <p className="text-foreground leading-relaxed">
                      You can opt out of social features at any time while still accessing core coaching and training functionality.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border/30">
                  8) Analytics & Tracking
                </h2>
                <p className="text-foreground leading-relaxed mb-2">
                  We collect analytics to improve our service:
                </p>
                <ul className="list-disc list-inside space-y-1 text-foreground leading-relaxed ml-4">
                  <li><strong>App Usage:</strong> Feature usage, session duration, and user flow patterns to optimize the experience.</li>
                  <li><strong>Performance Analytics:</strong> Conversation success rates, coaching effectiveness, and learning progress to enhance AI models.</li>
                  <li><strong>Error Tracking:</strong> Technical issues and crashes to improve app stability.</li>
                </ul>
                <p className="text-foreground leading-relaxed mt-3">
                  We do <strong>not</strong> track users across apps or websites and do not use advertising identifiers for marketing purposes.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border/30">
                  9) Children's Privacy
                </h2>
                <p className="text-foreground leading-relaxed">
                  Prospector is not directed to children under 13, and we do not knowingly collect personal information from children. If we learn that we have collected information from a child under 13, we will delete it promptly.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border/30">
                  10) Your Rights & Controls
                </h2>
                <div className="space-y-3">
                  <p className="text-foreground leading-relaxed">
                    Subject to applicable law, you have the following rights:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-foreground leading-relaxed ml-4">
                    <li><strong>Access:</strong> Request a copy of your personal information and data.</li>
                    <li><strong>Correction:</strong> Update or correct inaccurate information.</li>
                    <li><strong>Deletion:</strong> Request deletion of your account and all associated data.</li>
                    <li><strong>Data Export:</strong> Download your data in a portable format.</li>
                    <li><strong>Leaderboard Control:</strong> Toggle your visibility on public leaderboards.</li>
                    <li><strong>Recording Management:</strong> Delete individual call recordings and analysis data.</li>
                    <li><strong>Communication Preferences:</strong> Control notifications and communication settings.</li>
                  </ul>
                  <p className="text-foreground leading-relaxed mt-3">
                    To exercise these rights, visit your profile settings or contact us directly. We will respond within a reasonable time frame as required by law.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border/30">
                  11) Changes to This Policy
                </h2>
                <p className="text-foreground leading-relaxed">
                  We may update this Privacy Policy to reflect new features, legal requirements, or service improvements. When we make material changes, we will notify you through the app or email. Updates will be posted here with a new "Last Updated" date.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4 pt-2 border-t border-border/30">
                  12) Contact Us
                </h2>
                <div className="space-y-2">
                  <p className="text-foreground leading-relaxed">
                    Questions about privacy, data requests, or concerns? Contact us:
                  </p>
                  <ul className="list-none space-y-1 text-foreground leading-relaxed ml-4">
                    <li>
                      <strong>Email:</strong>{' '}
                      <a href="mailto:prospector@webnixo.net" className="text-primary hover:underline">
                        prospector@webnixo.net
                      </a>
                    </li>
                    <li><strong>Response Time:</strong> We aim to respond within 48 hours</li>
                  </ul>
                  <p className="text-foreground leading-relaxed mt-3 text-sm">
                    For data deletion requests, please include your account email and specify what data you'd like removed.
                  </p>
                </div>
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