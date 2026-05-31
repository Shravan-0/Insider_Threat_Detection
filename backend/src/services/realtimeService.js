let ioInstance = null;

function attachRealtime(io) {
  ioInstance = io;
}

function emitRealtime(event, payload) {
  if (!ioInstance) return;
  ioInstance.to("soc").emit(event, payload);
}

module.exports = { attachRealtime, emitRealtime };
