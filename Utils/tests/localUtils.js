const AVOID = [3, 4];
const PRO = 1;
const CON = 2;

/**
 * Finds the score of each Knesset member in relation to what the user chose.
 * @param {Array} bill_ids_list         list of bill IDs.
 * @param {Array} user_vote_list        list of boolean values for or against.
 * @param {Object} members_vote_object  dict of {key= bill id, value= list of {member id, vote}}. // vote (-1 0 1)
 * @returns {Object} score per member {key= member id, val= score}.
 */
export const findScoresToMembers = (
  bill_ids_list,
  user_vote_list,
  members_vote_object
) => {
  // console.log('members_vote_object:', members_vote_object)
  let member_score = {};
  const bill_len = bill_ids_list.length;

  /* check if len are equals and not zero | bill_ids_list | user_vote_list | members_vote_object.keys | */

  if (
    bill_ids_list.length !== user_vote_list.length ||
    user_vote_list.length !== Object.keys(members_vote_object).length ||
    bill_ids_list.length === 0
  ) {
    // console.log("checking" ,(bill_ids_list.length === user_vote_list.length) && user_vote_list.length === Object.keys(members_vote_object).length)
    // console.log("bill_ids_list.length === 0", bill_ids_list.length === 0)
    // console.log("bill_ids_list.length", bill_ids_list.length)
    // console.log("user_vote_list.length", user_vote_list.length)
    // console.log("Object.keys(members_vote_object).length", Object.keys(members_vote_object).length)
    // throw new TypeError(); // throws en error
    return { error: "data length error" };
  }
  /**  for all bill_id in bill_ids_list:
   *     for all member, vote in items:
   *
   *  */
  /* checks for every member if vote like the user, if yes get +1, if opposite get -1, if vote avoid not change */
  bill_ids_list.forEach((bill_id, index) => {
    // console.log("bill_id", bill_id);
    // console.log("index", index);
    const user_vote = user_vote_list[index];

    // console.log(`members_vote_object: ${members_vote_object} \nbill_id: ${bill_id}`)
    if (bill_id in members_vote_object === false)
      console.log("bill id is not in members_vote_object", bill_id); //

    members_vote_object[bill_id].forEach((element) => {
      const member_id = element["member_id"];
      const member_vote = element["vote"];

      let score;
      // member vote avoid.
      if (AVOID.includes(member_vote)) {
        score = 0;
      } else if (
        (member_vote === PRO && user_vote) ||
        (member_vote === CON && !user_vote)
      ) {
        score = 1;
      } else {
        score = -1;
      }

      /* if exist -add score, if not -create score */
      if (member_id in member_score === true) {
        member_score[member_id] = member_score[member_id] + score;
      } else {
        member_score[member_id] = score;
      }
    });
  });
  // console.log("member_score", member_score)

  /* caculate the score of every member ->  ((member_points / bills len) * 100)  */
  for (const [key, score] of Object.entries(member_score)) {
    // console.log(`${key}, ${score}`)
    member_score[key] = (score / bill_len) * 100;
  }
  // console.log("member_score", member_score)

  return member_score;
};

// module.exports = findScoresToMembers;

// export default findScoresToMembers;

const getPair = (member_id, vote) => {
  return { member_id, vote };
};

// const member_votes = {  1: [getPair(55, 2), getPair(56, 2)],
//                         2: [getPair(55, 2), getPair(56, 1), getPair(90, 1)]
//                      }
// const res = findScoresToMembers([1,2], [true, false], member_votes)
// console.log(res)
export default findScoresToMembers;
