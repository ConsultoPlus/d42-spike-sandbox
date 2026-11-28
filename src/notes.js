import { parseTags } from "./tags.js";

// Shared by both stores.
export function parseTitle(title) {
  if (typeof title !== "string" || title.trim() === "") {
    throw Object.assign(new Error("title is required"), { status: 400 });
  }
  return title.trim();
}

// In-memory notes store. Ids are increasing integers, starting at 1.
export function createStore() {
  const notes = new Map();
  let next = 1;
  return {
    list: async ({ tag } = {}) =>
      [...notes.values()].filter((n) => tag === undefined || n.tags.includes(tag)),
    get: async (id) => notes.get(id) ?? null,
    async add({ title, body = "", tags } = {}) {
      const clean = parseTitle(title);
      const note = { id: next++, title: clean, body: String(body), tags: parseTags(tags) };
      notes.set(note.id, note);
      return note;
    },
  };
}
