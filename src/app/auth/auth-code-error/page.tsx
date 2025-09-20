import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-destructive">
            Authentication Error
          </h1>
          <p className="text-sm text-muted-foreground">
            There was a problem with your sign-in link. This could happen if:
          </p>
        </div>
        
        <div className="text-left space-y-2 text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-1">
            <li>The link has expired (links expire after 24 hours)</li>
            <li>The link has already been used</li>
            <li>There was a network issue</li>
          </ul>
        </div>

        <div className="space-y-3">
          <Link href="/sign-in">
            <Button className="w-full">
              Try Signing In Again
            </Button>
          </Link>
          
          <Link href="/">
            <Button variant="outline" className="w-full">
              Back to Home
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          If you continue having issues, please contact support.
        </p>
      </div>
    </div>
  );
}
