import {
  LayoutDashboard,
  Wrench,
  Users,
  MessageSquare,
  Settings,
  LogOut,
  UserCircle2
} from "lucide-react";

const navItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "skills", label: "Skills", icon: Wrench },
  { key: "friends", label: "Friends", icon: Users },
  { key: "messages", label: "Messages", icon: MessageSquare },
  { key: "settings", label: "Settings", icon: Settings }
];

const formatBadgeValue = (value) => (value > 99 ? "99+" : String(value));

const StudentLayout = ({ activeSection, onSectionChange, onLogout, children, navBadges = {} }) => {
  return (
    <div className="app-shell student-theme">
      <div className="dashboard-atmosphere student-atmosphere" aria-hidden="true">
        <span className="atmo-orb orb-a" />
        <span className="atmo-orb orb-b" />
        <span className="atmo-grid" />
      </div>

      <aside className="sidebar glass">
        <div className="sidebar-brand">Tracker</div>
        <div className="profile-chip">
          <UserCircle2 size={34} />
          <div>
            <p>Student Space</p>
            <small>Build your identity</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const badgeValue = Number(navBadges[item.key] || 0);
            return (
              <button
                key={item.key}
                className={`nav-button ${activeSection === item.key ? "active" : ""}`}
                onClick={() => onSectionChange(item.key)}
                type="button"
              >
                <Icon size={17} />
                <span className="nav-label">{item.label}</span>
                {badgeValue > 0 ? <span className="nav-badge">{formatBadgeValue(badgeValue)}</span> : null}
              </button>
            );
          })}
        </nav>

        <button className="nav-button logout" onClick={onLogout} type="button">
          <LogOut size={17} /> <span className="nav-label">Logout</span>
        </button>
      </aside>
      <main className="content-area"><div className="dashboard-content-wrap">{children}</div></main>
    </div>
  );
};

export default StudentLayout;
