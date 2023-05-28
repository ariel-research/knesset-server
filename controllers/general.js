import pool from "../config/connect.js";

export const getBillsData = async (req, res) => {
  try {
    pool.query(
      "SELECT * FROM knesset.bills WHERE VoteID",
      function (error, results, fields) {
        if (error) return res.status(404).json({ error: error.message });

        // Transform the results into an array
        const data = results.map((row) => ({
          label: row.BillLabel,
          id: row.BillID,
        }));

        // Return the data as a JSON array
        return res.status(200).json(data);
      }
    );
  } catch (error) {
    return res.status(404).json(error);
  }
};
export const getBillsByKnessetNum = (req, res) => {
  try {
    const { knessetNum = 1 } = req.query;
    pool.query(
      `SELECT COUNT(*) AS count FROM knesset.bills WHERE VoteID AND KnessetNum = ?`,
      [knessetNum],
      function (error, results, fields) {
        if (error) {
          return res.status(404).json({ error: error.message });
        }
        const bills = results[1].map((row) => ({
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
      }

      if (voteIdFromDB) {
        votesToClient.push(...votesFromDB);
      }
    }

    return votesToClient;
  } catch (error) {
    return { error: error.message };
  }
};
export default getVotes;
