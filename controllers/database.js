import xml2js from "xml2js";
import {
  insertBillRow,
  insertKnessetMemberRow,
  insertTypeValue,
  updateVoteId,
  addToVoteListRow,
} from "../config/database.js";

const getParsedData = async (url) => {
  try {
    const response = await fetch(url);
    if (!response) {
      console.error("response problem");
    }
    const toXmlParser = await response.text();
    if (!toXmlParser) {
      console.error("break in xml parser");
    }
    const data = await xmlParser(toXmlParser);
    if (!data) {
      console.error("break in data");
    }
    return data;
  } catch (err) {
    console.error(err.message);
    throw err;
  }
};

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

const fetchBills = async (skip, knessetNum) => {
  const billUrl = `http://knesset.gov.il/Odata/ParliamentInfo.svc/KNS_Bill()`;
  const count = 100;
  while (true) {
    try {
      const url = `${billUrl}?$filter=KnessetNum%20eq%20${knessetNum}&$skip=${skip}&count=${count}`;
      console.log(url);
      const parsedData = await getParsedData(url);

      if (!parsedData) {
        break; // All bills have been fetched
      }
      if (!parsedData["feed"]["entry"]) {
        break;
      }
      const entries = parsedData["feed"]["entry"];
      // Map the entries to an array of bill objects
      const bills = entries.map((entry) => {
        const properties = entry["content"][0]["m:properties"][0];
        return {
          billID: properties["d:billID"][0]["_"],
          name:
            typeof properties["d:Name"][0] === "string"
              ? properties["d:Name"][0]
              : properties["d:Name"][0]["_"],
          knessetNum: properties["d:KnessetNum"][0]["_"],
        };
      });
      for (let bill of bills) {
        await insertBillRow(bill.billID, bill.name, bill.knessetNum);
      } // Insert the bills into the database
      skip += count;
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      skip += count;
      console.error(err.message);
      // Break out of the loop on error
    }
  }
};
/**
 * Insert into the sql schemes all of the bills by iterate over all the knesset values.
 * @param {*} req
 * @param {*} res
 * @returns
 */
export const getBillsByKnessetNum = async (knessetNum) => {
  while (knessetNum <= process.env.LAST_KNESSET) {
    await fetchBills(0, knessetNum);
    knessetNum++;
  }
};
/**
 * Insert all the knesset members after go to the api of the knesset.
 * @param {*} res
 * @returns
 */
export const getKnessetMembers = async () => {
  let skip = 0;
  const pageSize = 100;
  const baseUrl =
    "http://knesset.gov.il/Odata/ParliamentInfo.svc/KNS_PersonToPosition()?$filter=PositionID%20eq%2043%20or%20PositionID%20eq%2061&$expand=KNS_Person&$";
  try {
    while (true) {
      const url = `${baseUrl}skip=${skip}`;
      const result = await getParsedData(url);
      if (!result) {
        console.error("getKnessetMembersError: result error");
        return "getKnessetMembersError: result error";
      }
      const entries = result["feed"]["entry"];
      if (!entries) {
        break;
      } else {
        skip += pageSize;
      }
      const knessetMembers = entries.map((entry) => {
        try {
          if (
            entry?.link?.[1]?.["m:inline"]?.[0]?.entry?.[0]?.content?.[0]?.[
              "m:properties"
            ]
          ) {
            const properties =
              entry["link"][1]["m:inline"][0]["entry"][0]["content"][0][
                "m:properties"
              ][0];
            const id = properties["d:PersonID"][0]["_"];
            const firstName =
              typeof properties["d:FirstName"][0] === "string"
                ? properties["d:FirstName"][0]
                : properties["d:FirstName"][0]["_"];
            const lastName =
              typeof properties["d:LastName"][0] == "string"
                ? properties["d:LastName"][0]
                : properties["d:LastName"][0]["_"];
            const isActive = properties["d:IsCurrent"][0]["_"];
            return {
              id,
              firstName,
              lastName,
              isActive,
            };
          }
        } catch (error) {
          console.error(`Error occurred while processing an entry`, error);
          console.error("Entry details:", entry);
        }
      });
      for (let member of knessetMembers) {
        await insertKnessetMemberRow(
          member.id,
          member.firstName,
          member.lastName,
          member.isActive
        );
      }
    }

    // return res.status(404).json({ error: error.message });
  } catch (error) {
    console.error("get knessetMembers function: ", error.message);
    return `get knessetMembers function:  ${error.message}`;
  }
  console.log("Knesset members loaded successfully.!");
};
/**
 * Insert to bills table all bills that's vote id is existing.
 * @param {} req
 * @param {*} res
 * @returns
 */
