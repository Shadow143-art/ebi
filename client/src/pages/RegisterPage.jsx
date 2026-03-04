import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

const RegisterPage = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isStudent = role === "student";
  const isStaff = role === "staff";

  if (!isStudent && !isStaff) return <Navigate to="/" replace />;

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register({ ...form, role });
      navigate(role === "student" ? "/student" : "/staff");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <motion.form
        className="auth-card glass"
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2>Create {isStudent ? "Student" : "Staff"} Account</h2>

        <label>
          Full Name
          <input name="name" value={form.name} onChange={onChange} required />
        </label>

        <label>
          Username
          <input name="username" value={form.username} onChange={onChange} required />
        </label>

        <label>
          Email
          <input type="email" name="email" value={form.email} onChange={onChange} required />
        </label>

        <label>
          Password
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={onChange}
            minLength={6}
            required
          />
        </label>

        {error ? <div className="error-box">{error}</div> : null}

        <button className="primary-btn" type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Account"}
        </button>

        <p className="inline-note">
          Already have an account? <Link to={`/login/${role}`}>Login</Link>
        </p>
      </motion.form>
    </div>
  );
};

export default RegisterPage;
