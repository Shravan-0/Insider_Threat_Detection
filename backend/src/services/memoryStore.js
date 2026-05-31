const memoryStore = {
  logs: [],
  alerts: [],
  riskHistory: [],
  mlPredictions: [],
  timeline: [],
  auditEvents: [],
  incidentNotes: [],
  config: null,
};

function createMemoryId(prefix = "mem") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function pushLimited(collection, item, limit = 500) {
  const entry = {
    ...item,
    _id: item._id || item.id || createMemoryId(),
    id: item.id || item._id,
  };
  collection.push(entry);
  if (collection.length > limit) {
    collection.splice(0, collection.length - limit);
  }
  return entry;
}

module.exports = { memoryStore, pushLimited, createMemoryId };
