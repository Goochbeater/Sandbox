// Per-room boot check: loads each room with ?test&room=<id>&catchup=4 and checks the player stands in that room,
// nothing solid is on the walking line, nothing is parked on layer 1, and the page logged no errors.
// Run: node tools/regress.js rooms
const ROOMS = ['bedroom', 'study', 'garden', 'yard', 'chapel', 'throne', 'wood', 'hut', 'fair', 'lists', 'camp', 'lantern', 'lroom', 'lbath', 'warcamp', 'feast'];

module.exports = {
  name: 'rooms',
  runs: ROOMS.map((id) => ({
    label: id,
    query: `?test&room=${id}&catchup=4`,
    steps: [['wait', 3000], ['eval', `JSON.stringify({ room: SCENE.room.id, walk: SCENE.walkCheck().length, shown: SCENE.actors.filter(a => a.visible).map(a => a.id + '@' + a.layer).join(' '), parked: SCENE.actors.filter(a => a.visible && a.layer === 1).length, errs: (window.__errs || []).length })`]],
  })),
  check(label, evals) {
    const v = evals[0];
    if (!v || typeof v !== 'object') return 'no result';
    if (v.room !== label) return `room is ${v.room}`;
    if (v.walk !== 0) return `walk ${v.walk}`;
    if (v.parked !== 0) return `parked ${v.parked}`;
    if (v.errs !== 0) return `errs ${v.errs}`;
    return null;
  },
};
