import pool from "../config/connect.js";
import { error } from "console";

/**
 * A valid structure for bill label using regex for replacing multiple invalid characters.
 * @param {*} valid
 * @returns
 */
function validate(valid) {
  if (typeof valid === "string") {
    let newStr = valid.replace(/[\'\"]+/g, "");
    return newStr;
  }
  return valid;
}

/**
 * A valid structure for the mysql database.
 * @param {*} publishDate
 * @returns
 */

const validDate = async (publishDate, voteTime) => {
  voteTime = typeof voteTime === "string" ? " " + voteTime + ":00" : "";
  let valid =
    typeof publishDate === "string"
      ? publishDate.replace("T00:00:00", voteTime)
      : "";
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
  memberFirstName,
  memberLastName,
  isActive
) => {
  return new Promise((resolve, reject) => {
    // Check if the memberID already exists in the database
    pool.query(
      `${SQL_CHECKING_QUERY} knesset_members where MemberID = ${memberID}`,
      (err, result) => {
        if (err) {
          console.error(err.message);
          reject(err); // Reject the promise on error
          return; // Exit the function to prevent further execution
        }

        // Check if the memberID does not exist (result[0]["COUNT(*)"] === 0)
        if (result[0]["COUNT(*)"] === 0) {
          memberFirstName = validate(memberFirstName);
          memberLastName = validate(memberLastName);
          const fullName = memberFirstName + " " + memberLastName;

          isActive = isActive === "true" ? 1 : 0;
          // Insert the new row into the database
          const sql = `INSERT INTO knesset_members (MemberID, FullName, IsActive) VALUES (?, ?, ?)`;
          const values = [memberID, fullName, isActive];

          pool.query(sql, values, (err, result) => {
            if (err) {
              console.error(
                `${memberID}, ${memberName}, ${isActive}, ${err.message}`
              );
              reject(err); // Reject the promise on error
            } else {
              resolve(); // Resolve the promise when the insertion is successful
            }
          });
        } else {
          resolve(); // Resolve the promise if the memberID already exists
        }
      }
    );
  });
};

/**
 * Main function to insert bills into the local mySql database
 * @param {*} billID
 * @param {*} billName
 * @param {*} knessetNum
 * @param {*} publishDate
 */
export const insertBillRow = async (billID, billName, knessetNum) => {
  return new Promise(async (resolve, rejects) => {
    try {
      // Check if the bill already exists
      const checkQuery = `SELECT COUNT(*), BillID FROM bills WHERE BillID = ?`;
      pool.query(checkQuery, [billID], (err, res) => {
        if (err) {
          rejects(error);
        }

        if (res[0] && res[0]["COUNT(*)"] === 0) {
          const billNameValidator = validate(billName);
          const sql = `INSERT INTO bills(BillID, BillLabel, KnessetNum) VALUES (?, ?, ?)`;
          pool.query(sql, [billID, billNameValidator, knessetNum]);
        } else {
          // Check if billName needs to be updated

          const valid = validate(billName);
          const updateNameQuery = `UPDATE bills SET name = ? WHERE id = ?`;
          pool.query(updateNameQuery, [valid, billID]);

          // Check if publishDate needs to be updated
          // const billToUpdate = checkingResult.find(
          //   (item) => item.id === billID && item.publish_date === null
          // );
          // if (billToUpdate) {
          //   const modifiedDate = validDate(publishDate);
          //   if (modifiedDate !== "") {
          //     const updateQuery = `UPDATE bills SET PublishDate = ? WHERE BillID = ?`;
          //     pool.query(updateQuery, [modifiedDate, billID]);
          //   }
          // }
        }
      });
      resolve(); // Resolve the promise when done
    } catch (err) {
      console.error(`Error in insertBillRow: ${err.message}`);
      rejects(err); // Reject the promise on error
    }
  });
};
/**
 * Updating to the last vote of bill
 * @param {*} billId
 * @param {*} voteId
 */
export const updateVoteId = async (billId, voteId) => {
  return new Promise((resolve, reject) => {
    try {
      const search = `${SQL_CHECKING_QUERY} bills WHERE BillId = ${billId}`;
      pool.query(search, (err, res) => {
        if (err) {
          console.error(`error: ${err}`);
          reject(err); // Reject on error
        }
        if (res && res[0]["COUNT(*)"] === 0) {
          // console.log(`The BillID ${billId} is not exist on bills table`);
        } else {
          const sql = `UPDATE bills SET VoteID = ${voteId} WHERE BillID = ${billId}`;
          pool.query(sql, (err, res) => {
            if (err) {
              console.error(err);
              reject(err); // Reject on error
            } else {
              // console.log(`Updated successfully vote_id to bill_id: ${billId}`);
              resolve(); // Resolve on success
            }
          });
        }
        resolve();
      });
    } catch (err) {
      console.error(`Failed to update property vote_id in ${billId}`);
      reject(err); // Reject if an exception occurs
    }
  });
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
      `SELECT KnessetNum FROM bills GROUP BY KnessetNum ORDER BY KnessetNum`,
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
      `SELECT bills.BillID, bills.BillLabel, knesset_members.MemberID, knesset_members.FullName, vote_types.TypeID
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
            BillLabel: row.BillLabel,
            KnessetMemberId: row.MemberID,
            KnessetMemberName: row.FullName,
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
export const insertVoteForVotesRow = async (
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
          console.error("Error in insertVoteForVotesRow function");
          throw err;
        }
        if (res[0] && res[0]["COUNT(*)"] === 0) {
          const sql = `INSERT INTO votes(VoteID, BillID, KnessetMemberID, VoteValue) VALUES (${voteId}, ${billID}, ${memberID}, ${voteValue})`;
          pool.query(sql, (err, res) => {
            if (err) {
              console.error(`Got some error with insertion vote of ${voteId}`);
              throw err;
            }
          });
        }
        // else {
        //   console.log(`Already inserted vote_id:${voteId}`);
        // }
      }
    );
  } catch (err) {
    console.error(err);
    throw err;
  }
};
/**
 * For testing issues, query helper for using get only the bills that's have votes.
 * @returns
 */
export const getNumOfBillsWithVotes = async () => {
  return new Promise((resolve, reject) => {
    try {
      pool.query("SELECT COUNT(*) FROM bills WHERE VoteID", (err, res) => {
        if (err) reject(err);
        const resCount = res[0]["COUNT(*)"];
        resolve(resCount);
      });
    } catch (err) {
      reject(err);
    }
  });
};
export const getBillsFromDatabase = () => {
  return new Promise((resolve, reject) => {
    try {
      pool.query("SELECT * FROM bills WHERE VoteID", (error, results) => {
        if (error) {
          reject(error);
        }

        // Transform the results into an array
        const data = results.map((row) => ({
          id: row.BillID,
          label: row.BillLabel,
          knessetNum: row.KnessetNum,
        }));

        // Return the data as a JSON array
        resolve(data);
      });
    } catch (error) {
      reject({ error: error.message });
    }
  });
};
export const addToVoteListRow = async (
  voteId,
  billId,
  voteDate,
  against,
  abstain,
  knessetNum,
  voteTime
) => {
  try {
    pool.query(
      `${SQL_CHECKING_QUERY} votes_list WHERE VoteID = ${voteId}`,
      async (err, res) => {
        if (err) {
          console.error("Error in insertVoteForBillRow function");
          throw err;
        }
        if (res[0]) {
          if (res[0]["COUNT(*)"] === 0) {
            const date = await validDate(voteDate, voteTime);
            pool.query(
              `INSERT INTO votes_list(VoteID, BillID, VoteDate, TotalAgainst, TotalAbstain, KnessetNum) VALUES (${voteId}, ${billId}, '${date}', ${against}, ${abstain},${knessetNum})`,
              (err, res) => {
                if (err) {
                  console.error(`Got some error with VoteID: ${voteId}`);
                  throw err;
                }
              }
            );
          }
        }
      }
    );
  } catch (error) {
    console.error(error);
    throw error;
  }
};
export const getBillsByKnessetNumFromDB = (knessetNum) => {
  return new Promise((resolve, reject) => {
    pool.query(
      `SELECT * FROM bills WHERE VoteID AND KnessetNum = ?`,
      [knessetNum],
      function (error, results, fields) {
        if (error) {
          reject({ error: error.message });
        }

        const bills = results.map((row) => ({
          name: row.BillLabel,
          id: row.BillID,
        }));
        resolve({ bills });
      }
    );
  });
};
export const insertTypeValue = async (value) => {
  const checkQuery = "SELECT COUNT(*) FROM vote_types WHERE TypeID = ?";
  try {
    pool.query(checkQuery, [parseInt(value.typeId)], (err, res) => {
      if (err) {
        console.error(err.message);
        return;
      }

      if (!res && !res[0]["COUNT(*)"]) {
        console.error("InsertTypeValue: Bad result from checkQuery");
      }
      if (res[0]["COUNT(*)"] === 0) {
        const insertQuery =
          "INSERT INTO vote_types (TypeID, TypeValue) VALUES (?, ?)";
        pool.query(insertQuery, [value.typeId, value.typeValue], (err, res) => {
          if (err) {
            console.error(err.message);
          }
        });
      }
    });
  } catch (error) {
    console.error("Error executing the query:", error);
  }
};
