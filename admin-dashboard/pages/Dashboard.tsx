import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/ui/stats-card";
import { Users, CreditCard, Activity, TrendingUp } from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalCalls: number;
  totalCreditsUsed: number;
  activeUsers: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalCalls: 0,
    totalCreditsUsed: 0,
    activeUsers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch total calls
      const { count: totalCalls } = await supabase
        .from('calls')
        .select('*', { count: 'exact', head: true });

      // Fetch active users (users who made calls in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: activeUsersData } = await supabase
        .from('calls')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const activeUsers = new Set(activeUsersData?.map(call => call.user_id) || []).size;

      // Calculate total credits used (sum of all credit transactions with type 'deduction')
      const { data: creditTransactions } = await supabase
        .from('credit_transactions')
        .select('amount')
        .eq('type', 'deduction');

      const totalCreditsUsed = creditTransactions?.reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0) || 0;

      setStats({
        totalUsers: totalUsers || 0,
        totalCalls: totalCalls || 0,
        totalCreditsUsed,
        activeUsers
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your Prospector application</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          label="Total Users"
          value={stats.totalUsers}
          icon={Users}
          variant="default"
        />
        <StatsCard
          label="Total Calls"
          value={stats.totalCalls}
          icon={Activity}
          variant="info"
        />
        <StatsCard
          label="Credits Used"
          value={stats.totalCreditsUsed}
          icon={CreditCard}
          variant="warning"
        />
        <StatsCard
          label="Active Users (30d)"
          value={stats.activeUsers}
          icon={TrendingUp}
          variant="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Recent user activities and system events will be displayed here.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">System performance metrics and health indicators.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}