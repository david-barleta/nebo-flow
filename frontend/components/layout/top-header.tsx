"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";
import Breadcrumb from "./breadcrumb";
import { ChevronDown, LogOut } from "lucide-react";

export default function TopHeader() {
  const { authUser, signOut } = useAuth();
  const { pageTitle } = useBreadcrumb();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);
    await signOut();
    window.location.href = "/login";
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shrink-0">
      {/* Left: Page title + breadcrumb */}
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-gray-900 truncate">
          {pageTitle || "Dashboard"}
        </h1>
        <Breadcrumb />
      </div>

      {/* Right: Entity name + user dropdown */}
      <div className="flex items-center gap-4">
        {/* Entity name */}
        <span className="hidden sm:block text-sm text-gray-500">
          {authUser?.entity.tradeName || authUser?.entity.registeredName}
        </span>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {/* Avatar circle */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0f0f1a] text-white text-xs font-semibold">
              {authUser?.user.fullName
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900">{authUser?.user.fullName}</p>
              <p className="text-xs text-gray-500">{authUser?.role.name}</p>
            </div>
            <ChevronDown size={16} className="text-gray-400" />
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-50">
              <div className="px-3 py-2 border-b border-gray-100 sm:hidden">
                <p className="text-sm font-medium text-gray-900">{authUser?.user.fullName}</p>
                <p className="text-xs text-gray-500">{authUser?.role.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{authUser?.entity.tradeName || authUser?.entity.registeredName}</p>
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:text-gray-400"
              >
                <LogOut size={16} />
                {isLoggingOut ? "Logging out..." : "Log Out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
