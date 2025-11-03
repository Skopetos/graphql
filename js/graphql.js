export const GQL_URL = "https://platform.zone01.gr/api/graphql-engine/v1/graphql";

export async function gql(query, variables = {}) {
  const res = await fetch(GQL_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${window._jwt}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({ query, variables })
  });
  const data = await res.json();
  if (data.errors) throw new Error(data.errors.map(e => e.message).join("; "));
  return data.data;
}

export const Q_USER = `query { user { id login } }`;
export const Q_XP = `
  query XP($limit:Int = 5000){
    transaction(
      where:{ type:{ _eq:"xp" } }
      order_by:{ createdAt: asc }
      limit: $limit
    ){
      amount createdAt path object{ name }
    }
  }`;
export const Q_RESULTS = `
  query Results($limit:Int = 5000){
    result(order_by:{ createdAt: asc }, limit:$limit){
      grade object{ name }
    }
  }`;