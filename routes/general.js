import express from "express";
import {
  getBillsData,
  getBillsByKnessetNum,
  getKnessetNumbers,
  getVotes,
  getScoresController,
} from "../controllers/general.js";

const router = express.Router();

router
  .get("/bills", getBillsData)
  .get("/billsByKnessetNum", getBillsByKnessetNum)
  .get("/votes", getVotes)
  .get("/knessetAmounts", getKnessetNumbers)
  .post("/scores", async (req, res) => {
    if (
      req.get("Content-Length") === "0" ||
      Object.keys(req.body).length === 0
    ) {
      // Request body is empty
      console.log("No request body received");
      res.status(400).json({ error: "No request body received" });
    }
    const res1 = await getScoresController(req.body);
    console.log("res1:", res1);
    let status;
    if ("error" in res1) {
      status = 400;
    } else {
      status = 200;
    }
    res.status(status).json(res1);
  });

export default router;
