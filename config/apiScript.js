/*import {
  getBillsByKnessetNum,
  getKnessetMembers,
  getBillVoteIds,
  getVoteTypes,
  votesList,
} from "../controllers/database.js";
import ora from "ora";*/
import {
  fetchBillsByKnessetNum,
  fetchKnessetMembers,
  getVoteTypes,
  fetchPlenumVotes,
  fetchMemberVotes,
  updateFetchTime,
} from "../controllers/fetch.js";
import ora from "ora";

export const scriptStarter = async () => {
  let knessetNum = process.env.START_KNESSET;
  let spinnerMembers, spinnerVoteTypes, spinnerBills, spinnerMemberVotes, spinnerPlenumVotes;

  try {
    
    spinnerMembers = ora("Fetching Knesset Members").start();
    //await fetchKnessetMembers();
    spinnerMembers.succeed("Knesset Members fetched");

    spinnerVoteTypes = ora("Fetching Vote Types").start();
    //await getVoteTypes();
    spinnerVoteTypes.succeed("Vote Types fetched");

    spinnerBills = ora("Fetching bills").start();
    //await fetchBillsByKnessetNum();
    spinnerBills.succeed("bills fetched");

    spinnerPlenumVotes = ora("Fetching plenum Votes").start();
    //await fetchPlenumVotes();
    spinnerPlenumVotes.succeed("plenum Votes fetched");

    spinnerMemberVotes = ora("Fetching member Votes").start();
    //await fetchMemberVotes();
    spinnerMemberVotes.succeed("member Votes fetched");

  } catch (error) {
    if (spinnerBills) spinnerBills.fail("Failed Bills");
    if (spinnerMembers) spinnerMembers.fail("Failed Members");
    if (spinnerVoteTypes) spinnerVoteTypes.fail("Failed Vote Types");
    if (spinnerPlenumVotes) spinnerPlenumVotes.fail("Failed Plenum Votes");
    if (spinnerMemberVotes) spinnerMemberVotes.fail("Failed member Votes");
    console.error(error);
  }
};


/*export const scriptStarter = async () => {
  let knessetNum = process.env.START_KNESSET;
  let spinnerBills;
  let spinnerMembers;
  console.log(knessetNum);
  try {
      spinnerBills = ora("Fetching Bills by Knesset Number").start();
     await getBillsByKnessetNum(knessetNum);
     spinnerBills.succeed("Bills fetched successfully");
    /* const spinnerVotes = ora("Fetching Bill Vote IDs").start();
     await getBillVoteIds(knessetNum);
     spinnerVotes.succeed("Bill Vote IDs fetched successfully");
      spinnerMembers = ora("Fetching Knesset Members").start();
     await getKnessetMembers();
     spinnerMembers.succeed("Knesset Members fetched successfully");
    // const spinnerVoteTypes = ora("Fetching Vote Types").start();
    // await getVoteTypes();
    // spinnerVoteTypes.succeed("Vote Types fetched successfully");
     /*const spinnerVoteList = ora("Fetching Vote List").start();
     await votesList(knessetNum);
     spinnerVoteList.succeed("Votes List fetched successfully");
  } catch (error) {
    if (spinnerBills) {
      spinnerBills.fail("Error fetching Bills");
    }

    if (spinnerMembers) {
      spinnerMembers.fail("Error fetching Knesset Members");
    }
    console.error(error);
  }
};
*/