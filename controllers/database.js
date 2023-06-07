import xml2js from "xml2js";
import {
  insertBillRow,
  insertKnessetMemberRow,
  updateVoteId,
  addToVoteListRow,
} from "../config/database.js";

export const xmlParser = (xml) => {
  return new Promise((resolve, reject) => {
    const parser = new xml2js.Parser();
    parser.parseString(xml, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

const billUrl = `http://knesset.gov.il/Odata/ParliamentInfo.svc/KNS_Bill()`;
const count = 100;

const fetchBills = async (res, skip, knessetNum) => {
  try {
    const response = await fetch(
      `${billUrl}?$filter=KnessetNum%20eq%20${knessetNum}&$skip=${skip}&count=${count}`
    );
    const xml = await response.text();
    const result = await xmlParser(xml);
    const entries = await result["feed"]["entry"];
    if (!entries) {
      return; // All bills have been fetched
    }
    // Map the entries to an array of bill objects
    const bills = entries.map((entry) => {
      return {
        billId: entry["content"][0]["m:properties"][0]["d:BillID"][0]["_"],
        name:
          typeof entry["content"][0]["m:properties"][0]["d:Name"][0] ===
          "string"
            ? entry["content"][0]["m:properties"][0]["d:Name"][0]
            : entry["content"][0]["m:properties"][0]["d:Name"][0]["_"],
        knessetNum:
          entry["content"][0]["m:properties"][0]["d:KnessetNum"][0]["_"],
      };
    });

    for (let bill of bills) {
      await insertBillRow(
        bill.billId,
        bill.name,
        bill.knessetNum,
        bill.publishDate
      );
    } // Insert the bills into the database

    // Fetch the next batch of bills recursively
    return fetchBills(res, skip + count, knessetNum);
  } catch (err) {
    console.error(err);
    return res.status(404).json({ err: err.message + `${skip}` });
  }
};
/**
 * Insert into the sql schemes all of the bills by iterate over all the knesset values.
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const getBillsByKnessetNum = async (req, res) => {
  let knessetNum = 1;
  while (knessetNum <= 25) {
    await fetchBills(res, 0, knessetNum);
    knessetNum++;
  }
  // Insert all the bills into the database
  // for (const bill of allBills) {
  //   await database.insertBillRow(bill.billId, bill.name, bill.knessetNum);
  // }

  return res.status(200).json({ success: true });
};
/**
 * Insert all the knesset members after go to the api of the knesset.
 * @param {*} res
 * @returns
 */
export const getKnessetMembers = async (res) => {
  let skip = 0;
  const pageSize = 100;
  let hasMoreData = true;
  try {
    while (hasMoreData) {
      const response = await fetch(
        `http://knesset.gov.il/Odata/ParliamentInfo.svc/KNS_PersonToPosition()?$filter=PositionID%20eq%2043%20or%20PositionID%20eq%2061&$expand=KNS_Person&$skip=${skip}`
      );
      const xml = await response.text();
      result = await xmlParser(xml);
      const entries = result["feed"]["entry"];
      if (!entries) {
        break;
      } else {
        skip += pageSize;
      }
      const knessetMembers = entries.map((entry) => {
        return {
          id: entry["link"][1]["m:inline"][0]["entry"][0]["content"][0][
            "m:properties"
          ][0]["d:PersonID"][0]["_"],
          fullName:
            entry["link"][1]["m:inline"][0]["entry"][0]["content"][0][
              "m:properties"
            ][0]["d:FirstName"][0] +
            " " +
            entry["link"][1]["m:inline"][0]["entry"][0]["content"][0][
              "m:properties"
            ][0]["d:LastName"][0],
          isActive:
            entry["link"][1]["m:inline"][0]["entry"][0]["content"][0][
              "m:properties"
            ][0]["d:IsCurrent"][0]["_"],
        };
      });
      for (let member of knessetMembers) {
        await insertKnessetMemberRow(
          member.id,
          member.fullName,
          member.isActive.toString()
        );
      }
    }

    // return res.status(404).json({ error: error.message });
  } catch (error) {
    return res.status(404).json({ error: error.message });
  }
  return res.status(200).json({ result: "succeed" });
};
/**
 * Insert to bills table all bills that's vote id is existing.
 * @param {} req
 * @param {*} res
 * @returns
 */
export const getBillVoteIds = async (req, res) => {
  let knessetNum = 1;
  let skip = 0;
  let top = 100;
  try {
    while (knessetNum <= 25) {
      skip = 0;
      knessetNum += 1;
      while (true) {
        const url = `https://knesset.gov.il/Odata/Votes.svc/View_vote_rslts_hdr_Approved?$filter=knesset_num%20eq%20${knessetNum}&$skip=${skip}&$top=${top}`;
        const response = await fetch(url);
        if (!response) {
          console.error("Response PROBLEM");
        }
        const toXmlParser = await response.text();
        if (!toXmlParser) {
          console.error("XML PARSER PROBLEM");
        }
        const data = await xmlParser(toXmlParser);
        const entries = data["feed"]["entry"];
        if (!entries) {
          break;
        }
        const voteIds = entries.map((entry) => {
          return {
            sessionId:
              entry["content"][0]["m:properties"][0]["d:sess_item_id"][0]["_"],
            voteId: entry["content"][0]["m:properties"][0]["d:vote_id"][0]["_"],
          };
        });
        for (let item of voteIds) {
          await updateVoteId(item.sessionId, item.voteId);
        }
        skip = skip + top;
      }
    }
    return res.status(200).json({ result: "success" });
  } catch (error) {
    console.log(skip);
    return res.status(404).json({ error: error.message });
  }
};
export const votesList = async (req, res) => {
  let skip = 0;
  let knessetNum = 1;
  const top = 100;
  try {
    while (knessetNum <= 25) {
      console.log(knessetNum);
      skip += top;
      skip = 0;
      while (true) {
        const url = `https://knesset.gov.il/Odata/Votes.svc/View_vote_rslts_hdr_Approved?$filter=knesset_num%20eq%20${knessetNum}&$skip=${skip}&$top=${top}`;

        const response = await fetch(url);
        if (!response) {
          console.log("response problem");
        }
        const toXmlParser = await response.text();
        if (!toXmlParser) {
          console.log("break in xml parser");
        }
        const data = await xmlParser(toXmlParser);
        if (!data) {
          console.log("break in data");
          break;
        }
        const entries = data["feed"]["entry"];

        if (!entries) {
          console.log("break in entries");
          break;
        }
        const voteIds = entries.map((entry) => {
          return {
            VoteID: entry["content"][0]["m:properties"][0]["d:vote_id"][0]["_"],
            BillID:
              entry["content"][0]["m:properties"][0]["d:sess_item_id"][0]["_"],
            VoteDate:
              entry["content"][0]["m:properties"][0]["d:vote_date"][0]["_"],
            against:
              entry["content"][0]["m:properties"][0]["d:total_against"][0]["_"],
            abstain:
              entry["content"][0]["m:properties"][0]["d:total_abstain"][0]["_"],
          };
        });
        for (let voteElement of voteIds) {
          await addToVoteListRow(
            voteElement.VoteID,
            voteElement.BillID,
            voteElement.VoteDate,
            voteElement.against,
            voteElement.abstain
          );
        }
        skip += top;
      }
      knessetNum += 1;
    }
    return res.status(202).json({ result: "Success" });
  } catch (error) {
    return res
      .status(404)
      .json({ error: error.message, skip: skip, knessetNum: knessetNum });
  }
};
