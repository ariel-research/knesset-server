import {
  insertBillRow,
  insertKnessetMemberRow,
  insertPlenumVote,
  insertMemberVoteRow,
  getRawBills,
  getPlenumVotesIds,
  getKnessetMembersIds,
} from "../config/dbQueriesOld.js";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";
import csv from "csv-parser";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: strip BOM from string
const stripBom = (str) => str.replace(/^\uFEFF/, "");

// Helper: collect all rows from a csv-parser stream
const readCsvRows = (filePath) => {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath, { encoding: "utf8" })
      .pipe(csv({ mapHeaders: ({ header }) => stripBom(header.trim()) }))
      .on("data", (row) => rows.push(row))
      .on("error", reject)
      .on("end", () => resolve(rows));
  });
};

// Helper: readline-based CSV reader (for files without quoted commas)
const readCsvLines = async (filePath) => {
  const fileStream = fs.createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let headers = [];
  const rows = [];
  let isFirst = true;

  for await (const line of rl) {
    if (!line.trim()) continue;
    const values = line.split(",").map((v) => v.trim());

    if (isFirst) {
      headers = values.map((h) => stripBom(h));
      isFirst = false;
      continue;
    }

    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    rows.push(row);
  }

  return rows;
};

// Helper: extract URL from Excel HYPERLINK formula =HYPERLINK("url", "label")
const extractUrl = (cell) => {
  if (!cell) return null;
  const match = cell.match(/=HYPERLINK\("([^"]+)"/i);
  return match ? match[1] : null;
};

// Helper: parse DD/MM/YYYY or DD/MM/YYYY HH:MM:SS to Date
const parseVoteDate = (dateStr) => {
  if (!dateStr) return new Date(0);
  const [datePart] = dateStr.split(" ");
  const [day, month, year] = datePart.split("/");
  return new Date(`${year}-${month}-${day}`);
};

/**
 * Build bills from votes CSV.
 * Groups votes by Item ID and takes the last vote (by date) per item.
 * bill.id = Item ID, bill.name = Vote Title, bill.knesset_num = 25,
 * bill.vote_id = last vote's ID, bill.bill_date = last vote's date.
 */
export const fetchBillsFromCsv = async () => {
  const filePath = path.resolve(__dirname, "../data/knesset-votes.csv");
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    return;
  }

  const rows = await readCsvRows(filePath);

  // Group by Item ID, keeping the latest vote per item
  const itemMap = new Map();

  for (const row of rows) {
    const itemId = Number(row["Item ID"]);
    if (isNaN(itemId) || !itemId) continue;

    const voteId = Number(row["ID"]);
    if (isNaN(voteId)) continue;

    const title = row["Vote Title"] || "";
    const dateStr = row["Vote Date Time"] || null;
    const link = extractUrl(row["קישור"]);

    const existing = itemMap.get(itemId);
    if (!existing || parseVoteDate(dateStr) > parseVoteDate(existing.dateStr)) {
      itemMap.set(itemId, { voteId, title, dateStr, link });
    }
  }

  let count = 0;
  for (const [itemId, { voteId, title, dateStr, link }] of itemMap) {
    await insertBillRow(itemId, title, 25, dateStr, voteId, dateStr, link);
    count++;
  }

  console.log(`Bills from votes CSV: ${count} inserted`);
};

/**
 * Read Knesset members from CSV.
 * Filter: only rows where position code is 43 or 61
 */
export const fetchKnessetMembersFromCsv = async () => {
  const filePath = path.resolve(__dirname, "../data/knesset-members.csv");
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    return;
  }

  const rows = await readCsvLines(filePath);
  let count = 0;

  for (const row of rows) {
    const positionCode = Number(row["קוד תפקיד"]);
    if (positionCode !== 43 && positionCode !== 61) continue;

    const memberID = Number(row["קוד שחקן"]);
    if (isNaN(memberID)) continue;

    const fullName = row["שם"] || "";
    const spaceIndex = fullName.indexOf(" ");
    const firstName = spaceIndex > -1 ? fullName.substring(0, spaceIndex) : fullName;
    const lastName = spaceIndex > -1 ? fullName.substring(spaceIndex + 1) : "";

    const endDate = row["סיום"] || "";
    const isActive = endDate === "NULL" || endDate === "";

    await insertKnessetMemberRow(memberID, firstName, lastName, isActive);
    count++;
  }

  console.log(`Knesset members from CSV: ${count} inserted`);
};

/**
 * Read plenum votes from CSV.
 * Filter: only rows where Item ID matches an existing bill in the DB.
 */
export const fetchPlenumVotesFromCsv = async () => {
  const filePath = path.resolve(__dirname, "../data/knesset-votes.csv");
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    return;
  }

  // Load existing bill IDs from DB
  const bills = await getRawBills();
  const billIds = new Set(bills.map((b) => b.id));

  const rows = await readCsvRows(filePath);
  let count = 0;

  for (const row of rows) {
    const itemId = Number(row["Item ID"]);
    if (!billIds.has(itemId)) continue;

    const voteId = Number(row["ID"]);
    if (isNaN(voteId)) continue;

    const title = row["Vote Title"] || "";
    const subject = row["Vote Subject"] || null;
    const ordinal = Number(row["Ordinal"]);
    const dateStr = row["Vote Date Time"] || null;
    const forOption = row["For Option Desc"] || null;
    const againstOption = row["Against Option Desc"] || null;

    await insertPlenumVote(
      voteId,
      itemId,
      title,
      subject,
      25,
      ordinal,
      dateStr,
      forOption,
      againstOption
    );
    count++;
  }

  console.log(`Plenum votes from CSV: ${count} inserted`);
};

/**
 * Read member votes from CSV.
 * Check that vote exists in DB, insert member if new.
 */
export const fetchMemberVotesFromCsv = async () => {
  const filePath = path.resolve(__dirname, "../data/knesset-member-votes.csv");
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    return;
  }

  const votes = await getPlenumVotesIds();
  const members = await getKnessetMembersIds();

  const rows = await readCsvLines(filePath);
  let count = 0;

  for (const row of rows) {
    const voteId = Number(row["Vote ID"]);
    if (!votes.has(voteId)) continue;

    const mkId = Number(row["Mk Id"]);
    if (isNaN(mkId)) continue;

    const resultDesc = row["Result Desc"] || "";
    const firstName = row["First Name"] || "";
    const lastName = row["Last Name"] || "";

    if (!members.has(mkId)) {
      await insertKnessetMemberRow(mkId, firstName, lastName, true);
      members.add(mkId);
    }

    await insertMemberVoteRow(voteId, mkId, resultDesc);
    count++;
  }

  console.log(`Member votes from CSV: ${count} inserted`);
};
