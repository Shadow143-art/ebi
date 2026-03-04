import FriendRequest from "../models/FriendRequest.js";
import User from "../models/User.js";

const areFriends = async (userA, userB) => {
  const relation = await FriendRequest.findOne({
    status: "accepted",
    $or: [
      { from: userA, to: userB },
      { from: userB, to: userA }
    ]
  });
  return Boolean(relation);
};

export const getFriendState = async (req, res, next) => {
  try {
    const myId = req.user._id;

    const accepted = await FriendRequest.find({
      status: "accepted",
      $or: [{ from: myId }, { to: myId }]
    })
      .populate("from", "name username")
      .populate("to", "name username")
      .sort({ updatedAt: -1 });

    const requests = await FriendRequest.find({ to: myId, status: "pending" })
      .populate("from", "name username")
      .sort({ createdAt: -1 });

    const outgoing = await FriendRequest.find({ from: myId, status: "pending" })
      .populate("to", "name username")
      .sort({ createdAt: -1 });

    const friends = accepted
      .map((item) => {
        const friend = String(item.from._id) === String(myId) ? item.to : item.from;
        return friend;
      })
      .filter(Boolean);

    res.json({ friends, pendingRequests: requests, outgoingRequests: outgoing });
  } catch (error) {
    next(error);
  }
};

export const sendFriendRequest = async (req, res, next) => {
  try {
    const toUserId = req.body.toUserId;
    const fromUserId = req.user._id;

    if (!toUserId) {
      res.status(400);
      throw new Error("Recipient user id is required");
    }

    if (String(toUserId) === String(fromUserId)) {
      res.status(400);
      throw new Error("Cannot send request to yourself");
    }

    const recipient = await User.findById(toUserId);
    if (!recipient || recipient.role !== "student") {
      res.status(404);
      throw new Error("Student not found");
    }

    if (await areFriends(fromUserId, toUserId)) {
      res.status(409);
      throw new Error("Already friends");
    }

    const existing = await FriendRequest.findOne({
      $or: [
        { from: fromUserId, to: toUserId },
        { from: toUserId, to: fromUserId }
      ]
    });

    if (existing && existing.status === "pending") {
      res.status(409);
      throw new Error("Request already pending");
    }

    if (existing && existing.status !== "pending") {
      existing.from = fromUserId;
      existing.to = toUserId;
      existing.status = "pending";
      await existing.save();
      return res.status(201).json({ message: "Friend request sent" });
    }

    await FriendRequest.create({ from: fromUserId, to: toUserId, status: "pending" });

    res.status(201).json({ message: "Friend request sent" });
  } catch (error) {
    next(error);
  }
};

export const respondToRequest = async (req, res, next) => {
  try {
    const { requestId, fromUserId, action } = req.body;

    if ((!requestId && !fromUserId) || !["accepted", "rejected"].includes(action)) {
      res.status(400);
      throw new Error("Invalid request payload");
    }

    let request = null;

    if (requestId) {
      request = await FriendRequest.findById(requestId);
    }

    // Fallback for cases where frontend has stale/missing request id.
    if (!request && fromUserId) {
      request = await FriendRequest.findOne({
        from: fromUserId,
        to: req.user._id,
        status: "pending"
      });
    }

    if (!request) {
      res.status(404);
      throw new Error("Friend request not found");
    }

    if (String(request.to) !== String(req.user._id)) {
      res.status(403);
      throw new Error("Not allowed");
    }

    request.status = action;
    await request.save();

    res.json({ message: `Request ${action}` });
  } catch (error) {
    next(error);
  }
};
