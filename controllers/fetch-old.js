import {
  insertVoteRow,
  insertMemberVoteRow,
  insertKnessetMemberRow,
  insertTypeValue,
  checkIfVoteExistInDB,
  checkIfBillExistInDB,
  checkIfMKExistInDB,
  getVotesIds,
  updateLastUpdated,
  getLastUpdated,
} from "../config/queries.js";

// פונקציה גנרית לקרוא JSON מ-ODATA v4
const getParsedData = async (url) => {
  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (err) {
    console.error("Fetch error: ", err);
    throw err;
  }
};

// שליפת חוקים
export const getBillsByKnessetNum = async (req) => {
  let { knessetNum = 16 } = req;
  while (knessetNum <= 25) {
    let skip = 500;
    const count = 100;
    while (true) {
      const url = `https://knesset.gov.il/OdataV4/ParliamentInfo/KNS_Bill?$filter=KnessetNum%20eq%20${knessetNum}&$skip=${skip}&$top=${count}`;
      console.log("url before: ", url);
      const data = await getParsedData(url);
      const entries = data.value;
      if (!entries || entries.length === 0) break;

      for (const bill of entries) {
        await insertBillRow(bill.Id, bill.Name, bill.KnessetNum, bill.LastUpdatedDate);
      }
      skip += count;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    knessetNum++;
  }
};

// שליפת חברי כנסת מכהנים
export const getKnessetMembers = async () => {
  let skip = 0;
  const count = 100;
  const urlBase = `https://knesset.gov.il/OdataV4/ParliamentInfo/KNS_PersonToPosition?$filter=PositionID in (43,61) and FinishDate eq null&$expand=KNS_Person&$orderby=KNS_Person/LastName&$count=true`;

  while (true) {
    const url = `${urlBase}&$skip=${skip}&$top=${count}`;
    const data = await getParsedData(url);
    const entries = data.value;
    if (!entries || entries.length === 0) break;

    for (const entry of entries) {
      const person = entry.KNS_Person;
      await insertKnessetMemberRow(person.Id, person.FirstName, person.LastName, person.IsCurrent);
    }
    skip += count;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
};



export const getVoteTypes = async () => {
  const url = "https://knesset.gov.il/Odata/Votes.svc/vote_result_type";
  const data = await getParsedData(url);
  const entries = data.value;
  for (const entry of entries) {
    await insertTypeValue({
      typeId: entry.result_type_id,
      typeValue: entry.result_type_name
    });
  }
};


// plenum votes
export const getVotes = async () => {
  let skip = 0;
  const top = 100;

  try {
    let latestTimestamp = null;
    while (true) {
      const lastModified = await getLastUpdated("votes")
      const url = `https://knesset.gov.il/OdataV4/ParliamentInfo/KNS_PlenumVote?$filter=LastModified gt ${lastModified}&$orderby=LastModified&$skip=${skip}&$top=${top}`;
      const data = await getParsedData(url);
      if (!data || !data.value || data.value.length === 0) break;
      for (const vote of data.value) {
        const voteId = vote.VoteID;
        const voteTitle = vote.VoteTitle;
        const voteSubject = vote.VoteSubject;
        const ordinal = vote.Ordinal;
        const sessionId = vote.SessionID;
        const sessionUrl = `https://knesset.gov.il/ODATAV4/ParliamentInfo/KNS_PlenumSession?$filter=Id%20eq%20${sessionId}`
        const sessionData = await getParsedData(sessionUrl);
        console.log("session data:", sessionData)
        if (!sessionData || !sessionData.value || sessionData.value.length === 0) break;
        const knessetNum = sessionData.value[0].KnessetNum;
        console.log(knessetNum)
        const [d,m,y,h,min] = vote.VoteDateTime.match(/\d+/g).map(Number);
        const dateTime = new Date(y, m - 1, d, h, min);
        console.log("date:", vote.VoteDateTime, dateTime)
        if (voteId) {
          await insertVoteRow(voteId, voteTitle, voteSubject,  knessetNum, ordinal, dateTime);
        }
        latestTimestamp = voteRow.LastModified;
      }

      skip += top;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (latestTimestamp) {
      await updateLastUpdated("votes", latestTimestamp);
      console.log("✅ Metadata updated with last timestamp:", latestTimestamp);
    }
  } catch (err) {
    console.error("Error in getVotes:", err.message);
  }
};

// שליפת רשימת הצבעות (הצבעות חברי כנסת)
export const memberVotesList = async () => {
  //let skip = 0;
  //const top = 100;

  try {
    let latestTimestamp = null;
    while (true) {
      const lastModified = await getLastUpdated("member_votes")
      const url = `https://knesset.gov.il/OdataV4/ParliamentInfo/KNS_PlenumVoteResult?$filter=LastModified gt ${lastModified}&$orderby=LastModified&$skip=${skip}&$top=${top}`;
      const data = await getParsedData(url);
      if (!data || !data.value || data.value.length === 0) break;

      for (const voteRow of data.value) {
        console.log(voteRow)
        const memberVoteId = voteRow.Id;
        const memberId = voteRow.MKID;
        const mkExist = await checkIfMKExistInDB(memberId);
        const voteValue = voteRow.ResultDesc;
        if (mkExist) {
          await insertMemberVoteRow(memberVoteId, voteId, memberId, voteValue);
        }
        
        latestTimestamp = voteRow.LastModified_DateTime;
      }

      skip += top;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (latestTimestamp) {
      await updateLastUpdated("member_votes", latestTimestamp);
      console.log("✅ Metadata updated with last timestamp:", latestTimestamp);
    }
      
    //}
  } catch (err) {
    console.error("Error in votesList:", err.message);
  }
};


export const updateFetchTime = async (sourceName) => {
  try {
    await updateLastUpdated(sourceName);
    console.log(`update: last update for ${sourceName} sucseed`);
  } catch (error) {
    console.error(`error: last upsate for ${sourceName} failed: `, error.message);
  }
}

export const getLastFetchTime = async (sourceName) => {
  try {
    const lastUpdate = await getLastUpdated(sourceName);
    console.log(`update: last update for ${sourceName} sucseed`);
  } catch (error) {
    console.error(`error: last upsate for ${sourceName} failed: `, error.message);
  }
}