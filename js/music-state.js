// VARIABEL GLOBAL PUSAT
let player;
let currentVideoId = '';
let isPlaying = false;
let progressInterval;
let playHistory = [];
let historyIndex = -1;
let parsedLyrics = [];
let currentLyricIndex = -1;
let allPlaylists = {}; 
let currentManagingPlaylist = ''; 

const playIconSvg = '▶';
const pauseIconSvg = '⏸';
const searchHistoryKey = 'ais_search_history';
