import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api/client";

const ForgotPasswordPage = () => {
  const { role } = useParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isStudent = role === "student";
  const isStaff = role === "staff";

  if (!isStudent && !isStaff) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data } = await api.post("/auth/forgot-password", { email, role });
      setMessage(data.message || "If this email exists, a reset link was sent.");
    } catch (err) {
      setError(err.response?.data?.message || "Could not send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <motion.form className="auth-card glass" onSubmit={onSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2>{isStudent ? "Student" : "Staff"} Forgot Password</h2>
        <p>Enter your account email. We will send a verification link to reset password.</p>

        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>

        {message ? <div className="success-box">{message}</div> : null}
        {error ? <div className="error-box">{error}</div> : null}

        <button className="primary-btn" type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

        <p className="inline-note">
          Back to <Link to={`/login/${role}`}>login</Link>
        </p>
      </motion.form>
    </div>
  );
};

export default ForgotPasswordPage;
