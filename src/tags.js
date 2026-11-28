const TAG = /^[A-Za-z0-9-]{1,20}$/;
const MAX_TAGS = 5;

const bad = (message) => Object.assign(new Error(message), { status: 400 });

// Tags are case-sensitive; duplicates are kept and counted; order as sent.
export function parseTags(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw bad("tags must be an array");
  if (value.length > MAX_TAGS) throw bad(`at most ${MAX_TAGS} tags`);
  for (const tag of value) {
    if (typeof tag !== "string" || !TAG.test(tag)) throw bad("invalid tag");
  }
  return [...value];
}

export function parseTagQuery(searchParams) {
  const values = searchParams.getAll("tag");
  if (values.length === 0) return undefined;
  if (values.length > 1) throw bad("tag given more than once");
  if (!TAG.test(values[0])) throw bad("invalid tag");
  return values[0];
}
