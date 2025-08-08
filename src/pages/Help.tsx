import React, { useEffect, useMemo } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
const contactSchema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid email"),
  subject: z.string().min(3, "Subject is too short"),
  message: z.string().min(10, "Message should be at least 10 characters")
});
type ContactFormValues = z.infer<typeof contactSchema>;
const Help: React.FC = () => {
  const {
    toast
  } = useToast();

  // Basic SEO tags
  useEffect(() => {
    document.title = "Help & Support | Prospector";
    const desc = "Help center: FAQs, billing/credits tips, troubleshooting, and contact support.";
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", desc);

    // Canonical
    const canonicalHref = `${window.location.origin}/help`;
    let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!linkCanonical) {
      linkCanonical = document.createElement("link");
      linkCanonical.setAttribute("rel", "canonical");
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute("href", canonicalHref);
  }, []);
  const faqs = useMemo(() => [{
    q: "How are credits used?",
    a: "Each practice call or AI action that consumes resources deducts credits. Your current balance is visible on the dashboard header."
  }, {
    q: "How do I buy more credits?",
    a: "Go to Profile > Subscription or the Credits card on the dashboard to purchase more via Stripe."
  }, {
    q: "I was charged but didn't receive credits",
    a: "Occasionally Stripe webhooks are delayed. Refresh after a minute. If credits still don't appear, contact us using the form below with your receipt email."
  }, {
    q: "Audio or mic not working",
    a: "Ensure your browser has microphone permissions and no other app is using the mic. Try refreshing the page or switching browsers."
  }, {
    q: "Sign-in issues",
    a: "If magic links don't arrive, check your spam folder and ensure your email domain allows external messages."
  }], []);
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: ""
    }
  });
  const onSubmit = async (values: ContactFormValues) => {
    try {
      const {
        error
      } = await supabase.functions.invoke("send-help", {
        body: values
      });
      if (error) throw error;
      toast({
        title: "Message sent",
        description: "Thanks! We'll get back to you shortly."
      });
      form.reset();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Couldn't send message",
        description: err?.message || "Please try again later or email support.",
        variant: "destructive"
      });
    }
  };
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a
      }
    }))
  };
  return <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Button variant="ghost" size="sm" className="ml-0 sm:-ml-2" asChild>
            <Link to="/" aria-label="Back to dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Help & Support</h1>
            <p className="text-sm text-muted-foreground mt-1">FAQs, billing tips, troubleshooting steps, and contact support.</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* FAQs */}
        <section aria-labelledby="faqs">
          <Card>
            <CardHeader>
              <CardTitle id="faqs">Frequently Asked Questions</CardTitle>
              <CardDescription>Quick answers to common questions</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((item, idx) => <AccordionItem key={idx} value={`faq-${idx}`}>
                    <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                    <AccordionContent>{item.a}</AccordionContent>
                  </AccordionItem>)}
              </Accordion>
            </CardContent>
          </Card>
        </section>

        {/* Billing / Credits Tips */}
        <section aria-labelledby="billing-tips">
          <Card>
            <CardHeader>
              <CardTitle id="billing-tips">Billing & Credits Tips</CardTitle>
              <CardDescription>Manage your balance effectively</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li>Track remaining credits in the dashboard header.</li>
                <li>Buy more anytime from Profile &gt; Subscription.</li>
                <li>Receipts are emailed by Stripe to your purchase email.</li>
                <li>If a payment completes but credits don't show, wait a minute and refresh.</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Troubleshooting */}
        <section aria-labelledby="troubleshooting">
          <Card>
            <CardHeader>
              <CardTitle id="troubleshooting">Troubleshooting</CardTitle>
              <CardDescription>Fix common problems fast</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li>Allow microphone access in your browser settings.</li>
                <li>Close other apps that may be using the mic.</li>
                <li>Try a hard refresh or a different browser.</li>
                <li>Check spam for account emails or magic links.</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Contact Form */}
        <section aria-labelledby="contact">
          <Card>
            <CardHeader>
              <CardTitle id="contact">Contact Support</CardTitle>
              <CardDescription>Send us a message and we'll reply by email</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4">
                  <FormField control={form.control} name="name" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="email" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="subject" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="How can we help?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="message" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Please include as many details as possible" rows={6} {...field} />
                        </FormControl>
                        <FormDescription>We usually respond within 24–48 hours.</FormDescription>
                        <FormMessage />
                      </FormItem>} />

                  <div className="flex items-center gap-3">
                    <Button type="submit" disabled={form.formState.isSubmitting} className="px-[50px]">
                      {form.formState.isSubmitting ? "Sending..." : "Send Message"}
                    </Button>
                    <a href="mailto:prospector@webnixo.net" className="text-sm text-primary underline underline-offset-4">Or email us directly here</a>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </section>

        <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify(faqJsonLd)
      }} />
      </main>
    </div>;
};
export default Help;