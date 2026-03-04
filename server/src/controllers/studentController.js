import User from "../models/User.js";
import StudentProfile from "../models/StudentProfile.js";

const normalizeArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
};

const normalizeCertifications = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
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
  }

  return String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((title) => ({ title, fileUrl: "" }));
};

export const getMyProfile = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({ user: req.user._id }).populate(
      "user",
      "username name email"
    );

    if (!profile) {
      res.status(404);
      throw new Error("Profile not found");
    }

    res.json({ profile });
  } catch (error) {
    next(error);
  }
};

export const upsertMyProfile = async (req, res, next) => {
  try {
    const payload = {
      photoUrl: req.body.photoUrl || "",
      bio: req.body.bio || "",
      department: req.body.department || "",
      year: req.body.year || "",
      contactNumber: req.body.contactNumber || "",
      skills: normalizeArray(req.body.skills),
      projects: normalizeArray(req.body.projects),
      certifications: normalizeCertifications(req.body.certifications),
      achievements: normalizeArray(req.body.achievements),
      links: {
        github: req.body.links?.github || "",
        linkedin: req.body.links?.linkedin || "",
        portfolio: req.body.links?.portfolio || ""
      }
    };

    const profile = await StudentProfile.findOneAndUpdate(
      { user: req.user._id },
      payload,
      { new: true, upsert: true }
    ).populate("user", "username name email");

    await User.findByIdAndUpdate(req.user._id, { profileCompleted: true });

    res.json({ profile });
  } catch (error) {
    next(error);
  }
};

export const searchStudentsForPeers = async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();

    const query = {
      user: { $ne: req.user._id }
    };

    if (q) {
      query.$or = [
        { skills: { $regex: q, $options: "i" } },
        { department: { $regex: q, $options: "i" } },
        { year: { $regex: q, $options: "i" } }
      ];
    }

    const profiles = await StudentProfile.find(query)
      .populate("user", "name username email")
      .sort({ updatedAt: -1 })
      .limit(30);

    const filtered = profiles.filter((p) => p.user);
    const sanitize = (p) => ({
      _id: p._id,
      user: p.user,
      photoUrl: p.photoUrl,
      bio: p.bio,
      department: p.department,
      year: p.year,
      skills: p.skills,
      projects: p.projects,
      certifications: p.certifications,
      achievements: p.achievements,
      links: p.links
    });

    if (!q) {
      return res.json({ students: filtered.map(sanitize) });
    }

    const qLower = q.toLowerCase();
    const matched = filtered.filter((p) => {
      const nameHit = p.user.name?.toLowerCase().includes(qLower);
      const usernameHit = p.user.username?.toLowerCase().includes(qLower);
      const skillsHit = (p.skills || []).some((s) => s.toLowerCase().includes(qLower));
      const deptHit = p.department?.toLowerCase().includes(qLower);
      const yearHit = p.year?.toLowerCase().includes(qLower);
      return Boolean(nameHit || usernameHit || skillsHit || deptHit || yearHit);
    });

    res.json({ students: matched.map(sanitize) });
  } catch (error) {
    next(error);
  }
};
