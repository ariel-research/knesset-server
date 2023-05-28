import pool from "../config/connect.js";

/**
 * A valid structure for bill label using regex for replacing multiple invalid characters.
 * @param {*} valid
 * @returns
 */
function validate(valid) {
  let newStr = valid.replace(/[\'\"]+/g, "");
  return newStr;
}

/**
 * A valid structure for the mysql database.
 * @param {*} publishDate
 * @returns
 */

const validDate = (publishDate) => {
  // console.log(publishDate);
  let valid =
    typeof publishDate === "string" ? publishDate.replace("T", " ") : "";
  return valid;
};
const SQL_CHECKING_QUERY = "SELECT COUNT(*) FROM";

/**
 * Insert a knesset member row with specific structure for the application needs into knesset_members table.
 * @param {*} memberID
 * @param {*} memberName
 * @param {*} isActive
 */
export const insertKnessetMemberRow = async (
  memberID,
  memberName,
  isActive
) => {
  pool.query(
    `${SQL_CHECKING_QUERY} knesset_members where MemberID = ${memberID}`,
    (err, result) => {
      if (err) throw err;
      // console.log(result[0]["COUNT(*)"] === 0);
      if (result[0]["COUNT(*)"] === 0) {
        memberName = validate(memberName);
        const sql = `INSERT INTO knesset_members(MemberID, FullName, IsActive) VALUES (${memberID}, '${memberName}', ${isActive})`;
        pool.query(sql, (err, result) => {
          if (err && err.code == "ER_DUP_ENTRY") {
            // console.log(`Id: ${memberID} already inserted to the db`);
          } else if (err) {
            throw err;
          }
          // console.log("Succeed insert into knesset_members new knesset member");
        });
      } else {
        // console.log(`Id: ${memberID} already inserted to the db`);
      }
    }
  );
};
/**
 * Main function to insert bills into the local mySql database
 * @param {*} billID
 * @param {*} billName
 * @param {*} knessetNum
 * @param {*} publishDate
 */
export const insertBillRow = async (
  billID,
  billName,
  knessetNum,
  publishDate
) => {
  pool.query(
    `${SQL_CHECKING_QUERY} bills WHERE BillID = ${billID}`,
    async (err, result) => {
      if (err) throw err;
      if (result[0]) {
        if (result[0]["COUNT(*)"] === 0) {
          const billNameValidator = validate(billName);
          const publishDateValidator = validDate(publishDate);
          if (publishDateValidator !== "") {
            const sql = `INSERT INTO bills(BillID, BillLabel, KnessetNum, PublishDate) VALUES (${billID}, '${billNameValidator}', ${knessetNum},${publishDateValidator})`;
            pool.query(sql, (err, result) => {
              if (err) {
                console.log("Insert bill with date problem");
                throw err;
              }
              // console.log(`Inserted Row with ID: ${billID}`);
            });
          } else {
            const sql = `INSERT INTO bills(BillID, BillLabel, KnessetNum) VALUES (${billID}, '${billNameValidator}', ${knessetNum})`;
            pool.query(sql, (err, result) => {
              if (err) {
                console.error(err.message);
                throw err;
              }
            });
          }
        } else {
          if (result.find((item) => item.name === billName)) {
            const valid = billNameValidator(item.name);
            pool.query(
              `UPDATE bills SET name = ${valid} WHERE id = ${billID}`,
              (err, result) => {
                if (err) throw err;
                // console.log(`Updated Row with ID: ${billID}`);
              }
            );
          }
          const bill = result.find(
            (item) => item.id === billID && item.publish_date === null
          );
          if (bill) {
            const modifiedDate = validDate(publishDate);
            if (modifiedDate !== "") {
              try {
                const updateQuery = `UPDATE bills SET PublishDate = '${modifiedDate}' WHERE BillID = ${billID}`;
                const updateResult = pool.query(updateQuery);
                console.log(`Succeed update publish date for bill ${billID}`);
              } catch (err) {
                console.error(
                  `Failed to update publish date for bill ${billID}: ${err}`
                );
              }
            }
          }
        }
      }
    }
  );
};
/**
 * Updating to the last vote of bill
 * @param {*} billId
 * @param {*} voteId
 */
export const updateVoteId = async (billId, voteId) => {
  try {
    const sql = `UPDATE bills SET VoteID = ${voteId} WHERE BillID = ${billId}`;
    pool.query(sql, (err, res) => {
      if (err) {
        console.error(err);
        throw err;
      } else {
        console.log(`Updated successfully vote_id to bill_id: ${billId}`);
      }
    });
  } catch (err) {
    console.error(`Failed to update property vote_id in ${billId}`);
    throw err;
  }
};

/**
 * If the voteID exists in the database this function will return the voteID as Number
 * @param {*} billId
 * @returns Number
 */
export const getVoteId = async (billId) => {
  return new Promise((resolve, reject) => {
    const sql = `SELECT VoteID FROM bills WHERE BillID = ${billId}`;
    pool.query(sql, (err, res) => {
      if (err) {
        console.error(
          `Failed in getVoteId function from config/database with Bill Id: ${billId}`
        );
        reject(err);
      } else {
        const voteId = res[0].VoteID; // Assuming the vote_id is present in the first row of the result
        resolve(voteId);
      }
    });
  });
};
export const getKnessetNumberAmount = async () => {
  return new Promise((resolve, reject) => {
    pool.query(
      `SELECT KnessetNum FROM knesset.bills GROUP BY KnessetNum ORDER BY KnessetNum`,
      (err, res) => {
        if (err) {
          console.error(err);
          reject(err);
        }
        resolve(res);
      }
    );
  });
};
/**
 * Function to retrieve votes using complex MySql query to connect between the table,
 * and return the payload to the server.
 * @param {*} voteId
 * @returns
 */
export const retrieveVotesFromDB = async (voteId) => {
  return new Promise((resolve, reject) => {
    pool.query(
      `SELECT bills.BillID, knesset_members.MemberID, vote_types.TypeID
      FROM bills
      INNER JOIN votes ON votes.VoteID = bills.VoteID
      INNER JOIN knesset_members ON knesset_members.MemberID = votes.KnessetMemberID
      INNER JOIN vote_types ON vote_types.TypeID = votes.VoteValue
      WHERE votes.VoteID = ${voteId};`,
      (err, res) => {
        if (err) {
          console.error("checkIfVoteExistInDB Retrieve votes table error");
          reject(err);
        } else {
          const votes = res.map((row) => ({
            BillID: row.BillID,
            KnessetMemberId: row.MemberID,
            TypeValue: row.TypeID,
          }));
          resolve(votes);
        }
      }
    );
  });
};
/**
 * Function that's check if voteID is exists on the votes table.
 * @param {*} voteId
 * @returns boolean
 */
export const checkIfVoteExistInDB = async (voteId) => {
  return new Promise((resolve, reject) => {
    pool.query(
      `${SQL_CHECKING_QUERY} votes WHERE VoteID = ${voteId}`,
      (err, res) => {
        // console.log(res);
        if (err) {
          console.error(
            `checkIfVoteExistInDB COUNT function error with id: ${voteId}`
          );
          reject(err);
        }
        if (res && res[0]["COUNT(*)"] > 0) {
          resolve(true);
        } else {
          resolve(false);
        }
      }
    );
  });
};
/**
 *
 * @param {*} voteId
 * @param {*} billID
 * @param {*} memberID
 * @param {*} voteValue
 */
export const insertVoteForBillRow = async (
  voteId,
  billID,
  memberID,
  voteValue
) => {
  try {
    pool.query(
      `${SQL_CHECKING_QUERY} votes WHERE VoteID = ${voteId}`,
      (err, res) => {
        if (err) {
          console.error("Error in insertVoteForBillRow function");
          throw err;
        }
        if (res[0]) {
          if (res[0]["COUNT(*)"] === 0) {
            const sql = `INSERT INTO votes(VoteID, BillID, KnessetMemberID, VoteValue) VALUES (${voteId}, ${billID}, ${memberID}, ${voteValue})`;
            pool.query(sql, (err, res) => {
              if (err) {
                console.error(
                  `Got some error with insertion vote of ${memberID}`
                );
                throw err;
              }
            });
          }
          // else {
          //   console.log(`Already inserted vote_id:${voteId}`);
          // }
        }
      }
    );
  } catch (err) {
    console.error(err);
    throw err;
  }
};
export const getBillsFromDatabase = () => {
  return new Promise((resolve, reject) => {
    try {
      pool.query(
        "SELECT * FROM knesset.bills WHERE VoteID",
        (error, results) => {
          if (error) reject(error);

          // Transform the results into an array
          const data = results.map((row) => ({
            id: row.BillID,
            label: row.BillLabel,
            knessetNum: row.KnessetNum,
          }));

          // Return the data as a JSON array
          resolve(data);
        }
      );
    } catch (error) {
      reject({ error: error.message });
    }
  });
};
