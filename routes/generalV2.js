import express from "express";
import {
  browseBillsController,
  searchBillsController,
  getKnessetNumbersV2,
  getScoresControllerV2,
} from "../controllers/generalV2.js";

const router = express.Router();

// GET /v2/browse?knessetNum=25&cursor=LAST_ID&limit=50
router.get("/browse", browseBillsController);

// GET /v2/search?knessetNum=25&q=query&cursor=LAST_ID&limit=50
router.get("/search", searchBillsController);

// GET /v2/knessetAmounts
router.get("/knessetAmounts", getKnessetNumbersV2);

// POST /v2/scores
router.post("/scores", async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0)
    return res.status(400).json({ error: "Empty request body" });
  const result = await getScoresControllerV2(req.body);
  res.status("error" in result ? 400 : 200).json(result);
});

export default router;
