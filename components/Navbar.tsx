import Link from "next/link";
import { UserButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "./ui/Button";

export function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-semibold text-black tracking-tight">
              UNIVO<span className="text-purple-600">+</span>
            </span>
            <span className="ml-1 text-xs text-gray-400 align-top">™</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/resources"
              className="text-sm font-medium text-gray-700 hover:text-black transition-colors relative group"
            >
              Resources
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-black transition-all group-hover:w-full"></span>
            </Link>
            <Link
              href="/toppers"
              className="text-sm font-medium text-gray-700 hover:text-black transition-colors relative group"
            >
              Toppers
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-black transition-all group-hover:w-full"></span>
            </Link>
            <Link
              href="/groups"
              className="text-sm font-medium text-gray-700 hover:text-black transition-colors relative group"
            >
              Study Groups
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-black transition-all group-hover:w-full"></span>
            </Link>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            <SignedIn>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-gray-700 hover:text-black"
              >
                Dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>

            <SignedOut>
              <Link href="/sign-up">
                <Button className="bg-black text-white hover:bg-gray-800">
                  Login
                </Button>
              </Link>
            </SignedOut>
          </div>
        </div>
      </div>
    </nav>
  );
}
