import dotenv from "dotenv";
dotenv.config();

import connection from "./connect.js";
import { KnessetMember, MemberVote } from "../models/index.js";
import { Sequelize } from "sequelize";

const deduplicateMembers = async () => {
  await connection.authenticate();

  // Find all names with more than one member row
  const duplicates = await KnessetMember.findAll({
    attributes: [
      "full_name",
      [Sequelize.fn("COUNT", Sequelize.col("id")), "cnt"],
    ],
    group: ["full_name"],
    having: Sequelize.literal("COUNT(id) > 1"),
    raw: true,
  });

  console.log(`Found ${duplicates.length} duplicate names.`);

  for (const { full_name } of duplicates) {
    // Get all members with this name, sorted by id asc — keep the first (lowest id)
    const members = await KnessetMember.findAll({
      where: { full_name },
      order: [["id", "ASC"]],
      raw: true,
    });

    const keepId = members[0].id;
    const dupIds = members.slice(1).map((m) => m.id);

    for (const dupId of dupIds) {
      // For vote_ids already covered by keepId, just delete the dup's rows
      await connection.query(
        `DELETE FROM member_votes
         WHERE mk_id = :dupId
           AND vote_id IN (
             SELECT vote_id FROM (
               SELECT vote_id FROM member_votes WHERE mk_id = :keepId
             ) AS sub
           )`,
        { replacements: { dupId, keepId } }
      );

      // Reassign remaining rows to keepId
      await MemberVote.update({ mk_id: keepId }, { where: { mk_id: dupId } });

      // Delete the duplicate member
      await KnessetMember.destroy({ where: { id: dupId } });

      console.log(`  Merged member id=${dupId} into id=${keepId} (${full_name})`);
    }
  }

  console.log("Done.");
  await connection.close();
};

deduplicateMembers().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
