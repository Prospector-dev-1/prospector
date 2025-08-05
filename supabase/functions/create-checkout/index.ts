import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create a Supabase client using the anon key
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const { priceType, packageId } = await req.json();
    
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    let lineItems;
    if (priceType === 'credits') {
      // Credit packages with different amounts
      const creditPackages = {
        starter: { credits: 5, price: 499, name: "5 Credits" },
        value: { credits: 15, price: 949, name: "15 Credits" },
        popular: { credits: 40, price: 1499, name: "40 Credits" },
        premium: { credits: 100, price: 1949, name: "100 Credits" }
      };
      
      const selectedPackage = creditPackages[packageId as keyof typeof creditPackages];
      if (!selectedPackage) throw new Error("Invalid package selected");
      
      lineItems = [{
        price_data: {
          currency: "usd",
          product_data: { name: selectedPackage.name },
          unit_amount: selectedPackage.price,
        },
        quantity: 1,
      }];
    } else {
      // Premium subscription
      lineItems = [{
        price_data: {
          currency: "usd",
          product_data: { name: "Premium Subscription" },
          unit_amount: 1999, // $19.99
          recurring: { interval: "month" },
        },
        quantity: 1,
      }];
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: priceType === 'credits' ? "payment" : "subscription",
      success_url: `${req.headers.get("origin")}/profile?tab=subscription&success=true`,
      cancel_url: `${req.headers.get("origin")}/profile?tab=subscription&canceled=true`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});