import {
  getBillsByKnessetNum,
  getKnessetMembers,
  getBillVoteIds,
} from "../controllers/database.js";
import ora from "ora";

export const scriptStarter = async () => {
  const spinnerBills = ora("Fetching Bills by Knesset Number").start();
  const spinnerVotes = ora("Fetching Bill Vote IDs").start();
  const spinnerMembers = ora("Fetching Knesset Members").start();

  try {
    await getBillsByKnessetNum();
    spinnerBills.succeed("Bills fetched successfully");

    await getBillVoteIds();
    spinnerVotes.succeed("Bill Vote IDs fetched successfully");

    await getKnessetMembers();
    spinnerMembers.succeed("Knesset Members fetched successfully");
  } catch (error) {
    spinnerBills.fail("Error fetching Bills");
    spinnerVotes.fail("Error fetching Bill Vote IDs");
    spinnerMembers.fail("Error fetching Knesset Members");
    console.error(error);
  }
};
