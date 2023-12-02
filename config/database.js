import pool from "../config/connect.js";

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
 */
export const insertBatchBills = async (rows) => {
  pool.getConnection(function (err, connection) {
    connection.beginTransaction(function (err) {
      if (err) {
        //Transaction Error (Rollback and release connection)
        connection.rollback(function () {
          connection.release();
          //Failure
        });
      } else {
        const values = rows.map(({ billId, billName, knessetNum, voteId }) => [
          billId,
          validate(billName),
          knessetNum,
          voteId,
        ]);
        const sql = `INSERT INTO bills(billID, billName, knessetNum, voteID) VALUES ?
      ON DUPLICATE KEY UPDATE billName = VALUES(billName)`;
        connection.query(sql, [values], function (err, results) {
          if (err) {
            //Query Error (Rollback and release connection)
            connection.rollback(function () {
              connection.release();
              //Failure
            });
          } else {
            connection.commit(function (err) {
              if (err) {
                connection.rollback(function () {
                  connection.release();
                  //Failure
                });
              } else {
                connection.release();
                //Success
              }
            });
          }
        });
      }
    });
  });
};
export const insertBillRow = async (billID, billName, knessetNum) => {
  try {
    const billNameValidator = validate(billName);

    const sql = `
      INSERT INTO bills(billID, billName, knessetNum)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE billName = VALUES(billName)
    `;

    await pool.query(sql, [billID, billNameValidator, knessetNum]);

    return; // Resolve the promise when done
  } catch (err) {
    console.error(`Error in insertBillRow: ${err.message}`);
    return err; // Reject the promise on error
  }
};
// export const insertBatchBills = async (rows) => {
//   pool.getConnection((err, connection) => {
//     connection.beginTransaction((err) => {
//       if (err) {
//         console.error(`beginTransaction Error: ${err.message} `);
//         throw err;
//       }
//       const values = rows.map(({ billId, billName, knessetNum, voteId }) => [
//         billId,
//         validate(billName),
//         knessetNum,
//         voteId,
//       ]);

//       const sql = `INSERT INTO bills(billID, billName, knessetNum, voteID) VALUES ?
//                    ON DUPLICATE KEY UPDATE billName = VALUES(billName)`;
//       connection.query(sql, [values], (error, results, fields) => {
//         if (error) {
//           connection.rollback(() => {
//             connection.release();
//             throw error;
//           });
//         }
//         connection.commit(function (err) {
//           if (err) {
//             connection.rollback(function () {
//               connection.release();
//               throw err;
//             });
//           }
//           connection.release();
//         });
//       });
//     });
//   });
// };
export const insertBatchVotes = async (rows) => {
  pool.getConnection((err, connection) => {
    connection.beginTransaction((err) => {
      if (err) {
        console.error(`beginTransaction Error: ${err.message} `);
        connection.release();
        throw err;
      }
      const values = rows.map(
        ({ voteId, billId, knessetMemberId, voteValue }) => [
          voteId,
          billId,
          knessetMemberId,
          voteValue,
        ]
      );
      const sql =
        "INSERT INTO votes (voteID, billID, knessetMemberID, voteValue) VALUES ?";
      connection.query(sql, [values], (error, results, fields) => {
        if (error) {
          connection.rollback(function () {
            connection.release();
            throw error;
          });
        }
        connection.commit(function (err) {
          if (err) {
            connection.rollback(function () {
              connection.release();
              throw err;
            });
          }
          connection.release();
        });
      });
    });
  });
};

/**
 * Updating to the last vote of bill
 * @param {*} billID
 * @param {*} voteID
 */
export const updateVoteId = async (billID, voteID) => {
  try {
    const query = await checkQuery("bills", "billID", billID);
    if (!query) {
      const sql = "UPDATE bills SET voteID = ? WHERE billID = ?";
      pool.query(sql, [voteID, billID], (err, res) => {
        if (err) {
          console.error(err);
          return err;
        }
        return;
      });
    }
    return;
  } catch (err) {
    console.error(`Failed to update property vote_id in ${billID}`);
    return err; // Reject if an exception occurs
  }
};

/**
 * If the voteID exists in the database this function will return the voteID as Number
 * @param {*} billID
 * @returns Number
 */
