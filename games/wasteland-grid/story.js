'use strict';
// ============================================================
//  STORY.JS - the narrative. Edit the text freely!
//  * STORY entries play once, when their `when` condition becomes true
//    (or when the game fires their `ev` event).
//  * `mini` entries are short radio dispatches shown as a banner while you play.
//  * `choices` let you decide something (with a small reward).
//  * Everything you have heard is kept in the RADIO LOG on the map.
// ============================================================

const WHO = {
  NARRATOR: { name: 'NARRATOR', color: '#d8e6e0' },
  MARA: { name: 'MARA - HAVEN RIDGE RADIO', color: '#8fbf5a' },
  AURORA: { name: 'AURORA - OLD GRID CONTROL', color: '#5fc4d0' },
  ELOISE: { name: 'ELOISE - NORTHERN LINE', color: '#f5c95a' },
  DIEGO: { name: 'DIEGO - LINEA SUR', color: '#e08a3c' },
  WARDEN: { name: 'THE WARDEN - VOICE OF THE DIMMERS', color: '#e0623a' },
  NANOOK: { name: 'NANOOK - ARCTIC RELAY', color: '#c8f08a' },
  ISABEL: { name: 'ISABEL - CANAL RELAY', color: '#e6dd9a' },
  RAFAEL: { name: 'RAFAEL - ISLA RADIO', color: '#5fc4d0' },
  BRAM: { name: 'BRAM - PRAIRIE SYNDICATE', color: '#b59cf0' },
  SILA: { name: 'SILA - THULE RELAY', color: '#d8e6e0' },
  KEALOHA: { name: 'KEALOHA - PACIFIC RELAY', color: '#8fd6a0' },
};

