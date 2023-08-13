import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import bodyParser from "body-parser";
import generalRoutes from "./routes/general.js";
import databaseRoutes from "./routes/database.js";
import morgan from "morgan";

import { getVotes, getBillsData } from "./controllers/general.js";

import { findScoresToMembers } from "./Utils/localUtils.js";
// const findScoresToMembers = require('../Utils/localUtils.js');

dotenv.config();
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

app.use("/general", generalRoutes);
app.use("/database", databaseRoutes);

app.get("/", (req, res) => {
  console.log("Hello from server!!!");
  res.status(202).json({ result: "Success" });
});

app.get("/bills", async (req, res) => {
  const bills = await getBillsData();
  res.status(202).json(bills);
});

app.get("/getVotes", async (req, res) => {
  const votes = await getVotes({ query: { billId: "2080650,2080751" } });
  res.status(202).json({ data: votes });
});
// app.get("/scores", async (req, res) => {
//   req.bill_ids = "16633,16634"; //splits by ,
//   req.user_votes = [true, false]; //list of) boolean user votes

app.get("/scores", async (req, res) => {
  // console.log(req);

  /* gets bills and user vote from client */
  // req.bill_ids = "16633,16634"; //splits by ,
  // req.user_votes = [true, false]; //list of boolean user votes

  const bill_ids_req = req.body.bill_ids; // '16633,16634'
  const user_votes_req = req.body.user_votes; // [true, false]

  // בעד - 1
  // נגד - 2
  // נמנע - 3
  // לא הצביע - 4

  /* gets votes of all member from DB */
  const re = { query: { billId: bill_ids_req } };
  const votes = await getVotes(re);
  // console.log("votes:", votes);

  /* validate there are no errors in getVotes */
  if ("error" in votes) {
    console.log("error: getVotes faild with error:", votes["error"]);
    res.send({ error: votes["error"] }).json;
  }

  /* parse votes */
  const map1 = await parseVotes(votes);
  // console.log("map1", map1);

  const bill_ids = bill_ids_req.split(",");
  // console.log("bill_ids", bill_ids)

  /* gets the score */
  const scores = findScoresToMembers(bill_ids, user_votes_req, map1);
  // console.log("res of findScoresToMembers", scores);

  /* validate there are no errors in findScoresToMembers */
  if (scores == null) {
    console.log("failed to get findScoresToMembers, scores=null");
    res.send({ error: "failed to get findScoresToMembers" }).json;
  }
  if ("error" in scores) {
    console.log(
      "error: findScoresToMembers faild with error:",
      scores["error"]
    );
    console.log("bill_ids:", bill_ids);
    console.log("bill_ids length:", bill_ids.length);
    console.log("user_votes_req:", user_votes_req);
    console.log("user_votes_req length:", user_votes_req.length);
    console.log("map1:", map1);
    console.log("map1 length:", map1.length);

    res.send({ error: scores["error"] }).json;
  }

  /* Order the answer to the client */
  const BillNames = billId2BillName(votes);
  // console.log("BillNames:", BillNames);
  const res1 = arrangeDataToClient(map1, scores, BillNames);
  // console.log("res1", res1);

  res.send(res1).json;
});

const billId2BillName = (votes) => {
  const visited = {};
  votes.forEach((element) => {
    const bill_id = element.BillID;
    const bill_name = element.BillLabel;

    if (!(bill_id in visited)) {
      visited[bill_id] = { bill_id: bill_id, bill_name: bill_name };
    }
  });
  return visited;
};

const arrangeDataToClient = (votes_map, scores, BillNames) => {
  const res = [];
  Object.entries(votes_map).forEach((entries) => {
    const [key, value] = entries;
    // console.log("key:", key);
    // console.log("value:" ,value);

    const voters = value.map(({ member_id, vote, member_name }) => ({
      voter_id: member_id,
      voter_name: member_name,
      ballot: vote,
      graded: scores[member_id],
    }));
    const entry = {
      bill_id: key,
      bill_name: BillNames[key]["bill_name"],
      voters: voters,
    };
    res.push(entry);
  });

  return { batch: res };
};

export const parseVotes = async (votes) => {
  const map1 = {};
  const awaitedVotes = await votes;

  awaitedVotes.forEach((element) => {
    const billid = element.BillID;
    const billname = element.BillLabel;
    const memberid = element.KnessetMemberId;
    const membername = element.KnessetMemberName;
    const voteVal = element.TypeValue;

    const tmp = { member_id: memberid, vote: voteVal, member_name: membername };
    if (billid in map1 === false) {
      // tmp[memberid] = voteVal
      map1[billid] = [tmp];
    } else {
      // tmp[memberid] = voteVal
      map1[billid].push(tmp);
    }
  });

  return map1;
};

const port = 8080;
app.listen(port, () => {
  console.log(`server is listening http://localhost:${port}`);
});
/**
 * for deployments
 */
// const port = 8080;
// app.listen(port, "0.0.0.0", () => {
//   console.log(`server is listening  on 8080 port`);
// });

export default parseVotes;
