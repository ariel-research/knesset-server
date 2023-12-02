import { createPool } from "mysql";
import dotenv from "dotenv";
dotenv.config();
import { Sequelize } from "sequelize";

const connection = new Sequelize(
  process.env.CLOUD_SQL_DATABASE,
  process.env.CLOUD_SQL_USERNAME,
  process.env.CLOUD_SQL_PASSWORD,
  {
    dialect: "mysql",
    host: process.env.CLOUD_SQL_HOST,
    port: process.env.CLOUD_SQL_PORT,
  }
);

// Function to create the 'knesset' schema and tables
// const createSchemaAndTables = () => {
//   const connectionPool = createPool({
//     multipleStatements: true,
//     host: process.env.CLOUD_SQL_HOST,
//     user: process.env.CLOUD_SQL_USERNAME,
//     password: process.env.CLOUD_SQL_PASSWORD,
//     connectionLimit: 10,
//     port: process.env.CLOUD_SQL_PORT,
//     connectTimeout: 1000000, // Set the connect timeout to a larger value (in milliseconds)
//     acquireTimeout: 1000000, // Set the acquire timeout to a larger value (in milliseconds)
//   });

//   connectionPool.getConnection((err, connection) => {
//     if (err) {
//       console.error("Error acquiring database connection", err);
//       return;
//     }

//     // Create the 'knesset' schema and tables here
//     const createSchemaAndTablesQuery = `
//         CREATE DATABASE IF NOT EXISTS knesset;
//         USE knesset;

//         CREATE TABLE IF NOT EXISTS knesset.bills (
//           billID INT NOT NULL,
//           billName VARCHAR(500) NULL,
//           knessetNum VARCHAR(50) NULL,
//           voteID VARCHAR(45),
//           PRIMARY KEY (billID)
//         );

//         CREATE TABLE IF NOT EXISTS knesset.knesset_members (
//           MemberID INT NOT NULL,
//           FullName VARCHAR(255) NOT NULL,
//           IsActive TINYINT(1) NOT NULL,
//           PRIMARY KEY (MemberID)
//         );

//         CREATE TABLE IF NOT EXISTS knesset.vote_types (
//           TypeID INT NOT NULL,
//           TypeValue VARCHAR(45) NULL,
//           PRIMARY KEY (TypeID)
//         );

//         CREATE TABLE IF NOT EXISTS knesset.votes (
//           voteID INT NOT NULL,
//           billID VARCHAR(45) NULL,
//           knessetMemberID VARCHAR(45) NULL,
//           voteValue VARCHAR(45) NULL
//         );

//         CREATE TABLE IF NOT EXISTS knesset.votes_list (
//           voteID INT NOT NULL,
//           billID INT NULL,
//           VoteDate DATETIME NULL,
//           TotalAgainst INT NULL,
//           TotalAbstain INT NULL,
//           KnessetNum INT NULL
//         );

//       `;

//     connection.query(createSchemaAndTablesQuery, (queryErr) => {
//       connection.release();

//       if (queryErr) {
//         console.error("Error creating schema and tables:", queryErr);
//       } else {
//         console.log("Schema and tables created or already exist.");
//       }
//     });
//   });
// };

// export const initializedDatabase = () => {
//   try {
//     createSchemaAndTables();

//     // Create a new connection pool with the specified database
//   } catch (err) {
//     console.error("Error initializing database pool:", err);
//     throw err;
//   }
// };
// const pool = createPool({
//   multipleStatements: true,
//   host: process.env.CLOUD_SQL_HOST,
//   user: process.env.CLOUD_SQL_USERNAME,
//   password: process.env.CLOUD_SQL_PASSWORD,
//   connectionLimit: 10,
//   database: process.env.CLOUD_SQL_DATABASE,
//   port: process.env.CLOUD_SQL_PORT,
// });

export default connection;
