import {
  fetchBillsByKnessetNum,
  fetchKnessetMembers,
  getVoteTypes,
  fetchPlenumVotes,
  fetchMemberVotes,
  updateFetchTime,
} from "../controllers/fetch.js";
import {
  fetchMemberVotesFromCsv as fetchMemberVotesFromOldCsv,
} from "../controllers/readFile.js";
import {
  fetchBillsFromCsv,
  fetchKnessetMembersFromCsv,
  fetchPlenumVotesFromCsv,
  fetchMemberVotesFromCsv,
} from "../controllers/readFromFiles.js";
import ora from "ora";

export const scriptStarter = async () => {
  let spinnerMembers, spinnerBills, spinnerPlenumVotes, spinnerMemberVotes;

  try {
    spinnerMembers = ora("Fetching Knesset Members from CSV").start();
    //await fetchKnessetMembersFromCsv();
    spinnerMembers.succeed("Knesset Members fetched from CSV");

    spinnerBills = ora("Fetching Bills from CSV").start();
    //await fetchBillsFromCsv();
    spinnerBills.succeed("Bills fetched from CSV");

    spinnerPlenumVotes = ora("Fetching Plenum Votes from CSV").start();
    //await fetchPlenumVotesFromCsv();
    spinnerPlenumVotes.succeed("Plenum Votes fetched from CSV");

    spinnerMemberVotes = ora("Fetching Member Votes from CSV").start();
    //await fetchMemberVotesFromCsv();
    spinnerMemberVotes.succeed("Member Votes fetched from CSV");

  } catch (error) {
    if (spinnerMembers) spinnerMembers.fail("Failed Members");
    if (spinnerBills) spinnerBills.fail("Failed Bills");
    if (spinnerPlenumVotes) spinnerPlenumVotes.fail("Failed Plenum Votes");
    if (spinnerMemberVotes) spinnerMemberVotes.fail("Failed Member Votes");
    console.error(error);
  }
};
