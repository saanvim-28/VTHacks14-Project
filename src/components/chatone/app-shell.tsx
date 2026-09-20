import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, LayoutList, Menu, Sparkles, Volume2 } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { patientsQuery } from "@/data/queries";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const { data: patients } = useQuery(patientsQuery());
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPatient = patients?.find(
    (patient) =>
      path.startsWith(`/patients/${patient.patient_id}/`) ||
      path === `/patients/${patient.patient_id}`,
  );
  return (
    <div className="app-frame top-header-app">
      <div className="workspace">
        <header className="top-header" aria-label="Workspace navigation">
          <Link to="/" className="brand top-header-brand">
            <span className="brand-mark" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>
              <strong>
                medMatch<span className="brand-period">.</span>
              </strong>
              <small>Medication workspace</small>
            </span>
          </Link>
          <div className="workspace-label top-header-workspace">
            <span className="workspace-avatar">CW</span>
            <div>
              <strong>Clinical workspace</strong>
              <small>Patient management</small>
            </div>
          </div>
          <button
            className="top-header-menu icon-button"
            aria-label="Toggle navigation"
            onClick={() => setMobileOpen((value) => !value)}
          >
            <Menu size={20} />
          </button>
          <nav
            className={cn("top-header-nav", mobileOpen && "top-header-nav-open")}
            aria-label="Primary navigation"
          >
            <Link
              to="/"
              className={cn("nav-item", path === "/" && "nav-active")}
              aria-current={path === "/" ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <span>Overview</span>
            </Link>
            <Link
              to="/patients"
              className={cn("nav-item", path === "/patients" && "nav-active")}
              aria-current={path === "/patients" ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <LayoutList size={18} />
              <span>Patient queue</span>
              {patients && <span className="nav-count">{patients.length}</span>}
            </Link>
            <Link
              to="/matches"
              className={cn("nav-item", path === "/matches" && "nav-active")}
              onClick={() => setMobileOpen(false)}
              aria-current={path === "/matches" ? "page" : undefined}
            >
              <Sparkles size={18} />
              <span>Clinical Matches</span>
            </Link>
            <Link
              to="/briefings"
              className={cn("nav-item", path === "/briefings" && "nav-active")}
              onClick={() => setMobileOpen(false)}
              aria-current={path === "/briefings" ? "page" : undefined}
            >
              <Volume2 size={18} />
              <span>Briefings</span>
            </Link>
          </nav>
          <div className="top-header-tools">
            <div className="workspace-user">
              <div>
                <strong>Welcome, Dr. Sarah J.</strong>
              </div>
              <span className="local-status" title="Local workspace" aria-label="Local workspace" />
            </div>
          </div>
        </header>
        <header className="workspace-topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <Link to="/">Patient records</Link>
            {currentPatient && (
              <>
                <ChevronRight size={14} />
                <span className="breadcrumb-current">{currentPatient.name}</span>
              </>
            )}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
