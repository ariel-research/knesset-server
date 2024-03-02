import { DataTypes, Sequelize } from "sequelize";
import connection from "../config/connect.js";

const MemberVote = connection.define("member_votes", {
  id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    primaryKey: true,
  },
  vote_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: false,
  },
  mk_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: false,
  },
  mk_vote: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  bill_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

export default MemberVote;
