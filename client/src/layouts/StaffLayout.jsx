import { LogOut } from "lucide-react";

const StaffLayout = ({ onLogout, children }) => {
  return (
    <div className="staff-shell staff-theme">
      <div className="dashboard-atmosphere staff-atmosphere" aria-hidden="true">
        <span className="atmo-orb orb-a" />
        <span className="atmo-orb orb-b" />
        <span className="atmo-grid" />
      </div>

      <header className="staff-header glass">
        <div>
          <h2>Tracker Staff Dashboard</h2>
          <p>Search and connect with students across campus.</p>
        </div>
        <button className="pill-button" type="button" onClick={onLogout}>
          <LogOut size={16} /> Logout
        </button>
      </header>
      <section className="staff-main"><div className="dashboard-content-wrap">{children}</div></section>
    </div>
  );
};

export default StaffLayout;
