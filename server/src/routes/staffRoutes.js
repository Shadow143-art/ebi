import { Router } from "express";
import { getStudentById, searchStudents } from "../controllers/staffController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth, requireRole("staff"));
router.get("/students", searchStudents);
router.get("/students/:id", getStudentById);

export default router;
