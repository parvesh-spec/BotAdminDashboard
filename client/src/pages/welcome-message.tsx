import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MessageSquare, Plus, Save, Trash2, Eye, Send, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/Sidebar";
import type { WelcomeMessage } from "@shared/schema";

const welcomeMessageSchema = z.object({
  source: z.string().min(1, "Source is required"),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Welcome message is required").max(4096, "Message is too long"),
  buttonText: z.string().optional(),
  buttonLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  isEnabled: z.string().default("true"),
});

type WelcomeMessageForm = z.infer<typeof welcomeMessageSchema>;

export default function WelcomeMessage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSource, setSelectedSource] = useState("default");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingMessage, setEditingMessage] = useState<WelcomeMessage | null>(null);

  const { data: welcomeMessages = [], isLoading } = useQuery<WelcomeMessage[]>({
    queryKey: ["/api/welcome-messages"],
  });

  const form = useForm<WelcomeMessageForm>({
    resolver: zodResolver(welcomeMessageSchema),
    defaultValues: {
      source: "",
      title: "",
      message: "Welcome to our Telegram bot! 🤖\n\nHere are some things you can do:\n• Get help and support\n• Explore our features\n• Stay updated with latest news\n\nFeel free to ask any questions!",
      buttonText: "",
      buttonLink: "",
      isEnabled: "true",
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: WelcomeMessageForm) => 
      apiRequest("PUT", "/api/welcome-message", data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Welcome message updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/welcome-messages"] });
      setShowCreateDialog(false);
      setEditingMessage(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update welcome message",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/welcome-message/${id}`),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Welcome message deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/welcome-messages"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete welcome message",
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

  const handleEdit = (message: WelcomeMessage) => {
    setEditingMessage(message);
    form.reset({
      source: message.source,
      title: message.title || "",
      message: message.message,
      buttonText: message.buttonText || "",
      buttonLink: message.buttonLink || "",
      isEnabled: message.isEnabled,
    });
    setShowCreateDialog(true);
  };

  const handleCreateNew = () => {
    setEditingMessage(null);
    form.reset({
      source: "",
      title: "",
      message: "Welcome to our Telegram bot! 🤖\n\nHere are some things you can do:\n• Get help and support\n• Explore our features\n• Stay updated with latest news\n\nFeel free to ask any questions!",
      buttonText: "",
      buttonLink: "",
      isEnabled: "true",
    });
    setShowCreateDialog(true);
  };

  const getSourceColor = (source: string) => {
    const colors = {
      default: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      facebookads: "bg-blue-600 text-white",
      referral: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      googleads: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      organic: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    };
    return colors[source as keyof typeof colors] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  };

  const currentMessage = welcomeMessages.find(m => m.source === selectedSource) || welcomeMessages.find(m => m.source === "default");

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-96 bg-muted rounded"></div>
              <div className="h-96 bg-muted rounded"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center mr-4">
                <MessageSquare className="text-primary-foreground" size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
                  Welcome Messages
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Manage source-specific welcome messages for your Telegram bot
                </p>
              </div>
            </div>
            <Button onClick={handleCreateNew} data-testid="button-create-message">
              <Plus className="mr-2" size={16} />
              New Message
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel - Message List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Message Sources</CardTitle>
                  <CardDescription>
                    {welcomeMessages.length} configured messages
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-2 p-4">
                    {welcomeMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedSource === message.source
                            ? "bg-primary/10 border-primary"
                            : "bg-muted/50 border-border hover:bg-muted"
                        }`}
                        onClick={() => setSelectedSource(message.source)}
                        data-testid={`source-item-${message.source}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Badge className={getSourceColor(message.source)}>
                              {message.source}
                            </Badge>
                            <div className="flex items-center space-x-2">
                              {message.isEnabled === "true" ? (
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              ) : (
                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(message);
                              }}
                              data-testid={`button-edit-${message.source}`}
                            >
                              <Edit3 size={14} />
                            </Button>
                            {message.source !== "default" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMutation.mutate(message.id);
                                }}
                                data-testid={`button-delete-${message.source}`}
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-sm font-medium text-foreground">
                            {message.title || `${message.source} Message`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {message.message.substring(0, 60)}...
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {welcomeMessages.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="mx-auto mb-2" size={24} />
                        <p>No welcome messages configured</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCreateNew}
                          className="mt-2"
                        >
                          Create First Message
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Preview & Details */}
            <div className="lg:col-span-2 space-y-6">
              {currentMessage ? (
                <>
                  {/* Message Details */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center space-x-3">
                            <Badge className={getSourceColor(currentMessage.source)}>
                              {currentMessage.source}
                            </Badge>
                            <span>{currentMessage.title || `${currentMessage.source} Message`}</span>
                          </CardTitle>
                          <CardDescription className="mt-1">
                            This message will be sent to users who start the bot with source: {currentMessage.source}
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => testMutation.mutate()}
                            disabled={testMutation.isPending}
                            data-testid="button-test-message"
                          >
                            <Send className="mr-2" size={16} />
                            {testMutation.isPending ? "Testing..." : "Test"}
                          </Button>
                          <Button
                            onClick={() => handleEdit(currentMessage)}
                            data-testid="button-edit-current"
                          >
                            <Edit3 className="mr-2" size={16} />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">Status:</span>
                            <Badge variant={currentMessage.isEnabled === "true" ? "default" : "secondary"}>
                              {currentMessage.isEnabled === "true" ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="text-muted-foreground">
                            Created: {new Date(currentMessage.createdAt).toLocaleDateString()}
                          </div>
                          {currentMessage.updatedAt && (
                            <div className="text-muted-foreground">
                              Updated: {new Date(currentMessage.updatedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">Message Content:</h4>
                          <div className="bg-muted rounded-lg p-4">
                            <pre className="whitespace-pre-wrap text-sm font-mono">
                              {currentMessage.message}
                            </pre>
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            {currentMessage.message.length}/4096 characters
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Preview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Eye className="mr-2" size={16} />
                        Telegram Preview
                      </CardTitle>
                      <CardDescription>
                        How this message will appear to users on Telegram
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg p-4 border">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 max-w-sm">
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-bold">🤖</span>
                            </div>
                            <div>
                              <div className="font-semibold text-sm">Your Bot</div>
                              <div className="text-xs text-green-500">● online</div>
                            </div>
                          </div>
                          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                            <div className="whitespace-pre-wrap text-sm" data-testid="text-message-preview">
                              {currentMessage.message.replace(/\{firstName\}/g, "John")}
                            </div>
                            {currentMessage.buttonText && currentMessage.buttonLink && (
                              <div className="mt-3">
                                <button className="bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium">
                                  {currentMessage.buttonText}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <MessageSquare className="mx-auto mb-4 text-muted-foreground" size={48} />
                    <h3 className="text-lg font-semibold mb-2">No Message Selected</h3>
                    <p className="text-muted-foreground mb-4">
                      Select a message from the list or create a new one to get started.
                    </p>
                    <Button onClick={handleCreateNew}>
                      <Plus className="mr-2" size={16} />
                      Create Welcome Message
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingMessage ? "Edit Welcome Message" : "Create Welcome Message"}
            </DialogTitle>
            <DialogDescription>
              Configure a welcome message for users who start your bot from a specific source.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., facebookads, referral"
                          disabled={editingMessage?.source === "default"}
                          data-testid="input-source"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Facebook Ads Welcome"
                          data-testid="input-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                        className="min-h-[160px] font-mono text-sm"
                        data-testid="textarea-welcome-message"
                      />
                    </FormControl>
                    <FormMessage />
                    <div className="text-xs text-muted-foreground">
                      {field.value?.length || 0}/4096 characters • Use {"{firstName}"} for personalization
                    </div>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="buttonText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Button Text (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Visit Website"
                          data-testid="input-button-text"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="buttonLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Button Link (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://example.com"
                          data-testid="input-button-link"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Message</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        When enabled, this message will be sent to users from this source
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value === "true"}
                        onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                        data-testid="switch-enabled"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-save-message"
                >
                  <Save className="mr-2" size={16} />
                  {updateMutation.isPending ? "Saving..." : editingMessage ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}