import { DataTypes, Sequelize } from "sequelize";
import connection from "../config/connect.js";

const MetadataUpdate = connection.define('metadata_update', {
  source_name: {
    type: DataTypes.STRING(100),
    primaryKey: true,
    allowNull: false
  },
  last_updated: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'metadata_updates',
  timestamps: false
});

export default MetadataUpdate;
