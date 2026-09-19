import {
  Bookmark,
  ChevronRight,
  HeartPulse,
  LayoutList,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useChatOne } from "./app-context";
import { SidebarArtwork } from "./clinical-artwork";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const { saved } = useChatOne();
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <HeartPulse />
          </span>
          <span>
            <strong>ChatOne</strong>
            <small>Clinical intelligence</small>
          </span>
        </Link>
        <nav aria-label="Primary navigation">
          <Link to="/" className={cn("nav-item", path === "/" && "nav-active")}>
            <LayoutList />
            <span>Priority queue</span>
            <ChevronRight className="nav-arrow" />
          </Link>
          <div className={cn("nav-item", "nav-static")}>
            <UserRound />
            <span>Patients</span>
          </div>
          <div className={cn("nav-item", "nav-static")}>
            <Bookmark />
            <span>Saved</span>
            {saved.size > 0 && <span className="saved-count">{saved.size}</span>}
          </div>
        </nav>
        <SidebarArtwork />
        <div className="sidebar-footer">
          <ShieldCheck />
          <span>
            <strong>Clinical support</strong>
            <small>Review all recommendations</small>
          </span>
        </div>
      </aside>
      <div className="workspace">
        <header className="mobile-header">
          <Link to="/" className="brand">
            <span className="brand-mark">
              <HeartPulse />
            </span>
            <strong>ChatOne</strong>
          </Link>
          <span className="mobile-status">Clinical support</span>
        </header>
        {children}
      </div>
    </div>
  );
}
