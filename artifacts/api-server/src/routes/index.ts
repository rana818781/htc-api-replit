import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import plansRouter from "./plans";
import usersRouter from "./users";
import extensionRouter from "./extension";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(plansRouter);
router.use(usersRouter);
router.use(extensionRouter);
router.use(adminRouter);

export default router;
