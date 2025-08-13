import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, Star, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import SEO from '@/components/SEO';
const Plans = () => {
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const handlePurchase = async (planType: string) => {
    if (!user) {
      toast.error("Please sign in to purchase a subscription");
      navigate('/auth');
      return;
    }
    setPurchaseLoading(planType);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceType: 'subscription',
          packageId: planType
        }
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        toast.error("Failed to create checkout session");
      }
    } catch (error: any) {
      console.error('Subscription purchase error:', error);
      toast.error(error.message || "Failed to start subscription process");
    } finally {
      setPurchaseLoading(null);
    }
  };
  // Base pricing: 5 credits = $4.99, so 1 credit = $0.998
  const baseCreditPrice = 4.99 / 5; // $0.998 per credit
  
  const plans = [{
    id: 'beginner',
    name: 'Beginner Bundle',
    price: '$14.99',
    period: '/month',
    description: 'Perfect for getting started with sales training',
    popular: true,
    savings: '70%', // 50 credits would cost $49.90 individually, saving $34.91
    features: ['50 credits per month', 'Credits expire at month end', 'Unlimited Objection Coaching', '1 free Custom Script per month', 'Basic analytics dashboard', 'Email support'],
    buttonText: 'Start Beginner Bundle',
    buttonVariant: 'default' as const
  }, {
    id: 'premium',
    name: 'Premium Plan',
    price: '$19.99',
    period: '/month',
    description: 'Full access to all features and unlimited usage',
    popular: false,
    savings: 'Best Value', // Unlimited credits for fixed price
    features: ['Unlimited practice calls', 'Unlimited objection coaching', 'Unlimited custom scripts', 'Advanced analytics & insights', 'Call recording & playback', 'Priority support', 'Early access to new features'],
    buttonText: 'Upgrade to Premium',
    buttonVariant: 'outline' as const
  }];
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Subscription Plans - Choose Your Sales Training Plan" description="Choose from our Beginner Bundle or Premium Plan. Get unlimited access to AI-powered sales training, objection coaching, and custom scripts." />
      
      <div className="container mx-auto px-4 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock your sales potential with our AI-powered training platform. 
            Choose the plan that fits your learning style and budget.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map(plan => <Card key={plan.id} className={`relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}>
              {plan.popular && <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1">
                    <Star className="w-4 h-4 mr-1" />
                    Most Popular
                  </Badge>
                </div>}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-base">{plan.description}</CardDescription>
                <div className="flex items-baseline justify-center mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-1">{plan.period}</span>
                </div>
                {plan.savings && (
                  <div className="mt-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                      Save {plan.savings}
                    </Badge>
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => <li key={index} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>)}
                </ul>
                
                <Button className="w-full" variant={plan.buttonVariant} onClick={() => handlePurchase(plan.id)} disabled={purchaseLoading === plan.id}>
                  {purchaseLoading === plan.id ? <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </> : plan.buttonText}
                </Button>
              </CardContent>
            </Card>)}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            Need more credits without a subscription?
          </p>
          <Button variant="outline" onClick={() => navigate('/buy-credits')}>
            Buy Credits Instead
          </Button>
        </div>

        <div className="mt-16 bg-card rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">What happens to unused credits?</h3>
              <p className="text-sm text-muted-foreground">Beginner Bundle credits expire at the end of each month. Premium plan includes non expireable credits.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I change plans anytime?</h3>
              <p className="text-sm text-muted-foreground">
                Yes, you can upgrade or downgrade your plan at any time from your profile page.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What's included in objection coaching?</h3>
              <p className="text-sm text-muted-foreground">
                AI-powered analysis of your call performance with personalized coaching tips and strategies.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">How do custom scripts work?</h3>
              <p className="text-sm text-muted-foreground">
                AI generates personalized sales scripts based on your industry, product, and target audience.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Plans;