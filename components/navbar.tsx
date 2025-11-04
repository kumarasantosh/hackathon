import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";

// Planet/Saturn icon component
function PlanetIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-5 h-5"
    >
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
      <ellipse cx="12" cy="12" rx="12" ry="4" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

export async function Navbar() {
  // Await headers() first for Next.js 15 compatibility with Clerk
  await headers();
  
  // Use auth() instead of currentUser() for better error handling
  // Since navbar is on all pages (including public), we handle unauthenticated gracefully
  let userName = "Sign In";
  let isAuthenticated = false;
  
  try {
    const { userId } = await auth();
    if (userId) {
      // If user is authenticated, try to get user info from Supabase
      try {
        const { getOrCreateUser } = await import("@/lib/user-helpers");
        const { user } = await getOrCreateUser(userId);
        if (user?.name) {
          userName = user.name;
          isAuthenticated = true;
        } else {
          // Fallback to userId or email if name not available
          userName = user?.email?.split("@")[0] || "User";
          isAuthenticated = true;
        }
      } catch (error) {
        // If getOrCreateUser fails, just use generic name
        console.error("Error getting user info:", error);
        userName = "User";
        isAuthenticated = true;
      }
    }
  } catch (error) {
    // If auth() fails, user is not authenticated - show "Sign In"
    console.error("Auth error:", error);
    userName = "Sign In";
    isAuthenticated = false;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-down {
          animation: fadeInDown 0.6s ease-out forwards;
        }
      `}} />
      
      <nav className="flex justify-center py-6 px-4 opacity-0 animate-fade-in-down">
        <div className="relative flex items-center justify-between w-full h-14 bg-gradient-to-br from-[#1a5f3f] to-[#2d7a55] rounded-full px-4 shadow-lg hover:shadow-xl transition-all duration-300">
          {/* Left Icon/Logo */}
          <Link href="/" className="flex items-center justify-center group">
            <div className="w-10 h-10 bg-white rounded-full border border-gray-800 flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <PlanetIcon />
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-8 flex-1 justify-center">
            <Link 
              href="/marketplace" 
              className="text-white font-medium text-sm relative transition-all duration-300 hover:text-white/90 hover:scale-105 group py-2"
            >
              Marketplace
              <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link 
              href="/dashboard" 
              className="text-white font-medium text-sm relative transition-all duration-300 hover:text-white/90 hover:scale-105 group py-2"
            >
              Dashboard
              <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link 
              href="/orders" 
              className="text-white font-medium text-sm relative transition-all duration-300 hover:text-white/90 hover:scale-105 group py-2"
            >
              Orders
              <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link 
              href="/profile" 
              className="text-white font-medium text-sm relative transition-all duration-300 hover:text-white/90 hover:scale-105 group py-2"
            >
              Profile
              <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </Link>
          </div>

          {/* Right User Name Button */}
          <div className="flex items-center">
            <Link
              href={isAuthenticated ? "/profile" : "/sign-in"}
              className="h-9 px-6 bg-white border border-gray-800 rounded-full flex items-center justify-center text-gray-900 font-medium text-sm transition-all duration-300 hover:bg-gray-50 hover:scale-105 hover:shadow-md hover:border-gray-900"
            >
              {userName}
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}

