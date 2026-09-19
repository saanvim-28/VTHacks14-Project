import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Database,
  LayoutList,
  Menu,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { patientsQuery } from "@/data/queries";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const { data: patients, isError } = useQuery(patientsQuery());
  const [sourceOpen, setSourceOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentPatient = patients?.find(
    (patient) =>
      path.startsWith(`/patients/${patient.patient_id}/`) ||
      path === `/patients/${patient.patient_id}`,
  );
  const closeMenu = () => setMobileOpen(false);
  return (
    <div className="app-frame">
      {mobileOpen && (
        <button className="sidebar-backdrop" aria-label="Close navigation" onClick={closeMenu} />
      )}
      <aside
        className={cn("sidebar", mobileOpen && "sidebar-open")}
        aria-label="Workspace navigation"
      >
        <div className="sidebar-brand-row">
          <Link to="/" className="brand" onClick={closeMenu}>
            <span className="brand-mark" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>
              <strong>
                ChatOne<span className="brand-period">.</span>
              </strong>
              <small>Medication workspace</small>
            </span>
          </Link>
          <button
            className="mobile-close icon-button"
            aria-label="Close navigation"
            onClick={closeMenu}
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-label">
          <span className="workspace-avatar">CW</span>
          <div>
            <strong>Clinical workspace</strong>
            <small>Patient management</small>
          </div>
        </div>
        <nav aria-label="Primary navigation">
          <span className="nav-section-label">WORKSPACE</span>
          <Link
            to="/"
            className={cn("nav-item", path === "/" && "nav-active")}
            aria-current={path === "/" ? "page" : undefined}
            onClick={closeMenu}
          >
            <LayoutList size={18} />
            <span>Patient queue</span>
            {patients && <span className="nav-count">{patients.length}</span>}
          </Link>
          <Link
            to="/matches"
            className={cn("nav-item", path === "/matches" && "nav-active")}
            onClick={closeMenu}
            aria-current={path === "/matches" ? "page" : undefined}
          >
            <Sparkles size={18} />
            <span>Clinical matches</span>
          </Link>
          <Link
            to="/briefings"
            className={cn("nav-item", path === "/briefings" && "nav-active")}
            onClick={closeMenu}
            aria-current={path === "/briefings" ? "page" : undefined}
          >
            <Volume2 size={18} />
            <span>60-second briefings</span>
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <button
            className="source-control"
            aria-expanded={sourceOpen}
            aria-controls="source-details"
            onClick={() => setSourceOpen((value) => !value)}
          >
            <span className="source-control-icon">
              <Database size={17} />
            </span>
            <span>
              <strong>OpenEMR</strong>
              <small>{isError ? "Export unavailable" : "Patient data source"}</small>
            </span>
            <ChevronDown size={15} className={cn("directory-chevron", sourceOpen && "is-open")} />
          </button>
          {sourceOpen && (
            <div className="source-details" id="source-details">
              <strong>
                {patients ? `${patients.length} exported records` : "Records unavailable"}
              </strong>
              <p>
                Snapshot data from the OpenEMR export. This workspace is not connected to a live
                database.
              </p>
            </div>
          )}
          <div className="workspace-user">
            <span className="user-avatar">CT</span>
            <div>
              <strong>Care team</strong>
              <small>Local workspace</small>
            </div>
            <span className="local-status" title="Local workspace" aria-label="Local workspace" />
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((value) => !value)}
            >
              <Menu size={20} />
            </button>
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
          <span className="topbar-source">
            <Database size={13} />
            OpenEMR snapshot
          </span>
        </header>
        {children}
      </div>
    </div>
  );
}