export const getVoteId = async (billID) => {
  return new Promise((resolve, reject) => {
    const sql = `SELECT voteID FROM bills WHERE billID = ?`;
    pool.query(sql, [billID], (err, res) => {
      if (err) {
        console.error(
          `Failed in getVoteID function from config/database with Bill Id: ${billID}`
        );
        reject(err);
      } else {
        const voteID = res[0].voteID; // Assuming the vote_id is present in the first row of the result
        resolve(voteID);
      }
    });
  });
};
export const getKnessetNumberAmount = async () => {
  return new Promise((resolve, reject) => {
    pool.query(
      `SELECT knessetNum FROM bills GROUP BY knessetNum ORDER BY knessetNum`,
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
 * @param {*} voteID
 * @returns
 */
export const retrieveVotesFromDB = async (voteID) => {
  return new Promise((resolve, reject) => {
    pool.query(
      `SELECT bills.billID, bills.billName, knesset_members.MemberID, knesset_members.FullName, vote_types.TypeID
      FROM bills
      INNER JOIN votes ON votes.voteID = bills.voteID
      INNER JOIN knesset_members ON knesset_members.MemberID = votes.KnessetMemberID
      INNER JOIN vote_types ON vote_types.TypeID = votes.VoteValue
      WHERE votes.voteID = ${voteID};`,
      (err, res) => {
        if (err) {
          console.error("checkIfVoteExistInDB Retrieve votes table error");
          reject(err);
        } else {
          const votes = res.map((row) => ({
            billID: row.billID,
            billName: row.billName,
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
 * @param {*} voteID
 * @returns boolean
 */
export const checkIfVoteExistInDB = async (voteID) => {
  const valid = !(await checkQuery("votes", "voteID", voteID));
  if (valid) {
    return true;
  } else {
    return false;
  }
};
/**
 *
 * @param {*} voteID
 * @param {*} billID
 * @param {*} memberID
 * @param {*} voteValue
 */
export const isBillNotExistInDB = async (billID) => {
  return await checkQuery("bills", "billID", billID);
};

export const insertVoteForVotesRow = async (
  voteID,
  billID,
  memberID,
  voteValue
) => {
  try {
    const valid = await checkQuery("votes", "voteID", voteID);
    if (valid) {
      const sql =
        "INSERT INTO votes(voteID, billID, KnessetMemberID, VoteValue) VALUES (?,?,?,?)";
      pool.query(sql, [voteID, billID, memberID, voteValue], (err, res) => {
        if (err) {
          console.error(`Got some error with insertion vote of ${voteID}`);
          return err;
        }
      });
    }
  } catch (err) {
    console.error(err);
    return err;
  }
};
/**
 * For testing issues, query helper for using get only the bills that's have votes.
 * @returns
 */
export const getNumOfBillsWithVotes = async () => {
  return new Promise((resolve, reject) => {
    try {
      pool.query("SELECT COUNT(*) FROM bills WHERE voteID", (err, res) => {
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
      pool.query("SELECT * FROM bills WHERE voteID", (error, results) => {
        if (error) {
          reject(error);
        }

        // Transform the results into an array
        const data = results.map((row) => ({
          id: row.billID,
          label: row.billName,
          knessetNum: row.knessetNum,
        }));

        // Return the data as a JSON array
        resolve(data);
      });
    } catch (error) {
      reject({ error: error.message });
    }
  });
};

const checkQuery = (table, checkColumn, checkValue) => {
  return new Promise((resolve, rejects) => {
    try {
      const query = `SELECT COUNT(*) FROM ${table} where ${checkColumn} = ?`;
      pool.query(query, [checkValue], (err, res) => {
        if (err) {
          console.error("checkQuery:", err.message);
          rejects(err);
        }
        if (!res || !res[0]) {
          console.log(res);
          console.error("checkQuery: res callback not found");
          rejects(res);
        }
        if (res && res[0]["COUNT(*)"] === 0) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    } catch (error) {
      console.log(error.message);
      throw err;
    }
  });
};

export const addToVoteListRow = async (
  voteID,
  billID,
  voteDate,
  against,
  abstain,
  knessetNum,
  voteTime
) => {
  try {
    const valid = await checkQuery("votes_list", "voteID", voteID);
    if (valid) {
      const date = await validDate(voteDate, voteTime);
      pool.query(
        `INSERT INTO votes_list(voteID, billID, VoteDate, TotalAgainst, TotalAbstain, knessetNum) VALUES (${voteID}, ${billID}, '${date}', ${against}, ${abstain},${knessetNum})`,
        (err, res) => {
          if (err) {
            console.error(`Got some error with voteID: ${voteID}`);
            throw err;
          }
        }
      );
    }
  } catch (error) {
    console.error(error);
    throw error;
  }
};
export const getBillsByKnessetNumFromDB = (knessetNum) => {
  return new Promise((resolve, reject) => {
    pool.query(
      `SELECT * FROM bills WHERE voteID AND knessetNum = ?`,
      [knessetNum],
      function (error, results, fields) {
        if (error) {
          reject({ error: error.message });
        }

        const bills = results.map((row) => ({
          name: row.billName,
          id: row.billID,
        }));
        // console.log(bills);
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
