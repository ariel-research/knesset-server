import express from "express";
import {
  getBillsData,
  getBillsByKnessetNum,
  getKnessetNumbers,
} from "../controllers/general.js";

const router = express.Router();

router
  .get("/bills", getBillsData)
  .get("/billsByKnessetNum", getBillsByKnessetNum)
  .get("/knessetAmounts", getKnessetNumbers);

export default router;
