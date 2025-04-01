"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewsletterSubscribeProps {
  variant?: 'default' | 'rustic';
  className?: string;
}

export function NewsletterSubscribe({ variant = 'default', className }: NewsletterSubscribeProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");
    
    // Client-side validation
    if (!email.trim()) {
      setErrorMessage("Please enter an email address");
      return;
    }
    
    if (!validateEmail(email)) {
      setErrorMessage("Please enter a valid email address");
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Special handling for already subscribed emails
        if (response.status === 400 && (
            data.error === "Email already subscribed" || 
            data.error?.includes("duplicate key value") ||
            data.error?.includes("unique constraint")
          )) {
          toast({
            title: "Already subscribed",
            description: "This email is already subscribed to our newsletter.",
            variant: "default",
          });
          setEmail("");
          return;
        }
        
        // Special handling for RLS policy errors
        if (data.error?.includes("row-level security") || 
            data.error?.includes("violates row-level security policy") ||
            data.error?.includes("permission denied")) {
          toast({
            title: "Configuration Issue",
            description: "Our team has been notified of this issue. Please try again later.",
            variant: "destructive",
          });
          console.error("RLS Policy Error:", data.error);
          setErrorMessage("Subscription service is currently unavailable. Please try again later.");
          return;
        }
        
        throw new Error(data.error || "Subscription failed");
      }

      toast({
        title: "Success!",
        description: "You've been subscribed to our newsletter.",
      });
      setEmail("");
    } catch (error: any) {
      console.error("Subscription error:", error);
      
      // Handle RLS errors in the catch block as well
      if (error.message?.includes("row-level security") || 
          error.message?.includes("violates row-level security policy") ||
          error.message?.includes("permission denied")) {
        toast({
          title: "Configuration Issue",
          description: "Our team has been notified of this issue. Please try again later.",
          variant: "destructive",
        });
        setErrorMessage("Subscription service is currently unavailable. Please try again later.");
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to subscribe. Please try again.",
        variant: "destructive",
      });
      setErrorMessage(error.message || "Failed to subscribe. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Render different UI based on variant
  if (variant === 'rustic') {
    return (
      <div className={cn("w-full relative z-10", className)}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input 
              type="email" 
              placeholder="Email address" 
              className={cn(
                "rustic-input py-2 px-3 min-w-0 flex-1 text-sm rounded border border-primary/20 bg-background/70",
                errorMessage ? "border-destructive" : ""
              )}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMessage("");
              }}
              required
              aria-invalid={!!errorMessage}
            />
            <button 
              type="submit"
              disabled={isLoading}
              className="rustic-button rustic-button-primary py-2 px-4 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {isLoading ? "..." : "Subscribe"}
            </button>
          </div>
          
          {errorMessage && (
            <div className="flex items-center gap-2 text-xs text-destructive mt-1">
              <AlertCircle className="h-3 w-3" />
              <span>{errorMessage}</span>
            </div>
          )}
        </form>
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn("w-full max-w-md mx-auto relative z-10", className)}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrorMessage("");
            }}
            required
            className={`flex-1 bg-background ${errorMessage ? "border-destructive" : ""}`}
            aria-invalid={!!errorMessage}
          />
          <Button 
            type="submit" 
            disabled={isLoading} 
            className="relative z-20"
          >
            {isLoading ? "Subscribing..." : "Subscribe"}
          </Button>
        </div>
        
        {errorMessage && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            <span>{errorMessage}</span>
          </div>
        )}
      </form>
    </div>
  );
} 