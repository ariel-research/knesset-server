import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import bodyParser from "body-parser";
import generalRoutes from "./routes/general.js";
import databaseRoutes from "./routes/database.js";
import morgan from "morgan";
import { getVotes } from "./controllers/general.js";
import { findScoresToMembers } from "./Utils/tests/localUtils.js";
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

app.get("/", async (req, res) => {
  req.bill_ids = "16633"; //splits by ,
  req.user_votes = [true]; //list of boolean user votes

  const bill_ids_req = req.bill_ids; // '16633,16634'
  const user_votes_req = req.user_votes; // [true, false]
  console.log(req);

  // let bill_ids = '16633';
  // bill_ids = '16633';
  // בעד - 1
  // נגד - 2
  // נמנע - 3
  // לא הצביע - 4

  const re = { query: { billId: bill_ids_req } };
  const votes = await getVotes(re);

  const map1 = await parseVotes(votes);
  // console.log(map1);
  const bill_ids = bill_ids_req.split(",");
  // console.log("bill_ids", bill_ids)

  // const res1 = findScoresToMembers(bill, [true], map1)
  const res1 = findScoresToMembers(bill_ids, user_votes_req, map1);

  // console.log("res of findScoresToMembers", res1)
  res.send(res1).json;
});

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
export default parseVotes;
