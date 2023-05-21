import pool from "../config/connect.js";

function validate(valid) {
  let newStr = valid.replace(/[\'\"]+/g, "");
  return newStr;
}

const validDate = (publishDate) => {
  console.log(publishDate);
  let valid =
    typeof publishDate === "string" ? publishDate.replace("T", " ") : "";
  return valid;
};
const SQL_CHECKING_QUERY = "SELECT COUNT(*) FROM";

export const insertKnessetMemberRow = async (
  memberID,
  memberName,
  isActive
) => {
  pool.query(
    `${SQL_CHECKING_QUERY} knesset_members where MemberID = ${memberID}`,
    (err, result) => {
      if (err) throw err;
      console.log(result[0]["COUNT(*)"] === 0);
      if (result[0]["COUNT(*)"] === 0) {
        memberName = validate(memberName);
        const sql = `INSERT INTO knesset_members(MemberID, FullName, IsActive) VALUES (${memberID}, '${memberName}', ${isActive})`;
        pool.query(sql, (err, result) => {
          if (err && err.code == "ER_DUP_ENTRY") {
            console.log(`Id: ${memberID} already inserted to the db`);
          } else if (err) {
            throw err;
          }
          console.log("Succeed insert into knesset_members new knesset member");
        });
      } else {
        console.log(`Id: ${memberID} already inserted to the db`);
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
                console.log("Insert bill without date problem");
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
                console.log(
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
        console.log(err);
        throw err;
      } else {
        console.log(`Updated successfully vote_id to bill_id: ${billId}`);
      }
    });
  } catch (err) {
    console.log(`Failed to update property vote_id in ${billId}`);
    throw err;
  }
};
export const getVoteId = async (billId) => {
  return new Promise((resolve, reject) => {
    const sql = `SELECT VoteID FROM bills WHERE BillID = ${billId}`;
    pool.query(sql, (err, res) => {
      if (err) {
        console.log(
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
export const retrieveVotesFromDB = async (voteId) => {
  return new Promise((resolve, reject) => {
    pool.query(
      `SELECT bills.BillID, bills.BillLabel, knesset_members.FullName, vote_types.TypeValue
      FROM bills
      INNER JOIN votes ON votes.VoteID = bills.VoteID
      INNER JOIN knesset_members ON knesset_members.MemberID = votes.KnessetMemberID
      INNER JOIN vote_types ON vote_types.TypeID = votes.VoteValue
      WHERE votes.VoteID = ${voteId};`,
      (err, res) => {
        if (err) {
          console.log("checkIfVoteExistInDB Retrieve votes table error");
          reject(err);
        } else {
          const votes = res.map((row) => ({
            BillID: row.BillID,
            BillLabel: row.BillLabel,
            KnessetMemberName: row.FullName,
            TypeValue: row.TypeValue,
          }));
          resolve(votes);
        }
      }
    );
  });
};

export const checkIfVoteExistInDB = async (voteId) => {
  return new Promise((resolve, reject) => {
    pool.query(
      `${SQL_CHECKING_QUERY} votes WHERE VoteID = ${voteId}`,
      (err, res) => {
        console.log(res)
        if (err) {
          console.log(
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
          console.log("Error in insertVoteForBillRow function");
          throw err;
        }
        if (res[0]) {
          if (res[0]["COUNT(*)"] === 0) {
            const sql = `INSERT INTO votes(VoteID, BillID, KnessetMemberID, VoteValue) VALUES (${voteId}, ${billID}, ${memberID}, ${voteValue})`;
            pool.query(sql, (err, res) => {
              if (err) {
                console.log(
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
    console.log(err)
    throw err;
  }
};
