import { Router } from "express";
import {
  getAcceptedContacts,
  getStudentContactRequests,
  requestStudentContact,
  respondStudentContactRequest
} from "../controllers/staffContactController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/accepted", getAcceptedContacts);
router.post("/request", requireRole("staff"), requestStudentContact);
router.get("/requests", requireRole("student"), getStudentContactRequests);
router.post("/respond", requireRole("student"), respondStudentContactRequest);

export default router;
