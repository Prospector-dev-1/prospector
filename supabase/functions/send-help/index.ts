import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SUPPORT_TO_EMAIL = Deno.env.get("SUPPORT_TO_EMAIL") || "prospector@webnixo.net";
const SUPPORT_FROM_EMAIL = Deno.env.get("SUPPORT_FROM_EMAIL") || "Support <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HelpRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!Deno.env.get("RESEND_API_KEY")) {
      throw new Error("Missing RESEND_API_KEY env var");
    }

    const { name, email, subject, message } = (await req.json()) as HelpRequest;

    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emailResponse = await resend.emails.send({
      from: SUPPORT_FROM_EMAIL,
      to: [SUPPORT_TO_EMAIL],
      reply_to: email,
      subject: `[Help] ${subject}`,
      html: `
        <h2>New Help Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br/>')}</p>
      `,
    });

    // Handle Resend API errors explicitly
    if ((emailResponse as any)?.error) {
      console.error("Resend send-help error:", (emailResponse as any).error);
      return new Response(
        JSON.stringify({ error: (emailResponse as any).error?.message || "Email sending failed" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("send-help error:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
