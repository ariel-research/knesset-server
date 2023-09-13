import {
  getBillsByKnessetNum,
  getKnessetMembers,
  getBillVoteIds,
  getVoteTypes,
} from "../controllers/database.js";
import ora from "ora";
import fs from "fs";

export const scriptStarter = async () => {
  let knessetNum;
  try {
    fs.readFile("config\\knessetNumber.txt", "utf-8", async (err, data) => {
      if (err) {
        console.error("failed to open file ", err.message);
      } else {
        knessetNum = data;

        const spinnerBills = ora("Fetching Bills by Knesset Number").start();
        await getBillsByKnessetNum(knessetNum);
        spinnerBills.succeed("Bills fetched successfully");
        const spinnerVotes = ora("Fetching Bill Vote IDs").start();
        await getBillVoteIds(knessetNum);
        spinnerVotes.succeed("Bill Vote IDs fetched successfully");
        const spinnerMembers = ora("Fetching Knesset Members").start();
        await getKnessetMembers();
        spinnerMembers.succeed("Knesset Members fetched successfully");
        const spinnerVoteTypes = ora("Fetching Vote Types").start();
        await getVoteTypes();
        spinnerVoteTypes.succeed("Vote Types fetched successfully");
      }
    });
  } catch (error) {
    spinnerBills.fail("Error fetching Bills");
    spinnerVotes.fail("Error fetching Bill Vote IDs");
    spinnerMembers.fail("Error fetching Knesset Members");
    spinnerVoteTypes.fail("Error fetching Vote Types");
    console.error(error);
  }
};


