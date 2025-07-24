import fetch from "node-fetch";
import {
  getKnessetNumberAmount,
  getBills,
  getVoteId,
  doesPlenumVoteExist,
} from "../config/dbQueries.js";
import { MemberVote, VoteType, PlenumVote, KnessetMember,Bill, MetadataUpdate } from "../models/index.js";

import { findScoresToMembers } from "../Utils/localUtils.js";

// const validate = (voteUserOpinion) => {
//   const possibleValue = [1, -1];
//   const billIds = billUserOpinion.map((element) => {
//     element.billID;
//   });
//   const userOpinions = billUserOpinion.map((element) => {
//     element.opinionValue;
//   });
//   booleanMapIds = {};
//   booleanOpinionsId = {};
//   for (let id of billIds) {
//     if (booleanMapIds[id] === true) return false;
//     else booleanMapIds[id] === true;
//   }
//   for (let opinion of userOpinions) {
//     if (!possibleValue.includes(opinion)) return false;
//   }
//   return true;
// };
export const getBillsData = async (req, res) => {
  try {
    const bills = await getBills();
    return res.status(200).json(bills);
  } catch (error) {
    return res.status(404).json(error.message);
  }
};
export const getBillsByKnessetNum = async (req, res) => {
  try {
    console.log("req:",req.query)
    const { knessetNum = 25 } = req.query;
    console.log("knesset num: ", knessetNum)
    const bills = await getBills(knessetNum);
    return res.status(200).json(bills);
  } catch (error) {
    return res.status(404).json(error);
  }
};

export const getKnessetNumbers = async (req, res) => {
  try {
    const answer = await getKnessetNumberAmount();
    return res.status(200).json(answer);
  } catch (error) {
    return res.status(404).json(error);
  }
};
const billIdsWithoutDuplicates = async (billIds) => {
  return [...new Set(billIds)];
};

let voteIds = []
export const getVotes = async (req) => {
    try {
      const { billId } = req.query;
      if (!billId || billId === "") {
        return null;
      }
      const billIds = billId.split(",");
      const setOfBillIds = [...new Set(billIds)];
      const votesToClient = [];
  
      for (let billId of setOfBillIds) {
        // נביא את ההצבעה מתוך טבלת votes
        const billRecord = await Bill.findOne({ where: { id: billId } });
  
        if (!billRecord) {
          console.warn(`No vote found for bill id ${billId}`);
          continue;
        }
        const plenumVote = await PlenumVote.findOne({
          where: { bill_id : billId }, 
          order: [['date', 'DESC']],
        });
        voteIds.push(plenumVote.id)
        
        if (!plenumVote) {
          console.warn(`No plenum vote found for bill id ${billId}`);
          continue;
        }

        // מתוך טבלת member_votes נביא את ההצבעות של חברי הכנסת
        const memberVotes = await MemberVote.findAll({
          where: { vote_id: plenumVote.id },
        });
        console.log("member votes length: ",memberVotes.length)
  
        for (let voteRow of memberVotes) {
          const member = await KnessetMember.findOne({ where: { id: voteRow.mk_id } });
  
          votesToClient.push({
            voteID: plenumVote.id,
            voteName: plenumVote.title,
            KnessetMemberId: member.id,
            KnessetMemberName: member.full_name,
            TypeValue: voteRow.mk_vote,
            billId: plenumVote.bill_id,
          });
        }
      }
  
      return votesToClient;
    } catch (error) {
      return { error: error.message };
    }
  };
  
export default getVotes;

