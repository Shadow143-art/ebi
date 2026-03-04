import { Router } from "express";
import {
  getMyProfile,
  searchStudentsForPeers,
  upsertMyProfile
} from "../controllers/studentController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("student"));
router.get("/profile", getMyProfile);
router.put("/profile", upsertMyProfile);
router.get("/search", searchStudentsForPeers);

export default router;
