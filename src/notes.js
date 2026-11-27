// In-memory notes store. Ids are increasing integers, starting at 1.
export function createStore() {
  const notes = new Map();
  let next = 1;
  return {
    list: () => [...notes.values()],
    get: (id) => notes.get(id) ?? null,
    add({ title, body = "" }) {
      if (typeof title !== "string" || title.trim() === "") {
        throw Object.assign(new Error("title is required"), { status: 400 });
      }
      const note = { id: next++, title: title.trim(), body: String(body) };
      notes.set(note.id, note);
      return note;
    },
  };
}
