import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Copy, Loader2 } from "lucide-react";
import SEO from "@/components/SEO";
import SmartBackButton from '@/components/SmartBackButton';
const contactSchema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid email"),
  subject: z.string().min(3, "Subject is too short"),
  message: z.string().min(10, "Message should be at least 10 characters")
});
type ContactFormValues = z.infer<typeof contactSchema>;

interface HealthCheckResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  duration?: number;
  details?: string;
}

const Help: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();

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
  const [diagLoading, setDiagLoading] = useState(false);
  const [healthResults, setHealthResults] = useState<HealthCheckResult[]>([]);
  const [healthProgress, setHealthProgress] = useState(0);

  const runSingleTest = async (testName: string, testFn: () => Promise<void>): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    try {
      await testFn();
      const duration = Date.now() - startTime;
      return {
        test: testName,
        status: 'pass',
        message: 'Success',
        duration
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      return {
        test: testName,
        status: 'fail',
        message: error.message || 'Unknown error',
        duration,
        details: error.stack
      };
    }
  };

  const runHealthChecks = async () => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to run diagnostics',
        variant: 'destructive',
      });
      return;
    }

    try {
      setDiagLoading(true);
      setHealthResults([]);
      setHealthProgress(0);

      const tests = [
        {
          name: 'Database Connection',
          test: async () => {
            const { error } = await supabase.from('profiles').select('count').limit(1);
            if (error) throw error;
          }
        },
        {
          name: 'Authentication Service',
          test: async () => {
            const { data, error } = await supabase.auth.getUser();
            if (error || !data.user) throw new Error('Auth service unavailable');
          }
        },
        {
          name: 'Profile Access (RLS)',
          test: async () => {
            const { error } = await supabase.from('profiles').select('*').eq('user_id', user.id).limit(1);
            if (error) throw error;
          }
        },
        {
          name: 'Calls Table (RLS)',
          test: async () => {
            // Test if we can read our own calls
            const { error } = await supabase.from('calls').select('id').eq('user_id', user.id).limit(1);
            if (error) throw error;
          }
        },
        {
          name: 'Security Event Logging',
          test: async () => {
            const { error } = await supabase.rpc('log_security_event', {
              action_name: 'health_check_test',
              event_details: { timestamp: new Date().toISOString() }
            });
            if (error) throw error;
          }
        },
        {
          name: 'Storage Service',
          test: async () => {
            const { error } = await supabase.storage.listBuckets();
            if (error) throw error;
          }
        },
        {
          name: 'Edge Functions - Test Function',
          test: async () => {
            const { error } = await supabase.functions.invoke('test-function', { body: {} });
            if (error) throw error;
          }
        },
        {
          name: 'Edge Functions - Vapi Key',
          test: async () => {
            const { data, error } = await supabase.functions.invoke('get-vapi-key');
            if (error) throw error;
            if (!(data as any)?.publicKey) throw new Error('Vapi key not configured');
          }
        },
        {
          name: 'AI Analysis Cache',
          test: async () => {
            const { error } = await supabase.from('ai_analysis_cache').select('count').limit(1);
            if (error) throw error;
          }
        }
      ];

      const results: HealthCheckResult[] = [];
      
      for (let i = 0; i < tests.length; i++) {
        const result = await runSingleTest(tests[i].name, tests[i].test);
        results.push(result);
        setHealthResults([...results]);
        setHealthProgress(((i + 1) / tests.length) * 100);
      }

      const passed = results.filter(r => r.status === 'pass').length;
      const failed = results.filter(r => r.status === 'fail').length;

      toast({
        title: failed === 0 ? 'All diagnostics passed' : 'Some diagnostics failed',
        description: `${passed}/${tests.length} tests passed`,
        variant: failed === 0 ? 'default' : 'destructive',
      });

    } catch (err: any) {
      console.error('Diagnostics failed:', err);
      toast({
        title: 'Diagnostics failed',
        description: err?.message || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setDiagLoading(false);
    }
  };

  const copyDiagnostics = () => {
    const report = healthResults.map(r => 
      `${r.test}: ${r.status.toUpperCase()} - ${r.message}${r.duration ? ` (${r.duration}ms)` : ''}`
    ).join('\n');
    
    const fullReport = `Supabase Health Check Report\nGenerated: ${new Date().toISOString()}\nUser: ${user?.email || 'Unknown'}\n\n${report}`;
    
    navigator.clipboard.writeText(fullReport);
    toast({
      title: 'Diagnostics copied',
      description: 'Report copied to clipboard'
    });
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
  return (<>
      <SEO title="Help & Support | Prospector" description="Help center: FAQs, billing/credits tips, troubleshooting, and contact support." canonicalPath="/help" structuredData={faqJsonLd} />
      <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <SmartBackButton variant="ghost" size="sm" className="ml-0 sm:-ml-2" />
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

        {/* Diagnostics */}
        <section aria-labelledby="diagnostics">
          <Card>
            <CardHeader>
              <CardTitle id="diagnostics">Supabase Health Diagnostics</CardTitle>
              <CardDescription>Comprehensive connectivity and functionality tests for all Supabase services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Button 
                  onClick={runHealthChecks} 
                  disabled={diagLoading || !user}
                  className="w-full sm:w-auto"
                >
                  {diagLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Running Diagnostics...
                    </>
                  ) : (
                    'Run Complete Health Check'
                  )}
                </Button>
                
                {healthResults.length > 0 && !diagLoading && (
                  <Button
                    variant="outline"
                    onClick={copyDiagnostics}
                    className="w-full sm:w-auto"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Report
                  </Button>
                )}
                
                {!user && (
                  <p className="text-sm text-muted-foreground">
                    Sign in required to run diagnostics
                  </p>
                )}
              </div>

              {diagLoading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Running tests...</span>
                    <span>{Math.round(healthProgress)}%</span>
                  </div>
                  <Progress value={healthProgress} className="w-full" />
                </div>
              )}

              {healthResults.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium">
                        {healthResults.filter(r => r.status === 'pass').length} Passed
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium">
                        {healthResults.filter(r => r.status === 'fail').length} Failed
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium">
                        {healthResults.filter(r => r.status === 'warning').length} Warnings
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {healthResults.map((result, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border border-border rounded-lg bg-card"
                      >
                        <div className="flex items-center gap-3">
                          {result.status === 'pass' && <CheckCircle className="w-4 h-4 text-green-600" />}
                          {result.status === 'fail' && <XCircle className="w-4 h-4 text-red-600" />}
                          {result.status === 'warning' && <AlertCircle className="w-4 h-4 text-yellow-600" />}
                          
                          <div>
                            <p className="text-sm font-medium">{result.test}</p>
                            <p className={`text-xs ${
                              result.status === 'pass' ? 'text-green-600' :
                              result.status === 'fail' ? 'text-red-600' :
                              'text-yellow-600'
                            }`}>
                              {result.message}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {result.duration && (
                            <Badge variant="secondary" className="text-xs">
                              {result.duration}ms
                            </Badge>
                          )}
                          <Badge 
                            variant={
                              result.status === 'pass' ? 'default' :
                              result.status === 'fail' ? 'destructive' :
                              'secondary'
                            }
                          >
                            {result.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  {healthResults.some(r => r.details) && (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="error-details">
                        <AccordionTrigger className="text-sm">View Error Details</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3">
                            {healthResults
                              .filter(r => r.details)
                              .map((result, index) => (
                                <div key={index} className="p-3 bg-muted rounded-lg">
                                  <p className="text-sm font-medium mb-2">{result.test}</p>
                                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                                    {result.details}
                                  </pre>
                                </div>
                              ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>
              )}
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
                        <FormDescription>You can expect a response within 1–24 hours during business days.</FormDescription>
                        <FormMessage />
                      </FormItem>} />

                  <div className="flex items-center gap-3">
                    <Button type="submit" disabled={form.formState.isSubmitting} className="px-[50px]">
                      {form.formState.isSubmitting ? "Sending..." : "Send Message"}
                    </Button>
                    <a href="mailto:prospector@webnixo.net" className="text-sm text-primary underline underline-offset-4">Email us directly</a>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </section>

      </main>
    </div>
  </>);
};
export default Help;