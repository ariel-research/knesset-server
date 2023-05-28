import { createPool } from "mysql";
import dotenv from "dotenv";
dotenv.config();

/**
 * Local connection for testing and speed
 */
// const pool = createPool({
//   multipleStatements: true,
//   host: "localhost",
//   user: "root",
//   password: "1234",
//   connectionLimit: 10,
//   database: "knesset",
//   port: "3307",
// });

/**
 * Cloud connection
 */
const pool = createPool({
  multipleStatements: true,
  host: process.env.CLOUD_SQL_HOST,
  user: process.env.CLOUD_SQL_USERNAME,
  password: process.env.CLOUD_SQL_PASSWORD,
  connectionLimit: 10,
  database: "knesset",
  port: "3306",
});

pool
  .on("connection", () => {
    console.log("Connected to the MySql database.");
  })
  .on("error", (err) => {
    console.error("Error connecting to the database", err);
  });
export default pool;
