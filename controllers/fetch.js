import {
  insertMemberVoteRow,
  insertKnessetMemberRow,
  insertTypeValue,
  insertBillRow,
  doesMKExist,
  updateLastUpdated,
  getLastUpdated,
  updateVoteId,
  getVoteId,
  insertPlenumVote,
  doesPlenumVoteExist,
  getRawBills,
  getPlenumVotesIds,
  getKnessetMembersIds,
} from "../config/dbQueries.js";
import Fuse from 'fuse.js';

let fuse = null
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

/**
 * מנקה טקסט עברי לצורך השוואה גמישה:
 * - מסיר סימנים מיוחדים
 * - מסיר ה' הידיעה בתחילת מילה
 * - מסיר ו' חיבור בתחילת מילה
 * - מסיר י' כפולה בכל מקום
 * - מסיר ו' כפולה בכל מקום
 * - מסיר רווחים לגמרי (תוצאה אחת רציפה)
 * - תוצאה באותיות קטנות בלבד
 */
function normalizeHebrewText(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    .normalize("NFKD")
    .replace(/["׳״',.:;!?()\[\]{}<>־–—\-/\\]/g, '') // הסרת סימנים מיוחדים
    .split(/\s+/)
    .map(word => {
      let cleaned = word;

      // הסרת ה' הידיעה בתחילת מילה
      if (cleaned.startsWith("ה") && cleaned.length > 2) {
        cleaned = cleaned.slice(1);
      }

      // הסרת ו' חיבור בתחילת מילה
      if (cleaned.startsWith("ו") && cleaned.length > 2) {
        cleaned = cleaned.slice(1);
      }

      // הסרת י' כפולה בכל מקום
      cleaned = cleaned.replace(/יי+/g, 'י');

      // הסרת ו' כפולה בכל מקום
      cleaned = cleaned.replace(/וו+/g, 'ו');

      return cleaned;
    })
    .join('') // איחוד למחרוזת אחת ללא רווחים
    .toLowerCase()
    .trim();
}

export const findMatchingBill = (voteTitle) => {
  const normalized = normalizeHebrewText(voteTitle);
  const results = fuse.search(normalized);

  if (results.length > 0) {
    return {
      bill: results[0].item,
      score: results[0].score,
    };
  }

  return null;
};


// bills
// fetch bills (no votes yet)
// date field: LastUpdatedDate
export const fetchBillsByKnessetNum = async (knessetNum=25) => {
  let latestTimestamp = null;
  const lastModified = await getLastUpdated("bills");
  let urlBase = `https://knesset.gov.il/OdataV4/ParliamentInfo/KNS_Bill?$filter=KnessetNum%20eq%20${knessetNum}`
  if (lastModified){
    urlBase += ` and LastUpdatedDate gt ${lastModified.toISOString()}`
  }
  
   while (knessetNum <= 25) {
    let skip = 0;
    const count = 100;
    while (true) {
      const url = `${urlBase}&$skip=${skip}&$top=${count}&$orderby=LastUpdatedDate`;
      console.log("url: ",url)
      const data = await getParsedData(url);
      const entries = data.value;
      if (!entries || entries.length === 0) break;

      for (const bill of entries) {
        await insertBillRow(bill.Id, bill.Name, bill.KnessetNum, bill.LastUpdatedDate);
        latestTimestamp = bill.LastModified;
      }
      skip += count;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (latestTimestamp) {
      await updateLastUpdated("bills", latestTimestamp);
      console.log("✅ Metadata updated with last timestamp:", latestTimestamp);
    }
    knessetNum++;
  }
};


// knesset-members
// fetch knesset members
// date field: LastUpdatedDate
export const fetchKnessetMembers = async () => {
  let skip = 0;
  const count = 100;
  let latestTimestamp = null;
  const lastModified = await getLastUpdated("knesset_members")
  let urlBase = `https://knesset.gov.il/OdataV4/ParliamentInfo/KNS_PersonToPosition?$filter=PositionID in (43,61) and FinishDate eq null`
  if (lastModified){
    urlBase += ` and LastUpdatedDate gt ${lastModified}`
  }
  while (true) {
    const url = `${urlBase}&$expand=KNS_Person&$orderby=LastUpdatedDate&$skip=${skip}&$top=${count}`;
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


// vote-types
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
// date field: LastUpdatedDate
export const fetchPlenumVotes = async () => {
  let skip = 0;
  const top = 100;

  try {
    let latestTimestamp = null;
    const lastModified = await getLastUpdated("plenum-votes")
    let urlBase = `https://knesset.gov.il/OdataV4/ParliamentInfo/KNS_PlenumVote?$filter=startswith(VoteTitle,%27%D7%94%D7%A6%D7%A2%D7%AA%20%D7%97%D7%95%D7%A7%27)%20and%20VoteDateTime%20ge%202022-11-01T00:00:00Z`
    if (lastModified){
      urlBase += ` and filter=LastUpdatedDate gt ${lastModified}`
    }
    const bills = await getRawBills(25);
    const normalizedBills = bills.map(bill => ({
      id: bill.id,
      originalName: bill.name,
      normalizedName: normalizeHebrewText(bill.name),
    }));
     fuse = new Fuse(normalizedBills, {
      keys: ['normalizedName'],
      threshold: 0.35, // אפשר לשחק עם זה לפי דיוק/רעש
    });
    while (true) {
      const url = `${urlBase}&$orderby=LastUpdatedDate&$skip=${skip}&$top=${top}`;
      console.log("url: ", url);
      const data = await getParsedData(url);
      if (!data || !data.value || data.value.length === 0) break;
      for (const vote of data.value) {
        console.log("vote:", vote);
        
        //const billId = vote.ItemID;
        const voteId = vote.Id;
        const voteTitle = vote.VoteTitle;
        const matchBill = findMatchingBill(voteTitle);
        const billId = matchBill?.bill?.id ?? null
        if (!billId){
          continue;
        }
        console.log("match:",matchBill)
        /*const exist = await doesBillExist(billId);
        if (!exist){
          console.log(`bill ${billId} from vote ${voteId} doesn't exist`)
          continue;
        }*/
        const [d,m,y,h,min] = vote.VoteDateTime.match(/\d+/g).map(Number);
        const voteDate = new Date(y, m - 1, d, h, min);
        const knessetNum = voteDate >= new Date(2022,11,11)? 25 : 24;
        const voteSubject = vote.VoteSubject;
        const ordinal = vote.Ordinal;
        const forOption = vote.ForOptionDesc;
        const againstOption = vote.AgainstOptionDesc;
        console.log("vote id:" , voteId)
        if (voteId) {
          console.log("inserting now...")
          await insertPlenumVote(
            voteId,
            billId,
            voteTitle,
            voteSubject,
            knessetNum,
            ordinal,
            voteDate,
            forOption,
            againstOption,
          );
        }
        latestTimestamp = vote.LastModified;
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


// member-votes
// date field: LastUpdatedDate
export const fetchMemberVotes = async () => {
  let skip = 0;
  const top = 100;
  let latestTimestamp = null;
  let baseUrl = `https://knesset.gov.il/OdataV4/ParliamentInfo/KNS_PlenumVoteResult?$filter=VoteDate%20ge%202022-11-01T00:00:00Z`;
  const lastModified = await getLastUpdated("member_votes");
  if (lastModified){
    baseUrl+= ` and LastUpdatedDate gt ${lastModified}`
  }
  const votes = await getPlenumVotesIds();
  let members = await getKnessetMembersIds();
  try {
    while (true) {        
      const url = `${baseUrl}&$orderby=LastUpdatedDate&$skip=${skip}&$top=${top}`;
      console.log("url: ", url)
      const data = await getParsedData(url);
      if (!data || !data.value || data.value.length === 0) break;
      
      break;
      for (const voteRow of data.value) {
        const voteId = voteRow.VoteID;
        const exists = votes.has(voteId)
        if (!exists) continue;

        const memberVoteId = voteRow.Id;
        const memberId = voteRow.MKID;
        const voteValue = voteRow.ResultDesc;

        
          //const mkExist = await checkIfMKExistInDB(memberId);
          const mkExists = votes.has(memberId);
          if (!mkExists) {
            const mkUrl = `https://knesset.gov.il/OdataV4/ParliamentInfo/KNS_PersonToPosition?$filter=MKID eq ${memberId}&$expand=KNS_Person`;
            const mkData = await getParsedData(mkUrl);
            const person = mkData.value?.[0]?.KNS_Person;
            if (person) {
              await insertKnessetMemberRow(person.Id, person.FirstName, person.LastName, person.IsCurrent);
            }
            members.add(memberId);
          }

        await insertMemberVoteRow(memberVoteId, voteId, memberId, voteValue);
        latestTimestamp = voteRow.LastModified_DateTime;
      }

      skip += top;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (latestTimestamp) {
      await updateLastUpdated("member_votes", latestTimestamp);
      console.log("✅ Metadata updated with last timestamp:", latestTimestamp);
    }

  } catch (err) {
    console.error("❌ Error in memberVotesList:", err.message);
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
    console.log(`✅ update: last update for ${sourceName} succeeded`);
    return lastUpdate;
  } catch (error) {
    console.error(`❌ error: last update for ${sourceName} failed:`, error.message);
  }
}