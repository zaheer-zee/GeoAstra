import React from "react";
import { cn } from "@/lib/utils";
import { NAVIGATION_CONFIG } from "@/constants/navigation";
import { NavItem } from "./NavItem";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import {
  Orbit,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Tooltip } from "../ui/Tooltip";

export const Sidebar: React.FC = () => {
  const {
    isSidebarCollapsed,
    toggleSidebar,
    isMobileMenuOpen,
    closeMobileMenu,
  } = useLayoutStore();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-surface-secondary border-r border-border-subtle",
          "transition-[width,transform] duration-200 ease-in-out",
          // Desktop styling
          "hidden lg:flex",
          isSidebarCollapsed ? "w-16" : "w-64",
          // Mobile styling (slide-over drawer)
          isMobileMenuOpen &&
            "flex !translate-x-0 w-64 shadow-2xl lg:shadow-none z-50",
          !isMobileMenuOpen && "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="h-13 px-4 border-b border-border-subtle flex items-center justify-between shrink-0 bg-surface-secondary">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shrink-0 shadow-sm">
              <Orbit className="w-5 h-5 text-surface-main animate-pulse" />
            </div>

            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  GeoAstra
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-surface-elevated text-accent-primary border border-border-subtle">
                    PRO
                  </span>
                </span>
                <span className="text-2xs font-mono text-content-muted truncate">
                  HYPERSPECTRAL WORKSTATION
                </span>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <button
            onClick={closeMobileMenu}
            className="lg:hidden text-content-muted hover:text-content-primary p-1 rounded"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-6">
          {NAVIGATION_CONFIG.map((section) => (
            <div key={section.title} className="space-y-1">
              {!isSidebarCollapsed ? (
                <div className="px-3 pb-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-content-muted select-none">
                  {section.title}
                </div>
              ) : (
                <div className="w-full border-t border-border-subtle/50 my-2" />
              )}

              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavItem
                    key={item.id}
                    item={item}
                    isCollapsed={isSidebarCollapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Environment Indicator & Collapse Control Footer */}
        <div className="p-3 border-t border-border-subtle bg-surface-panel/40 shrink-0 flex flex-col gap-2">
          {/* Environment Status Pill */}
          {!isSidebarCollapsed ? (
            <div className="px-2.5 py-2 rounded bg-surface-elevated/70 border border-status-success/30 flex items-center justify-between text-2xs font-mono">
              <span className="flex items-center gap-1.5 text-content-secondary">
                <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
                ENVIRONMENT
              </span>
              <span className="text-status-success font-semibold flex items-center gap-1">
                ONLINE
              </span>
            </div>
          ) : (
            <Tooltip content="Environment: Online (Backend Connected)" position="right">
              <div className="w-10 h-8 mx-auto rounded bg-surface-elevated border border-status-success/30 flex items-center justify-center text-status-success">
                <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
              </div>
            </Tooltip>
          )}

          {/* Desktop Collapse Toggle Button */}
          <button
            type="button"
            onClick={toggleSidebar}
            className={cn(
              "hidden lg:flex items-center gap-2 px-3 py-1.5 rounded text-2xs text-content-muted hover:text-content-primary hover:bg-surface-elevated transition-colors duration-150 w-full select-none",
              isSidebarCollapsed && "justify-center px-0 w-10 h-8 mx-auto"
            )}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-accent-primary" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse Sidebar</span>
                <span className="ml-auto font-mono text-[10px] text-content-muted">
                  [
                </span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

