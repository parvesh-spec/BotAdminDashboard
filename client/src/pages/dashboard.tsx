import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/Sidebar";
import UserStats from "@/components/UserStats";
import UserTable from "@/components/UserTable";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/bot-users"] });
    queryClient.invalidateQueries({ queryKey: ["/api/bot-users/stats"] });
    toast({
      title: "Data Refreshed",
      description: "User data has been updated",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className="ml-64">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">Users</h1>
              <p className="text-sm text-muted-foreground">Manage and track bot users and their sources</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-secondary px-3 py-2 rounded-md">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="text-sm font-medium text-foreground" data-testid="status-bot">Bot Online</span>
              </div>
              <Button 
                onClick={handleRefresh}
                className="text-sm font-medium"
                data-testid="button-refresh"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="p-6">
          <UserStats />
          <div className="mt-6">
            <UserTable />
          </div>
        </div>
      </div>
    </div>
  );
}
