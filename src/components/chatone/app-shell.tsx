import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Database, LayoutList, Menu, Users, X } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { patientsQuery } from "@/data/queries";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const { data: patients, isError } = useQuery(patientsQuery());
  const [directoryOpen, setDirectoryOpen] = useState(true);
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
          <button
            className="nav-item directory-toggle"
            aria-expanded={directoryOpen}
            aria-controls="patient-directory"
            onClick={() => setDirectoryOpen((value) => !value)}
          >
            <Users size={18} />
            <span>Patient directory</span>
            <ChevronDown
              size={14}
              className={cn("directory-chevron", directoryOpen && "is-open")}
            />
          </button>
          {directoryOpen && (
            <div className="patient-directory" id="patient-directory">
              {patients?.map((patient) => (
                <Link
                  key={patient.patient_id}
                  to="/patients/$patientId"
                  params={{ patientId: patient.patient_id }}
                  className={cn(
                    "directory-patient",
                    currentPatient?.patient_id === patient.patient_id && "directory-patient-active",
                  )}
                  aria-current={
                    currentPatient?.patient_id === patient.patient_id ? "page" : undefined
                  }
                  onClick={closeMenu}
                >
                  <span className="directory-dot" />
                  {patient.name}
                </Link>
              ))}
              {isError && <p className="directory-message">Records unavailable</p>}
            </div>
          )}
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
