import { Sequelize } from "sequelize";
import connection from "../config/connect.js";
import pool from "../config/connect.js";
import { validate, voteStringToInt } from "../Utils/localUtils.js";
import { MemberVote, VoteType, KnessetMember,Vote, MetadataUpdate } from "../models/index.js";

// הכנסת חברי כנסת חדשים בפורמט החדש
export const insertKnessetMemberRow = async (
  memberID,
  memberFirstName,
  memberLastName,
  isActive
) => {
  const fullName = validate(`${memberFirstName} ${memberLastName}`);
  try {
    await KnessetMember.findOrCreate({
      where: { id: memberID },
      defaults: { is_active: isActive, full_name: fullName },
    });
  } catch (error) {
    console.error(`Error with inserting knesset_member: ${error.message}`);
  }
};

// הכנסת הצעות חוק כולל תאריך
/*export const insertBillRow = async (
  billID,
  billName,
  knessetNum,
  billDate = null,
  voteId = null
) => {
  try {
    const validName = validate(billName);
    const [bill, created] = await Bill.upsert({
      id: billID,
      name: validName,
      knesset_num: knessetNum,
      date: billDate ? new Date(billDate) : null,
      vote_id: voteId,
    });
  } catch (err) {
    console.error(`Error in insertBillRow: ${err.message}`);
    return err;
  }
};


export const updateVoteId = async (billID, voteID) => {
  try {
    await Bill.update(
      { vote_id: voteID },
      { where: { id: billID } }
    );
  } catch (err) {
    console.error(`Failed to update vote_id for ${billID}`);
  }
};
*/
export const getVoteId = async (billID) => {
  try {
    const result = await Bill.findOne({
      attributes: ["vote_id"],
      where: { id: billID },
      raw: true,
      plain: true,
    });
    return result ? result.vote_id : null;
  } catch (e) {
    console.error(e.message);
  }
};

// הכנסת סוגי תוצאות הצבעה
export const insertTypeValue = async (value) => {
  try {
    await VoteType.findOrCreate({
      where: { id: value.typeId },
      defaults: { value: value.typeValue },
    });
  } catch (error) {
    console.error("Error inserting VoteType:", error);
  }
};

// הכנסת הצבעה להצבעות
export const insertMemberVoteRow = async (
  memberVoteID,
  voteId,
  memberID,
  voteValue
) => {
  try {
    await MemberVote.create({
      id: memberVoteID,
      vote_id: voteId,
      mk_id: memberID,
      mk_vote: voteStringToInt(voteValue),
    });
  } catch (error) {
    console.error(`Error inserting member vote row: ${error}`);
  }
};


export const insertVoteRow = async (
  voteID,
  voteTitle,
  voteSubject,
  knessetNum,
  ordinal,
  voteDate = null
) => {
  try {
    await Vote.create({
      id: voteID,
      title: validate(voteTitle),
      subject: validate(voteSubject),
      knesset_num: knessetNum,
      ordinal: ordinal,
      date: voteDate,
    });
  } catch (error) {
    console.error(`Error inserting vote row: ${error}`);
  }
};

// הכנסת הצבעות מלאות (רשימת הצבעות)
export const addToVoteListRow = async (
  voteID,
  voteDateTime,
  voteTitle,
  voteSubject,
  knessetNum
) => {
  try {
    await Vote.findOrCreate({
      where: { vote_id: voteID },
      defaults: {
        bill_id: billID,
        vote_date: voteDateTime ? new Date(voteDateTime) : null,
        vote_title: validate(voteTitle),
        vote_subject: validate(voteSubject),
        knesset_num: knessetNum,
      },
    });
  } catch (error) {
    console.error(`Error inserting vote header: ${error}`);
  }
};

// שליפת כל החוקים (אפשר עם סינון לפי כנסת)
export const getBillsFromDatabase = async (knessetNum = null) => {
  const whereClause = knessetNum ? { knesset_num: knessetNum } : {};
  const bills = await Vote.findAll({
    attributes: ["id", "title", "date","ordinal","knesset_num"],
    where: whereClause
  });
  return bills.map((entry) => ({
    id: entry.id,
    name: entry.title,
    knessetNum: entry.knesset_num,
    ordinal: entry.ordinal,
    date: entry.date,
  }));
};

