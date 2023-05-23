import findScoresToMembers from "../Utils/tests/localUtils.js";
// const {findScoresToMembers} = require('../localUtils');
// import {findScoresToMembers} from "../Utils/localUtils.js"

const SINGEL_BILL_ID = [10];
const SINGEL_USER_VOTE_PRO = [true];
const BILL_IDS = [1, 2, 3, 4, 5, 6];
const USER_VOTE = [true, true, false, true, false, true];

const PRO = 1;
const CON = 2;
const AVOID = 3;

const getPair = (member_id, vote) => {
  return { member_id, vote };
};

describe("member score for a bill", () => {
  test("test the score of member who vote all the bills opposite the user is -100", () => {
    const NEGATIVE_SCORE = -100;

    let members_vote = {};
    let member_id = 555;

    for (let index = 0; index < BILL_IDS.length; index++) {
      const bill_id = BILL_IDS[index];
      const member_vote = USER_VOTE[index] ? CON : PRO;

      members_vote[bill_id] = [getPair(member_id, member_vote)];
    }
    const scores = findScoresToMembers(BILL_IDS, USER_VOTE, members_vote);

    expect(scores[member_id]).toEqual(NEGATIVE_SCORE);

    member_id = 7;
    let bill_id = 1;
    const score_for_one_bill = findScoresToMembers([bill_id], [true], {
      [bill_id]: [getPair(member_id, CON)],
    });
    expect(score_for_one_bill[member_id]).toEqual(NEGATIVE_SCORE);
  });

  test("test the score of member who did not vote for any bills is zero", () => {
    const ZERO_SCORE = 0;
    let member_id = 8;
    let bill_id = SINGEL_BILL_ID[0];
    let member_vote = AVOID;

    let members_vote = { [bill_id]: [getPair(member_id, member_vote)] };
    const score_of_avoid_vote = findScoresToMembers(
      SINGEL_BILL_ID,
      SINGEL_USER_VOTE_PRO,
      members_vote
    );
    expect(score_of_avoid_vote[member_id]).toEqual(ZERO_SCORE);
  });

  test("test the score of member who vote all the bills like the user is 100", () => {
    const POSITIVE_SCORE = 100;

    let members_vote = {};
    let member_id = 77;

    for (let index = 0; index < BILL_IDS.length; index++) {
      let bill_id = BILL_IDS[index];
      let member_vote = USER_VOTE[index] ? PRO : CON;

      members_vote[bill_id] = [getPair(member_id, member_vote)];
    }
    const scores = findScoresToMembers(BILL_IDS, USER_VOTE, members_vote);

    expect(scores[member_id]).toEqual(POSITIVE_SCORE);

    member_id = 7;
    let bill_id = 4;
    const score_for_one_bill = findScoresToMembers([bill_id], [true], {
      [bill_id]: [getPair(member_id, PRO)],
    });
    expect(score_for_one_bill[member_id]).toEqual(POSITIVE_SCORE);
  });

  test("test error - bill ids length not equals to members vote list length", () => {
    let empty_members_vote = {};
    const bad_using = findScoresToMembers(
      BILL_IDS,
      USER_VOTE,
      empty_members_vote
    );
    expect(bad_using).toHaveProperty("error");
  });

  test("test error - bill ids length not equals to user choises length", () => {
    // use arr.slice(1) for get sub array.
  });

  test("test the result length is equals to members length", () => {});

  test("test the scores range between (-100, 100)", () => {});
});
