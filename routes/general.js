import express from "express";
import {
  getBillsData,
  getBillsByKnessetNum,
  getKnessetNumbers,
  getVotes,
} from "../controllers/general.js";

const router = express.Router();

router
  .get("/bills", getBillsData)
  .get("/billsByKnessetNum", getBillsByKnessetNum)
  .get("/knessetAmounts", getKnessetNumbers)
  .get("/votes", getVotes);

export default router;
