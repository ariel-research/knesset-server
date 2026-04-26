import {
    insertMemberVoteRow,
    insertKnessetMemberRow,
    updateLastUpdated,
    getLastUpdated,
    getPlenumVotesIds,
    getKnessetMembersIds,
  } from "../config/dbQueriesOld.js";

  
  import fs from 'fs';
  import path from 'path';
  import { fileURLToPath } from 'url';
  import csv from 'csv-parser';
  import readline from 'readline';

  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  export const fetchMemberVotesFromCsv = async () => {
    const filePath = path.resolve(__dirname, '../data/Votes25.csv');
  
    if (!fs.existsSync(filePath)) {
      console.error("❌ File not found:", filePath);
      return;
    }
  
    console.log("📂 File found:", filePath);
  
    const lastModified = await getLastUpdated("member_votes");
    console.log("⏱ Last modified from DB:", lastModified || "none");
  
    const members = await getKnessetMembersIds();
    console.log("👥 Loaded member IDs:", members.size);
  
    const votes = await getPlenumVotesIds();
    console.log("🗳 Loaded vote IDs:", votes.size);
  
    let latestTimestamp = null;
    let rowCount = 0;
    let headers = [];
  
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });
  
    console.log("🚀 Starting line-by-line processing...");
  
    for await (const line of rl) {
      if (!line.trim()) {
        console.log("⚠️ Empty line skipped");
        continue;
      }
  
      const values = line.split(',').map(v => v.trim());
  
      // קריאת כותרות
      if (rowCount === 0) {
        headers = values;
        console.log("📌 Headers:", headers);
        rowCount++;
        continue;
      }
  
      try {
        const voteId = Number(values[0]);
        const voteDateTime = values[1];
        const mkId = Number(values[5]);
        const lastName = values[6];
        const firstName = values[7];
        const resultDesc = values[9];
        const lastUpdatedStr = values[10];
  
        if (isNaN(voteId) || isNaN(mkId)) {
          console.warn(`❌ Invalid voteId or mkId in row ${rowCount + 1}`);
          rowCount++;
          continue;
        }
  
        const voteDate = new Date(voteDateTime);
        const lastUpdated = new Date(lastUpdatedStr);
  
        console.log(`➡️ Row ${rowCount}:`, {
          voteId,
          voteDateTime,
          mkId,
          firstName,
          lastName,
          resultDesc,
          lastUpdatedStr,
        });
  
        if (voteDate < new Date("2022-11-01T00:00:00Z")) {
          console.log("⏭ Skipped: voteDate too early");
          rowCount++;
          continue;
        }
  
        if (lastModified && lastUpdated <= new Date(lastModified)) {
          console.log("⏭ Skipped: already processed (LastUpdatedDate)");
          rowCount++;
          continue;
        }
  
        if (!votes.has(voteId)) {
          console.log("⏭ Skipped: voteId not in known votes list");
          rowCount++;
          continue;
        }
  
        const memberVoteId = `${voteId}_${mkId}`;
  
        if (!members.has(mkId)) {
          console.log("👤 New MK found:", mkId, firstName, lastName);
          await insertKnessetMemberRow(mkId, firstName, lastName, true);
          members.add(mkId);
        }
  
        await insertMemberVoteRow(voteId, mkId, resultDesc);
        console.log("✅ Vote inserted:", memberVoteId);
  
        if (!latestTimestamp || lastUpdated > latestTimestamp) {
          latestTimestamp = lastUpdated;
          console.log("🆕 New latestTimestamp:", latestTimestamp.toISOString());
        }
  
      } catch (err) {
        console.warn(`⚠️ Error in row ${rowCount + 1}:`, err.message);
      }
  
      rowCount++;
      if (rowCount % 1000 === 0) {
        console.log(`📊 Processed ${rowCount} rows...`);
      }
    }
  
    if (latestTimestamp) {
      await updateLastUpdated("member_votes", latestTimestamp.toISOString());
      console.log("🕒 Metadata updated:", latestTimestamp.toISOString());
    }
  
    console.log(`🎉 Done. Total rows processed: ${rowCount}`);
  };