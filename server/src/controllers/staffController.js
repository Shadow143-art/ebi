import StudentProfile from "../models/StudentProfile.js";

export const searchStudents = async (req, res, next) => {
  try {
    const { q = "", name = "", skill = "", department = "", year = "" } = req.query;
    const qValue = String(q || "").trim();
    const nameValue = String(name || "").trim();
    const skillValue = String(skill || "").trim();
    const departmentValue = String(department || "").trim();
    const yearValue = String(year || "").trim();

    const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const andQuery = [];

    if (skillValue) andQuery.push({ skills: { $regex: escapeRegex(skillValue), $options: "i" } });
    if (departmentValue) {
      andQuery.push({ department: { $regex: escapeRegex(departmentValue), $options: "i" } });
    }
    if (yearValue) andQuery.push({ year: { $regex: escapeRegex(yearValue), $options: "i" } });

    const profileQuery = andQuery.length ? { $and: andQuery } : {};

    let profiles = await StudentProfile.find(profileQuery)
      .populate("user", "name username email")
      .sort({ updatedAt: -1 })
      .limit(100);

    profiles = profiles.filter((profile) => {
      if (!profile.user) return false;
      const nameNeedle = nameValue.toLowerCase();
      const qNeedle = qValue.toLowerCase();

      const byName = !nameValue
        ? true
        : profile.user.name?.toLowerCase().includes(nameNeedle) ||
          profile.user.username?.toLowerCase().includes(nameNeedle);

      const byQ = !qValue
        ? true
        : profile.user.name?.toLowerCase().includes(qNeedle) ||
          profile.user.username?.toLowerCase().includes(qNeedle) ||
          (profile.skills || []).some((s) => s.toLowerCase().includes(qNeedle)) ||
          profile.department?.toLowerCase().includes(qNeedle) ||
          profile.year?.toLowerCase().includes(qNeedle);

      return byName && byQ;
    });

    res.json({ students: profiles });
  } catch (error) {
    next(error);
  }
};

export const getStudentById = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findById(req.params.id).populate(
      "user",
      "name username email"
    );

    if (!profile || !profile.user) {
      res.status(404);
      throw new Error("Student profile not found");
    }

    res.json({ profile });
  } catch (error) {
    next(error);
  }
};
