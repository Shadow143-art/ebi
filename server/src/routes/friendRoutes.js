import { Router } from "express";
import {
  getFriendState,
  respondToRequest,
  sendFriendRequest
} from "../controllers/friendController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("student"));
router.get("/state", getFriendState);
router.post("/request", sendFriendRequest);
router.post("/respond", respondToRequest);

export default router;
