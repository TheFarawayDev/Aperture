'use strict';
// ============================================================
//  STORY.JS - the storyline has been removed on purpose.
//  This tiny shim keeps the old event hooks harmless so the rest of the game does not need to care.
// ============================================================
const WHO = { NARRATOR: { name: 'LOG', color: '#e6dd9a' } };
const MAP_MINI = new Set();
const chapterName = () => '';
const Story = {
  queue: [], cur: null, mute: 0,
  seen() { return true; }, event() { }, check() { }, pump() { }, play() { }, catchUp() { }, briefing() { },
};
