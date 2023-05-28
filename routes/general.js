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
  .get("/votes", getVotes);
  .get("/knessetAmounts", getKnessetNumbers)



export default router;
