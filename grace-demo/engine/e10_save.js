/* SAVE — one save slot in this browser's storage. The game decides what goes in it (GAME.state()); storage can be
   missing (private windows, blocked site data), so every call is guarded and the game runs fine without it. */
const SAVE = { key: 'grace.save1' };
SAVE.get = function () { try { const s = localStorage.getItem(SAVE.key); return s ? JSON.parse(s) : null; } catch (e) { return null; } };
SAVE.put = function (data) { try { localStorage.setItem(SAVE.key, JSON.stringify(Object.assign({ v: 1, at: Date.now() }, data))); return true; } catch (e) { return false; } };
SAVE.clear = function () { try { localStorage.removeItem(SAVE.key); } catch (e) { /* */ } };
