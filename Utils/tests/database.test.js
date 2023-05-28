import "jest";
import { getVotes } from "../../controllers/general.js";
import parseVotes from "../../index.js";
import { getBillsFromDatabase } from "../../config/database.js";

const validateRightStructureForBills = async (data) => {
  const awaitedData = await data;
  awaitedData.forEach((element) => {
    if (!element.id || !element.label || !element.knessetNum) {
      return false;
    }
  });
  return true;
};

const validateRightStructureForVotes = async (data) => {
  const votesToClient = await data;
  votesToClient.forEach((element) => {
    if (
      !element.voteID ||
      !element.BillID ||
      !element.KnessetMemberID ||
      !element.VoteValue
    ) {
      return false;
    }
  });
  return true;
};

const validation = async (votes) => {
  const mappedVotes = await parseVotes(votes);
  for (const billId in mappedVotes) {
    const validationDuplicatesMaps = {};
    for (const element of mappedVotes[billId]) {
      if (validationDuplicatesMaps[element.member_id]) {
        return false;
      } else {
        validationDuplicatesMaps[element.member_id] = true;
      }
    }
  }
  return true;
};
// import pool from "../../config/connect";
describe("getBillsData() testing", () => {
  test("check if the return object in the right structure", async () => {
    const data = await getBillsFromDatabase();
    const resVal = await validateRightStructureForBills(data);
    expect(resVal).toBe(true);
  });
});

/**
 * The validation check if there is duplicated knessetMemberID with vote on the same bill.
 * @param {*} votes
 */

describe("validation() tests", () => {
  test("validation check duplicated votes on the same bill is forbidden", async () => {
    const duplicatedVotes = [
      { BillID: 16633, KnessetMemberId: 1061, TypeValue: 2 },
      { BillID: 16633, KnessetMemberId: 1061, TypeValue: 1 },
    ];
    expect(await validation(duplicatedVotes)).toBe(false);
  });
  test("validation check with good input", async () => {
    const duplicatedVotes = [
      { BillID: 16633, KnessetMemberId: 1062, TypeValue: 2 },
      { BillID: 16633, KnessetMemberId: 1061, TypeValue: 1 },
    ];
    expect(await validation(duplicatedVotes)).toBe(true);
  });
});
/**
 * getVotes Function testing
 */
describe("getVotes() testing", () => {
  test("check if the return votesToClient object in the right structure", async () => {
    const billData =
      '[{"billId":17660,"opinionValue":1},{"billId":17799,"opinionValue":-1}]';
    const query = { query: { billData: billData } };
    const { votesToClient } = await getVotes(query);
    // console.log(votes);
    const resVal = await validateRightStructureForVotes(votesToClient);
    expect(resVal).toBe(true);
  });

  test("No duplicates in one vote object", async () => {
    const billData = '[{"billId":17660,"opinionValue":1}]';
    const query = { query: { billData: billData } };
    const { votesToClient } = await getVotes(query);
    const result = await validation(votesToClient);
    expect(result).toBe(true);
  });

  test("duplicates in multiple votes object", async () => {
    const billData =
      '[{"billId":17660,"opinionValue":1},{"billId":17799,"opinionValue":-1},{"billId":16127,"opinionValue":-1}]';
    const query = { query: { billData: billData } };
    const { votesToClient, _ } = await getVotes(query);
    const resVal = await validation(votesToClient);
    expect(resVal).toBe(true);
  }, 10000);

  test("duplicates in multiple votes object", async () => {
    const billData =
      '[{"billId":17660,"opinionValue":1},{"billId":17799,"opinionValue":-1},{"billId":16127,"opinionValue":-1}]';
    const query = { query: { billData: billData } };
    const { votesToClient, _ } = await getVotes(query);
    const resVal = await validation(votesToClient);
    expect(resVal).toBe(true);
  }, 10000);

  test("Empty input check", async () => {
    const billIds = "";
    const query = { query: { billData: billIds } };
    const { votesToClient, _ } = await getVotes(query);
    expect(votesToClient).toBe(undefined);
  });
});
