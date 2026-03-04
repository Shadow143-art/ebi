import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api/client";

const ResetPasswordPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const email = params.get("email") || "";
  const role = params.get("role") || "student";

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const hasToken = useMemo(() => Boolean(token && email), [token, email]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password", {
        token,
        email,
        newPassword: form.password
      });
      setSuccess(data.message || "Password reset successful");
      setTimeout(() => navigate(`/login/${role}`), 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (!hasToken) {
    return (
      <div className="auth-screen">
        <div className="auth-card glass">
          <h2>Invalid Reset Link</h2>
          <p className="inline-note">Request a new password reset link.</p>
          <Link to="/">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <motion.form className="auth-card glass" onSubmit={onSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2>Set New Password</h2>

        <label>
          New Password
          <input
            type="password"
            minLength={6}
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            required
          />
        </label>

        <label>
          Confirm Password
          <input
            type="password"
            minLength={6}
            value={form.confirmPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            required
          />
        </label>

        {success ? <div className="success-box">{success}</div> : null}
        {error ? <div className="error-box">{error}</div> : null}

        <button className="primary-btn" type="submit" disabled={loading}>
          {loading ? "Saving..." : "Reset Password"}
        </button>
      </motion.form>
    </div>
  );
};

export default ResetPasswordPage;
