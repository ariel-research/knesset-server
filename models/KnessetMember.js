import { Sequelize, DataTypes } from "sequelize";
import connection from "../config/connect.js";

const KnessetMember = connection.define("knesset_members", {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
  },
  full_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  is_active: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

export default KnessetMember;