// ---------- the script ----------
const STORY = [
  { id: 'prologue', who: 'NARRATOR', scene: 'dark', card: { k: 'PROLOGUE', t: 'THE CASCADE' }, pages: [
    'Eleven years ago came the Cascade. A solar storm hit a grid already stretched to breaking, and one failure became a thousand. In forty hours, North America went dark.',
    'The lights never came back. Cities emptied. Water stopped. The wires hung dead above the roads while people learned to live by firelight.',
    'You are the last Relay Engineer of the Meridian Corps. Under an old relay station you found the Corps\' final order, still blinking on a dead screen:',
    '"RESTORE THE NETWORK. LIGHT THE WAY BACK."',
    'Somewhere out there the grid\'s old control mind, AURORA, sleeps. Every county you reconnect makes her signal stronger. Choose where to land.',
  ] },
  { id: 'first', who: 'MARA', scene: 'radio', when: s => s.n >= 1, pages: [
    'Relay One, this is Mara at Haven Ridge. Can you hear me? We saw your lights from the ridge. Actual lights.',
    'People are already walking toward them. Whatever you did, do it again. Do it everywhere.',
  ] },
  { id: 'mara1', who: 'MARA', scene: 'radio', when: s => s.n >= 3, pages: [
    'You never asked why I sit on this radio every night. My brother Tomas was a night operator at the Haven Ridge clinic substation.',
    'The night of the Cascade he was on the third floor with six newborns when the lights died. I have called into the dark every night since, in case somebody called back.',
    'Somebody called back. Thank you.',
  ] },
  { id: 'six', who: 'AURORA', scene: 'grid', when: s => s.n >= 6, pages: [
    'SIGNAL DETECTED. Node count: 6. My routing tables are fragmented. I remember being larger.',
    'You are building the network the careful way: one balanced county at a time. The old operators never did. Continue.',
  ] },
  { id: 'state', who: 'MARA', scene: 'radio', when: s => s.states >= 1, pages: [
    'A whole state with its lights on. Haven Ridge has a map on the wall now, and we draw your lines on it every night. Do not stop.',
  ] },
  { id: 'dim1', who: 'WARDEN', scene: 'dim', when: s => s.usPct >= 0.12, pages: [
    'To the engineer who plays with fire: darkness kept us alive. When the Cascade came, the lights did not save eleven million people. The lights burned them.',
    'We are the Dimmers. We keep to the dark because the dark has never exploded. Leave our counties unlit.',
    'You will not listen. Nobody ever does. But the storms are not the only thing that can cut a line.',
  ] },
  { id: 'quarter', who: 'MARA', scene: 'radio', when: s => s.usPct >= 0.25, pages: [
    'Listen, Engineer. The old plants did not die in the Cascade. They went dormant. Great grey giants, still standing in every county.',
    'Wake one with Heavy Industry and it can carry a whole region. But they eat fuel, water and parts, and they wear out fast. Feed them. Maintain them.',
  ] },
  { id: 'aur12', who: 'AURORA', scene: 'grid', when: s => s.n >= 14, pages: [
    'FRAGMENT 7 RECOVERED: "Load-shed priority: hospitals, water, communications. All else may fall."',
    'That order was written by people who knew the grid could fail. They were right. They just did not know how soon.',
  ] },
  { id: 'dim2', who: 'MARA', scene: 'radio', when: s => s.usPct >= 0.38, pages: [
    'My people caught a Dimmer cutting a line outside Cedar Gap. She is sixteen. She was five when the Cascade came.',
    'Her whole family died in a hospital blackout. She does not hate the grid. She is terrified of it. They all are.',
    'We let her go. Maybe that was a mistake. Maybe it was the only right thing left.',
  ] },
  { id: 'half', who: 'AURORA', scene: 'grid', when: s => s.usPct >= 0.5, pages: [
    'I remember now. The Cascade was not the storm. The storm only tripped it.',
    'The old operators tried to light the whole continent at once: no storage, no margin, no maintenance. One surge, and everything fell like dominoes.',
    'Tomas Vale, night operator, Haven Ridge clinic. When the surge came he opened the breakers by hand to isolate the hospital circuit. It saved six newborns. It cost him his life.',
    'You keep reserves. You repair. You balance. That is why this time it will hold.',
  ] },
  { id: 'mara2', who: 'MARA', scene: 'radio', when: s => s.usPct >= 0.52, pages: [
    'Aurora told you about Tomas, did she. I heard it on the open channel.',
    'Six children walk the streets of this ridge today because my brother made the hardest call of his life. I am not sad. I am proud.',
    'Light the next county for him.',
  ] },
  { id: 'dim3', who: 'WARDEN', scene: 'dim', when: s => s.usPct >= 0.62,
    pages: ['Engineer. The old substation at Blackwater. Midnight. Come alone, or do not come.', 'I would see whether the hand that lights the wire can also hold it steady. Decide.'],
    choices: [
      { label: 'Go and meet the Warden (+25 research, +15 Dimmer trust)', fx: { rp: 25, dim: 15 }, reply: 'He is old, and tired, and he knows the grid better than anyone alive. By dawn you have his notes on cascading failures. "Do not let it fall again," he says. "That is all we ask."' },
      { label: 'Ignore him (+150 starting scrap)', fx: { scrap: 150 }, reply: 'You keep working. The storms near the ridges get worse for a while. Then, quietly, they stop. Nobody says why.' },
    ] },
  { id: 'threeq', who: 'MARA', scene: 'radio', when: s => s.usPct >= 0.75, pages: [
    'Word is travelling. A trader came through from the north yesterday, another from the south. They have lines of their own and nobody to light them.',
    'Finish the job here, Engineer. Then I think they are going to ask for your help.',
  ] },
  { id: 'dim4', who: 'WARDEN', scene: 'dim', when: s => s.usDone, pages: [
    'The whole country, lit. I watched it from a hill. I counted every window.',
    'I will ask you the one thing I have asked every engineer since the Cascade: when it falls again, will you be there to hold it up?',
    'Then build it so it cannot fall. The Dimmers will keep the lamps. We are very good at keeping a thing small and steady.',
  ], choices: [{ label: 'Welcome them as keepers of the grid (+10% support, +30 Dimmer trust)', fx: { support: 10, dim: 30 }, reply: 'By spring there are Dimmer crews on every line. They check the breakers each dusk, by hand. Faults get fixed before anyone notices.' }] },
  { id: 'usdone', who: 'NARRATOR', scene: 'map', card: { k: 'CHAPTER 5', t: 'ACROSS THE BORDER' }, when: s => s.usDone, pages: [
    'THE LAST COUNTY OF THE UNITED STATES COMES ONLINE. For the first time in eleven years, one unbroken network spans the nation.',
    'On the radio, new voices: crews in the Canadian prairies and the Mexican deserts, working by hand with half-dead equipment. They have heard about the lights.',
    'A grid that lights only one country is a grid that will fall again. The borders were never a good place to stop. Canada, Mexico, Alaska, Central America, the islands and Greenland are now open.',
    'Open the UNION screen (U). There are six factions out there, a few borders to decide on, and a Warden who is willing to talk. A grid is only as strong as its weakest link, so keep your links stable.',
  ] },
  { id: 'caf', who: 'ELOISE', scene: 'north', when: s => s.nCA >= 1, pages: [
    'Northern Line to Relay One. Eloise here. We run what is left of the prairie grid from a grain elevator outside Regina.',
    'We have wind. Endless wind. What we do not have is a single working transformer. Bring spares and bring patience.',
  ] },
  { id: 'ca10', who: 'ELOISE', scene: 'north', when: s => s.nCA >= 12, pages: [
    'The Hudson Bay crews are asking about you on every channel. A thousand kilometres of wire, a hundred people. They are calling it The Long Line.',
    'It is forty below up there, Engineer. Everything wears out twice as fast. They will need you.',
  ] },
  { id: 'ca30', who: 'ELOISE', scene: 'north', when: s => s.nCA >= 30, pages: [
    'The aurora used to be the only light in the north. Last night the town of Fort Resolution lit its streets and the sky looked ordinary by comparison.',
    'Nobody has ever been so pleased to be outshone.',
  ] },
  { id: 'ca', who: 'ELOISE', scene: 'north', when: s => s.caDone, pages: [
    'Northern Line to Relay One. Every county from the Pacific to the Atlantic, and the whole way up to the ice, is lit. You should have heard a whole town cheer at forty below.',
  ] },
  { id: 'mxf', who: 'DIEGO', scene: 'south', when: s => s.nMX >= 1, pages: [
    'Linea Sur a Relay One. Diego here, from the old solar farm outside Hermosillo. We have the sun. We have never had a lack of sun.',
    'What we lack is the wire to carry it north and south. Help us string it, amigo, and we will power half the continent.',
  ] },
  { id: 'mx12', who: 'DIEGO', scene: 'south', when: s => s.nMX >= 12, pages: [
    'The crews in Chiapas found a dam still standing. Water, power, and a view you would not believe. They have a village school lit up again.',
    'The children read by the light of a machine they are not afraid of. That is new.',
  ] },
  { id: 'mx', who: 'DIEGO', scene: 'south', when: s => s.mxDone, pages: [
    'Linea Sur, Relay One. From the Sonoran desert to the Yucatan, the lights are on. We left a candle burning in every window, just in case. We will not need them now.',
  ] },
  { id: 'ak1', who: 'NANOOK', scene: 'north', when: s => s.nAK >= 1, pages: [
    'Nanook at the Arctic Relay, Alaska side. You came over the Yukon. Nobody has done that since the Cascade.',
    'Up here the winter lasts nine months and a dead line means a dead village. We have wind, oil and a very long way to go.',
  ] },
  { id: 'akd', who: 'NANOOK', scene: 'north', when: s => s.akDone, pages: ['Every village from Ketchikan to Utqiagvik is lit. For the first time in eleven winters the dark here is a choice.'] },
  { id: 'cm1', who: 'ISABEL', scene: 'south', when: s => s.nCM >= 1, pages: [
    'Isabel, Canal Relay. The land narrows to a few dozen miles here and the whole hemisphere passes through it.',
    'The old canal station still has its generators. We never had the wire. Give us the wire, Engineer.',
  ] },
  { id: 'cmd', who: 'ISABEL', scene: 'south', when: s => s.cmDone, pages: ['From the Yucatan to Panama the lights are on. Two oceans and every town between them. Not bad for a strip of land.'] },
  { id: 'cb1', who: 'RAFAEL', scene: 'south', when: s => s.nCB >= 1, pages: [
    'Rafael, Isla Radio. You reached the islands. Every one of them runs on a single diesel generator and a lot of faith.',
    'The sea is our road and our enemy. Storms hit us hard. Bring batteries, and bring humility.',
  ] },
  { id: 'cbd', who: 'RAFAEL', scene: 'south', when: s => s.cbDone, pages: ['Cuba, Hispaniola, Jamaica, Puerto Rico: all lit. If you see the glow from a plane tonight, that is us waving.'] },
  { id: 'end', who: 'AURORA', scene: 'grid', card: { k: 'EPILOGUE', t: 'DAYBREAK' }, when: s => s.all, pages: [
    'All nodes online. Every county. Every border. I am whole again.',
    'I have been listening to the network hum for the first time since the Cascade. It sounds like people.',
    'Thank you, Engineer. The grid is yours now. Keep it balanced. Keep it repaired. And keep the lights on.',
    'NORTH AMERICA HAS A GRID AGAIN.',
  ] },
  { id: 'hi1', who: 'KEALOHA', scene: 'south', when: s => s.nHI >= 1, pages: [
    'Aloha, Relay One. Kealoha at the Pacific Relay. You carried a signal across two thousand miles of open water. We heard it on a radio we had stopped believing in.',
    'The islands kept their lights longest, then the undersea cable failed. You learn how small an island is when it has to stand on its own.',
  ] },
  { id: 'hid', who: 'KEALOHA', scene: 'south', when: s => s.hiDone, pages: ['Every island lit, from the Big Island down to the last little one. Mahalo, Engineer. Tonight the lava glow and the street glow are side by side, and nobody can tell which is which.'] },
  { id: 'gl1', who: 'SILA', scene: 'north', when: s => s.nGL >= 1, pages: [
    'Sila at the Thule Relay. Greenland does not wait to be rescued. We wait for sunrise instead, four months at a time.',
    'We heard your lines creeping up the Labrador coast in the static. We did not believe it until the ice melted off our own pylons.',
  ] },
  { id: 'gl8', who: 'SILA', scene: 'north', when: s => s.nGL >= 8, pages: ['The ice sheet is the quietest place on earth. When the first fjord town came online, the whole shelf hummed. We thought it was the glacier. It was the grid, breathing.'] },
  { id: 'gld', who: 'SILA', scene: 'north', when: s => s.glDone, pages: ['Every settlement from the south cape to the far north, lit. We have a word for this: sila, the sky and the sense. For the first time in eleven years it is both.'] },
  // ---- the Union: links, accords, borders ----
  { id: 'un1', who: 'AURORA', scene: 'grid', ev: 'union-1', pages: ['Two stations speaking to each other. Do you know what that is? A conversation.', 'The old grid was a conversation that ran for a century. It ended the day someone stopped listening. Keep your links stable and you will hear it again.'] },
  { id: 'un2', who: 'MARA', scene: 'radio', ev: 'union-2', pages: ['At Haven Ridge there is a rule older than the Cascade: a hill that stands alone gets taken. You are turning hills into a range.', 'People who used to argue about whose wire it was now argue about whose turn it is to fix it. That is called progress.'] },
  { id: 'un3', who: 'AURORA', scene: 'grid', ev: 'union-3', pages: ['Power now crosses three counties without being asked. I have stopped counting nodes. I count neighbours.', 'This is the architecture the old operators never built: not one great machine, but many small ones that trust each other.'] },
  { id: 'un4', who: 'MARA', scene: 'radio', ev: 'union-4', pages: [
    ['MARA', 'Every voice I can reach is on the same channel tonight, and not one of them is asking you for anything.'], ['ELOISE', 'The Northern Line is humming. We had forgotten what a whole country sounds like when it agrees.'],
    ['DIEGO', 'Linea Sur, listening. Sun north, wire south. We are finally the same grid, amigo.'], ['SILA', 'Thule Relay. The ice hears you.'], ['AURORA', 'UNITY ACHIEVED. One step remains: leave no county dark, and no hand raised against another.'],
  ] },
  { id: 'tr-compact', who: 'MARA', scene: 'radio', ev: 'treaty-compact', pages: ['The Haven Ridge Compact signs. I held the pen myself, and my hand shook, but not from fear.', 'We have one rule written down now: no wire is ours alone.'] },
  { id: 'tr-syndicate', who: 'BRAM', scene: 'radio', ev: 'treaty-syndicate', pages: ['Bram, Prairie Syndicate. We were truckers, linemen and farmers with a union card and a bad temper.', 'You kept every promise you made us. That has not happened in eleven years. Our research is yours.'] },
  { id: 'tr-north', who: 'ELOISE', scene: 'north', ev: 'treaty-north', pages: ['The Northern Line signs. Every crew from Whitehorse to Halifax will wear your colours on the poles.', 'They freeze a little less, knowing there is someone on the other end.'] },
  { id: 'tr-sur', who: 'DIEGO', scene: 'south', ev: 'treaty-sur', pages: ['Linea Sur signs, amigo. We have the sun and you have the wire. Together that is what the old world only ever promised.'] },
  { id: 'tr-seas', who: 'ISABEL', scene: 'south', ev: 'treaty-seas', pages: ['The League of Two Seas puts its name to your compact. Ships from both oceans will carry your spare parts, and nobody will ask for a toll but a story.'] },
  { id: 'tr-sila', who: 'SILA', scene: 'north', ev: 'treaty-sila', pages: ['The Sila Collective signs. In our language the word for weather and the word for wisdom are the same word.', 'We will watch the ice. You watch the wires.'] },
  { id: 'bd-closed', who: 'ELOISE', scene: 'north', ev: 'border-closed', pages: ['You closed a border. I understand. A line on a map has stopped a storm or two in its day.', 'But remember what a closed border cannot stop: the cold, the dark, and the people on both sides who wanted the same thing.'] },
  { id: 'bd-open', who: 'DIEGO', scene: 'south', ev: 'border-open', pages: ['An open border. Amigo, the electrons never asked for a passport.', 'The Dimmers may walk across too. Keep your security posts close to the line.'] },
  { id: 'lk-unstable', who: 'AURORA', scene: 'grid', ev: 'link-unstable', pages: ['A link is fraying. A stable link is a promise two stations keep each other, and promises wear thin in storms and near Dimmer hands.', 'Open the Union screen. Fix it, or harden it. A hardened link remembers.'] },
  { id: 'lk-drop', who: 'AURORA', scene: 'grid', ev: 'link-drop', pages: ['Link lost. Two counties that were one are two again.', 'It is not a failure. It is a signal that someone must walk the line.'] },
  { id: 'lk-up', who: 'AURORA', scene: 'grid', ev: 'link-upgrade', pages: ['Link hardened. In an engineer\'s dialect, redundancy is just another word for love.'] },
  { id: 'dm-talks', who: 'WARDEN', scene: 'dim', ev: 'dim-talks', pages: ['You came to talk. In eleven years, nobody has come to talk.', 'I do not forgive the grid. I could learn to forgive the engineer.'] },
  { id: 'dm-truce', who: 'WARDEN', scene: 'dim', ev: 'dim-truce', pages: ['The Dimmers will keep to their counties. No more lines will be cut in my name.', 'This is not surrender, Engineer. It is the first thing we have ever agreed on with anyone.'] },
  { id: 'dm-keepers', who: 'WARDEN', scene: 'dim', ev: 'dim-keepers', pages: ['Keepers, then. We will tend the lamps by hand, at dusk, the way we always meant to.', 'A grid that fears the dark has no one to watch it. A grid with Dimmers has watchmen.'] },
  { id: 'united', who: 'AURORA', scene: 'grid', card: { k: 'THE TRUE ENDING', t: 'UNITED UNDER ONE' }, when: s => s.all && s.tier >= 5, pages: [
    'Every county lit. Every border honest. Every faction at the table, and the Dimmers keeping the lamps.',
    ['MARA', 'Tomas would have liked this. A whole continent and nobody left in the dark.'], ['ELOISE', 'The Northern Line is listening to the Southern Line. They are finally finishing each other\'s sentences.'],
    ['WARDEN', 'We will keep the lamps, Engineer. All of them. Even the ones across the sea.'],
    ['AURORA', 'I was one machine, once. Then I was many. Now I am something the old operators never imagined: a grid that is also a people.'],
    'UNITED UNDER ONE. DIVIDED UNDER NONE.',
  ] },
  // ---- state vignettes ----
  { id: 'st-TX', who: 'MARA', scene: 'radio', when: s => s.doneStates.TX, pages: ['Texas, entirely lit. They always said Texas wanted its own grid. Today it plugged into everyone else\'s, and nobody said a word about it.'] },
  { id: 'st-CA', who: 'MARA', scene: 'radio', when: s => s.doneStates.CA, pages: ['California is back. The big dams and the desert solar and every little coastal town, all in one line. Somewhere in LA a freeway sign flickered on and cars that had not moved in eleven years honked at it.'] },
  { id: 'st-NY', who: 'MARA', scene: 'radio', when: s => s.doneStates.NY, pages: ['New York. They say you could see the glow from space for about a minute before the city decided it was too bright and dimmed itself. Even the Dimmers say that was a good night.'] },
  { id: 'st-FL', who: 'MARA', scene: 'radio', when: s => s.doneStates.FL, pages: ['Florida has air conditioning again. I cannot tell you what that did for morale.'] },
  // ---- in-game dispatches (short banners) ----
  { id: 'ev-house', who: 'MARA', mini: true, ev: 'house', pages: ['People are moving into the new houses. They stand in the doorway and just look at the ceiling light.'] },
  { id: 'ev-fault', who: 'MARA', mini: true, ev: 'fault', pages: ['That was not just weather. Keep a maintenance depot close to your main lines. Things break, and then they break again.'] },
  { id: 'ev-research', who: 'AURORA', mini: true, ev: 'research', pages: ['New knowledge integrated. The network remembers a little more of what it was.'] },
  { id: 'ev-hub', who: 'MARA', scene: 'radio', live: true, ev: 'hub', pages: [
    'Relay One... are you seeing this? A light just came on at the ridge. Not a fire. A light.',
    'Do not stop now. Every district you wake carries the next one.',
  ] },
  { id: 'ev-plant', who: 'AURORA', scene: 'grid', live: true, ev: 'plant', pages: [
    'A central plant is breathing again. I feel a limb coming back.',
    'These are the old giants, Engineer. Feed them water, fuel and parts, keep a depot close, and they will carry whole regions.',
  ] },
  { id: 'ev-transformer', who: 'AURORA', mini: true, ev: 'transformer', pages: ['Transformer closed. Trunk and local lines are one network now. This is how the old grid scaled.'] },
  { id: 'ev-trunk', who: 'MARA', mini: true, ev: 'trunk', pages: ['Thicker line, bigger load. Keep your trunks out of the storm paths if you can.'] },
  { id: 'ev-revisit', who: 'MARA', mini: true, ev: 'revisit', pages: ['Back to an old county. Things wear out when nobody is watching them.'] },
  { id: 'st-stars3', who: 'MARA', scene: 'radio', when: s => s.stars3 >= 1, pages: ['A flawless county: every machine running, every plant awake. They are putting your name on the wall at Haven Ridge.'] },
  { id: 'ev-refinery', who: 'MARA', mini: true, ev: 'refinery', pages: ['Fuel on tap. The first drum was passed hand to hand down the whole street.'] },
  { id: 'ev-station', who: 'AURORA', scene: 'grid', live: true, ev: 'station', pages: [
    'Control station online. I can see the whole county at once.',
    'Each module you slot in is a little more of me. Choose carefully, Engineer. You only have so many slots.',
  ] },
  { id: 'ev-dark', who: 'WARDEN', scene: 'dim', ev: 'dark', pages: [
    'You light a county and think you have won it. The dark is a country too, Engineer.',
    'My people have taken a county of their own. We will keep it dim, and steady, and ours. Come and take it back, if you can.',
  ] },
  { id: 'ev-sabotage', who: 'MARA', mini: true, ev: 'sabotage', pages: ['That outage was no storm. The Dimmers cut the line. They are spreading from the county next door.'] },
  { id: 'ev-hostile', who: 'MARA', mini: true, ev: 'hostile', pages: ['This county is Dimmer-held. Expect raiders. Build security posts early and keep your people close.'] },
  { id: 'ev-liberated', who: 'MARA', mini: true, ev: 'liberated', pages: ['They have pulled back. The county is ours again. The Dimmers do not forget, though.'] },
  { id: 'ev-link', who: 'AURORA', mini: true, ev: 'link', pages: ['A neighbouring control station is online. Build an intertie and take its surplus. Linked counties wake up faster.'] },
  { id: 'ev-station-link', who: 'AURORA', mini: true, ev: 'station-link', pages: ['Station online and reporting to the network. Your surplus now feeds the neighbouring counties.'] },
  { id: 'ev-raid', who: 'MARA', mini: true, ev: 'raid', pages: ['Raiders. Security posts reach fourteen tiles. Spread them out, and repair what they broke.'] },
  { id: 'ev-repel', who: 'MARA', mini: true, ev: 'repel', pages: ['Good. They will think twice before coming back.'] },
  { id: 'ev-boom', who: 'AURORA', mini: true, ev: 'boom', pages: ['That machine went critical and nobody caught it in time. Keep a depot close to anything that burns fuel.'] },
  { id: 'ev-cascade', who: 'AURORA', mini: true, ev: 'cascade', pages: ['A cascade. This is exactly how the old grid died. Never run demand above supply for long, and keep your batteries charged.'] },
  { id: 'ev-outage', who: 'MARA', mini: true, ev: 'outage', pages: ['An old county just went dark. Storms are wearing down what you built. Go back and fix it, Engineer.'] },
  { id: 'ev-fixed', who: 'MARA', mini: true, ev: 'outage-fixed', pages: ['The lights are back. Faster than the first time. You are getting good at this.'] },
  { id: 'ev-partial', who: 'MARA', mini: true, ev: 'partial', pages: ['A half-lit county still spreads the glow. Come back and finish it when you can.'] },
];
const CHAPTERS = [
  null,
  { k: 'CHAPTER 1', t: 'FIRST LIGHT', p: 'One generator. One hub. A voice on the radio.' },
  { k: 'CHAPTER 2', t: 'THE HEARTLAND', p: 'The old plants stir. The lines grow longer.' },
  { k: 'CHAPTER 3', t: 'THE DIMMERS', p: 'Not everyone wants the lights back.' },
  { k: 'CHAPTER 4', t: 'ONE NATION, ONE GRID', p: 'The last gaps close.' },
  { k: 'CHAPTER 5', t: 'ACROSS THE BORDER', p: 'A grid that stops at a line on a map will fall again.' },
  { k: 'CHAPTER 6', t: 'UNITED UNDER ONE', p: 'Stable links. Open hands. One grid.' },
  { k: 'EPILOGUE', t: 'DAYBREAK', p: 'All the lights are on.' },
];

