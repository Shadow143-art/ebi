import User from "../models/User.js";
import StaffContactRequest from "../models/StaffContactRequest.js";

export const requestStudentContact = async (req, res, next) => {
  try {
    const { studentUserId, note = "" } = req.body;

    if (!studentUserId) {
      res.status(400);
      throw new Error("Student user id is required");
    }

    const student = await User.findById(studentUserId);
    if (!student || student.role !== "student") {
      res.status(404);
      throw new Error("Student not found");
    }

    const existing = await StaffContactRequest.findOne({
      staff: req.user._id,
      student: studentUserId
    });

    if (existing?.status === "accepted") {
      return res.status(200).json({
        message: "Student already accepted your contact request. You can message now."
      });
    }

    if (existing) {
      existing.note = note;
      existing.status = "pending";
      await existing.save();
    } else {
      await StaffContactRequest.create({
        staff: req.user._id,
        student: studentUserId,
        note,
        status: "pending"
      });
    }

    res.status(201).json({
      message: "Contact request sent. Student needs to accept to open chat."
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentContactRequests = async (req, res, next) => {
  try {
    const requests = await StaffContactRequest.find({
      student: req.user._id,
      status: "pending"
    })
      .populate("staff", "name username email")
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (error) {
    next(error);
  }
};

export const respondStudentContactRequest = async (req, res, next) => {
  try {
    const { requestId, action } = req.body;

    if (!requestId || !["accepted", "rejected"].includes(action)) {
      res.status(400);
      throw new Error("Invalid request payload");
    }

    const request = await StaffContactRequest.findById(requestId).populate("staff", "name username");
    if (!request) {
      res.status(404);
      throw new Error("Request not found");
    }

    if (String(request.student) !== String(req.user._id)) {
      res.status(403);
      throw new Error("Not allowed");
    }

    if (request.status !== "pending") {
      return res.status(200).json({
        message:
          request.status === "accepted"
            ? "Request already accepted."
            : "Request already rejected."
      });
    }

    request.status = action;
    await request.save();

    const msg =
      action === "accepted"
        ? `${request.staff?.name || request.staff?.username || "Staff"} request accepted. You can now see messages.`
        : "Contact request rejected";

    res.json({ message: msg });
  } catch (error) {
    next(error);
  }
};

export const getAcceptedContacts = async (req, res, next) => {
  try {
    if (req.user.role === "student") {
      const accepted = await StaffContactRequest.find({
        student: req.user._id,
        status: "accepted"
      })
        .populate("staff", "name username email role")
        .sort({ updatedAt: -1 });

      return res.json({
        contacts: accepted
          .map((item) => item.staff)
          .filter(Boolean)
      });
    }

    const accepted = await StaffContactRequest.find({
      staff: req.user._id,
      status: "accepted"
    })
      .populate("student", "name username email role")
      .sort({ updatedAt: -1 });

    res.json({
      contacts: accepted
        .map((item) => item.student)
        .filter(Boolean)
    });
  } catch (error) {
    next(error);
  }
};
