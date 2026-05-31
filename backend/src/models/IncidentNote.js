const mongoose = require("mongoose");

const incidentNoteSchema = new mongoose.Schema(
  {
    incidentId: { type: mongoose.Schema.Types.ObjectId, ref: "Alert", required: true, index: true },
    authorId: { type: String },
    authorName: { type: String },
    note: { type: String, required: true },
  },
  { timestamps: true }
);

const IncidentNote = mongoose.model("IncidentNote", incidentNoteSchema);

module.exports = { IncidentNote };
