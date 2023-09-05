import express from "express";
import { votesList } from "../controllers/database.js";

const router = express.Router();

router.get("/votes_list", votesList);

export default router;
