import { Sequelize } from "sequelize";
import connection from "../config/connect";

const KnessetMember = connection.define("knesset_members", {
  id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    primaryKey: true,
  },
  full_name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  is_active: {
    type: Sequelize.INTEGER,
    allowNull: false,
  },
});