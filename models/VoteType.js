import { Sequelize } from "sequelize";
import connection from "../config/connect.js";

const VoteType = connection.define("vote_types", {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
  },
  value: {
    type: Sequelize.STRING,
    allowNull: false,
  },
});


export default VoteType;
