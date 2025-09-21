"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/forms/fields";
import { useZodForm, Form } from "@/components/forms/Form";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

const EmailSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export default function SignInPage() {
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();
  const supabase = createClient();

  const methods = useZodForm(EmailSchema, { defaultValues: { email: "" } });

  // Check if user is already signed in
  React.useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
      
      if (user) {
        router.push('/');
      }
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          router.push('/');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth, router]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="h-8 w-32 bg-muted animate-pulse rounded mx-auto" />
          <div className="h-4 w-48 bg-muted animate-pulse rounded mx-auto" />
        </div>
      </div>
    );
  }

  // If user is signed in, show success message
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-green-600">
            You're signed in!
          </h1>
          <p className="text-sm text-muted-foreground">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        toast.error("Failed to sign in with Google");
      }
    } catch (error) {
      toast.error("Failed to sign in with Google");
    } finally {
      setIsGoogleLoading(false);
    }
  }

  async function handleEmailSignIn(values: z.infer<typeof EmailSchema>) {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: values.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error("Failed to send sign-in email");
      } else {
        setEmailSent(true);
        toast.success("Check your email for a sign-in link");
      }
    } catch (error) {
      toast.error("Something went wrong");
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-brand">Stanga</h1>
            <h2 className="text-xl font-medium">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              We've sent you a sign-in link. Check your email and click the link to continue.
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => setEmailSent(false)}
            className="w-full"
          >
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-brand">Stanga</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to manage your football matches
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full"
            variant="outline"
          >
            {isGoogleLoading ? "Signing in..." : "Continue with Google"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <form onSubmit={methods.handleSubmit(handleEmailSignIn)} className="space-y-4">
            <Form methods={methods}>
              <TextField
                name="email"
                label="Email"
                type="email"
                placeholder="Enter your email"
              />
              <Button type="submit" className="w-full">
                Continue with Email
              </Button>
            </Form>
          </form>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          By signing in, you agree to our terms of service and privacy policy.
          <br />
          Magic links expire in 24 hours.
        </p>
      </div>
    </div>
  );
}
