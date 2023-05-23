import "jest";
import getVotes from "../../controllers/database.js";
import parseVotes from "../../index.js";
import pool from "../../config/connect";

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
    expect(await getVotes(query)).toBe([]);
  });
});
