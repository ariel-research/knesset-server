import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import bodyParser from "body-parser";
import generalRoutes from "./routes/general.js";
import morgan from "morgan";
import {
  votingScript,
  billsScript,
  totalScript,
} from "./config/rowDataScript.js";
import { scriptStarter } from "./config/apiScript.js";
import connection from "./config/connect.js";

dotenv.config({ path: "../.env" });
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

app.use("/general", generalRoutes);
// app.use("/database", databaseRoutes);

// app.get("/", (req, res) => {
//   console.log("Hello from server!!!");
//   res.status(202).json({ result: "Success" });
// });

// const options = {
//   key: fs.readFileSync("./certifications/server.key"),
//   cert: fs.readFileSync("./certifications/server.cert"),
// };
const port = process.env.SERVER_PORT ?? 8080;
app.listen(port, () => {
  connection.sync().then(() => {
    scriptStarter();
    // totalScript();
    // votingScript();
    // billsScript();
  });

  console.log(`Server started at port ${port}`);
});

// https.createServer(options, app).listen(port, (req,res) => {
//   initializedDatabase();

//   console.log(`Server started at port ${port}`);

// })