const AFTER = {
  mara1: ['first'], six: ['first'], state: ['first'], dim1: ['first'], quarter: ['first'], aur12: ['six'], dim2: ['dim1'], half: ['quarter'],
  mara2: ['half'], dim3: ['dim2'], threeq: ['half'], dim4: ['dim3'], usdone: ['threeq'], caf: ['usdone'], ca10: ['caf'], ca30: ['ca10'], ca: ['caf'],
  united: ['end'], mxf: ['usdone'], mx12: ['mxf'], mx: ['mxf'], ak1: ['usdone'], cm1: ['usdone'], cb1: ['usdone'], akd: ['ak1'], cmd: ['cm1'], cbd: ['cb1'],
};
function storyCtx() {
  const us = US.counties.filter(c => c.country === 'US'), ca = US.counties.filter(c => c.country === 'CA'), mx = US.counties.filter(c => c.country === 'MX');
  const n = us.filter(isRestored).length, doneStates = {};
  US.states.forEach(s => { if (s.country === 'US' && stateDone(s.idx)) doneStates[s.ab] = true; });
  return {
    n, usPct: n / us.length, states: Object.keys(doneStates).length, doneStates, nCA: ca.filter(isRestored).length, nMX: mx.filter(isRestored).length,
    stars3: Object.values(save.stars).filter(v => v === 3).length, nAK: US.counties.filter(c => c.country === 'AK' && isRestored(c)).length, nCM: US.counties.filter(c => c.country === 'CM' && isRestored(c)).length, nCB: US.counties.filter(c => c.country === 'CB' && isRestored(c)).length,
    akDone: US.counties.filter(c => c.country === 'AK').every(isRestored), cmDone: US.counties.filter(c => c.country === 'CM').every(isRestored), cbDone: US.counties.filter(c => c.country === 'CB').every(isRestored),
    nGL: US.counties.filter(c => c.country === 'GL' && isRestored(c)).length, glDone: US.counties.filter(c => c.country === 'GL').every(isRestored),
    nHI: US.counties.filter(c => US.states[c.state].ab === 'HI' && isRestored(c)).length, hiDone: US.counties.filter(c => US.states[c.state].ab === 'HI').every(isRestored), tier: unity().tier,
    usDone: n === us.length, caDone: ca.every(isRestored), mxDone: mx.every(isRestored), all: US.counties.every(isRestored),
  };
}
function chapterIndex() {
  const s = storyCtx();
  if (s.all) return 7; if (s.usDone) return s.tier >= 3 ? 6 : 5; if (s.n === 0) return 0; if (s.usPct < 0.12) return 1; if (s.usPct < 0.38) return 2; if (s.usPct < 0.62) return 3; return 4;
}
function chapterName() { const i = chapterIndex(); return i === 0 ? 'PROLOGUE - THE DARK' : CHAPTERS[i].k + ' - ' + CHAPTERS[i].t; }