export const getKnessetNumberAmount = async () => {
  return new Promise((resolve, reject) => {
    pool.query(
      `SELECT knessetNum FROM votes GROUP BY knessetNum ORDER BY knessetNum`,
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

// שליפת חברי כנסת
export const getKnessetMembersFromDB = async () => {
  const members = await KnessetMember.findAll({
    attributes: ["id", "full_name", "is_active"],
  });
  return members.map((entry) => ({
    id: entry.id,
    fullName: entry.full_name,
    isActive: entry.is_active,
  }));
};

// שליפת סוגי הצבעות (VoteType)
export const getVoteTypesFromDB = async () => {
  const types = await VoteType.findAll({
    attributes: ["id", "value"],
  });
  return types.map((entry) => ({
    typeId: entry.id,
    typeValue: entry.value,
  }));
};

// שליפת הצבעות לפי הצבעה כללית
export const retrieveMemberVotesFromDB = async (voteId) => {
  const memberVotes = await MemberVote.findAll({
    where: { vote_id: voteId },
    attributes: ["id", "mk_id", "mk_vote", "bill_id"]
  });

  return memberVotes.map((vote) => ({
    memberVoteId: vote.id,
    voteId: vote.vote_id,
    memberId: vote.mk_id,
    voteValue: vote.mk_vote,
    billId: vote.bill_id
  }));
};

// בדיקה אם ההצבעת ח"כ קיימת כבר
export const checkIfVoteExistInDB = async (memberVoteId) => {
  const res = await MemberVote.findOne({ where: { id: memberVoteId } });
  return res !== null;
};

export const getVotesIds = async () => {
  const votes = await Vote.findAll({
    attributes: ["id"]
  });

  return votes.map((vote) => vote.id);
}

export const checkIfBillExistInDB = async (billId) => {
  const res = await Bill.findOne({ where: { id: billId } });
  console.log("bill exist:", res!==null)
  return res !== null;
};

export const checkIfMKExistInDB = async (MKId) => {
  const res = await KnessetMember.findOne({ where: { id: MKId } });
  console.log("knesset member exist:", res!==null)
  return res !== null;
};


// שליפת כלל ההצבעות (votes)
export const getVotesFromDB = async () => {
  const votes = await Vote.findAll({
    attributes: ["id", "bill_id", "date", "ordinal"]
  });

  return votes.map((vote) => ({
    id: vote.id,
    title: vote.title,
    knessetNum: vote.knesset_num,
    ordinal: vote.ordinal,
    date: vote.date,
  }));
};

// שליפת חוקים עם הצבעות (רק חוקים שיש להם הצבעה)
export const getBillsWithVotes = async () => {
  const bills = await Bill.findAll({
    where: {
      vote_id: { [Sequelize.Op.not]: null }
    },
    attributes: ["id", "name", "knesset_num", "date", "vote_id"]
  });

  return bills.map((bill) => ({
    id: bill.id,
    name: bill.name,
    knessetNum: bill.knesset_num,
    date: bill.date,
    voteId: bill.vote_id
  }));
};

// services/updateMetadata.js


export async function updateLastUpdated(sourceName, lastModified) {
  try {
    await MetadataUpdate.upsert({
      source_name: sourceName,
      last_updated: lastModified
    });
    console.log(`Updated metadata for source: ${sourceName}`);
  } catch (err) {
    console.error(`Failed to update metadata: ${err.message}`);
  }
}


export async function getLastUpdated(sourceName) {
  try {
    const record = await MetadataUpdate.findOne({ where: { source_name: sourceName } });

    if (!record) {
      console.warn(`⚠️ No MetadataUpdate record found for '${sourceName}'.`);
      return null;
    }

    return record.last_updated;
  } catch (error) {
    console.error(`❌ Error fetching MetadataUpdate for '${sourceName}':`, error.message);
    return null;
  }
}

