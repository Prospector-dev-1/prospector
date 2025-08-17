import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Search, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description?: string;
  created_at: string;
  profiles?: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  credits: number;
}

export default function Credits() {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"credit" | "deduction">("credit");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([fetchTransactions(), fetchUsers()]);
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select(`
          *,
          profiles:user_id (
            email,
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch credit transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, email, first_name, last_name, credits')
        .order('email');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const addCreditTransaction = async () => {
    if (!selectedUser || !amount) {
      toast({
        title: "Error",
        description: "Please select a user and enter an amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const transactionAmount = type === "credit" ? parseInt(amount) : -parseInt(amount);
      
      const { error } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: selectedUser,
          amount: transactionAmount,
          type,
          description: description || `Manual ${type} by admin`
        });

      if (error) throw error;

      // Update user credits
      const user = users.find(u => u.user_id === selectedUser);
      if (user) {
        const newCredits = Math.max(0, user.credits + transactionAmount);
        await supabase
          .from('profiles')
          .update({ credits: newCredits })
          .eq('user_id', selectedUser);
      }

      toast({
        title: "Success",
        description: `${type === "credit" ? "Added" : "Deducted"} ${amount} credits successfully`,
      });

      // Reset form
      setSelectedUser("");
      setAmount("");
      setDescription("");
      
      // Refresh data
      fetchTransactions();
      fetchUsers();
    } catch (error) {
      console.error('Error adding credit transaction:', error);
      toast({
        title: "Error",
        description: "Failed to process credit transaction",
        variant: "destructive",
      });
    }
  };

  const filteredTransactions = transactions.filter(transaction =>
    transaction.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Credits</h1>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Credits</h1>
          <p className="text-muted-foreground">Manage user credits and transactions</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <DollarSign className="h-4 w-4 mr-2" />
              Add Credits
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Credit Transaction</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="user">Select User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.email} - {user.credits} credits
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="type">Transaction Type</Label>
                <Select value={type} onValueChange={(value: "credit" | "deduction") => setType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Add Credits</SelectItem>
                    <SelectItem value="deduction">Deduct Credits</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Reason for this transaction"
                />
              </div>
              
              <Button onClick={addCreditTransaction} className="w-full">
                {type === "credit" ? "Add Credits" : "Deduct Credits"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredTransactions.map((transaction) => (
          <Card key={transaction.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {transaction.type === "credit" ? (
                        <Plus className="h-4 w-4 text-green-500" />
                      ) : (
                        <Minus className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium">
                        {transaction.profiles?.email || 'Unknown User'}
                      </span>
                    </div>
                    <Badge variant={transaction.type === "credit" ? "default" : "destructive"}>
                      {transaction.type}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {transaction.description || 'No description'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(transaction.created_at).toLocaleDateString()} at {new Date(transaction.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-semibold ${
                    transaction.amount > 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                  </div>
                  <div className="text-xs text-muted-foreground">credits</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTransactions.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No transactions found matching your search.</p>
        </div>
      )}
    </div>
  );
}