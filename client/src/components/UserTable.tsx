import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Eye, Send, ChevronLeft, ChevronRight } from "lucide-react";
import type { BotUser } from "@shared/schema";

interface BotUsersResponse {
  users: BotUser[];
  total: number;
  page: number;
  totalPages: number;
}

export default function UserTable() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: usersData, isLoading } = useQuery<BotUsersResponse>({
    queryKey: ["/api/bot-users", { search, source: sourceFilter === "all" ? "" : sourceFilter, page, limit }],
  });

  const { data: sources } = useQuery<string[]>({
    queryKey: ["/api/bot-users/sources"],
  });

  const getInitials = (firstName?: string, lastName?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName.slice(0, 2).toUpperCase();
    }
    return "?";
  };

  const getSourceBadgeVariant = (source: string) => {
    switch (source.toLowerCase()) {
      case "direct":
        return "secondary";
      case "referral":
        return "default";
      case "social media":
        return "destructive";
      case "advertisement":
        return "outline";
      default:
        return "secondary";
    }
  };

  const formatTimeAgo = (date: string | Date) => {
    const now = new Date();
    const past = new Date(date);
    const diffInHours = Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground" data-testid="text-table-title">
              User List
            </h3>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 text-sm w-64"
                  data-testid="input-search"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
              </div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-40" data-testid="select-source-filter">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {sources?.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersData?.users?.length ? (
                usersData.users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/50" data-testid={`row-user-${user.id}`}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-foreground">
                            {getInitials(user.firstName || "", user.lastName || "")}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-foreground" data-testid={`text-user-name-${user.id}`}>
                            {user.firstName && user.lastName 
                              ? `${user.firstName} ${user.lastName}` 
                              : user.username || "Unknown User"}
                          </div>
                          <div className="text-sm text-muted-foreground" data-testid={`text-telegram-id-${user.id}`}>
                            {user.username ? `@${user.username}` : user.telegramId}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSourceBadgeVariant(user.source)} data-testid={`badge-source-${user.id}`}>
                        {user.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground" data-testid={`text-joined-${user.id}`}>
                      {formatTimeAgo(user.joinedAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground" data-testid={`text-last-active-${user.id}`}>
                      {user.lastActiveAt ? formatTimeAgo(user.lastActiveAt) : "Never"}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.isActive === "active" ? "default" : "secondary"}
                        className={user.isActive === "active" ? "bg-accent/10 text-accent" : ""}
                        data-testid={`badge-status-${user.id}`}
                      >
                        {user.isActive === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary/80"
                          data-testid={`button-view-${user.id}`}
                        >
                          <Eye size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground"
                          data-testid={`button-message-${user.id}`}
                        >
                          <Send size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {search || sourceFilter !== "all" ? "No users found matching your filters" : "No bot users yet"}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {usersData && usersData.total > 0 && (
          <div className="bg-card px-6 py-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                Showing <span className="font-medium">{((page - 1) * limit) + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(page * limit, usersData.total)}
                </span> of{" "}
                <span className="font-medium">{usersData.total}</span> results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft size={16} />
                  Previous
                </Button>
                
                {Array.from({ length: Math.min(5, usersData.totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      data-testid={`button-page-${pageNum}`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(usersData.totalPages, page + 1))}
                  disabled={page === usersData.totalPages}
                  data-testid="button-next-page"
                >
                  Next
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
