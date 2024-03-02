import KnessetMember from "./KnessetMember.js";
import VoteType from "./VoteType.js";
import PlenumVote from "./PlenumVote.js";
import MemberVote from "./MemberVote.js";
import Bill from "./Bill.js"
import MetadataUpdate from './MetadataUpdate.js';

Bill.hasMany(PlenumVote, { foreignKey: "bill_id" });
PlenumVote.belongsTo(Bill, { foreignKey: "bill_id" });

PlenumVote.hasMany(MemberVote, { foreignKey: "vote_id" });
MemberVote.belongsTo(PlenumVote, { foreignKey: "vote_id" });

KnessetMember.hasMany(MemberVote, { foreignKey: "mk_id" });
MemberVote.belongsTo(KnessetMember, { foreignKey: "mk_id" });

VoteType.hasOne(PlenumVote, { foreignKey: "mk_vote" });
PlenumVote.belongsTo(VoteType, { foreignKey: "mk_vote" });

export { VoteType, Bill, PlenumVote, MemberVote, KnessetMember, MetadataUpdate };
