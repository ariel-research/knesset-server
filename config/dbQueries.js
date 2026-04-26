/**
 * dbQueriesV2.js — Cursor-based queries (replaces OFFSET pagination)
 *
 * Why cursor instead of OFFSET:
 *   OFFSET N forces the DB to scan and discard N rows on every request.
 *   At page 30 (offset 1500) that's 1500 wasted row reads.
 *   Cursor-based uses a WHERE clause on an indexed column (id), so every
 *   page fetch is O(1) regardless of how deep into the list you are.
 *
 * DB index required (run once):
 *   ALTER TABLE bills ADD INDEX idx_bills_name (name(191));
 */

import { Op } from "sequelize";
import { Bill, PlenumVote, MemberVote, KnessetMember } from "../models/index.js";

const PAGE_SIZE = 50;

// ─── Shared helpers ───────────────────────────────────────────────────────────

const billShape = (entry) => ({
  id: entry.id,
  name: entry.name,
  knessetNum: entry.knesset_num,
  billDate: entry.bill_date,
  voteDate: entry.vote_date,
  link: entry.link,
});

// INNER JOIN with PlenumVote ensures we only return bills that have votes
const PLENUM_JOIN = [{ model: PlenumVote, required: true, attributes: [] }];

// ─── Browse (cursor-based) ────────────────────────────────────────────────────

/**
 * Returns the next page of bills for browsing.
 * Pass `cursor` = last bill ID received; omit (null) for the first page.
 *
 * Sort: id DESC (primary-key index → instant seek)
 */
export const getBillsCursor = async (knessetNum, cursor = null, limit = PAGE_SIZE) => {
  const baseWhere = { ...(knessetNum ? { knesset_num: knessetNum } : {}) };
  const where = { ...baseWhere, ...(cursor ? { id: { [Op.lt]: cursor } } : {}) };

  const [bills, total] = await Promise.all([
    Bill.findAll({ where, include: PLENUM_JOIN, order: [["id", "DESC"]], limit }),
    cursor ? null : Bill.count({ where: baseWhere, include: PLENUM_JOIN, distinct: true, col: "id" }),
  ]);

  return { bills: bills.map(billShape), total };
};

// ─── Search (cursor-based) ────────────────────────────────────────────────────

/**
 * Full-text LIKE search against the full DB — independent of what's been
 * loaded for browsing.  Also cursor-paginated so "load more" works in search
 * mode too.
 *
 * Uses idx_bills_name index on bills.name.
 */
export const searchBillsCursor = async (knessetNum, query, cursor = null, limit = PAGE_SIZE) => {
  const baseWhere = {
    name: { [Op.like]: `%${query}%` },
    ...(knessetNum ? { knesset_num: knessetNum } : {}),
  };
  const where = { ...baseWhere, ...(cursor ? { id: { [Op.lt]: cursor } } : {}) };

  const [bills, total] = await Promise.all([
    Bill.findAll({ where, include: PLENUM_JOIN, order: [["id", "DESC"]], limit }),
    cursor ? null : Bill.count({ where: baseWhere, include: PLENUM_JOIN, distinct: true, col: "id" }),
  ]);

  return { bills: bills.map(billShape), total };
};

// ─── Bill links lookup ────────────────────────────────────────────────────────

export const getBillLinks = async (billIds) => {
  const bills = await Bill.findAll({
    where: { id: { [Op.in]: [...new Set(billIds)] } },
    attributes: ["id", "link"],
  });
  return Object.fromEntries(bills.map((b) => [b.id, b.link]));
};

// ─── Votes with members (single JOIN — no N+1) ────────────────────────────────

export const getVotesWithMembers = async (billIds) => {
  const uniqueIds = [...new Set(billIds)];

  const plenumVotes = await PlenumVote.findAll({
    where: { bill_id: { [Op.in]: uniqueIds } },
    include: [
      {
        model: MemberVote,
        include: [{ model: KnessetMember, attributes: ["id", "full_name"] }],
      },
    ],
    order: [["date", "DESC"]],
  });

  const seenBillIds = new Set();
  const result = [];

  for (const pv of plenumVotes) {
    if (seenBillIds.has(pv.bill_id)) continue;
    seenBillIds.add(pv.bill_id);

    for (const mv of pv.member_votes) {
      if (!mv.knesset_member) continue;
      result.push({
        voteID: pv.id,
        voteName: pv.title,
        voteDate: pv.date,
        KnessetMemberId: mv.knesset_member.id,
        KnessetMemberName: mv.knesset_member.full_name,
        TypeValue: mv.mk_vote,
        billId: pv.bill_id,
      });
    }
  }

  return result;
};
