import { useEffect, useMemo, useState } from "react";

const normalizeCertificationList = (certifications = []) => {
  if (!Array.isArray(certifications)) return [];

  return certifications
    .map((item) => {
      if (typeof item === "string") {
        const title = item.trim();
        return title ? { title, fileUrl: "" } : null;
      }
      const title = String(item?.title || "").trim();
      const fileUrl = String(item?.fileUrl || "").trim();
      if (!title && !fileUrl) return null;
      return { title, fileUrl };
    })
    .filter(Boolean);
};

const StudentProfileSetup = ({ profile, onSave, saving }) => {
  const [form, setForm] = useState({
    photoUrl: profile?.photoUrl || "",
    bio: profile?.bio || "",
    department: profile?.department || "",
    year: profile?.year || "",
    contactNumber: profile?.contactNumber || "",
    skills: profile?.skills || [],
    projects: profile?.projects || [],
    certifications: normalizeCertificationList(profile?.certifications),
    achievements: profile?.achievements || [],
    github: profile?.links?.github || "",
    linkedin: profile?.links?.linkedin || "",
    portfolio: profile?.links?.portfolio || ""
  });
  const [uploadError, setUploadError] = useState("");
  const [draft, setDraft] = useState({
    skill: "",
    project: "",
    achievement: "",
    certificationTitle: ""
  });

  useEffect(() => {
    setForm({
      photoUrl: profile?.photoUrl || "",
      bio: profile?.bio || "",
      department: profile?.department || "",
      year: profile?.year || "",
      contactNumber: profile?.contactNumber || "",
      skills: profile?.skills || [],
      projects: profile?.projects || [],
      certifications: normalizeCertificationList(profile?.certifications),
      achievements: profile?.achievements || [],
      github: profile?.links?.github || "",
      linkedin: profile?.links?.linkedin || "",
      portfolio: profile?.links?.portfolio || ""
    });
  }, [profile]);

  const title = useMemo(
    () => (profile?.bio || profile?.skills?.length ? "Update Profile" : "Complete Your Profile"),
    [profile]
  );

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const addItem = (key, value) => {
    const clean = value.trim();
    if (!clean) return;
    setForm((prev) => ({
      ...prev,
      [key]: Array.from(new Set([...(prev[key] || []), clean]))
    }));
  };

  const removeItem = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((item) => item !== value)
    }));
  };

  const addCertification = () => {
    const titleValue = draft.certificationTitle.trim();
    if (!titleValue) return;
    setForm((prev) => ({
      ...prev,
      certifications: [...(prev.certifications || []), { title: titleValue, fileUrl: "" }]
    }));
    setDraft((prev) => ({ ...prev, certificationTitle: "" }));
  };

  const removeCertification = (index) => {
    setForm((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }));
  };

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file.");
      return;
    }
    if (file.size > 1024 * 1024 * 2) {
      setUploadError("Image should be under 2MB.");
      return;
    }

    setUploadError("");
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, photoUrl: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  };

  const handleCertificateUpload = (index, file) => {
    if (!file) return;
    if (file.size > 1024 * 1024 * 5) {
      setUploadError("Certificate file should be under 5MB.");
      return;
    }

    setUploadError("");
    const reader = new FileReader();
    reader.onload = () => {
      const fileUrl = String(reader.result || "");
      setForm((prev) => ({
        ...prev,
        certifications: prev.certifications.map((item, i) =>
          i === index ? { ...item, fileUrl } : item
        )
      }));
    };
    reader.readAsDataURL(file);
  };

  const submit = (e) => {
    e.preventDefault();
    onSave({
      photoUrl: form.photoUrl,
      bio: form.bio,
      department: form.department,
      year: form.year,
      contactNumber: form.contactNumber,
      skills: form.skills,
      projects: form.projects,
      certifications: form.certifications,
      achievements: form.achievements,
      links: {
        github: form.github,
        linkedin: form.linkedin,
        portfolio: form.portfolio
      }
    });
  };

  return (
    <form className="panel form-panel" onSubmit={submit}>
      <h3>{title}</h3>
      <div className="input-grid">
        <label>
          Profile Photo (upload from device)
          <input type="file" accept="image/*" onChange={handleUpload} />
        </label>
        <label>
          Photo URL (optional)
          <input name="photoUrl" value={form.photoUrl} onChange={handleChange} />
        </label>
        <label>
          Department
          <input name="department" value={form.department} onChange={handleChange} />
        </label>
        <label>
          Year
          <input name="year" value={form.year} onChange={handleChange} />
        </label>
        <label>
          Contact Number
          <input name="contactNumber" value={form.contactNumber} onChange={handleChange} />
        </label>
        <label className="full">
          Bio
          <textarea name="bio" value={form.bio} onChange={handleChange} rows={3} />
        </label>

        <div className="full panel mini-section">
          <h4>Skills (Add one by one)</h4>
          <div className="chat-input-row">
            <input
              value={draft.skill}
              onChange={(e) => setDraft((p) => ({ ...p, skill: e.target.value }))}
              placeholder="Add skill"
            />
            <button type="button" className="mini-btn" onClick={() => { addItem("skills", draft.skill); setDraft((p) => ({ ...p, skill: "" })); }}>
              Add
            </button>
          </div>
          <div className="skills-wrap">
            {(form.skills || []).map((item) => (
              <button type="button" key={item} className="skill-chip" onClick={() => removeItem("skills", item)}>
                {item} x
              </button>
            ))}
          </div>
        </div>

        <div className="full panel mini-section">
          <h4>Projects (Add one by one)</h4>
          <div className="chat-input-row">
            <input
              value={draft.project}
              onChange={(e) => setDraft((p) => ({ ...p, project: e.target.value }))}
              placeholder="Add project"
            />
            <button type="button" className="mini-btn" onClick={() => { addItem("projects", draft.project); setDraft((p) => ({ ...p, project: "" })); }}>
              Add
            </button>
          </div>
          <div className="skills-wrap">
            {(form.projects || []).map((item) => (
              <button type="button" key={item} className="skill-chip" onClick={() => removeItem("projects", item)}>
                {item} x
              </button>
            ))}
          </div>
        </div>

        <div className="full panel mini-section">
          <h4>Achievements (Add one by one)</h4>
          <div className="chat-input-row">
            <input
              value={draft.achievement}
              onChange={(e) => setDraft((p) => ({ ...p, achievement: e.target.value }))}
              placeholder="Add achievement"
            />
            <button type="button" className="mini-btn" onClick={() => { addItem("achievements", draft.achievement); setDraft((p) => ({ ...p, achievement: "" })); }}>
              Add
            </button>
          </div>
          <div className="skills-wrap">
            {(form.achievements || []).map((item) => (
              <button type="button" key={item} className="skill-chip" onClick={() => removeItem("achievements", item)}>
                {item} x
              </button>
            ))}
          </div>
        </div>

        <div className="full panel mini-section">
          <h4>Certifications (Add one by one + upload certificate)</h4>
          <div className="chat-input-row">
            <input
              value={draft.certificationTitle}
              onChange={(e) => setDraft((p) => ({ ...p, certificationTitle: e.target.value }))}
              placeholder="Certification title"
            />
            <button type="button" className="mini-btn" onClick={addCertification}>
              Add
            </button>
          </div>
          <div className="list-block">
            {(form.certifications || []).map((item, index) => (
              <div className="list-item" key={`${item.title}-${index}`}>
                <div>
                  <strong>{item.title || `Certification ${index + 1}`}</strong>
                  <small>{item.fileUrl ? "Certificate uploaded" : "No file uploaded"}</small>
                </div>
                <div className="inline-actions">
                  <label className="mini-btn" style={{ cursor: "pointer" }}>
                    Upload
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      style={{ display: "none" }}
                      onChange={(e) => handleCertificateUpload(index, e.target.files?.[0])}
                    />
                  </label>
                  <button type="button" className="mini-btn alt" onClick={() => removeCertification(index)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <label>
          GitHub
          <input name="github" value={form.github} onChange={handleChange} />
        </label>
        <label>
          LinkedIn
          <input name="linkedin" value={form.linkedin} onChange={handleChange} />
        </label>
        <label>
          Portfolio
          <input name="portfolio" value={form.portfolio} onChange={handleChange} />
        </label>
      </div>
      {uploadError ? <div className="error-box">{uploadError}</div> : null}
      {form.photoUrl ? <img className="avatar-lg" src={form.photoUrl} alt="Profile preview" /> : null}

      <button type="submit" className="primary-btn" disabled={saving}>
        {saving ? "Saving..." : "Save Profile"}
      </button>
    </form>
  );
};

export default StudentProfileSetup;
