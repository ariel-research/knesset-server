import pool from "../config/connect.js";
import {
  getKnessetNumberAmount,
  getBillsFromDatabase,
  insertVoteForBillRow,
  getVoteId,
  retrieveVotesFromDB,
  checkIfVoteExistInDB,
} from "../config/database.js";
import { xmlParser } from "./database.js";

import { findScoresToMembers } from "../Utils/localUtils.js";

// const validate = (billUserOpinion) => {
//   const possibleValue = [1, -1];
//   const billIds = billUserOpinion.map((element) => {
//     element.billId;
//   });
//   const userOpinions = billUserOpinion.map((element) => {
//     element.opinionValue;
//   });
//   booleanMapIds = {};
//   booleanOpinionsId = {};
//   for (let id of billIds) {
//     if (booleanMapIds[id] === true) return false;
//     else booleanMapIds[id] === true;
//   }
//   for (let opinion of userOpinions) {
//     if (!possibleValue.includes(opinion)) return false;
//   }
//   return true;
// };
export const getBillsData = async (req, res) => {
  try {
    const bills = await getBillsFromDatabase();
    return res.status(200).json(bills);
  } catch (error) {
    return res.status(404).json(error.message);
  }
};
export const getBillsByKnessetNum = (req, res) => {
  try {
    const { knessetNum = 1 } = req.query;
    pool.query(
      `SELECT * FROM knesset.bills WHERE VoteID AND KnessetNum = ?`,
      [knessetNum],
      function (error, results, fields) {
        if (error) {
          return res.status(404).json({ error: error.message });
        }

        const bills = results.map((row) => ({
          name: row.BillLabel,
          id: row.BillID,
        }));
        return res.status(200).json({ bills });
      }
    );
  } catch (error) {
    return res.status(404).json(error);
  }
};

