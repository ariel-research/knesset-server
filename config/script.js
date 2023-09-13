import {
  getBillsByKnessetNum,
  getKnessetMembers,
  getBillVoteIds,
  getVoteTypes,
} from "../controllers/database.js";
import ora from "ora";

export const scriptStarter = async () => {
  let knessetNum = process.env.START_KNESSET;
  console.log(knessetNum);
  try {
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
  } catch (error) {
    spinnerBills.fail("Error fetching Bills");
    spinnerVotes.fail("Error fetching Bill Vote IDs");
    spinnerMembers.fail("Error fetching Knesset Members");
    spinnerVoteTypes.fail("Error fetching Vote Types");
    console.error(error);
  }
};
