import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

const roles = [
  {
    key: "student",
    icon: GraduationCap,
    title: "Student",
    desc: "Build profile, connect with peers, and showcase projects."
  },
  {
    key: "staff",
    icon: ShieldCheck,
    title: "Staff",
    desc: "Search students by skills, department, and academic year."
  }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const navigationTimer = useRef(null);

  const [activeRole, setActiveRole] = useState("");
  const [pullingRole, setPullingRole] = useState("");

  useEffect(
    () => () => {
      if (navigationTimer.current) {
        clearTimeout(navigationTimer.current);
      }
    },
    []
  );

  const chooseRole = (roleKey) => {
    if (pullingRole) {
      return;
    }

    setActiveRole(roleKey);
    setPullingRole(roleKey);

    if (navigationTimer.current) {
      clearTimeout(navigationTimer.current);
    }

    navigationTimer.current = setTimeout(() => {
      navigate(`/login/${roleKey}`, {
        state: {
          pullIntro: true,
          transitionAt: Date.now()
        }
      });
    }, 760);
  };

  return (
    <div className="landing-bg role-scene role-launch-scene">
      <div className="scene-glow scene-glow-a" />
      <div className="scene-glow scene-glow-b" />
      <div className="scene-grid" />

      <motion.div
        className="role-launch-stage"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="scene-head role-launch-head">
          <span className="hero-chip">Tracker Workspace</span>
          <h1>Select Your Role</h1>
          <p>Choose Student or Staff. The login page opens with a rope-pull animation.</p>
        </div>

        <div className="role-launch-grid">
          {roles.map((entry) => {
            const Icon = entry.icon;
            const active = activeRole === entry.key;
            const pulling = pullingRole === entry.key;

            return (
              <motion.button
                key={entry.key}
                type="button"
                className={`role-launch-card ${active ? "active" : ""} ${pulling ? "pulling" : ""}`}
                whileHover={{ y: -6, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => chooseRole(entry.key)}
                disabled={Boolean(pullingRole)}
              >
                <div className="role-launch-sheen" />
                <Icon size={34} />
                <h3>{entry.title}</h3>
                <p>{entry.desc}</p>
                <small>{pulling ? `Opening ${entry.title} Login...` : "Click to continue"}</small>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default LandingPage;