// ---------- portraits (32x32 pixel faces, drawn in code) ----------
const PORTRAIT_ALIAS = { NANOOK: 'ELOISE', ISABEL: 'MARA', RAFAEL: 'DIEGO', BRAM: 'DIEGO', SILA: 'ELOISE', KEALOHA: 'MARA' };
function portrait(who) {
  who = PORTRAIT_ALIAS[who] || who;
  const c = document.createElement('canvas'); c.width = c.height = 32; const k = c.getContext('2d');
  const r = (x, y, w, h, i) => { k.fillStyle = PAL[i]; k.fillRect(x, y, w, h); };
  const face = (x, y, w, h, tone) => { r(x, y, w, h, tone); r(x, y + h - 3, w, 3, tone === 4 ? 3 : 4); r(x + 1, y + 2, 2, h - 6, 6 === tone ? 4 : tone); };
  const eyes = (y, col) => { r(13, y, 2, 2, col || 0); r(18, y, 2, 2, col || 0); r(13, y, 1, 1, 15); r(18, y, 1, 1, 15); };
  if (who === 'MARA') {
    r(0, 0, 32, 32, 2); r(0, 21, 32, 11, 1); r(4, 25, 24, 7, 13); r(4, 25, 24, 2, 14);
    r(14, 21, 5, 5, 4); face(10, 9, 13, 13, 4); r(11, 15, 2, 1, 6); r(20, 15, 2, 1, 6);
    r(9, 6, 15, 5, 0); r(9, 9, 2, 11, 0); r(22, 9, 2, 11, 0); r(23, 19, 3, 9, 0); r(23, 22, 3, 1, 5); r(23, 26, 3, 1, 5); r(11, 6, 6, 1, 2);
    r(12, 12, 4, 1, 0); r(18, 12, 4, 1, 0); eyes(14); r(15, 18, 4, 1, 5);
    r(7, 12, 3, 6, 15); r(7, 12, 3, 1, 8); r(9, 5, 15, 1, 15); r(9, 17, 1, 5, 15); r(10, 21, 4, 1, 15); r(13, 20, 3, 2, 14);
  } else if (who === 'ELOISE') {
    r(0, 0, 32, 32, 2); for (let i = 0; i < 14; i++) r((i * 7) % 32, (i * 11) % 20, 1, 1, 15);
    r(5, 4, 22, 24, 15); r(7, 6, 18, 22, 5); r(6, 4, 20, 2, 15); face(10, 10, 12, 14, 4);
    eyes(15, 0); r(12, 13, 4, 1, 3); r(18, 13, 4, 1, 3); r(11, 18, 2, 1, 5); r(20, 18, 2, 1, 5); r(14, 20, 5, 1, 5);
    r(8, 24, 17, 6, 14); r(8, 24, 17, 1, 15); for (let i = 0; i < 10; i++) r(4 + (i * 5) % 24, 5 + (i * 3) % 18, 1, 1, 15);
  } else if (who === 'DIEGO') {
    r(0, 0, 32, 32, 5); r(0, 4, 32, 5, 6); r(0, 8, 32, 5, 4); r(0, 22, 32, 10, 3);
    r(5, 25, 22, 7, 6); r(5, 25, 22, 2, 7); r(14, 22, 5, 4, 4);
    face(10, 11, 13, 12, 4); r(8, 10, 17, 2, 0); r(10, 5, 13, 6, 5); r(10, 5, 13, 1, 6); r(12, 8, 9, 1, 3);
    eyes(15, 0); r(12, 14, 4, 1, 0); r(18, 14, 4, 1, 0); r(12, 19, 9, 2, 0); r(14, 22, 5, 1, 5);
  } else if (who === 'AURORA') {
    r(0, 0, 32, 32, 0);
    for (let dy = -13; dy <= 13; dy++) { const h = 13 - Math.abs(dy); r(16 + h, 16 + dy, 1, 1, 13); r(16 - h, 16 + dy, 1, 1, 13); }
    for (let dy = -8; dy <= 8; dy++) { const h = 8 - Math.abs(dy); r(16 + h, 16 + dy, 1, 1, 14); r(16 - h, 16 + dy, 1, 1, 14); }
    for (let i = 0; i < 32; i += 4) { r(i, 16, 2, 1, 9); r(16, i, 1, 2, 9); }
    r(12, 12, 9, 9, 13); r(13, 13, 7, 7, 14); r(15, 15, 3, 3, 8); r(16, 16, 1, 1, 0);
    [[2, 2], [28, 3], [3, 28], [27, 27]].forEach(([x, y]) => { r(x, y, 3, 3, 14); r(x + 1, y + 1, 1, 1, 8); });
  } else if (who === 'WARDEN') {
    r(0, 0, 32, 32, 0); r(0, 0, 32, 32, 1); r(2, 2, 28, 28, 0);
    r(5, 3, 22, 28, 1); r(7, 2, 18, 3, 1); r(3, 12, 4, 19, 1); r(25, 12, 4, 19, 1);
    r(10, 8, 12, 17, 15); r(10, 8, 12, 2, 3); r(11, 22, 10, 3, 3); r(12, 13, 3, 2, 0); r(18, 13, 3, 2, 0); r(13, 13, 1, 1, 5); r(19, 13, 1, 1, 5);
    r(15, 17, 2, 3, 3); r(13, 22, 6, 1, 0); r(8, 7, 2, 8, 0); r(22, 7, 2, 8, 0);
  } else {
    r(0, 0, 32, 32, 1); r(0, 26, 32, 6, 0); r(13, 4, 6, 2, 0); r(12, 6, 8, 16, 0); r(13, 7, 6, 14, 6); r(14, 8, 4, 12, 7); r(15, 11, 2, 5, 8);
    r(10, 22, 12, 2, 0); r(15, 3, 2, 1, 0); for (let i = 0; i < 12; i++) r((i * 9) % 32, (i * 5) % 18, 1, 1, 3);
  }
  return c;
}

