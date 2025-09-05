import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MessageSquare, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/Sidebar";

const welcomeMessageSchema = z.object({
  message: z.string().min(1, "Welcome message is required").max(4096, "Message is too long"),
  isEnabled: z.boolean().default(true),
});

type WelcomeMessageForm = z.infer<typeof welcomeMessageSchema>;

export default function WelcomeMessage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: welcomeMessage, isLoading } = useQuery<{
    id?: string;
    message: string;
    isEnabled: boolean;
  }>({
    queryKey: ["/api/welcome-message"],
    retry: false,
  });

  const form = useForm<WelcomeMessageForm>({
    resolver: zodResolver(welcomeMessageSchema),
    defaultValues: {
      message: welcomeMessage?.message || "Welcome to our Telegram bot! 🤖\n\nHere are some things you can do:\n• Get help and support\n• Explore our features\n• Stay updated with latest news\n\nFeel free to ask any questions!",
      isEnabled: welcomeMessage?.isEnabled ?? true,
    },
  });

  // Reset form when data loads
  useState(() => {
    if (welcomeMessage) {
      form.reset({
        message: welcomeMessage.message,
        isEnabled: welcomeMessage.isEnabled,
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: WelcomeMessageForm) => 
      apiRequest("PUT", "/api/welcome-message", data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Welcome message updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/welcome-message"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update welcome message",
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/welcome-message/test"),
    onSuccess: () => {
      toast({
        title: "Test sent",
        description: "Test welcome message sent! Check your Telegram bot.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test failed",
        description: error.message || "Failed to send test message",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WelcomeMessageForm) => {
    updateMutation.mutate(data);
  };

  const resetToDefault = () => {
    form.reset({
      message: "Welcome to our Telegram bot! 🤖\n\nHere are some things you can do:\n• Get help and support\n• Explore our features\n• Stay updated with latest news\n\nFeel free to ask any questions!",
      isEnabled: true,
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-8">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center mr-4">
              <MessageSquare className="text-primary-foreground" size={20} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">
                Welcome Message
              </h1>
              <p className="text-muted-foreground mt-1">
                Customize the message new users receive when they start your bot
              </p>
            </div>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Message Configuration</CardTitle>
                <CardDescription>
                  Set up the welcome message that will be sent to new users when they first interact with your bot.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">Loading...</div>
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Welcome Message</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Enter your welcome message..."
                                className="min-h-[200px] font-mono text-sm"
                                data-testid="textarea-welcome-message"
                              />
                            </FormControl>
                            <FormMessage />
                            <div className="text-xs text-muted-foreground">
                              {field.value?.length || 0}/4096 characters
                            </div>
                          </FormItem>
                        )}
                      />

                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="submit"
                          disabled={updateMutation.isPending}
                          data-testid="button-save"
                        >
                          <Save className="mr-2" size={16} />
                          {updateMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={resetToDefault}
                          data-testid="button-reset"
                        >
                          <RotateCcw className="mr-2" size={16} />
                          Reset to Default
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => testMutation.mutate()}
                          disabled={testMutation.isPending}
                          data-testid="button-test"
                        >
                          {testMutation.isPending ? "Sending..." : "Send Test Message"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  This is how your welcome message will appear to users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-4 border-l-4 border-primary">
                  <div className="font-semibold text-sm text-muted-foreground mb-2">
                    🤖 Bot Message
                  </div>
                  <div className="whitespace-pre-wrap text-sm" data-testid="text-message-preview">
                    {form.watch("message") || "Welcome message will appear here..."}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}