export const getScoresController = async (data) => {
  /**
   * data {
   *        user_votes  : [integer,], // 1-PRO|2-CON|3-no opinion
   *        bill_ids    : [integer,]
   *      }
   */
  /* ---- validate data contains keys ---- */
  if (!("user_votes" in data) || !("bill_ids" in data)) {
    console.log(
      "error: getScoresController failed, data does'nt contains 'user_votes' and 'bill_ids' keys. data=",
      data
    );
    return {
      error:
        "error: the parameter does'nt contains the keys: 'user_votes' and 'bill_ids'",
      data: data,
    };
  }

  const user_votes = data.user_votes;
  const bill_ids = data.bill_ids;

  /* ---- validate data is correct ---- */
  if (!Array.isArray(user_votes) || !Array.isArray(bill_ids)) {
    console.log(
      "error: getScoresController failed, 'user_votes' and 'bill_ids' should be an arrays",
      Array.isArray(user_votes),
      Array.isArray(bill_ids)
    );
    return {
      error:
        "error: getScoresController failed, 'user_votes' and 'bill_ids' should be an arrays",
    };
  }
  if (user_votes.length !== bill_ids.length) {
    const error =
      "error: user_votes and bill_ids are not the same length." +
      " user_votes.length:" +
      user_votes.length +
      " bill_ids.length:" +
      bill_ids.length;
    console.log(error);
    return { error };
  }

  /* ---- get votes ---- */
  const billId_as_string = bill_ids.join(",");
  const bill_id_query = { query: { billId: billId_as_string } };
  console.log("going to getvotes")
  const votes = await getVotes(bill_id_query);
  //console.log(votes);

  /* ---- getVotes - validate there are no errors ---- */
  if (votes == null) {
    console.log("error: getVotes failed votes=:", votes);
    return { error: "getVotes returned null value" };
  }
  if ("error" in votes) {
    console.log("error: getVotes failed with error:", votes["error"]);
    return { error: votes["error"] };
  }

  /* ---- prepare only the vote ids with user opinion and convert the vote number to boolean ---- */
  const map1 = await parseVotes(votes);

  const map_without_no_opinion = { ...map1 };
  const user_vote_ids_without_no_opinion = [];
  const user_boolean_votes_without_no_opinion = [];
  for (let index = 0; index < user_votes.length; index++) {
    let user_vote = user_votes[index];
    const vote_id = voteIds[index];
    if (user_vote !== 3) {
      if (user_vote === 1) {
        user_vote = true;
      } else if (user_vote === 2) {
        user_vote = false;
      } else {
        const error = "error: user_votes should be an array of integers, 1,2,3";
        console.log(error);
        return { error: error };
      }
      user_boolean_votes_without_no_opinion.push(user_vote);
      user_vote_ids_without_no_opinion.push(vote_id);
    } else {
      // console.log("deleting from map");
      if (vote_id in map_without_no_opinion) {
        delete map_without_no_opinion[vote_id];
        // console.log("vote id:", vote_id, "is deleted from map");
      }
    }
  }
  // console.log("user_boolean_votes_without_no_opinion:", user_boolean_votes_without_no_opinion);
  // console.log("user_vote_ids_without_no_opinion:", user_vote_ids_without_no_opinion);
  // console.log("map_without_no_opinion:", Object.keys(map_without_no_opinion));

  /* --- gets the score ---- */
  const scores = findScoresToMembers(
    user_vote_ids_without_no_opinion,
    user_boolean_votes_without_no_opinion,
    map_without_no_opinion
  );

  /* ---- findScoresToMembers - validate there are no errors ---- */
  if (scores == null) {
    console.log("failed to get findScoresToMembers, scores=null");
    return { error: "failed to get findScoresToMembers" };
  }
  if ("error" in scores) {
    console.log("error: findScoresToMembers faild with error:", scores);
    console.log("bill_ids:", bill_ids);
    console.log("bill_ids length:", bill_ids.length);
    console.log("user_votes:", user_votes);
    console.log("user_votes length:", user_votes.length);
    console.log("map1:", map1);
    console.log("map1 length:", Object.keys(map1).length);

    return { error: scores };
  }

  /* ---- order the result ---- */
  /**
   * res  {
   *        batch : [
   *                  {
   *                    vote_id   : integer,
   *                    vote_name : string,
   *                    voters : [
   *                              {
   *                                votes_id : integer,
   *                                voter_name : string,
   *                                ballot : integer,    // 1,2,3,4
   *                                graded : integer     // between -100 , 100
   *                              },
   *                              ...
   *                             ]
   *                  },
   *                  ...
   *                ]
   *      }
   */
  const VoteNames = billId2VoteName(votes);
  // console.log("scores:", scores);
  // console.log("VoteNames:", VoteNames);
  // console.log("map1:", map1);

  const res1 = arrangeDataToClient(map1, scores, VoteNames);

  return res1;
};

const billId2VoteName = (votes) => {
  const visited = {};
  votes.forEach((element) => {
    const vote_id = element.voteID;
    const vote_name = element.voteName;
    const bill_id = element.billId;

    if (!(vote_id in visited)) {
      visited[vote_id] = { vote_id: vote_id, vote_name: vote_name, bill_id: bill_id };
    }
  });
  return visited;
};

const arrangeDataToClient = (votes_map, scores, VoteNames) => {
  const res = [];
  Object.entries(votes_map).forEach((entries) => {
    const [key, value] = entries;
    // console.log("key:", key);
     //console.log("value:" ,value);

    const voters = value.map(({ member_id, vote, member_name }) => ({
      voter_id: member_id,
      voter_name: member_name,
      ballot: vote,
      graded: scores[member_id],
    }));
    const entry = {
      vote_id: key,
      bill_id: VoteNames[key]["bill_id"],
      vote_name: VoteNames[key]["vote_name"],
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
    const voteID = element.voteID;
    const votename = element.voteName;
    const memberid = element.KnessetMemberId;
    const membername = element.KnessetMemberName;
    const voteVal = element.TypeValue;
    const billId = element.billId;

    const tmp = { member_id: memberid, vote: voteVal, member_name: membername };
    if (voteID in map1 === false) {
      // tmp[memberid] = voteVal
      map1[voteID] = [tmp];
    } else {
      // tmp[memberid] = voteVal
      map1[voteID].push(tmp);
    }
  });
  return map1;
};
