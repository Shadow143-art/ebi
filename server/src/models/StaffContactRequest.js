import mongoose from "mongoose";

const staffContactRequestSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    note: {
      type: String,
      default: "",
      maxlength: 500
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending"
    }
  },
  { timestamps: true }
);

staffContactRequestSchema.index({ staff: 1, student: 1 }, { unique: true });

export default mongoose.model("StaffContactRequest", staffContactRequestSchema);
