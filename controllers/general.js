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

export const getBillsData = async () => {
  const bills = await getBillsFromDatabase();
  return bills;
};
export const getBillsByKnessetNum = (req, res) => {
  try {
    const { page = 1, pageSize = 20, knessetNum = 1 } = req.query;
    pool.query(
      `SELECT COUNT(*) AS count FROM knesset.bills WHERE VoteID AND KnessetNum = ?;
       SELECT * FROM knesset.bills WHERE VoteID AND KnessetNum = ? LIMIT ? OFFSET ?`,
      [knessetNum, knessetNum, parseInt(pageSize), page * pageSize],
      function (error, results, fields) {
        if (error) {
          return res.status(404).json({ error: error.message });
        }
        const total = results[0][0].count;
        const bills = results[1].map((row) => ({
          name: row.BillLabel,
          id: row.BillID,
        }));
        return res.status(200).json({ bills, total });
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
export const getVotes = async (req) => {
  try {
    const { billId } = req.query;
    const billIds = await billId.split(",");
    const votesToInsert = [];
    const votesToClient = [];
    let votesFromDB = null;

    for (let id of billIds) {
      if (!id) continue;
      /**If the vote exists in bills table */
      const voteIdFromDB = await getVoteId(id);
      /**If the vote exists in votes table */
      const voteExistsInDB = await checkIfVoteExistInDB(voteIdFromDB);
      /**Database checking before going to the knessetApi */
      if (voteExistsInDB) {
        // console.log("voteExistInDB = TRUE");
        votesFromDB = await retrieveVotesFromDB(voteIdFromDB);
        // console.log(votesFromDB);

        /** Make an Api call to the knesset server */
      } else {
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
