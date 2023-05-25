import "jest";
import { getVotes, getBillsData } from "../../controllers/general.js";
import parseVotes from "../../index.js";

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
  const awaitedData = await data;
  awaitedData.forEach((element) => {
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

// import pool from "../../config/connect";
describe("getBillsData() testing", () => {
  test("check if the return object in the right structure", async () => {
    const data = await getBillsData();
    const resVal = await validateRightStructureForBills(data);
    expect(resVal).toBe(true);
  });
});

/**
 * The validation check if there is duplicated knessetMemberID with vote on the same bill.
 * @param {*} votes
 */
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
  test("check if the return object in the right structure", async () => {
    const billIds = "16633";
    const query = { query: { billId: billIds } };
    const data = await getVotes(query);
    const resVal = await validateRightStructureForVotes(data);
    expect(resVal).toBe(true);
  });

  test("No duplicates in one vote object", async () => {
    const billIds = "16633";
    const query = { query: { billId: billIds } };
    const votes = await getVotes(query);
    const result = await validation(votes);
    expect(result).toBe(true);
  });
  test("No duplicates in multiple votes object", async () => {
    const billIds = "16633,541525,412757";
    const query = { query: { billId: billIds } };
    const result = await validation(await getVotes(query));
    expect(result).toBe(true);
  }, 15000);
  test("Empty input check", async () => {
    const billIds = "";
    const query = { query: { billId: billIds } };
    const result = await validation(await getVotes(query));
    expect(result).toBe(true);
  });
});
