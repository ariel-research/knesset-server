import jest from "jest";
import parseVotes from "../../index.js";
import getVotes, { getBillsByKnessetNum } from "../../controllers/general.js";
import {
  getBillsByKnessetNumFromDB,
  getBillsFromDatabase,
  getNumOfBillsWithVotes,
} from "../../config/database.js";

const checkForDuplicatedIds = async (data) => {
  const awaitedData = await data;
  const idMap = {};
  for (const element of awaitedData) {
    if (!idMap[element.id]) {
      idMap[element.id] = true;
    } else {
      return false;
    }
  }
  return true;
};
const validateRightStructureForBills = async (data) => {
  const awaitedData = await data;
  for (const element of awaitedData) {
    if (!element.id || !element.label || !element.knessetNum) {
      return false;
    }
  }
  return true;
};
/**
{
  BillID: 16633,
  BillLabel: 'חוק המדיניות הכלכלית לשנת הכספים 2004 (תיקוני חקיקה), התשסד-2004',
  KnessetMemberId: 1054,
  KnessetMemberName: 'יגאל יאסינוב',
  TypeValue: 1
}
 */
/*
  
*/
const validateRightStructureForVotes = async (data) => {
  const votesToClient = await data;
  for (const element of votesToClient) {
    if (
      !element.BillID ||
      !element.BillLabel ||
      !element.KnessetMemberId ||
      !element.KnessetMemberName ||
      !element.TypeValue
    ) {
      return false;
    }
  }
  return true;
};

/**
 *
 * @param {*} votes
 */
const validation = async (votes) => {
  const mappedVotes = await parseVotes(votes);
  for (const billId in mappedVotes) {
    const validationDuplicatesMaps = {};
    for (let element of mappedVotes[billId]) {
      if (validationDuplicatesMaps[element.member_id]) {
        return false;
      } else {
        validationDuplicatesMaps[element.member_id] = true;
      }
    }
  }
  return true;
};
describe("getVotes() testing", () => {
  test("No duplicates while sending same two billIds.", async () => {
    const billIds = "16633,16633";
    const query = { query: { billId: billIds } };
    expect(await validation(getVotes(query))).toBe(true);
  });
  test("No duplicates in one vote object", async () => {
    const billIds = "16633";
    const query = { query: { billId: billIds } };
    expect(await validation(getVotes(query))).toBe(true);
  });
  test("No duplicates in multiple votes object", async () => {
    const billIds = "16633,541525,412757";
    const query = { query: { billId: billIds } };
    expect(await validation(getVotes(query))).toBe(true);
  });
  test("Empty input check", async () => {
    const billIds = "";
    const query = { query: { billId: billIds } };
    expect(await getVotes(query)).toBe(null);
  });
  test("Right structure for one bill id", async () => {
    const billIds = "16633";
    const query = { query: { billId: billIds } };
    expect(await validateRightStructureForVotes(await getVotes(query))).toBe(
      true
    );
  });
  test("Right structure for multiple bill ids ", async () => {
    const billIds = "16633,541525,412757";
    const query = { query: { billId: billIds } };
    expect(await validateRightStructureForVotes(await getVotes(query))).toBe(
      true
    );
  });
});
describe("getBillsData() testing", () => {
  test("check if the return object in the right structure", async () => {
    const data = await getBillsFromDatabase();
    const resVal = await validateRightStructureForBills(data);
    expect(resVal).toBe(true);
  });
  test("check not duplicated ids", async () => {
    const data = await getBillsFromDatabase();
    const resVal = await checkForDuplicatedIds(data);
    expect(resVal).toBe(true);
  });
  test("check if the number bills with votes is the number that exist in the sql", async () => {
    const data = await getBillsFromDatabase();
    expect(data.length).toBe(await getNumOfBillsWithVotes());
  });
});
describe("getBillByKnessetNum() testing", () => {
  test("check if the default knesset Number is 1", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(24);
    expect(billsByKnessetNum).toBe({ bills: [{}] });
  });
});
