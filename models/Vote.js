import { Sequelize } from "sequelize";
import connection from "../config/connect.js";

const Vote = connection.define("votes", {
  vote_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    primaryKey: false,
  },
  mk_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    primaryKey: false,
  },
  mk_vote: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  bill_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
});

export default Vote;
