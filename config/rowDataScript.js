import Bill from "../models/bill.js";
import Vote from "../models/vote.js";
import excel from "exceljs";
import { insertBillRow, insertVoteForVotesRow } from "./database.js";

const data = "Votes 2021-2023.xlsx";

export const billsScript = async function () {
  // Sync the model with the database
  await Bill.sync();

  // Create an Excel workbook
  const workbook = new excel.Workbook();
  await workbook.xlsx.readFile(data);

  // Get the first worksheet
  const worksheet = workbook.getWorksheet(1);

  console.log("total rows: ", worksheet.rowCount);

  // Iterate over rows starting from the second row (assuming the first row contains headers)
  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);

    // Extract data from the Excel row
    const id = row.getCell(3).value;
    const name = row.getCell(8).value;
    const knesset_num = row.getCell(5).value;
    const isNum = Number.isInteger(knesset_num) ? knesset_num : 25;
    const vote_id = row.getCell(1).value;
    if (name === "NULL" || id === "NULL" || vote_id === "NULL") {
      continue;
    }
    try {
      await insertBillRow(id, name, isNum);
      console.log(`Row ${i - 1} processed successfully.`);
    } catch (error) {
      console.error(`Error inserting row ${i - 1}:`, error);
      return;
    }
  }

  console.log("Data import completed.");
};

export const votingScript = async function () {
  // Sync the model with the database
  await Vote.sync();

  // Create an Excel workbook
  const workbook = new excel.Workbook();
  await workbook.xlsx.readFile(data);

  // Get the first worksheet
  const worksheet = workbook.getWorksheet(1);

  console.log("total rows: ", worksheet.rowCount);

  // Iterate over rows starting from the second row (assuming the first row contains headers)
  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);

    // Extract data from the Excel row
    const vote_id = row.getCell(1).value;
    const mk_id = row.getCell(10).value;
    const bill_id = row.getCell(3).value;
    const vote = row.getCell(4).value;
    if (bill_id === "NULL" || mk_id === "NULL" || vote === "NULL") {
      continue;
    }
    await insertVoteForVotesRow(bill_id, vote_id, mk_id, vote);
    console.log(`Row ${i - 1} processed successfully.`);
  }

  console.log("Data import completed.");
};
