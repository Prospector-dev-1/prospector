import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

interface AnalyticsData {
  userGrowth: Array<{ month: string; users: number }>;
  callsPerDay: Array<{ date: string; calls: number }>;
  subscriptionBreakdown: Array<{ name: string; value: number }>;
  averageScores: {
    overall: number;
    clarity: number;
    confidence: number;
    persuasiveness: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData>({
    userGrowth: [],
    callsPerDay: [],
    subscriptionBreakdown: [],
    averageScores: { overall: 0, clarity: 0, confidence: 0, persuasiveness: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      // Fetch user growth (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', sixMonthsAgo.toISOString());

      // Process user growth data
      const monthlyGrowth: { [key: string]: number } = {};
      profiles?.forEach(profile => {
        const month = new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        monthlyGrowth[month] = (monthlyGrowth[month] || 0) + 1;
      });

      const userGrowth = Object.entries(monthlyGrowth).map(([month, users]) => ({ month, users }));

      // Fetch calls per day (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: calls } = await supabase
        .from('calls')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const dailyCalls: { [key: string]: number } = {};
      calls?.forEach(call => {
        const date = new Date(call.created_at).toLocaleDateString();
        dailyCalls[date] = (dailyCalls[date] || 0) + 1;
      });

      const callsPerDay = Object.entries(dailyCalls).map(([date, calls]) => ({ date, calls }));

      // Fetch subscription breakdown
      const { data: subscriptions } = await supabase
        .from('profiles')
        .select('subscription_type');

      const subBreakdown: { [key: string]: number } = {};
      subscriptions?.forEach(sub => {
        const type = sub.subscription_type || 'free';
        subBreakdown[type] = (subBreakdown[type] || 0) + 1;
      });

      const subscriptionBreakdown = Object.entries(subBreakdown).map(([name, value]) => ({ name, value }));

      // Fetch average scores
      const { data: scoresData } = await supabase
        .from('calls')
        .select('overall_score, clarity_score, confidence_score, persuasiveness_score')
        .not('overall_score', 'is', null);

      const averageScores = {
        overall: 0,
        clarity: 0,
        confidence: 0,
        persuasiveness: 0
      };

      if (scoresData?.length) {
        averageScores.overall = scoresData.reduce((sum, call) => sum + (call.overall_score || 0), 0) / scoresData.length;
        averageScores.clarity = scoresData.reduce((sum, call) => sum + (call.clarity_score || 0), 0) / scoresData.length;
        averageScores.confidence = scoresData.reduce((sum, call) => sum + (call.confidence_score || 0), 0) / scoresData.length;
        averageScores.persuasiveness = scoresData.reduce((sum, call) => sum + (call.persuasiveness_score || 0), 0) / scoresData.length;
      }

      setData({
        userGrowth,
        callsPerDay,
        subscriptionBreakdown,
        averageScores
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-64 bg-muted rounded"></div>
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
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Detailed insights and performance metrics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Growth (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Call Volume (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.callsPerDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="calls" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.subscriptionBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.subscriptionBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Call Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Overall Score</span>
                <span className="font-semibold">{data.averageScores.overall.toFixed(1)}/10</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Clarity</span>
                <span className="font-semibold">{data.averageScores.clarity.toFixed(1)}/10</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Confidence</span>
                <span className="font-semibold">{data.averageScores.confidence.toFixed(1)}/10</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Persuasiveness</span>
                <span className="font-semibold">{data.averageScores.persuasiveness.toFixed(1)}/10</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}