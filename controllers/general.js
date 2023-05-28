import pool from "../config/connect.js";

<<<<<<< HEAD
=======
const validate = (billUserOpinion) => {
  const possibleValue = [1, -1];
  const billIds = billUserOpinion.map((element) => {
    element.billId;
  });
  const userOpinions = billUserOpinion.map((element) => {
    element.opinionValue;
  });
  booleanMapIds = {};
  booleanOpinionsId = {};
  for (let id of billIds) {
    if (booleanMapIds[id] === true) return false;
    else booleanMapIds[id] === true;
  }
  for (let opinion of userOpinions ) {
    if (!possibleValue.includes(opinion)) return false;
  }
  return true;
};
>>>>>>> parent of 117251a (changes for raphel the client boss)
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
