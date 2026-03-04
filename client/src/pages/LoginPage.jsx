import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
  const { role } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ loginId: "", password: "" });
  const [focus, setFocus] = useState({ loginId: false, password: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [pulling, setPulling] = useState(Boolean(location.state?.pullIntro));
  const pullTimer = useRef(null);

  const isStudent = role === "student";
  const isStaff = role === "staff";

  const roleMeta = useMemo(() => {
    if (role === "staff") {
      return {
        artTitle: "Staff Operations",
        artText: "Search talent quickly, review complete student profiles, and start direct communication.",
        formHint: "Staff Portal"
      };
    }

    return {
      artTitle: "Student Space",
      artText: "Build your profile, highlight projects, and connect with friends and mentors.",
      formHint: "Student Portal"
    };
  }, [role]);

  useEffect(() => {
    if (!pulling) {
      return undefined;
    }

    pullTimer.current = setTimeout(() => {
      setPulling(false);
    }, 1200);

    return () => {
      if (pullTimer.current) {
        clearTimeout(pullTimer.current);
      }
    };
  }, [pulling]);

  if (!isStudent && !isStaff) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login({ ...form, role });
      navigate(user.role === "student" ? "/student" : "/staff");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen rope-login-screen">
      <div className="rope-login-bg" />
      <div className="rope-login-blur" />

      <motion.div
        className="rope-login-stage"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <Link to="/" className="login-back-link">
          <ArrowLeft size={16} />
          Change Role
        </Link>

        <div className={`rope-login-theater ${pulling ? "is-pulling" : ""}`}>
          <motion.div
            className="login-rope-line"
            animate={
              pulling
                ? { opacity: [0.32, 1, 0.92], scaleX: [0.25, 1.08, 1] }
                : { opacity: 0.9, scaleX: 1 }
            }
            transition={{ duration: pulling ? 1.05 : 0.35, ease: "easeOut" }}
          />

          <motion.div
            className={`login-rope-boy ${pulling ? "pulling" : ""}`}
            animate={
              pulling
                ? { x: [0, -18, 4, 0], y: [0, 5, -2, 0], rotate: [0, -2, 1, 0] }
                : { x: 0, y: 0, rotate: 0 }
            }
            transition={{ duration: 1.05, ease: "easeInOut" }}
          >
            <span className="boy-head" />
            <span className="boy-body" />
            <span className="boy-arm arm-left" />
            <span className="boy-arm arm-right" />
            <span className="boy-leg leg-left" />
            <span className="boy-leg leg-right" />
          </motion.div>

          <motion.div
            className="rope-login-card"
            initial={{ x: pulling ? 360 : 0, y: pulling ? -24 : 0, rotate: pulling ? 9 : 0, opacity: 0, scale: 0.97 }}
            animate={
              pulling
                ? {
                    x: [360, 170, 0],
                    y: [-24, 10, 0],
                    rotate: [9, -3, 0],
                    opacity: [0, 0.92, 1],
                    scale: [0.97, 1.02, 1]
                  }
                : { x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }
            }
            transition={{ duration: pulling ? 1.05 : 0.4, ease: "easeOut" }}
          >
            <div className="rope-login-art">
              <div className="art-badge">TRACKER</div>
              <h3>{roleMeta.artTitle}</h3>
              <p>{roleMeta.artText}</p>
              <div className="art-pulse" />
            </div>

            <form className="rope-login-form" onSubmit={onSubmit}>
              <h2>Login</h2>
              <p>{roleMeta.formHint}</p>

              <div className={`modern-field ${focus.loginId || form.loginId ? "filled" : ""}`}>
                <input
                  name="loginId"
                  value={form.loginId}
                  onChange={(e) => setForm((prev) => ({ ...prev, loginId: e.target.value }))}
                  onFocus={() => setFocus((prev) => ({ ...prev, loginId: true }))}
                  onBlur={() => setFocus((prev) => ({ ...prev, loginId: false }))}
                  required
                />
                <label>Email or Username</label>
              </div>

              <div className={`modern-field password ${focus.password || form.password ? "filled" : ""}`}>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  onFocus={() => setFocus((prev) => ({ ...prev, password: true }))}
                  onBlur={() => setFocus((prev) => ({ ...prev, password: false }))}
                  required
                />
                <label>Password</label>
                <button
                  type="button"
                  className="modern-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <div className="rope-login-meta">
                <label className="check-inline check-dark">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Remember Me
                </label>
                <Link to={`/forgot-password/${role}`}>Forgot Password?</Link>
              </div>

              {error ? <div className="error-box">{error}</div> : null}

              <button className="rope-login-btn" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Login"}
              </button>

              <p className="rope-login-register">
                Don&apos;t have an account? <Link to={`/register/${role}`}>Create Account</Link>
              </p>
            </form>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
