export const GQL_URL = "https://green-sky-91e0.giannhsgew.workers.dev/query";

export async function gql(query, variables = {}) {
  console.log("jwt in gql:", window._jwt);
  if (!window._jwt) throw new Error("Not signed in");
  const auth = window._jwt.startsWith("Bearer ") ? window._jwt : `Bearer ${window._jwt}`;
  const res = await fetch(GQL_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${window._jwt}`,
      "Content-Type": "text/plain"
    },
    body: query
  });
  const data = await res.json();
  console.log("GQL response:", data);
  if (data.errors) throw new Error(data.errors.map(e => e.message).join("; "));
  return data.data;
}

export const Q_USER = `{ user { id login } }`;

export const Q_XP = `
  {
    transaction(
      where:{ type:{ _eq:"xp" }, eventId: { _eq: 200 } }
      order_by:{ createdAt: asc }
      
      
    ){
      amount
      createdAt
      path
      objectId         # <-- added
      object { name }  # (type not required here)
    }
  }`;

export const Q_RESULTS = `
  {
    result(order_by:{ createdAt: asc }){
      grade
      path
      object { id name type }   # add id so you can match against event objectIds
    }
  }`;

export const Q_PROGRESS = `
  {
    progress(order_by:{ createdAt: asc }){
      objectId
      path
      grade
      createdAt
    }
  }`;

export const Q_EVENT_OBJECT_IDS = `
{
  transaction(
    where:{ eventId:{ _eq: 200 }, objectId:{ _is_null: false } }
    distinct_on: objectId
    order_by: { objectId: asc }
  ){
    objectId
  }
}`;

export const Q_AUDITS_EVENT = `
{
  transaction(
    where:{
      eventId:{ _eq: 200 },
      type:{ _in:["up","down"] }
    }
  ){
    type
    amount
    createdAt
  }
}`;