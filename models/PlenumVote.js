import { DataTypes, Sequelize } from "sequelize";
import connection from "../config/connect.js";

const PlenumVote = connection.define("plenum_votes", {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
  },
  bill_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  knesset_num: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  ordinal: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  for_option_desc: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  against_option_desc: {
    type: DataTypes.STRING,
    allowNull: true,
  }
});

export default PlenumVote;
