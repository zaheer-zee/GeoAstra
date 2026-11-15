import React, { useState, useRef, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { useAuthStore } from "@/features/auth/useAuthStore";
import { NAVIGATION_CONFIG } from "@/constants/navigation";
import {
  Menu,
  Search,
  Bell,
  Moon,
  ChevronRight,
  Shield,
  User as UserIcon,
  Settings,
  LogOut,
} from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { Tooltip } from "../ui/Tooltip";
import { Badge } from "../ui/Badge";
import { useToast } from "@/hooks/useToast";

export const TopNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleMobileMenu } = useLayoutStore();
  const { user, logout } = useAuthStore();
  const toast = useToast();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Resolve current active item & section from pathname
  let currentSection = "WORKSPACE";
  let currentItemTitle = "Dashboard";

  for (const section of NAVIGATION_CONFIG) {
    for (const item of section.items) {
      if (
        location.pathname === item.path ||
        (item.path !== "/" && location.pathname.startsWith(item.path))
      ) {
        currentSection = section.title;
        currentItemTitle = item.label;
        break;
      }
    }
  }

  const handleSearchClick = () => {
    toast.info("Global Search", "Full catalog search indexing will be activated in Phase 3.");
  };

  const handleNotificationClick = () => {
    toast.info("Notification Feed", "Telemetry heartbeat checked. No critical anomalies.");
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
    toast.success("Session Ended", "Analyst workstation session signed out.");
    navigate("/login", { replace: true });
  };

  const userName = user?.name || "Analyst";
  const userEmail = user?.email || "analyst@geoastra.demo";
  const userRole = user?.role || "Senior Analyst";

  return (
    <header className="h-13 bg-surface-secondary/90 backdrop-blur-md border-b border-border-subtle px-4 lg:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
      {/* Left Area: Mobile Menu Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleMobileMenu}
          className="lg:hidden text-content-secondary hover:text-content-primary p-1.5 rounded hover:bg-surface-elevated transition-colors"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb Trail */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-mono text-content-muted hidden sm:inline select-none">
            {currentSection}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-content-muted hidden sm:inline" />
          <span className="font-semibold text-content-primary tracking-tight">
            {currentItemTitle}
          </span>
        </div>
      </div>

      {/* Center Area: Global Search Input */}
      <div className="hidden md:flex items-center max-w-sm w-full mx-4">
        <button
          type="button"
          onClick={handleSearchClick}
          className="w-full flex items-center justify-between bg-surface-panel hover:bg-surface-elevated/80 border border-border-subtle rounded px-3 py-1.5 text-xs text-content-muted transition-colors group cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-content-muted group-hover:text-accent-primary transition-colors" />
            <span>Search scenes, algorithms, signatures...</span>
          </span>
          <kbd className="font-mono text-[10px] bg-surface-secondary px-1.5 py-0.5 rounded border border-border-subtle text-content-secondary">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Area: Status Pill, Notifications, Theme, User Menu */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Quick System Status Indicator */}
        <div className="hidden sm:flex items-center">
          <Link to="/status">
            <Badge variant="success" size="sm" dot className="hover:opacity-90 cursor-pointer">
              SYSTEM OPERATIONAL
            </Badge>
          </Link>
        </div>

        {/* Theme Indicator (Dark-First Workstation) */}
        <Tooltip content="Workstation Theme: Deep Space Dark (Default)" position="bottom">
          <button
            type="button"
            className="w-8 h-8 rounded flex items-center justify-center text-content-secondary hover:text-content-primary hover:bg-surface-elevated transition-colors"
            onClick={() => toast.info("Theme Configuration", "Dark-first scientific interface is locked for optimal spectral contrast.")}
            aria-label="Theme mode"
          >
            <Moon className="w-4 h-4 text-accent-primary" />
          </button>
        </Tooltip>

        {/* Notifications Icon Button */}
        <Tooltip content="System Telemetry Feed" position="bottom">
          <button
            type="button"
            onClick={handleNotificationClick}
            className="relative w-8 h-8 rounded flex items-center justify-center text-content-secondary hover:text-content-primary hover:bg-surface-elevated transition-colors"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
          </button>
        </Tooltip>

        <div className="h-4 w-[1px] bg-border-subtle mx-1" />

        {/* User Profile Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2.5 p-1 rounded hover:bg-surface-elevated transition-colors select-none"
            aria-expanded={isUserMenuOpen}
            aria-haspopup="true"
          >
            <Avatar name={userName} size="sm" status="online" />
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-semibold text-content-primary leading-tight">
                {userName}
              </span>
              <span className="text-2xs font-mono text-content-muted leading-tight truncate max-w-[130px]">
                {userEmail}
              </span>
            </div>
          </button>

          {/* Dropdown Menu Window */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg bg-surface-elevated border border-border-strong shadow-modal py-1.5 z-50 animate-slide-down text-left">
              <div className="px-3.5 py-2 border-b border-border-subtle">
                <p className="text-xs font-semibold text-content-primary">
                  {userName}
                </p>
                <p className="text-2xs font-mono text-content-muted truncate">
                  {userEmail}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Badge variant="primary" size="sm">
                    {userRole}
                  </Badge>
                  <span className="text-2xs text-content-muted font-mono truncate max-w-[120px]">
                    ID: {user?.id ? user.id.slice(0, 8) : "demo"}
                  </span>
                </div>
              </div>

              <div className="py-1">
                <Link
                  to="/profile"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-content-secondary hover:text-content-primary hover:bg-surface-hover transition-colors"
                >
                  <UserIcon className="w-3.5 h-3.5 text-accent-primary" />
                  <span>Analyst Profile</span>
                </Link>

                <Link
                  to="/settings"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-content-secondary hover:text-content-primary hover:bg-surface-hover transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Workstation Settings</span>
                </Link>

                <Link
                  to="/status"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-content-secondary hover:text-content-primary hover:bg-surface-hover transition-colors"
                >
                  <Shield className="w-3.5 h-3.5 text-status-success" />
                  <span>Telemetry & Services</span>
                </Link>
              </div>

              <div className="border-t border-border-subtle pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full text-left px-3.5 py-2 text-xs text-status-danger hover:bg-status-danger/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