export const getBillVoteIds = async (knessetNum) => {
  let skip = 0;
  let top = 100;

  const baseUrl =
    "https://knesset.gov.il/Odata/Votes.svc/View_vote_rslts_hdr_Approved";
  while (knessetNum <= process.env.LAST_KNESSET) {
    skip = 0;
    try {
      while (true) {
        const url = `${baseUrl}?$filter=knesset_num%20eq%20${knessetNum}&$skip=${skip}&$top=${top}`;
        console.log(url);
        const data = await getParsedData(url);
        const entries = data["feed"]["entry"];
        if (!entries) {
          knessetNum = Number(knessetNum) + 1;
          break;
        }
        const voteIds = entries.map((entry) => {
          const properties = entry["content"][0]["m:properties"][0];
          return {
            sessionId: properties["d:sess_item_id"][0]["_"],
            voteID: properties["d:vote_id"][0]["_"],
          };
        });
        for (let item of voteIds) {
          await updateVoteId(item.sessionId, item.voteID);
        }
        skip = skip + top;

        // Add a one-second delay here
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      // Handle errors here
      console.error(error.message + "skip: ", skip);
      skip = skip + top;

      // return res.status(404).json({ error: error.message });
    }
  }
};
export const votesList = async () => {
  let skip = 0;
  let knessetNum = 0;
  const baseUrl =
    "https://knesset.gov.il/Odata/Votes.svc/View_vote_rslts_hdr_Approved";
  const top = 100;
  try {
    while (knessetNum <= process.env.LAST_KNESSET) {
      skip += top;
      skip = 0;
      while (true) {
        const url = `${baseUrl}?$filter=knesset_num%20eq%20${knessetNum}&$skip=${skip}&$top=${top}`;
        const data = await getParsedData(url);
        if (!data) {
          break;
        }
        const entries = data["feed"]["entry"];
        if (!entries) {
          break;
        }
        const voteIds = entries.map((entry) => {
          const properties = entry["content"][0]["m:properties"][0];

          return {
            voteID: properties["d:vote_id"][0]["_"],
            billID: properties["d:sess_item_id"][0]["_"],
            VoteDate: properties["d:vote_date"][0]["_"],
            against: properties["d:total_against"][0]["_"],
            abstain: properties["d:total_abstain"][0]["_"],
            knessetNum: properties["d:knesset_num"][0]["_"],
            voteTime: properties["d:vote_time"][0],
          };
        });
        for (let voteElement of voteIds) {
          await addToVoteListRow(
            voteElement.voteID,
            voteElement.billID,
            voteElement.VoteDate,
            voteElement.against,
            voteElement.abstain,
            voteElement.knessetNum,
            voteElement.voteTime
          );
        }
        skip += top;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      knessetNum += 1;
    }
  } catch (err) {
    console.error(err);
  }
};
export const getVoteTypes = async () => {
  try {
    const url = "https://knesset.gov.il/Odata/Votes.svc/vote_result_type";
    const data = await getParsedData(url);

    if (!data || !data["feed"] || !data["feed"]["entry"]) {
      console.error("Invalid data structure:", data);
      return; // Return or throw an error as needed
    }

    const entries = data["feed"]["entry"];
    const typesValues = entries.map((entry) => {
      entry = entry["content"][0]["m:properties"][0];
      return {
        typeId: entry["d:result_type_id"][0]["_"],
        typeValue: entry["d:result_type_name"][0],
      };
    });
    typesValues.forEach((element) => {
      insertTypeValue(element);
    });
  } catch (err) {
    console.error("Error:", err);
    // Handle the error appropriately
  }
};
