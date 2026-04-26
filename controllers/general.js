import {
  getBillsCursor,
  searchBillsCursor,
  getVotesWithMembers,
  getBillLinks,
} from "../config/dbQueries.js";
import { getKnessetNumberAmount } from "../config/dbQueriesOld.js";
import { findScoresToMembers } from "../Utils/localUtils.js";

// ─── Browse endpoint ──────────────────────────────────────────────────────────

/**
 * GET /v2/browse?knessetNum=25&cursor=LAST_ID&limit=50
 * Returns the next page of bills using cursor-based pagination.
 * cursor is the `id` of the last bill received (omit for first page).
 */
export const browseBillsController = async (req, res) => {
  try {
    const { knessetNum, cursor, limit = 50 } = req.query;
    const { bills, total } = await getBillsCursor(
      knessetNum || null,
      cursor ? parseInt(cursor, 10) : null,
      parseInt(limit, 10)
    );
    res.status(200).json({
      bills,
      total,
      nextCursor: bills.length ? bills[bills.length - 1].id : null,
      hasMore: bills.length === parseInt(limit, 10),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Search endpoint ──────────────────────────────────────────────────────────

/**
 * GET /v2/search?knessetNum=25&q=query&cursor=LAST_ID&limit=50
 * Searches the full DB — not just loaded records.
 * Also cursor-paginated so the user can load more search results.
 */
export const searchBillsController = async (req, res) => {
  try {
    const { knessetNum, q, cursor, limit = 50 } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ error: "Query param 'q' is required" });
    }
    const { bills, total } = await searchBillsCursor(
      knessetNum || null,
      q.trim(),
      cursor ? parseInt(cursor, 10) : null,
      parseInt(limit, 10)
    );
    res.status(200).json({
      bills,
      total,
      nextCursor: bills.length ? bills[bills.length - 1].id : null,
      hasMore: bills.length === parseInt(limit, 10),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Knesset numbers ──────────────────────────────────────────────────────────

export const getKnessetNumbersV2 = async (req, res) => {
  try {
    res.status(200).json(await getKnessetNumberAmount());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─── Scores (fixed: local voteIds, single JOIN) ───────────────────────────────

export const getScoresControllerV2 = async (data) => {
  if (!("user_votes" in data) || !("bill_ids" in data))
    return { error: "Request body must contain 'user_votes' and 'bill_ids'" };

  const { user_votes, bill_ids } = data;

  if (!Array.isArray(user_votes) || !Array.isArray(bill_ids))
    return { error: "'user_votes' and 'bill_ids' must be arrays" };

  if (user_votes.length !== bill_ids.length)
    return { error: `Length mismatch: user_votes(${user_votes.length}) vs bill_ids(${bill_ids.length})` };

  const votes = await getVotesWithMembers(bill_ids).catch((e) => ({ error: e.message }));
  if (!votes || "error" in votes) return { error: votes?.error ?? "getVotesWithMembers failed" };

  const billLinks = await getBillLinks(bill_ids).catch(() => ({}));

  const billIdToVoteId = {};
  for (const v of votes) {
    if (!billIdToVoteId[v.billId]) billIdToVoteId[v.billId] = v.voteID;
  }
  const voteIds = bill_ids.map((id) => billIdToVoteId[id]);

  const votesMap = parseVotesLocal(votes);
  const filteredMap = { ...votesMap };
  const filteredVoteIds = [];
  const filteredUserVotes = [];

  for (let i = 0; i < user_votes.length; i++) {
    const op = user_votes[i];
    const vid = voteIds[i];
    if (op === 3) {
      delete filteredMap[vid];
    } else if (op === 1 || op === 2) {
      filteredVoteIds.push(vid);
      filteredUserVotes.push(op === 1);
    } else {
      return { error: `Invalid vote value ${op} at index ${i}` };
    }
  }

  const scores = findScoresToMembers(filteredVoteIds, filteredUserVotes, filteredMap);
  if (!scores || "error" in scores) return { error: scores ?? "findScoresToMembers failed" };

  return arrangeDataToClient(votesMap, scores, buildVoteNameMap(votes), billLinks);
};

// ─── Private helpers ──────────────────────────────────────────────────────────

const parseVotesLocal = (votes) => {
  const map = {};
  for (const v of votes) {
    const entry = { member_id: v.KnessetMemberId, vote: v.TypeValue, member_name: v.KnessetMemberName, bill_id: v.billId };
    map[v.voteID] ? map[v.voteID].push(entry) : (map[v.voteID] = [entry]);
  }
  return map;
};

const buildVoteNameMap = (votes) => {
  const seen = {};
  for (const v of votes) {
    if (!(v.voteID in seen)) seen[v.voteID] = { vote_id: v.voteID, vote_name: v.voteName, bill_id: v.billId, vote_date: v.voteDate };
  }
  return seen;
};

const arrangeDataToClient = (votesMap, scores, voteNames, billLinks = {}) => ({
  batch: Object.entries(votesMap).map(([key, value]) => ({
    vote_id: key,
    bill_id: voteNames[key]?.bill_id,
    vote_name: voteNames[key]?.vote_name,
    bill_link: billLinks[voteNames[key]?.bill_id] ?? null,
    vote_date: voteNames[key]?.vote_date ?? null,
    voters: value.map(({ member_id, vote, member_name }) => ({
      voter_id: member_id,
      voter_name: member_name,
      ballot: vote,
      graded: scores[member_id],
    })),
  })),
});
