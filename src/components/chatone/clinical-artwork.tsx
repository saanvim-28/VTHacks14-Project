// Decorative artwork only; these shapes do not represent patient measurements.
export function ClinicalSignalArtwork() {
  return (
    <div className="instrument-art" aria-hidden="true">
      <svg viewBox="0 0 440 180" fill="none">
        <defs>
          <pattern id="signal-grid" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r=".8" fill="#83E3DC" opacity=".24" />
          </pattern>
          <linearGradient id="signal-line">
            <stop stop-color="#83E3DC" stop-opacity=".25" />
            <stop offset=".5" stop-color="#A8F1EA" />
            <stop offset="1" stop-color="#83E3DC" stop-opacity=".35" />
          </linearGradient>
        </defs>
        <rect width="440" height="180" fill="url(#signal-grid)" />
        <circle cx="220" cy="90" r="68" stroke="#83E3DC" strokeOpacity=".25" />
        <circle
          cx="220"
          cy="90"
          r="50"
          stroke="#83E3DC"
          strokeOpacity=".35"
          strokeDasharray="2 8"
        />
        <path d="M220 6v20M220 154v20M136 90h20M284 90h20" stroke="#83E3DC" strokeOpacity=".65" />
        <path
          d="M16 91h109l19-17 18 32 28-68 34 108 26-73 20 18h154"
          stroke="url(#signal-line)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx="125" cy="91" r="4" fill="#83E3DC" />
        <circle cx="270" cy="91" r="4" fill="#83E3DC" />
        <path d="M22 26h12M28 20v12M400 146h12M406 140v12" stroke="#83E3DC" />
        <path d="M365 30h47v30M75 150H28v-30" stroke="#83E3DC" strokeOpacity=".45" />
      </svg>
    </div>
  );
}
export function SidebarArtwork() {
  return (
    <div className="sidebar-art" aria-hidden="true">
      <svg viewBox="0 0 160 210" fill="none">
        <path d="M80 12v186M12 105h136" stroke="currentColor" opacity=".16" />
        <circle cx="80" cy="105" r="57" stroke="currentColor" opacity=".3" />
        <circle cx="80" cy="105" r="40" stroke="currentColor" strokeDasharray="2 7" opacity=".6" />
        <path
          d="M66 78h28v13h13v28H94v13H66v-13H53V91h13z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="80" cy="48" r="4" fill="currentColor" />
        <circle cx="137" cy="105" r="3" fill="currentColor" />
        <path d="M18 24h13M24 18v13M129 181h13M135 175v13" stroke="currentColor" opacity=".6" />
      </svg>
    </div>
  );
}
