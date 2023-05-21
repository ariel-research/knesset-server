import express from "express";
import { getBillsData, getBillsByKnessetNum } from "../controllers/general.js";

const router = express.Router();

router
  .get("/bills", getBillsData)
  .get("/billsByKnessetNum", getBillsByKnessetNum);

export default router;
