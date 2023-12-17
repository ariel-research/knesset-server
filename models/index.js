import KnessetMember from "./KnessetMember.js";
import VoteType from "./VoteType.js";
import Bill from "./bill.js";
import Vote from "./vote.js";

Bill.hasOne(Vote, { foreignKey: "bill_id" });
Vote.belongsTo(Bill, { foreignKey: "bill_id" });

KnessetMember.hasOne(Vote, { foreignKey: "mk_id" });
Vote.belongsTo(KnessetMember, { foreignKey: "mk_id" });

VoteType.hasOne(Vote, { foreignKey: "mk_vote" });
Vote.belongsTo(VoteType, { foreignKey: "mk_vote" });

export { VoteType, Vote, Bill, KnessetMember };
