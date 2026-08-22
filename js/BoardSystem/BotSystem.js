// BotSystem.js — CSW24 bot opponents (Basic ~1200, Medium ~1400, Henry ~1500)
(function (global) {
  'use strict';

  const BS = () => global.BoardSystems;
  const RM = () => global.RackManage;
  const WORDSET = () => global.CSW24_WORDSET; // built lazily, Set per length for O(1) validity checks

  function ensureWordSet() {
    if (global.CSW24_WORDSET) return;
    const byLen = global.CSW24_BY_LENGTH;
    const set = new Set();
    for (const len in byLen) byLen[len].forEach(w => set.add(w));
    global.CSW24_WORDSET = set;
  }

  function isValidWord(word) {
    ensureWordSet();
    return global.CSW24_WORDSET.has(word.toUpperCase());
  }

  // ---- Bot profiles ----
  const PROFILES = {
    basic: {
      label: 'Basic Bot',
      rating: 1200,
      maxWordLenPreference: 6,   // tends to play short, simple words
      bingoChance: 0.15,         // rarely finds/plays bingos, and only "basic" ones
      searchDepth: 40,           // fewer candidate anchors explored
      rackManagementSkill: 0.2,  // poor at keeping good leaves
      mistakeChance: 0.25,       // sometimes skips a better word for a worse one
      thinkTimeMs: [900, 1800]
    },
    medium: {
      label: 'Medium Bot',
      rating: 1400,
      maxWordLenPreference: 8,
      bingoChance: 0.45,
      searchDepth: 90,
      rackManagementSkill: 0.55,
      mistakeChance: 0.12,
      thinkTimeMs: [1200, 2400]
    },
    henry: {
      label: 'Henry',
      rating: 1500,
      maxWordLenPreference: 10,
      bingoChance: 0.65,
      searchDepth: 140,
      rackManagementSkill: 0.7,
      mistakeChance: 0.06,
      thinkTimeMs: [1500, 3000]
    }
  };

  function getProfile(level) {
    return PROFILES[level] || PROFILES.basic;
  }

  // Find all anchor squares (empty cells adjacent to filled cells, or center if empty board)
  function findAnchors(board) {
    const size = BS().SIZE;
    const anchors = [];
    const isEmpty = board.flat().every(c => !c);
    if (isEmpty) return [{ r: 7, c: 7 }];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c]) continue;
        const hasNeighbor = [[-1,0],[1,0],[0,-1],[0,1]].some(([dr,dc]) => {
          const rr = r + dr, cc = c + dc;
          return BS().inBounds(rr, cc) && board[rr][cc];
        });
        if (hasNeighbor) anchors.push({ r, c });
      }
    }
    return anchors;
  }

  // Generate candidate placements: for each anchor, for each direction, try forming words
  // using rack letters combined with existing board letters. Simplified but genuine
  // approach: gather the "through letters" available at anchor lines, then check rack
  // permutation subsets against the dictionary length-buckets.
  function generateCandidates(board, rack, profile) {
    const anchors = findAnchors(board);
    const candidates = [];
    const rackLetters = rack.slice();
    const maxTries = profile.searchDepth;
    let tries = 0;

    for (const anchor of anchors) {
      if (tries >= maxTries) break;
      for (const direction of ['H', 'V']) {
        if (tries >= maxTries) break;
        const result = tryBuildAtAnchor(board, anchor, direction, rackLetters, profile);
        tries++;
        if (result) candidates.push(result);
      }
    }
    return candidates;
  }

  // Attempt to build a word at an anchor: try placing 1..7 rack tiles in the given
  // direction starting at or through the anchor, validating the full word (and
  // any perpendicular cross-words) against the dictionary.
  function tryBuildAtAnchor(board, anchor, direction, rackLetters, profile) {
    const [dr, dc] = direction === 'H' ? [0, 1] : [1, 0];
    const maxLen = Math.min(7, profile.maxWordLenPreference + (Math.random() < 0.2 ? 2 : 0));
    const shuffledRack = RM().shuffle(rackLetters);

    for (let wordLen = Math.min(2, shuffledRack.length); wordLen <= Math.min(maxLen, 7); wordLen++) {
      for (let startOffset = 0; startOffset < wordLen; startOffset++) {
        const startR = anchor.r - dr * startOffset;
        const startC = anchor.c - dc * startOffset;
        if (!BS().inBounds(startR, startC)) continue;

        const placements = [];
        const usedRackIdx = new Set();
        let letters = '';
        let valid = true;
        let touchesAnchor = false;

        for (let i = 0; i < wordLen; i++) {
          const r = startR + dr * i, c = startC + dc * i;
          if (!BS().inBounds(r, c)) { valid = false; break; }
          const existing = board[r][c];
          if (existing) {
            letters += existing.letter;
            if (r === anchor.r && c === anchor.c) touchesAnchor = true;
          } else {
            const idx = shuffledRack.findIndex((l, k) => !usedRackIdx.has(k) && (l === '?' || l !== '?'));
            let chosen = null, chosenIdx = -1;
            for (let k = 0; k < shuffledRack.length; k++) {
              if (usedRackIdx.has(k)) continue;
              chosen = shuffledRack[k]; chosenIdx = k; break;
            }
            if (chosenIdx === -1) { valid = false; break; }
            usedRackIdx.add(chosenIdx);
            const isBlank = chosen === '?';
            const letterToPlace = isBlank ? randomLetterGuess() : chosen;
            letters += letterToPlace;
            placements.push({ r, c, letter: letterToPlace, blank: isBlank });
            if (r === anchor.r && c === anchor.c) touchesAnchor = true;
          }
        }
        if (!valid || placements.length === 0 || !touchesAnchor) continue;
        if (!isValidWord(letters)) continue;

        const shape = BS().validatePlacementShape(board, placements);
        if (!shape.ok) continue;

        const formed = BS().collectFormedWords(board, placements, shape.direction);
        const allValid = formed.every(w => isValidWord(w.text));
        if (!allValid) continue;

        const { totalScore } = BS().scoreWords(board, placements, formed);
        return { placements, direction: shape.direction, score: totalScore, word: letters, formed };
      }
    }
    return null;
  }

  function randomLetterGuess() {
    const common = 'ETAOINSHRDLU';
    return common[Math.floor(Math.random() * common.length)];
  }

  // Pick the bot's move given candidates, per profile skill (mistakes, bingo bias)
  function chooseMove(candidates, profile) {
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.score - a.score);

    const bingos = candidates.filter(c => c.placements.length === 7);
    const nonBingos = candidates.filter(c => c.placements.length < 7);

    let pool = candidates;
    if (bingos.length > 0 && Math.random() < profile.bingoChance) {
      pool = bingos;
    } else if (nonBingos.length > 0) {
      pool = nonBingos;
    }

    // Simulate imperfect rack management / occasional mistakes: sometimes pick
    // a suboptimal move from the top-N instead of the very best.
    const topN = Math.max(1, Math.round(pool.length * (1 - profile.rackManagementSkill)));
    const consideredPool = pool.slice(0, Math.min(pool.length, Math.max(topN, 3)));

    if (Math.random() < profile.mistakeChance && consideredPool.length > 1) {
      const idx = 1 + Math.floor(Math.random() * (consideredPool.length - 1));
      return consideredPool[idx];
    }
    return consideredPool[0];
  }

  // Public: given board+rack+level, return a Promise resolving to a chosen move
  // (or null meaning "pass/exchange"), after a simulated "thinking" delay.
  function decideMove(board, rack, level) {
    const profile = getProfile(level);
    return new Promise(resolve => {
      const candidates = generateCandidates(board, rack, profile);
      const move = chooseMove(candidates, profile);
      const [minT, maxT] = profile.thinkTimeMs;
      const delay = minT + Math.random() * (maxT - minT);
      setTimeout(() => resolve(move), delay);
    });
  }

  // Bot self-scoring for manual-count mode: bot "counts" its own move the same way
  function botSelfScore(board, placements, direction) {
    const formed = BS().collectFormedWords(board, placements, direction);
    return BS().scoreWords(board, placements, formed);
  }

  global.BotSystem = {
    PROFILES,
    getProfile,
    decideMove,
    botSelfScore,
    isValidWord,
    findAnchors
  };
})(window);
