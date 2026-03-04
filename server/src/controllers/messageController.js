import mongoose from "mongoose";
import Message from "../models/Message.js";
import FriendRequest from "../models/FriendRequest.js";
import StaffContactRequest from "../models/StaffContactRequest.js";
import User from "../models/User.js";
import { emitToUser } from "../realtime/socket.js";

const hasFriendship = async (from, to) => {
  const relation = await FriendRequest.findOne({
    status: "accepted",
    $or: [
      { from, to },
      { from: to, to: from }
    ]
  });

  return Boolean(relation);
};

const hasAcceptedStaffContact = async (userA, userB) => {
  const relation = await StaffContactRequest.findOne({
    status: "accepted",
    $or: [
      { staff: userA, student: userB },
      { staff: userB, student: userA }
    ]
  });
  return Boolean(relation);
};

const canMessage = async (fromUser, toUserId) => {
  const peer = await User.findById(toUserId).select("role");
  if (!peer) return false;

  const bothStudents = fromUser.role === "student" && peer.role === "student";
  if (bothStudents) {
    return hasFriendship(fromUser._id, toUserId);
  }

  if (
    (fromUser.role === "staff" && peer.role === "student") ||
    (fromUser.role === "student" && peer.role === "staff")
  ) {
    return hasAcceptedStaffContact(fromUser._id, toUserId);
  }

  return false;
};

const toObjectId = (value) =>
  value instanceof mongoose.Types.ObjectId ? value : new mongoose.Types.ObjectId(value);

const buildUnreadSummary = async (userId) => {
  const userObjectId = toObjectId(userId);
  const rows = await Message.aggregate([
    {
      $match: {
        to: userObjectId,
        readAt: null
      }
    },
    {
      $group: {
        _id: "$from",
        count: { $sum: 1 }
      }
    }
  ]);

  const byContact = rows.map((row) => ({
    contactId: String(row._id),
    count: Number(row.count || 0)
  }));

  const total = byContact.reduce((sum, item) => sum + item.count, 0);

  return { total, byContact };
};

const emitUnreadSummary = async (userId) => {
  const summary = await buildUnreadSummary(userId);
  emitToUser(userId, "message:unread", summary);
  return summary;
};

export const getUnreadSummary = async (req, res, next) => {
  try {
    const summary = await buildUnreadSummary(req.user._id);
    res.json(summary);
  } catch (error) {
    next(error);
  }
};

export const markConversationAsRead = async (req, res, next) => {
  try {
    const myId = req.user._id;
    const peerId = req.params.peerId;

    if (!(await canMessage(req.user, peerId))) {
      res.status(403);
      throw new Error("Messaging allowed only with accepted contacts");
    }

    await Message.updateMany(
      {
        from: peerId,
        to: myId,
        readAt: null
      },
      {
        $set: { readAt: new Date() }
      }
    );

    const summary = await emitUnreadSummary(myId);
    res.json({ message: "Conversation marked as read", ...summary });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const myId = req.user._id;

    await Message.updateMany(
      {
        to: myId,
        readAt: null
      },
      {
        $set: { readAt: new Date() }
      }
    );

    const summary = await emitUnreadSummary(myId);
    res.json({ message: "All messages marked as read", ...summary });
  } catch (error) {
    next(error);
  }
};

export const getConversation = async (req, res, next) => {
  try {
    const myId = req.user._id;
    const peerId = req.params.peerId;

    if (!(await canMessage(req.user, peerId))) {
      res.status(403);
      throw new Error("Messaging allowed only with accepted contacts");
    }

    await Message.updateMany(
      {
        from: peerId,
        to: myId,
        readAt: null
      },
      {
        $set: { readAt: new Date() }
      }
    );

    const messages = await Message.find({
      $or: [
        { from: myId, to: peerId },
        { from: peerId, to: myId }
      ]
    })
      .sort({ createdAt: 1 })
      .limit(200);

    await emitUnreadSummary(myId);

    res.json({ messages });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const from = req.user._id;
    const { to, body } = req.body;

    if (!to || !body) {
      res.status(400);
      throw new Error("Recipient and message body are required");
    }

    if (!(await canMessage(req.user, to))) {
      res.status(403);
      throw new Error("You can only message accepted contacts");
    }

    const message = await Message.create({ from, to, body });
    const payload = message.toObject();

    emitToUser(to, "message:new", { message: payload });
    await emitUnreadSummary(to);

    res.status(201).json({ message: payload });
  } catch (error) {
    next(error);
  }
};
