import { DataTypes, Sequelize } from "sequelize";
import connection from "../config/connect.js";

const Vote = connection.define("votes", {
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
    allowNull: false,
  },
});

export default Vote;
