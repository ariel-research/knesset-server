import express from "express";
import {
  getBillsData,
  getBillsByKnessetNum,
  getVotes,
} from "../controllers/general.js";

const router = express.Router();

router
  .get("/bills", getBillsData)
  .get("/billsByKnessetNum", getBillsByKnessetNum)
  .get("/votes", getVotes);
export default router;
