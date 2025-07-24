import { Sequelize } from "sequelize";
import connection from "../config/connect.js";
import pool from "../config/connect.js";
import { validate, voteStringToInt } from "../Utils/localUtils.js";
import { MemberVote, VoteType, PlenumVote, KnessetMember,Bill, MetadataUpdate } from "../models/index.js";

// knesset-members
// insert
const syncDB = async () => {
  await connection.sync({ alter: true });

  console.log("SYNC DB")
};
syncDB();

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

// knesset-member exist
export const doesMKExist = async (mkId) => {
    if (!mkId) {
      throw new Error("mkId is required");
    }
  
    const mk = await KnessetMember.findByPk(mkId);
    return !!mk; 
  };

// get knesset-members
export const getKnessetMembers = async () => {
    const members = await KnessetMember.findAll({
      attributes: ["id", "full_name", "is_active"],
    });
    return members.map((entry) => ({
      id: entry.id,
      fullName: entry.full_name,
      isActive: entry.is_active,
    }));
  };

  export const getKnessetMembersIds = async () => {
    const members = await KnessetMember.findAll({
      attributes: ["id"],
      raw: true,
    });
    return new Set(members.map(m => m.id));
  };
  


// plenum-votes
// insert

export const insertPlenumVote = async (
  id,
  billId,
  title,
  subject,
  knessetNum,
  ordinal,
  date,
  forOption,
  againstOption,
) => {
  if (
    id === undefined ||
    billId === undefined ||
    title === undefined ||
    knessetNum === undefined ||
    ordinal === undefined ||
    forOption === undefined ||
    againstOption === undefined
  ) {
    throw new Error("Missing required fields: id, billId, title, knessetNum, ordinal");
  }
    try {
      const newVote = await PlenumVote.create({
        id,
        bill_id: billId,
        title,
        subject: subject ?? null,
        knesset_num: knessetNum,
        ordinal,
        date: date ?? null,
        for_option_desc: forOption ?? null,
        against_option_desc: againstOption ?? null,
    });
    console.log("insert new vote: ", newVote)
    } catch (error) {
      console.error(`Error with inserting plenum_vote: ${error.message}`);
    }
};

export const doesVoteExist = async (voteId) => {
  const res = await PlenumVote.findOne({ where: { id: voteId } });
  return res !== null;
};


// get by billid
export const getPlenumVoteByBillId = async (billId) => {
  if (!billId) {
    throw new Error("billId is required");
  }

  const vote = await PlenumVote.findOne({
    where: { bill_id: billId },
  });

  if (!vote) return null;

  return {
    id: vote.id,
    billId: vote.bill_id,
    title: vote.title,
    subject: vote.subject,
    knessetNum: vote.knesset_num,
    ordinal: vote.ordinal,
    date: vote.date,
  };
};

export const getPlenumVotesIds = async () => {
  const votes = await PlenumVote.findAll({
    attributes: ['id'],
    raw: true,
  });

  return new Set(votes.map(v => v.id));
};



export const doesPlenumVoteExist = async (voteId) => {
  if (!voteId) {
    throw new Error("voteId is required");
  }

  const plenumVote = await PlenumVote.findByPk(voteId);
  return !!plenumVote;
};


//member-votes
// insert
export const insertMemberVoteRow = async (
    voteId,
    memberID,
    voteValue
  ) => {
    try {
      await MemberVote.create({
        vote_id: voteId,
        mk_id: memberID,
        mk_vote: voteStringToInt(voteValue),
      });
    } catch (error) {
      console.error(`Error inserting member vote row: ${error}`);
    }
  };

export const getMemberVotesByVoteId = async (voteId) => {
    if (!voteId) throw new Error("voteId is required");
  
    const memberVotes = await MemberVote.findAll({
      where: { vote_id: voteId },
    });
  
    return memberVotes.map((entry) => ({
      id: entry.id,
      voteId: entry.vote_id,
      mkId: entry.mk_id,
      mkVote: entry.mk_vote,
      billId: entry.bill_id,
    }));
  };
  
  export const deleteMemberVotesByVoteId = async (voteId) => {
    if (!voteId) {
      throw new Error("voteId is required for deletion");
    }
  
    const deletedCount = await MemberVote.destroy({
      where: { vote_id: voteId },
    });
  
    return deletedCount; // מספר השורות שנמחקו
  };
  
// vote-types
// insert
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

// get
export const getVoteTypes = async () => {
    const types = await VoteType.findAll({
      attributes: ["id", "value"],
    });
    return types.map((entry) => ({
      typeId: entry.id,
      typeValue: entry.value,
    }));
  };


// bills
// insert
export const insertBillRow = async (
    billID,
    billName,
    knessetNum,
    billDate = null,
    voteId = null,
    voteDate = null,
  ) => {
    try {
      const validName = validate(billName);
      const [bill, created] = await Bill.upsert({
        id: billID,
        name: validName,
        knesset_num: knessetNum,
        bill_date: billDate ? new Date(billDate) : null,
        vote_date: voteDate ? new Date(voteDate) : null,
        vote_id: voteId,
      });
    } catch (err) {
      console.error(`Error in insertBillRow: ${err.message}`);
      return err;
    }
};

// get bills - id and name fields, sql objects
export const getRawBills = async (knessetNum = null) => {
    const whereClause = knessetNum ? { knesset_num: knessetNum } : {};
    const bills = await Bill.findAll({
      where: whereClause,
      attributes: ['id', 'name'],
    });
  
    return bills;
  };

  export const getBills = async (knessetNum = null) => {
    const whereClause = knessetNum ? { knesset_num: knessetNum} : {};
    const bills = await Bill.findAll({
      where: whereClause,
      include: [
        {
          model: PlenumVote,
          required: true, // חשוב! זה עושה INNER JOIN – כלומר רק הצעות עם הצבעות
          attributes: [], // אם לא צריך את פרטי ההצבעה
        },
      ],
    });
  
    return bills.map((entry) => ({
      id: entry.id,
      name: entry.name,
      knessetNum: entry.knesset_num,
      voteId: entry.vote_id,
      billDate: entry.bill_date,
      voteDate: entry.vote_date,
    }));
  };



// bill exist
export const doesBillExist = async (billId) => {
    if (!billId) {
      throw new Error("billId is required");
    }
  
    const bill = await Bill.findByPk(billId);
    return !!bill;
  };

  export const getVoteIdByBillId = async (billId) => {
    if (!billId) {
      throw new Error("billId is required");
    }
  
    const bill = await Bill.findByPk(billId, {
      attributes: ["vote_id"],
    });
  
    return bill?.vote_id ?? null;
  };

// get knesset number amount
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


// update vote in bill
export const updateVoteId = async (billID, voteID, voteDate=null) => {
    try {
      await Bill.update(
        { 
            vote_id: voteID,
            vote_date: voteDate ? new Date(voteDate): null
         },
        { where: { id: billID } }
      );
    } catch (err) {
      console.error(`Failed to update vote_id for ${billID}`);
    }
  };

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


// metadataUpdate
//insert/update
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
  
//get  
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
  