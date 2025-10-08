"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { GroupProvider } from "@/lib/hooks/use-group-context";
import { DialogProvider } from "@/lib/hooks/use-dialogs";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5_000, // Reduced from 30s to 5s to allow more frequent updates
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthGuard>
          <GroupProvider>
            <DialogProvider>
              {children}
            </DialogProvider>
          </GroupProvider>
        </AuthGuard>
      </ThemeProvider>
      {process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      ) : null}
    </QueryClientProvider>
  );
}


