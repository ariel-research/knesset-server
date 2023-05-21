import express from "express";
import {
  getBillsByKnessetNum,
  getKnessetMembers,
  getBillVoteIds,
  getVotes,
} from "../controllers/database.js";

const router = express.Router();

router.get("/bills", getBillsByKnessetNum);
router.get("/members", getKnessetMembers);
router.get("/votes_ids", getBillVoteIds);
router.get("/votes", getVotes);

export default router;
