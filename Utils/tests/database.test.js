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
  test("check if it returns an object", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(1);
    expect(typeof billsByKnessetNum).toBe("object");
  });
  test("check the count of bills for knesset  1, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(1);
    expect(billsByKnessetNum.bills.length).toBe(0);
  })
  test("check the count of bills for knesset  2, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(2);
    expect(billsByKnessetNum.bills.length).toBe(0);
  })
  test("check the count of bills for knesset  3, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(3);
    expect(billsByKnessetNum.bills.length).toBe(0);
  })
  test("check the count of bills for knesset  4, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(4);
    expect(billsByKnessetNum.bills.length).toBe(0);
  })
  test("check the count of bills for knesset  1, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(1);
    expect(billsByKnessetNum.bills.length).toBe(0);
  })
  test("check the count of bills for knesset  5, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(5);
    expect(billsByKnessetNum.bills.length).toBe(0);
  })
  test("check the count of bills for knesset  1, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(1);
    expect(billsByKnessetNum.bills.length).toBe(0);
  })
  test("check the count of bills for knesset  6, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(6);
    expect(billsByKnessetNum.bills.length).toBe(0);
  })
  test("check the count of bills for knesset  7, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(7);
    expect(billsByKnessetNum.bills.length).toBe(0);
  })
  test("check the count of bills for knesset  8, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(8);
    expect(billsByKnessetNum.bills.length).toBe(0);
  })
  test("check the count of bills for knesset  9, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(9);
    expect(billsByKnessetNum.bills.length).toBe(0);
  })
  test("check the count of bills for knesset  11, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(11);
    expect(billsByKnessetNum.bills.length).toBe(0);
  })
  test("check the count of bills for knesset  12, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(12);
    expect(billsByKnessetNum.bills.length).toBe(0);
  })
  test("check the count of bills for knesset  13, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(13);
    expect(billsByKnessetNum.bills.length).toBe(0);
  })
  test("check the count of bills for knesset  14, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(14);
    expect(billsByKnessetNum.bills.length).toBe(0);
  })
  test("check the count of bills for knesset  15, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(15);
    expect(billsByKnessetNum.bills.length).toBe(0);
  })
  test("check the count of bills for knesset  16, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(16);
    expect(billsByKnessetNum.bills.length).toBe(478);
  })
  test("check the count of bills for knesset  17, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(17);
    expect(billsByKnessetNum.bills.length).toBe(1198);
  })
  test("check the count of bills for knesset  18, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(18);
    expect(billsByKnessetNum.bills.length).toBe(1393);
  })
  test("check the count of bills for knesset  19, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(19);
    expect(billsByKnessetNum.bills.length).toBe(699);
  })
  test("check the count of bills for knesset  20, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(20);
    expect(billsByKnessetNum.bills.length).toBe(1612);
  })
  test("check the count of bills for knesset  21, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(21);
    expect(billsByKnessetNum.bills.length).toBe(3);
  })
  test("check the count of bills for knesset  22, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(22);
    expect(billsByKnessetNum.bills.length).toBe(6);
  })
  test("check the count of bills for knesset  23, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(23);
    expect(billsByKnessetNum.bills.length).toBe(250)
  })
  test("check the count of bills for knesset  24, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(24);
    expect(billsByKnessetNum.bills.length).toBe(32);
  })
  test("check the count of bills for knesset  25, and if it suppose to be as in MySQL", async () => {
    const billsByKnessetNum = await getBillsByKnessetNumFromDB(25);
    expect(billsByKnessetNum.bills.length).toBe(0);
  })
});