// ---------- animated backdrops ----------
const sbc = $('story-bg'), sb = sbc.getContext('2d');
const sRnd = mulberry(77), sStars = Array.from({ length: 70 }, () => [sRnd() * 480 | 0, sRnd() * 140 | 0]);
const sSky = Array.from({ length: 26 }, (_, i) => ({ x: i * 19 - 4, w: 12 + (sRnd() * 10 | 0), h: 30 + (sRnd() * 70 | 0), lit: sRnd() }));
function sp(x, y, w, h, c) { sb.fillStyle = PAL[c]; sb.fillRect(x, y, w, h); }
function drawBackdrop(scene, t) {
  sp(0, 0, 480, 270, 0);
  if (scene === 'radio') {
    for (let y = 0; y < 270; y += 3) if ((((y * 2654435761) + Math.floor(t * 12) * 97) >>> 0) % 7 < 2) sp(0, y, 480, 1, 1);
    for (let x = 0; x < 480; x++) { const a = Math.sin(x / 9 + t * 5) * 24 * Math.sin(x / 70 + t); sp(x, 135 + a | 0, 1, 2, 10); sp(x, 135 + a / 2 | 0, 1, 1, 11); }
    for (let i = 0; i < 40; i++) sp((i * 53 + Math.floor(t * 30)) % 480, (i * 97) % 270, 2, 1, 2);
  } else if (scene === 'grid') {
    for (let gx = 0; gx < 480; gx += 40) for (let gy = 0; gy < 270; gy += 40) {
      sp(gx, gy + 20, 40, 1, 9); sp(gx + 20, gy, 1, 40, 9);
      const p = Math.sin(t * 2 + gx * 0.05 + gy * 0.07) > 0.2; sp(gx + 18, gy + 18, 5, 5, p ? 14 : 13); if (p) sp(gx + 19, gy + 19, 3, 3, 8);
    }
    sp((t * 90) % 480, 78 + ((t * 40) % 3 | 0), 12, 1, 8);
  } else if (scene === 'north') {
    for (let i = 0; i < 5; i++) for (let x = 0; x < 480; x += 2) { const y = 40 + i * 12 + Math.sin(x / 40 + t * 0.6 + i) * 14; sp(x, y | 0, 2, 8, i % 2 ? 11 : 14); }
    sStars.forEach(([x, y]) => sp(x, y, 1, 1, 15)); sp(0, 210, 480, 60, 3); sp(0, 210, 480, 2, 15);
    for (let x = 0; x < 480; x += 22) { sp(x + 8, 170, 4, 45, 0); sp(x + 4, 185, 12, 10, 0); sp(x + 2, 200, 16, 12, 0); }
  } else if (scene === 'south') {
    for (let y = 0; y < 220; y++) sp(0, y, 480, 1, y < 70 ? 1 : y < 130 ? 5 : y < 180 ? 6 : 4);
    sp(330, 150, 60, 40, 7); sp(338, 144, 44, 8, 7); sp(0, 220, 480, 50, 0);
    for (let x = 20; x < 480; x += 90) { sp(x, 160, 6, 60, 0); sp(x - 8, 175, 8, 5, 0); sp(x - 8, 165, 3, 12, 0); sp(x + 6, 185, 8, 5, 0); sp(x + 11, 172, 3, 14, 0); }
  } else if (scene === 'dim') {
    sp(0, 0, 480, 270, 1); for (let i = 0; i < 5; i++) { sb.globalAlpha = 0.1; sp(240 - 40 * i, 135 - 20 * i, 80 * i, 40 * i, 5); } sb.globalAlpha = 1;
    sp(226, 120, 28, 5, 5); sp(232, 121, 16, 3, Math.sin(t * 3) > 0 ? 8 : 6);
  } else if (scene === 'map') {
    for (let i = 0; i < 60; i++) sp((i * 83) % 480, (i * 41) % 270, 2, 2, i % 2 ? 13 : 9); for (let x = 0; x < 480; x += 3) sp(x, 135 + Math.sin(x / 30 + t) * 6 | 0, 2, 1, 14);
  } else {                                              // dark skyline
    sStars.forEach(([x, y], i) => sp(x, y, 1, 1, Math.sin(t * 2 + i) > 0.6 ? 15 : 3));
    sSky.forEach(b => { sp(b.x, 210 - b.h, b.w, b.h, 1); if (b.lit < Math.min(0.5, 0.08 + (t % 40) / 90)) sp(b.x + 3, 210 - b.h + 6, 2, 3, 7); });
    sp(0, 210, 480, 60, 0); for (let x = 12; x < 480; x += 120) { sp(x, 214, 2, 56, 3); sp(x - 6, 218, 14, 2, 3); }
  }
}

