/**
 * Floating Gloria affordance pinned to the bottom-right of every
 * authenticated page.
 *
 * - Click → open dock.
 * - Right-click → "Hide for this page" (per-route via dock store).
 * - Hidden when the dock is already open and when the user has
 *   suppressed the icon for the current pathname.
 *
 * Unread dot (bottom-left, primary): a stream completed while the dock
 * was closed. Cleared on next open.
 */
import { useState } from "react";
import { useRouterState } from "@tanstack/react-router";

import { GloriaOrb } from "@/components/ui/loading-orb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  hideOnRoute,
  markDockOpened,
  openDock,
  useGloriaDockState,
} from "@/hooks/use-gloria-dock-state";

export function GloriaMinimizedIcon() {
  const dock = useGloriaDockState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Hide when the dock is already open (no double affordance).
  if (dock.state.mode === "docked") return null;
  // Per-route opt-out (right-click → "Hide for this page").
  if (dock.isHiddenOnRoute(pathname)) return null;

  const hasUnread = dock.hasUnread();

  function handleClick() {
    openDock();
    markDockOpened();
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setContextMenuOpen(true);
  }

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={handleClick}
              onContextMenu={handleContextMenu}
              aria-label="Open Gloria"
              className={cn(
                "fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-background border border-border shadow-lg flex items-center justify-center",
                "hover:scale-105 active:scale-95 transition-transform",
              )}
            >
              <GloriaOrb size={32} />
              {hasUnread && (
                <span
                  aria-hidden
                  className="absolute bottom-0 left-0 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-background"
                />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            Open Gloria <span className="ml-1 opacity-60">⌘⇧G</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Right-click "Hide for this page" via dropdown-menu positioned at
          the click. shadcn `context-menu` isn't installed; this composes
          the same UX with the existing dropdown primitive. */}
      <DropdownMenu open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
        <DropdownMenuTrigger asChild>
          <span
            aria-hidden
            className="fixed pointer-events-none"
            style={
              contextMenuPos
                ? { left: contextMenuPos.x, top: contextMenuPos.y }
                : { left: 0, top: 0 }
            }
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={2}>
          <DropdownMenuItem
            onSelect={() => {
              hideOnRoute(pathname);
              setContextMenuOpen(false);
            }}
          >
            Hide for this page
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
