import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Edit, Save, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  credits: number;
  subscription_type: string;
  subscription_end?: string;
  phone_number?: string;
  avatar_url?: string;
  created_at: string;
}

const AdminUsers = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (isAdmin && !adminLoading) {
      fetchUsers();
    }
  }, [isAdmin, adminLoading]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (user: UserProfile) => {
    setEditingUser(user.id);
    setEditForm(user);
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditForm({});
  };

  const saveUser = async () => {
    if (!editForm.id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          phone_number: editForm.phone_number,
          credits: editForm.credits,
          subscription_type: editForm.subscription_type,
          subscription_end: editForm.subscription_end,
        })
        .eq('id', editForm.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      setEditingUser(null);
      setEditForm({});
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Admin: User Management</h1>
          <Badge variant="secondary" className="px-3 py-1">
            {filteredUsers.length} users
          </Badge>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search users by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-4">
          {filteredUsers.map((user) => (
            <Card key={user.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div>
                    <span className="text-lg">{user.first_name} {user.last_name}</span>
                    <span className="text-sm text-muted-foreground ml-2">({user.email})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={user.subscription_type === 'premium' ? 'default' : 'secondary'}>
                      {user.subscription_type}
                    </Badge>
                    {editingUser === user.id ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveUser}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditing}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startEditing(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editingUser === user.id ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        value={editForm.first_name || ''}
                        onChange={(e) => setEditForm({...editForm, first_name: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        value={editForm.last_name || ''}
                        onChange={(e) => setEditForm({...editForm, last_name: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={editForm.phone_number || ''}
                        onChange={(e) => setEditForm({...editForm, phone_number: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="credits">Credits</Label>
                      <Input
                        id="credits"
                        type="number"
                        value={editForm.credits || 0}
                        onChange={(e) => setEditForm({...editForm, credits: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="subscription">Subscription</Label>
                      <Input
                        id="subscription"
                        value={editForm.subscription_type || ''}
                        onChange={(e) => setEditForm({...editForm, subscription_type: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="subscription_end">Subscription End</Label>
                      <Input
                        id="subscription_end"
                        type="datetime-local"
                        value={editForm.subscription_end ? new Date(editForm.subscription_end).toISOString().slice(0, 16) : ''}
                        onChange={(e) => setEditForm({...editForm, subscription_end: e.target.value ? new Date(e.target.value).toISOString() : undefined})}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Credits:</span>
                      <div className="font-medium">{user.credits}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone:</span>
                      <div className="font-medium">{user.phone_number || 'Not provided'}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Subscription End:</span>
                      <div className="font-medium">
                        {user.subscription_end ? new Date(user.subscription_end).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Joined:</span>
                      <div className="font-medium">{new Date(user.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No users found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;