export const getKnessetNumbers = async (req, res) => {
  try {
    const answer = await getKnessetNumberAmount();
    return res.status(200).json(answer);
  } catch (error) {
    return res.status(404).json(error);
  }
};
const billIdsWithoutDuplicates = async (billIds) => {
  return [...new Set(billIds)];
};
export const getVotes = async (req) => {
  try {
    const { billId } = req.query;
    console.log(billId);
    if (!billId || billId === "") {
      return null;
    }
    const billIds = billId.split(",");
    const setOfBillIds = await billIdsWithoutDuplicates(billIds);
    const votesToInsert = [];
    const votesToClient = [];
    let votesFromDB = null;

    for (let id of setOfBillIds) {
      /**If the vote exists in bills table */
      const voteIdFromDB = await getVoteId(id);

      /**If the vote exists in votes table */
      const voteExistsInDB = await checkIfVoteExistInDB(voteIdFromDB);

      /**Database checking before going to the knessetApi */
      if (voteExistsInDB) {
        // console.log("voteExistInDB = TRUE");
        votesFromDB = await retrieveVotesFromDB(voteIdFromDB);

        votesToClient.push(...votesFromDB);
        // console.log(votesFromDB);

        /** Make an Api call to the knesset server */
      } else {
        console.log("voteExistsInDB: False");
        const url = `http://knesset.gov.il/Odata/Votes.svc/vote_rslts_kmmbr_shadow?$filter=vote_id%20eq%20${voteIdFromDB}`;
        const response = await fetch(url);
        const toXmlParser = await response.text();
        const data = await xmlParser(toXmlParser);
        const entries = data["feed"]["entry"];
        const votes = entries.map((entry) => {
          return {
            voteId: voteIdFromDB,
            BillId: id,
            knessetMemberId: Number(
              entry["content"][0]["m:properties"][0]["d:kmmbr_id"]
            ),
            voteValue:
              entry["content"][0]["m:properties"][0]["d:vote_result"][0]["_"],
          };
        });
        votesToInsert.push(...votes);

        for (let vote of votesToInsert) {
          await insertVoteForBillRow(
            vote.voteId,
            vote.BillId,
            vote.knessetMemberId,
            vote.voteValue
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
        votesFromDB = await retrieveVotesFromDB(voteIdFromDB);
        if (voteIdFromDB) {
          votesToClient.push(...votesFromDB);
        }
      }
    }

    return votesToClient;
  } catch (error) {
    return { error: error.message };
  }
};
export default getVotes;

export const getScoresController = async (data) => {
  /**
   * data {
   *        user_votes  : [boolean,],
   *        bill_ids    : [integer,]
   *      }
   */
  /* ---- validate data contains keys ---- */
  if (!("user_votes" in data) || !("bill_ids" in data)) {
    console.log(
      "error: getScoresController failed, data dosent contains 'user_votes' and 'bill_ids' keys. data=",
      data
    );
    return {
      error:
        "error: the parameter dosent contains the keys: 'user_votes' and 'bill_ids'",
      data: data,
    };
  }

  const user_votes = data.user_votes;
  const bill_ids = data.bill_ids;

  /* ---- validate data is correct ---- */
  if (!Array.isArray(user_votes) || !Array.isArray(bill_ids)) {
    console.log(
      "error: getScoresController failed, 'user_votes' and 'bill_ids' sould be an arrays",
      Array.isArray(user_votes),
      Array.isArray(bill_ids)
    );
    return {
      error:
        "error: getScoresController failed, 'user_votes' and 'bill_ids' sould be an arrays",
    };
  }

  /* ---- get votes ---- */
  const billId_as_string = bill_ids.join(",");
  const bill_id_query = { query: { billId: billId_as_string } };
  const votes = await getVotes(bill_id_query);

  /* ---- getVotes - validate there are no errors ---- */
  if (votes == null) {
    console.log("error: getVotes faild votes=:", votes);
    return { error: "getVotes returned null value" };
  }
  if ("error" in votes) {
    console.log("error: getVotes faild with error:", votes["error"]);
    return { error: votes["error"] };
  }

  /* --- gets the score ---- */
  const map1 = await parseVotes(votes);
  const scores = findScoresToMembers(bill_ids, user_votes, map1);

  /* ---- findScoresToMembers - validate there are no errors ---- */
  if (scores == null) {
    console.log("failed to get findScoresToMembers, scores=null");
    return { error: "failed to get findScoresToMembers" };
  }
  if ("error" in scores) {
    console.log(
      "error: findScoresToMembers faild with error:",
      scores["error"]
    );
    console.log("bill_ids:", bill_ids);
    console.log("bill_ids length:", bill_ids.length);
    console.log("user_votes:", user_votes);
    console.log("user_votes length:", user_votes.length);
    console.log("map1:", map1);
    console.log("map1 length:", Object.keys(map1).length);

    return { error: scores["error"] };
  }

  /* ---- order the result ---- */
  /**
   * res  {
   *        batch : [
   *                  {
   *                    bill_id   : integer,
   *                    bill_name : string,
   *                    voters : [
   *                              {
   *                                votes_id : integer,
   *                                voter_name : string,
   *                                ballot : integer,    // 1,2,3,4
   *                                graded : integer     // between -100 , 100
   *                              },
   *                              ...
   *                             ]
   *                  },
   *                  ...
   *                ]
   *      }
   */
  const BillNames = billId2BillName(votes);
  const res1 = arrangeDataToClient(map1, scores, BillNames);

  return res1;
};

const billId2BillName = (votes) => {
  const visited = {};
  votes.forEach((element) => {
    const bill_id = element.BillID;
    const bill_name = element.BillLabel;

    if (!(bill_id in visited)) {
      visited[bill_id] = { bill_id: bill_id, bill_name: bill_name };
    }
  });
  return visited;
};

const arrangeDataToClient = (votes_map, scores, BillNames) => {
  const res = [];
  Object.entries(votes_map).forEach((entries) => {
    const [key, value] = entries;
    // console.log("key:", key);
    // console.log("value:" ,value);

    const voters = value.map(({ member_id, vote, member_name }) => ({
      voter_id: member_id,
      voter_name: member_name,
      ballot: vote,
      graded: scores[member_id],
    }));
    const entry = {
      bill_id: key,
      bill_name: BillNames[key]["bill_name"],
      voters: voters,
    };
    res.push(entry);
  });

  return { batch: res };
};

export const parseVotes = async (votes) => {
  const map1 = {};
  const awaitedVotes = await votes;

  awaitedVotes.forEach((element) => {
    const billid = element.BillID;
    const billname = element.BillLabel;
    const memberid = element.KnessetMemberId;
    const membername = element.KnessetMemberName;
    const voteVal = element.TypeValue;

    const tmp = { member_id: memberid, vote: voteVal, member_name: membername };
    if (billid in map1 === false) {
      // tmp[memberid] = voteVal
      map1[billid] = [tmp];
    } else {
      // tmp[memberid] = voteVal
      map1[billid].push(tmp);
    }
  });

  return map1;
};
