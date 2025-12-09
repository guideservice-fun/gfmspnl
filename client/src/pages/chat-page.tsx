import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { MainLayout } from "@/components/layout/main-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  Paperclip, 
  Trash2, 
  Image as ImageIcon, 
  Video, 
  Link as LinkIcon,
  X,
  Loader2,
  ExternalLink
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { MessageWithSender } from "@shared/schema";

export default function ChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const { data: messages = [], isLoading } = useQuery<MessageWithSender[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 5000, // Fallback polling
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const connect = () => {
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        console.log("WebSocket connected");
      };
      
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "new_message" || data.type === "delete_message") {
          queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
        }
      };
      
      socket.onclose = () => {
        console.log("WebSocket disconnected, reconnecting...");
        setTimeout(connect, 3000);
      };
      
      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
      
      wsRef.current = socket;
    };
    
    connect();
    
    return () => {
      wsRef.current?.close();
    };
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/messages", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to send message");
      }
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      setAttachedFile(null);
      setAttachedPreview(null);
      setLinkUrl("");
      setShowLinkInput(false);
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      await apiRequest("DELETE", `/api/messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSend = () => {
    if (!message.trim() && !attachedFile && !linkUrl) return;

    const formData = new FormData();
    
    if (attachedFile) {
      formData.append("file", attachedFile);
      formData.append("messageType", attachedFile.type.startsWith("video") ? "video" : "image");
    } else if (linkUrl) {
      formData.append("content", linkUrl);
      formData.append("messageType", "link");
    } else {
      formData.append("content", message);
      formData.append("messageType", "text");
    }
    
    sendMessageMutation.mutate(formData);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Error", description: "File size must be less than 10MB", variant: "destructive" });
        return;
      }
      setAttachedFile(file);
      const preview = URL.createObjectURL(file);
      setAttachedPreview(preview);
      setShowLinkInput(false);
    }
  };

  const handleAddLink = () => {
    if (linkUrl) {
      handleSend();
    }
    setShowLinkInput(false);
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString("en-US", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  };

  const isLinkValid = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const renderMessageContent = (msg: MessageWithSender) => {
    if (msg.isDeleted) {
      return (
        <p className="text-muted-foreground italic text-sm">This message was deleted</p>
      );
    }

    switch (msg.messageType) {
      case "image":
        return (
          <Dialog>
            <DialogTrigger asChild>
              <img 
                src={msg.mediaUrl || ""} 
                alt="Shared image"
                className="max-w-[300px] rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                data-testid={`img-message-${msg.id}`}
              />
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <img 
                src={msg.mediaUrl || ""} 
                alt="Shared image"
                className="w-full h-auto"
              />
            </DialogContent>
          </Dialog>
        );
      case "video":
        return (
          <video 
            src={msg.mediaUrl || ""} 
            controls 
            className="max-w-[400px] rounded-md"
            data-testid={`video-message-${msg.id}`}
          />
        );
      case "link":
        return (
          <a 
            href={msg.content || ""} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
            data-testid={`link-message-${msg.id}`}
          >
            <ExternalLink className="h-4 w-4" />
            {msg.content}
          </a>
        );
      default:
        return <p className="text-sm whitespace-pre-wrap">{msg.content}</p>;
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col h-full">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h1 className="text-lg font-semibold">Team Chat</h1>
            <p className="text-sm text-muted-foreground">
              {messages.length} messages
            </p>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Send className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No messages yet</h3>
              <p className="text-sm text-muted-foreground">Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isOwn = msg.senderId === user?.id;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 group ${isOwn ? "flex-row-reverse" : ""}`}
                    data-testid={`message-${msg.id}`}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={msg.sender?.avatar || undefined} />
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {msg.sender?.name ? getInitials(msg.sender.name) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{msg.sender?.name}</span>
                        <VerifiedBadge role={msg.sender?.role || null} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                      
                      <div 
                        className={`rounded-lg px-4 py-2 ${
                          isOwn 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        }`}
                      >
                        {renderMessageContent(msg)}
                      </div>
                      
                      {/* Delete button for own messages */}
                      {isOwn && !msg.isDeleted && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteMessageMutation.mutate(msg.id)}
                          disabled={deleteMessageMutation.isPending}
                          data-testid={`button-delete-${msg.id}`}
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Attachment Preview */}
        {attachedPreview && (
          <div className="px-6 py-2 border-t bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="relative">
                {attachedFile?.type.startsWith("video") ? (
                  <video src={attachedPreview} className="h-16 w-auto rounded" />
                ) : (
                  <img src={attachedPreview} alt="Preview" className="h-16 w-auto rounded" />
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                  onClick={() => {
                    setAttachedFile(null);
                    setAttachedPreview(null);
                  }}
                  data-testid="button-remove-attachment"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">{attachedFile?.name}</span>
            </div>
          </div>
        )}

        {/* Link Input */}
        {showLinkInput && (
          <div className="px-6 py-2 border-t bg-muted/50">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Paste URL here..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="flex-1"
                data-testid="input-link-url"
              />
              <Button 
                size="sm" 
                onClick={handleAddLink}
                disabled={!isLinkValid(linkUrl)}
                data-testid="button-add-link"
              >
                Add
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setShowLinkInput(false);
                  setLinkUrl("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="px-6 py-4 border-t">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,video/*"
              className="hidden"
            />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="button-attach">
                  <Paperclip className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem 
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="menu-attach-image"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Image
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  data-testid="menu-attach-video"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Video
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowLinkInput(true)}
                  data-testid="menu-attach-link"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={!!attachedFile || showLinkInput}
              className="flex-1"
              data-testid="input-message"
            />
            
            <Button 
              onClick={handleSend}
              disabled={sendMessageMutation.isPending || (!message.trim() && !attachedFile && !linkUrl)}
              data-testid="button-send"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
