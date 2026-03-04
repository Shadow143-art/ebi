import mongoose from "mongoose";

const studentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    photoUrl: {
      type: String,
      default: ""
    },
    bio: {
      type: String,
      default: ""
    },
    department: {
      type: String,
      default: ""
    },
    year: {
      type: String,
      default: ""
    },
    contactNumber: {
      type: String,
      default: ""
    },
    skills: {
      type: [String],
      default: []
    },
    projects: {
      type: [String],
      default: []
    },
    certifications: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    achievements: {
      type: [String],
      default: []
    },
    links: {
      github: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      portfolio: { type: String, default: "" }
    }
  },
  { timestamps: true }
);

studentProfileSchema.index({ skills: 1 });
studentProfileSchema.index({ department: 1, year: 1 });

export default mongoose.model("StudentProfile", studentProfileSchema);
