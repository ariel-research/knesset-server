import { Sequelize } from "sequelize";
import connection from "../config/connect.js";

export const Bill = connection.define("bills", {
  id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    primaryKey: true,
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  knesset_num: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
  vote_id: {
    type: Sequelize.INTEGER,
    allowNull: true,
  },
  bill_date: {
    type: Sequelize.DATE,
    allowNull: true,
  },
  vote_date: {
    type: Sequelize.DATE,
    allowNull: true,
  },

});

export default Bill;