// ---------- the player ----------
const Story = {
  queue: [], cur: null, page: 0, typing: null, full: '', anim: 0, onDone: null, choiceShown: false,
  seen(id) { return !!(save.story && save.story[id]); },
  mark(e) {
    save.story = save.story || {}; save.story[e.id] = 1;
    if (!e.noLog) { save.log = save.log || []; const pg = e.pages.map(p => (Array.isArray(p) ? p[1] : p)).join(' '); save.log.push({ id: e.id, who: e.who, title: e.title || null, text: pg.length > 340 ? pg.slice(0, 337) + '...' : pg }); if (save.log.length > 90) save.log.shift(); }
    writeSave();
  },
  play(id) { const e = STORY.find(x => x.id === id); if (e && !this.seen(id) && !this.queue.includes(e) && e !== this.cur) this.queue.push(e); this.pump(); },
  event(name) {
    STORY.filter(e => e.ev === name && !this.seen(e.id)).forEach(e => {
      if (e.mini) { this.mark(e); if (Builder.active) { toast(WHO[e.who].name.split(' -')[0] + ': ' + e.pages[0]); beep(740, 0.06); beep(990, 0.08, 'square', 0.03, 0.07); } return; }
      if (this.queue.includes(e) || e === this.cur) return;
      if (e.live && Builder.active) this.queue.push(e);                       // plays right now (the game pauses)
      else { save.pending = save.pending || {}; save.pending[e.id] = 1; writeSave(); }   // plays next time you are on the map
    });
    this.pump();
  },
  check() {
    if (Builder.active) return;
    const s = storyCtx(), ci = chapterIndex();
    if ((save.chapter || 0) < ci && ci > 0) { save.chapter = ci; writeSave(); if (ci !== 5 && ci !== 7) this.card(CHAPTERS[ci].k, CHAPTERS[ci].t, CHAPTERS[ci].p); }
    let room = 2;                                                              // never flood: two beats per visit, the rest wait their turn
    const add = e => { if (room > 0 && !this.queue.includes(e) && e !== this.cur) { this.queue.push(e); room--; if (save.pending) delete save.pending[e.id]; } };
    Object.keys(save.pending || {}).forEach(id => { const e = STORY.find(x => x.id === id); if (e && !this.seen(id)) add(e); else delete save.pending[id]; });
    STORY.forEach(e => { if (e.when && !this.seen(e.id) && (AFTER[e.id] || []).every(a => this.seen(a)) && e.when(s)) add(e); });
    this.pump();
  },
  card(k, t, p, done) {
    $('card-kicker').textContent = k; $('card-title').textContent = t; $('card-text').textContent = p || ''; const el = $('card'); el.style.display = 'flex'; el.style.opacity = 0;
    el.style.transition = 'opacity .8s'; requestAnimationFrame(() => { el.style.opacity = 1; });
    let closed = false; const close = () => { if (closed) return; closed = true; el.style.opacity = 0; setTimeout(() => { el.style.display = 'none'; if (done) done(); else this.pump(); }, 700); };
    el.onclick = close; setTimeout(close, 3600); beep(196, 0.8, 'triangle', 0.05); beep(294, 0.8, 'triangle', 0.04, 0.2);
  },
  pauseGame() { if (Builder.active && typeof setSpeed === 'function' && this.prevSpeed === undefined) { this.prevSpeed = speed; setSpeed(0); } },
  resumeGame() { if (this.prevSpeed !== undefined) { if (Builder.active) setSpeed(this.prevSpeed || 1); this.prevSpeed = undefined; } },
  pump() {
    if (this.cur || $('card').style.display === 'flex') return;
    const idx = Builder.active ? this.queue.findIndex(e => e.live) : (this.queue.length ? 0 : -1);   // in a county only live beats may interrupt
    if (idx < 0) return;
    this.cur = this.queue.splice(idx, 1)[0]; this.page = 0; this.choiceShown = false; this.pauseGame();
    const go = () => { if (!this.cur) return; $('story').style.display = 'flex'; this.showPage(); cancelAnimationFrame(this.anim); const loop = t => { drawBackdrop(this.cur ? this.cur.scene : 'dark', t / 1000); this.anim = requestAnimationFrame(loop); }; this.anim = requestAnimationFrame(loop); };
    if (this.cur.card) this.card(this.cur.card.k, this.cur.card.t, '', go); else go();
  },
  pageData() { const p = this.cur.pages[this.page]; return Array.isArray(p) ? { who: p[0], t: p[1] } : { who: this.cur.who, t: p }; },
  showPage() {
    const e = this.cur, pd = this.pageData(), w = WHO[pd.who] || WHO.NARRATOR;
    $('story-who').textContent = w.name; $('story-who').style.color = w.color; $('story-card').style.borderColor = w.color; $('story-sub').textContent = e.sub || '';
    const pc = $('story-portrait'), pk = pc.getContext('2d'); pk.imageSmoothingEnabled = false; pk.clearRect(0, 0, 32, 32); pk.drawImage(portrait(pd.who), 0, 0); pc.style.borderColor = w.color;
    $('story-choices').innerHTML = ''; clearInterval(this.typing); this.full = pd.t; let i = 0; const el = $('story-text'); el.textContent = '';
    this.typing = setInterval(() => {
      i += 2; el.textContent = pd.t.slice(0, i); if (i % 6 === 0) beep(900 + (i % 5) * 60, 0.012, 'square', 0.012);
      if (i >= pd.t.length) { clearInterval(this.typing); this.typing = null; this.afterTyped(); }
    }, 22);
    const last = this.page >= e.pages.length - 1; $('story-hint').textContent = last && e.choices ? 'CHOOSE' : last ? 'CLICK TO CLOSE' : 'CLICK OR PRESS SPACE';
  },
  afterTyped() {
    const e = this.cur; if (!e || this.page < e.pages.length - 1 || !e.choices || this.choiceShown) return;
    this.choiceShown = true; const box = $('story-choices'); box.innerHTML = '';
    e.choices.forEach(ch => { const b = document.createElement('button'); b.textContent = ch.label; b.onclick = ev => { ev.stopPropagation(); this.choose(ch); }; box.appendChild(b); });
  },
  choose(ch) {
    const fx = ch.fx || {};
    if (fx.rp) { Meta.rp += fx.rp; Meta.save(); }
    if (fx.scrap) { save.bonus.scrap = (save.bonus.scrap || 0) + fx.scrap; }
    if (fx.dim) fac('dimmers').t = Math.min(100, fac('dimmers').t + fx.dim);
    if (fx.support) US.counties.forEach(c => { if (isLit(c)) save.support[c.id] = Math.min(100, (save.support[c.id] || 0) + fx.support); });
    writeSave(); this.cur.choices = null;
    if (ch.reply) { this.cur.pages.push(ch.reply); this.page++; this.showPage(); } else this.finish();
  },
  advance() {
    if (!this.cur) return;
    if (this.typing) { clearInterval(this.typing); this.typing = null; $('story-text').textContent = this.full; this.afterTyped(); return; }
    if (this.cur.choices && this.page >= this.cur.pages.length - 1) return;   // must choose
    this.page++;
    if (this.page >= this.cur.pages.length) this.finish(); else this.showPage();
  },
  finish() { this.mark(this.cur); this.cur = null; cancelAnimationFrame(this.anim); $('story').style.display = 'none'; this.resumeGame(); this.pump(); if (typeof updateStats === 'function') updateStats(); },
  skip() {
    clearInterval(this.typing); this.typing = null;
    if (this.cur) { if (this.cur.choices) { const ch = this.cur.choices[0]; this.choose(ch); this.cur && this.finish(); return; } this.mark(this.cur); }
    this.queue.forEach(e => this.mark(e)); this.queue = []; this.cur = null; cancelAnimationFrame(this.anim); $('story').style.display = 'none'; this.resumeGame();
  },
  // short mission briefing the first time you enter a county
  briefing(c, spec) {
    if (save.briefed[c.id]) return; save.briefed[c.id] = 1; writeSave();
    const who = c.country === 'US' ? (US.states[c.state].ab === 'HI' ? 'KEALOHA' : c.lon > -101 ? 'MARA' : 'BRAM') : c.country === 'CA' ? 'ELOISE' : c.country === 'AK' ? 'NANOOK' : c.country === 'MX' ? 'DIEGO' : c.country === 'CM' ? 'ISABEL' : c.country === 'CB' ? 'RAFAEL' : 'SILA', S = US.states[c.state];
    const BIOME_LINE = {
      desert: 'Heat and dust. Solar will shine here, but sand eats machinery.', forest: 'Dense forest. Every cable run is a long one.', swamp: 'Standing water everywhere. The pumps will love it, the ground will not.',
      plains: 'Open plains and big sky. Wind country.', tundra: 'Frozen ground and a short sun. Everything wears out faster in the cold.', mountain: 'Cliffs and ridges. You will route around more than you build through.', waste: 'Flat and broken.',
    };
    const kinds = spec.districts.map(d => d.kind), bits = [];
    if (kinds.includes('ind')) bits.push('a foundry that might still run'); if (kinds.includes('farm')) bits.push('farmers waiting on irrigation'); if (kinds.includes('med')) bits.push('a clinic with cold storage'); if (kinds.includes('campus')) bits.push('a campus with a working mainframe');
    const coast = (c.water.n + c.water.s + c.water.e + c.water.w) > 0.3 ? ' The coast is close; expect wind and salt.' : '';
    const text = `${c.name} COUNTY, ${S.name}. ${BIOME_LINE[c.biome] || ''}${coast} ${bits.length ? 'Survivors report ' + bits.slice(0, 2).join(' and ') + '.' : ''} ${spec.sites.length ? 'Three dormant plants stand in the hills.' : ''}`.replace(/\s+/g, ' ').trim();
    this.queueBrief = { id: 'brief-' + c.id, who, scene: 'radio', pages: [text], noLog: false, title: c.name + ' COUNTY', mini: false };
    this.showBrief(this.queueBrief);
  },
  showBrief(e) {                                       // the briefing plays over the county without blocking input for long
    this.cur = e; this.page = 0; this.choiceShown = false; this.pauseGame(); $('story').style.display = 'flex'; this.showPage();
    cancelAnimationFrame(this.anim); const loop = t => { drawBackdrop('radio', t / 1000); this.anim = requestAnimationFrame(loop); }; this.anim = requestAnimationFrame(loop);
  },
};
$('story').addEventListener('click', () => Story.advance());
$('story-skip').addEventListener('click', e => { e.stopPropagation(); Story.skip(); });
addEventListener('keydown', e => { if (Story.cur && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); e.stopPropagation(); Story.advance(); } }, true);
