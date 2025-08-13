import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Check, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import SEO from '@/components/SEO';

interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  popular?: boolean;
  bonus?: number;
  savings?: string;
}

const creditPackages: CreditPackage[] = [
  {
    id: 'starter',
    credits: 5,
    price: 499, // $4.99
  },
  {
    id: 'value',
    credits: 15,
    price: 949, // $9.49
    savings: '37%'
  },
  {
    id: 'popular',
    credits: 40,
    price: 1499, // $14.99
    popular: true,
    savings: '62%'
  },
  {
    id: 'premium',
    credits: 100,
    price: 1949, // $19.49
    savings: '81%'
  }
];

const BuyCredits = () => {
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const handlePurchase = async (packageId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to purchase credits",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }
    
    setPurchaseLoading(packageId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceType: 'credits', packageId }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Error",
        description: "Failed to start checkout process",
        variant: "destructive"
      });
    } finally {
      setPurchaseLoading(null);
    }
  };

  return (<>
    <SEO title="Buy Credits | Prospector" description="Purchase credits for AI script analysis and call simulations." canonicalPath="/buy-credits" />
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="container mx-auto max-w-6xl py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Buy Credits</h1>
            <p className="text-lg text-muted-foreground mb-2">
              Choose the perfect credit package for your needs
            </p>
            {profile && (
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
                <Zap className="h-4 w-4" />
                Current Balance: {Math.floor(profile.credits)} credits
              </div>
            )}
          </div>
        </div>

        {/* Credit Packages */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {creditPackages.map((pkg) => (
            <Card 
              key={pkg.id} 
              className={`relative transition-all duration-300 hover:shadow-lg ${
                pkg.popular ? 'ring-2 ring-primary' : ''
              }`}
            >
              {pkg.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">
                  {pkg.credits} Credits
                </CardTitle>
              </CardHeader>

              <CardContent className="text-center space-y-4">
                <div>
                  <div className="text-3xl font-bold">
                    ${(pkg.price / 100).toFixed(2)}
                  </div>
                  {pkg.savings && (
                    <div className="text-sm text-green-600 font-medium">
                      Save {pkg.savings}
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Perfect for script analysis</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Call simulations</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Never expires</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  variant={pkg.popular ? "default" : "outline"}
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={!!purchaseLoading}
                >
                  {purchaseLoading === pkg.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Purchase Now'
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Info */}
        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>All purchases are secured by Stripe. Credits never expire.</p>
          <p>Credits are non refundable.</p>
          <p>Need help? Contact our support team.</p>
        </div>

        {/* View Plans Button */}
        <div className="text-center mt-8">
          <Button
            variant="outline"
            onClick={() => navigate('/plans')}
            className="px-8"
          >
            View Subscription Plans
          </Button>
        </div>
      </div>
    </div>
    </>
  );
};

export default BuyCredits;