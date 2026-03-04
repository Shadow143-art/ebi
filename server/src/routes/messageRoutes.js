import { Router } from "express";
import {
  getConversation,
  getUnreadSummary,
  markAllAsRead,
  markConversationAsRead,
  sendMessage
} from "../controllers/messageController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/unread", getUnreadSummary);
router.post("/read-all", markAllAsRead);
router.post("/read/:peerId", markConversationAsRead);
router.get("/:peerId", getConversation);
router.post("/", sendMessage);

export default router;
