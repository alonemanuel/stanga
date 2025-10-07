"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthGuard";
import { Button } from "@/components/ui/button";
import { ChevronDown, User, Settings, LogOut } from "lucide-react";
import { useProfile } from "@/lib/hooks/use-profile";

export function UserMenu() {
  const { user, loading, signOut } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const profileQuery = useProfile({ enabled: !!user });
  const profile = profileQuery.data?.data;

  // Handle click outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDropdownOpen]);

  const handleSignOut = async () => {
    console.log('UserMenu: Sign out clicked');
    setIsDropdownOpen(false);
    await signOut();
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  if (loading) {
    return (
      <div className="h-9 w-20 bg-muted animate-pulse rounded" />
    );
  }

  if (user) {
    const displayName =
      user.user_metadata?.display_name ||
      profile?.displayName ||
      user.user_metadata?.full_name ||
      profile?.fullName ||
      user.email?.split('@')[0] ||
      'User';
    
    return (
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleDropdown}
          className="flex items-center gap-2 text-sm"
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
        >
          <span className="hidden sm:inline">Hello, {displayName}</span>
          <span className="sm:hidden">
            <User className="h-4 w-4" />
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </Button>

        {isDropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 rounded-md border bg-popover p-1 shadow-md z-50">
            <div className="px-2 py-1.5 text-sm font-medium border-b mb-1">
              {displayName}
            </div>
            
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground outline-none"
              onClick={() => setIsDropdownOpen(false)}
            >
              <User className="h-4 w-4" />
              View Profile
            </Link>
            
            <Link
              href="/profile/settings"
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground outline-none"
              onClick={() => setIsDropdownOpen(false)}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground outline-none"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href="/sign-in">
      <Button>Sign In</Button>
    </Link>
  );
}
