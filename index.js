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

app.get("/bills", async (req, res) => {
  const bills = await getBillsData();
  res.status(202).json(bills);
});

app.get("/getVotes", async (req, res) => {
  const votes = await getVotes({ query: { billId: "16633,16634" } });
  res.status(200).json({ data: votes });
});
// app.get("/scores", async (req, res) => {
//   req.bill_ids = "16633,16634"; //splits by ,
//   req.user_votes = [true, false]; //list of) boolean user votes


app.get("/scores", async (req, res) => {

  console.log(req);
  console.log(`req.bill_ids: ${req.bill_ids} .`)
  console.log(`req.user_votes: ${req.user_votes} .`)

  /* gets bills and user vote from client */
  req.bill_ids = "16633,16634";           //splits by ,
  req.user_votes = [true, false];         //list of boolean user votes
  
  const bill_ids_req = req.bill_ids;      // '16633,16634'
  const user_votes_req = req.user_votes;  // [true, false]

  // let bill_ids = '16633';
  // bill_ids = '16633';
  // בעד - 1
  // נגד - 2
  // נמנע - 3
  // לא הצביע - 4

  /* gets votes of all member from DB */
  const re = { query: { billId: bill_ids_req } };
  const votes = await getVotes(re);
  // console.log("votes:", votes) 

  /* parse votes */
  const map1 = await parseVotes(votes);
  // console.log("map1", map1);

  const bill_ids = bill_ids_req.split(",");
  // console.log("bill_ids", bill_ids)

  // console.log(`${bill_ids}, ${user_votes_req}`);
  // const res1 = findScoresToMembers(bill, [true], map1)

  /* gets the score */
  const scores = findScoresToMembers(bill_ids, user_votes_req, map1);
  // console.log("res of findScoresToMembers", res1)

  /* Order the answer to the client */
  const res1 = arrangeDataToClient(map1, scores);
  // console.log("res1", res1);

  res.send(res1).json;
});

const arrangeDataToClient = (votes_map, scores) =>{
  const res = [];
  Object.entries(votes_map).forEach(entries => {
    
    const [key, value] = entries;
    // console.log("key:", key);
    // console.log("value:" ,value);

    const voters = value.map(({member_id, vote}) => ({ voter_id: member_id, voter_name: "TODO", ballot: vote, graded:  scores[member_id]}));
    const entry = {
                  bill_id: key,
                  bill_name: "TODO",
                  voters: voters
                  }
    res.push(entry);
  });


  return {batch: res}
};


export const parseVotes = async (votes) => {
  const map1 = {};
  const awaitedVotes = await votes;

  awaitedVotes.forEach((element) => {
    const billid = element.BillID;
    const memberid = element.KnessetMemberId;
    const voteVal = element.TypeValue;
    if (billid in map1 === false) {
      const tmp = { member_id: memberid, vote: voteVal };
      // tmp[memberid] = voteVal
      map1[billid] = [tmp];
    } else {
      const tmp = { member_id: memberid, vote: voteVal };
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
 * for deployment
 */
// const port = 8080;
// app.listen(port, "0.0.0.0", () => {
//   console.log(`server is listening  on 8080 port`);
// });

export default parseVotes;