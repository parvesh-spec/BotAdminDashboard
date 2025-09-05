import { useAuth } from "@/hooks/useAuth";
import { Bot, Users, LogOut } from "lucide-react";

export default function Sidebar() {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName.slice(0, 2).toUpperCase();
    }
    return "AD";
  };

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border">
      <div className="flex flex-col h-full">
        {/* Logo/Brand */}
        <div className="flex items-center px-6 py-4 border-b border-border">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
            <Bot className="text-primary-foreground" size={20} />
          </div>
          <h2 className="text-lg font-semibold text-foreground" data-testid="text-brand">Bot Admin</h2>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Management</div>
          
          <div className="flex items-center px-3 py-2 text-sm font-medium rounded-md bg-secondary text-foreground transition-colors group">
            <Users className="mr-3 text-muted-foreground group-hover:text-foreground" size={16} />
            <span data-testid="nav-users">Users</span>
          </div>

          {/* Future navigation items */}
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-3">Bot Settings</div>
          <div className="text-sm text-muted-foreground px-3 py-2">
            <i className="fas fa-cog mr-3 opacity-50"></i>
            Configuration <span className="text-xs">(Coming Soon)</span>
          </div>
          <div className="text-sm text-muted-foreground px-3 py-2">
            <i className="fas fa-chart-bar mr-3 opacity-50"></i>
            Analytics <span className="text-xs">(Coming Soon)</span>
          </div>
        </nav>

        {/* User Profile */}
        <div className="border-t border-border p-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-accent-foreground" data-testid="text-user-initials">
                {getInitials(user?.firstName, user?.lastName)}
              </span>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-foreground" data-testid="text-user-name">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : user?.email || "Admin User"}
              </p>
              <p className="text-xs text-muted-foreground" data-testid="text-user-email">
                {user?.email || "admin@example.com"}
              </p>
            </div>
            <button 
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
