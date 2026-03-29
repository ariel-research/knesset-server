import dotenv from "dotenv";
dotenv.config();

import connection from "./connect.js";
import "../models/index.js"; // register all models and associations
import {
  fetchBillsFromCsv,
  fetchKnessetMembersFromCsv,
  fetchPlenumVotesFromCsv,
  fetchMemberVotesFromCsv,
} from "../controllers/readFromFiles.js";

/**
 * Drop all tables, recreate them, and reseed from CSV files.
 */
export const resetDb = async () => {
  console.log("Dropping and recreating all tables...");
  await connection.sync({ force: true });
  console.log("Tables recreated.");

  console.log("Seeding Knesset Members...");
  await fetchKnessetMembersFromCsv();

  console.log("Seeding Bills from votes CSV...");
  await fetchBillsFromCsv();

  console.log("Seeding Plenum Votes...");
  await fetchPlenumVotesFromCsv();

  console.log("Seeding Member Votes...");
  await fetchMemberVotesFromCsv();

  console.log("Done. Database reset and reseeded.");
  await connection.close();
};

// Run directly: node config/resetDb.js
resetDb().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
