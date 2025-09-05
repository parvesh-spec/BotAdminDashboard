import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
              <Bot className="text-2xl text-primary-foreground" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Bot Admin Dashboard</h1>
            <p className="text-muted-foreground">Sign in to manage your Telegram bot</p>
          </div>

          <Button 
            onClick={handleLogin}
            className="w-full"
            data-testid="button-login"
          >
            Sign In
          </Button>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Secure admin access for bot management
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
