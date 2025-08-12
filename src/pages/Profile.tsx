import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { User, Phone, CreditCard, History, Settings, LogOut, Edit, Save, X, Loader2 } from 'lucide-react';
interface Profile {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  credits: number;
  subscription_type: string | null;
  subscription_end: string | null;
  created_at: string;
  updated_at: string;
}
interface CallHistory {
  id: string;
  difficulty_level: number;
  duration_seconds: number | null;
  overall_score: number | null;
  successful_sale: boolean;
  created_at: string;
}
const Profile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    user,
    signOut
  } = useAuth();
  const {
    toast
  } = useToast();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [callHistory, setCallHistory] = useState<CallHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone_number: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    password: ''
  });
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchProfile();
    fetchCallHistory();
  }, [user, navigate]);
  const fetchProfile = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('*').eq('user_id', user?.id).single();
      if (error) throw error;
      setProfile(data);
      setEditForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone_number: data.phone_number || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const fetchCallHistory = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('calls').select('id, difficulty_level, duration_seconds, overall_score, successful_sale, created_at').eq('user_id', user?.id).order('created_at', {
        ascending: false
      }).limit(10);
      if (error) throw error;
      setCallHistory(data || []);
    } catch (error) {
      console.error('Error fetching call history:', error);
    }
  };
  const handleUpdateProfile = async () => {
    try {
      const {
        error
      } = await supabase.from('profiles').update({
        first_name: editForm.first_name || null,
        last_name: editForm.last_name || null,
        phone_number: editForm.phone_number || null,
        updated_at: new Date().toISOString()
      }).eq('user_id', user?.id);
      if (error) throw error;
      await fetchProfile();
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    }
  };
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword) {
      toast({
        title: "Error",
        description: "Please enter your current password",
        variant: "destructive"
      });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive"
      });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive"
      });
      return;
    }
    try {
      // First verify current password by trying to sign in
      const {
        error: signInError
      } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordForm.currentPassword
      });
      if (signInError) {
        toast({
          title: "Error",
          description: "Current password is incorrect",
          variant: "destructive"
        });
        return;
      }

      // Update password if current password is correct
      const {
        error
      } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });
      if (error) throw error;
      toast({
        title: "Success",
        description: "Password updated successfully"
      });
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordForm(false);
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive"
      });
    }
  };
  const handleEmailChange = async () => {
    if (!emailForm.newEmail) {
      toast({
        title: "Error",
        description: "Please enter a new email address",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.auth.updateUser({
        email: emailForm.newEmail
      });
      if (error) throw error;
      toast({
        title: "Success",
        description: "Confirmation email sent to your new email address. Please check your email to confirm the change."
      });
      setEmailForm({
        newEmail: '',
        password: ''
      });
      setShowEmailForm(false);
    } catch (error: any) {
      console.error('Error updating email:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update email",
        variant: "destructive"
      });
    }
  };
  const handleDataExport = async () => {
    try {
      // Get user profile and call history
      const [profileData, callsData] = await Promise.all([supabase.from('profiles').select('*').eq('user_id', user?.id), supabase.from('calls').select('*').eq('user_id', user?.id)]);
      const exportData = {
        profile: profileData.data?.[0] || {},
        calls: callsData.data || [],
        exported_at: new Date().toISOString()
      };

      // Create and download file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `prospector-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: "Success",
        description: "Your data has been downloaded successfully"
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive"
      });
    }
  };
  const handlePurchase = async (type: 'credits' | 'premium') => {
    if (!user) return;
    setPurchaseLoading(type);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceType: type
        }
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
  const handleDeleteAccount = async () => {
    const confirmed = window.confirm("Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data including call history, profile information, and credits.");
    if (!confirmed) return;
    const finalConfirm = window.confirm("This is your final warning. Type 'DELETE' in the next prompt to confirm account deletion.");
    if (!finalConfirm) return;
    const deleteConfirmation = window.prompt("Please type 'DELETE' (all caps) to confirm account deletion:");
    if (deleteConfirmation !== 'DELETE') {
      toast({
        title: "Account deletion cancelled",
        description: "Account deletion was cancelled because the confirmation text was incorrect."
      });
      return;
    }
    try {
      // Delete profile and calls (will cascade due to foreign key constraints)
      await supabase.from('profiles').delete().eq('user_id', user?.id);

      // Delete the user account
      const {
        error
      } = await supabase.auth.admin.deleteUser(user?.id || '');
      if (error) throw error;
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted."
      });

      // Sign out and redirect
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please contact support.",
        variant: "destructive"
      });
    }
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0m 0s';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };
  const getDifficultyColor = (level: number) => {
    if (level <= 3) return 'bg-green-500';
    if (level <= 6) return 'bg-yellow-500';
    if (level <= 8) return 'bg-orange-500';
    return 'bg-red-500';
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2">Loading profile...</p>
        </div>
      </div>;
  }
  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center">
        <p>Profile not found</p>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-3 sm:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Profile & Settings</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage your account and view your progress</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
            <TabsTrigger value="profile" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <User className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Profile</span>
              <span className="sm:hidden">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <History className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Call History</span>
              <span className="sm:hidden">History</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Subscription</span>
              <span className="sm:hidden">Plan</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Manage your personal details and contact information</CardDescription>
                  </div>
                  {!isEditing ? <Button variant="outline" onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button> : <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button onClick={handleUpdateProfile}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </div>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={profile.email} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground mt-1">Change email or password in Settings tab.</p>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" value={isEditing ? editForm.phone_number : profile.phone_number || 'Not set'} onChange={e => setEditForm(prev => ({
                    ...prev,
                    phone_number: e.target.value
                  }))} disabled={!isEditing} placeholder="Enter phone number" className={!isEditing ? "bg-muted" : ""} />
                  </div>
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={isEditing ? editForm.first_name : profile.first_name || 'Not set'} onChange={e => setEditForm(prev => ({
                    ...prev,
                    first_name: e.target.value
                  }))} disabled={!isEditing} placeholder="Enter first name" className={!isEditing ? "bg-muted" : ""} />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={isEditing ? editForm.last_name : profile.last_name || 'Not set'} onChange={e => setEditForm(prev => ({
                    ...prev,
                    last_name: e.target.value
                  }))} disabled={!isEditing} placeholder="Enter last name" className={!isEditing ? "bg-muted" : ""} />
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Member Since</Label>
                    <p className="text-sm text-muted-foreground">{formatDate(profile.created_at)}</p>
                  </div>
                  <div>
                    <Label>Last Updated</Label>
                    <p className="text-sm text-muted-foreground">{formatDate(profile.updated_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Call History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Practice Calls</CardTitle>
                <CardDescription>Your last 10 practice sessions</CardDescription>
              </CardHeader>
              <CardContent>
                {callHistory.length === 0 ? <div className="text-center py-8">
                    <p className="text-muted-foreground">No practice calls yet</p>
                    <Button className="mt-4" onClick={() => navigate('/call-simulation')}>
                      Start Your First Call
                    </Button>
                  </div> : <div className="space-y-4">
                    {callHistory.map(call => <div key={call.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className={`${getDifficultyColor(call.difficulty_level)} text-white`}>
                            Level {call.difficulty_level}
                          </Badge>
                          <div>
                            <p className="font-medium">
                              Score: {call.overall_score ? `${call.overall_score}/10` : 'N/A'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Duration: {formatDuration(call.duration_seconds)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {formatDate(call.created_at)}
                          </p>
                          <Badge variant={call.successful_sale ? "default" : "secondary"}>
                            {call.successful_sale ? "Sale Made" : "No Sale"}
                          </Badge>
                        </div>
                      </div>)}
                  </div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscription & Credits</CardTitle>
                <CardDescription>Manage your subscription and credit balance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Current Plan</Label>
                    <Badge variant={profile.subscription_type === 'premium' ? 'default' : 'secondary'}>
                      {profile.subscription_type?.toUpperCase() || 'FREE'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Label>Available Credits</Label>
                    <p className="text-2xl font-bold text-primary">{profile.credits}</p>
                  </div>
                </div>
                
                {profile.subscription_end && <div className="space-y-2">
                    <Label>Subscription Ends</Label>
                    <p className="text-sm text-muted-foreground">{formatDate(profile.subscription_end)}</p>
                  </div>}
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="font-medium">Actions</h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button variant="outline" className="w-full sm:w-auto" onClick={() => navigate('/buy-credits')}>
                      Buy Credits
                    </Button>
                    <Button variant="outline" className="w-full sm:w-auto" onClick={() => handlePurchase('premium')} disabled={!!purchaseLoading}>
                      {purchaseLoading === 'premium' ? <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </> : 'Upgrade to Premium - $19.99/month'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-3 sm:space-y-6">
            {/* Email Change Section */}
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Change Email Address</CardTitle>
                <CardDescription className="text-sm">Update your email address. You'll need to confirm the change via email.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-3 sm:p-6 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                  <div>
                    <p className="font-medium">Current Email</p>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                  </div>
                  {!showEmailForm ? <Button variant="outline" onClick={() => setShowEmailForm(true)}>
                      Change Email
                    </Button> : <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button variant="outline" className="w-full sm:w-auto" onClick={() => {
                    setShowEmailForm(false);
                    setEmailForm({
                      newEmail: '',
                      password: ''
                    });
                  }}>
                        Cancel
                      </Button>
                      <Button className="w-full sm:w-auto" onClick={handleEmailChange}>
                        Update Email
                      </Button>
                    </div>}
                </div>
                
                {showEmailForm && <div className="space-y-4 pt-4 border-t">
                    <div>
                      <Label htmlFor="newEmail">New Email Address</Label>
                      <Input id="newEmail" type="email" value={emailForm.newEmail} onChange={e => setEmailForm(prev => ({
                    ...prev,
                    newEmail: e.target.value
                  }))} placeholder="Enter new email address" />
                    </div>
                  </div>}
              </CardContent>
            </Card>

            {/* Password Change Section */}
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Change Password</CardTitle>
                <CardDescription className="text-sm">Update your account password. Use a strong password for better security.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-3 sm:p-6 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                  </p>
                    
                  </div>
                  {!showPasswordForm ? <Button variant="outline" onClick={() => setShowPasswordForm(true)}>
                      Change Password
                    </Button> : <div className="flex gap-2">
                      <Button variant="outline" onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordForm({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                  }}>
                        Cancel
                      </Button>
                      <Button onClick={handlePasswordChange}>
                        Update Password
                      </Button>
                    </div>}
                </div>
                
                {showPasswordForm && <div className="space-y-4 pt-4 border-t">
                    <div>
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input id="currentPassword" type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm(prev => ({
                    ...prev,
                    currentPassword: e.target.value
                  }))} placeholder="Enter current password" />
                    </div>
                    <div>
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input id="newPassword" type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm(prev => ({
                    ...prev,
                    newPassword: e.target.value
                  }))} placeholder="Enter new password (min 8 characters)" />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input id="confirmPassword" type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(prev => ({
                    ...prev,
                    confirmPassword: e.target.value
                  }))} placeholder="Confirm new password" />
                    </div>
                  </div>}
              </CardContent>
            </Card>
            
            <Separator />
            
            {/* Data Export Section */}
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Data Export</CardTitle>
                <CardDescription className="text-sm">Download your personal data and call history</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-3 sm:p-6 sm:space-y-4">
                <Button variant="outline" onClick={handleDataExport}>
                  Download My Data
                </Button>
              </CardContent>
            </Card>
            
            {/* Danger Zone */}
            <Card>
              <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-6">
                <CardTitle className="text-base sm:text-lg text-red-600">Danger Zone</CardTitle>
                <CardDescription className="text-sm">Irreversible account actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-3 sm:p-6 sm:space-y-4">
                <Button variant="destructive" onClick={handleDeleteAccount}>
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>;
};
export default Profile;