import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Users, UserPlus, Link, Send } from "lucide-react";

interface BotUserStats {
  totalUsers: number;
  todayUsers: number;
  activeSources: number;
  messagesSent: number;
  todayGrowth: number;
  weeklyGrowth: number;
}

export default function UserStats() {
  const { data: stats, isLoading } = useQuery<BotUserStats>({
    queryKey: ["/api/bot-users/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      change: `+${stats?.weeklyGrowth || 0}%`,
      changeText: "from last week",
      bgColor: "bg-primary/10",
      iconColor: "text-primary"
    },
    {
      title: "Today's New Users",
      value: stats?.todayUsers || 0,
      icon: UserPlus,
      change: `+${stats?.todayGrowth || 0}`,
      changeText: "since yesterday",
      bgColor: "bg-accent/10",
      iconColor: "text-accent"
    },
    {
      title: "Active Sources",
      value: stats?.activeSources || 0,
      icon: Link,
      change: "tracking enabled",
      changeText: "",
      bgColor: "bg-secondary",
      iconColor: "text-muted-foreground"
    },
    {
      title: "Messages Sent",
      value: stats?.messagesSent || 0,
      icon: Send,
      change: `+${Math.floor((stats?.messagesSent || 0) * 0.02)}`,
      changeText: "today",
      bgColor: "bg-secondary",
      iconColor: "text-muted-foreground"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground" data-testid={`text-stat-title-${index}`}>
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-foreground" data-testid={`text-stat-value-${index}`}>
                  {stat.value.toLocaleString()}
                </p>
              </div>
              <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                <stat.icon className={stat.iconColor} size={24} />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-accent" data-testid={`text-stat-change-${index}`}>
                {stat.change}
              </span>
              {stat.changeText && (
                <span className="text-muted-foreground ml-1">{stat.changeText}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
