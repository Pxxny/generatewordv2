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

  // Rack-letter-count helper: does `rackCounts` (map letter->count, '?' = blanks)
  // contain enough letters to spell `word`, given some fixed letters already on
  // the board at certain positions within the word? Returns the list of rack
  // letters (in order, '?' entries flagged) needed, or null if impossible.
  function canFormWord(word, rackCounts, fixedLetters) {
    const counts = Object.assign({}, rackCounts);
    const used = [];
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      if (fixedLetters[i] !== undefined) {
        if (fixedLetters[i] !== ch) return null; // conflicts with existing board letter
        continue; // letter already on board, doesn't consume rack
      }
      if (counts[ch] > 0) {
        counts[ch]--;
        used.push({ letter: ch, blank: false });
      } else if (counts['?'] > 0) {
        counts['?']--;
        used.push({ letter: ch, blank: true });
      } else {
        return null;
      }
    }
    return used;
  }

  function rackToCounts(rack) {
    const counts = {};
    rack.forEach(l => { counts[l] = (counts[l] || 0) + 1; });
    return counts;
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

  // Generate candidate placements: for each anchor, for each direction, for each word
  // length up to the rack size, scan real dictionary words of that length and check
  // whether the rack (plus letters already fixed on the board along that line) can
  // actually spell them. This replaces the old "shuffle rack and hope it happens to
  // spell a word left-to-right" approach, which is why the bot used to pass so often.
  function generateCandidates(board, rack, profile) {
    ensureWordSet();
    const anchors = findAnchors(board);
    const candidates = [];
    const rackCounts = rackToCounts(rack);
    const maxLen = Math.min(7, profile.maxWordLenPreference + 2);
    let explored = 0;
    const maxExplore = profile.searchDepth * 20; // overall budget so it stays fast

    outer:
    for (const anchor of anchors) {
      for (const direction of ['H', 'V']) {
        const [dr, dc] = direction === 'H' ? [0, 1] : [1, 0];
        for (let wordLen = 2; wordLen <= maxLen; wordLen++) {
          const wordsOfLen = global.CSW24_BY_LENGTH[wordLen];
          if (!wordsOfLen) continue;
          for (let startOffset = 0; startOffset < wordLen; startOffset++) {
            const startR = anchor.r - dr * startOffset;
            const startC = anchor.c - dc * startOffset;
            if (!BS().inBounds(startR, startC)) continue;
            const endR = startR + dr * (wordLen - 1);
            const endC = startC + dc * (wordLen - 1);
            if (!BS().inBounds(endR, endC)) continue;

            // Build the "fixed letters" pattern from the board along this line,
            // and confirm it actually touches the anchor cell.
            const fixedLetters = {};
            let touchesAnchor = false;
            let newTileCount = 0;
            let validLine = true;
            for (let i = 0; i < wordLen; i++) {
              const r = startR + dr * i, c = startC + dc * i;
              const cell = board[r][c];
              if (cell) {
                fixedLetters[i] = cell.letter;
                if (r === anchor.r && c === anchor.c) touchesAnchor = true;
              } else {
                newTileCount++;
                if (r === anchor.r && c === anchor.c) touchesAnchor = true;
              }
            }
            if (!validLine || !touchesAnchor || newTileCount === 0 || newTileCount > rack.length) continue;
            // Skip if the cell right before/after the word is occupied (would merge into a longer word we're not accounting for)
            const beforeR = startR - dr, beforeC = startC - dc;
            const afterR = endR + dr, afterC = endC + dc;
            if (BS().inBounds(beforeR, beforeC) && board[beforeR][beforeC]) continue;
            if (BS().inBounds(afterR, afterC) && board[afterR][afterC]) continue;

            // Try candidate words of this length that match the fixed-letter pattern.
            let attemptsHere = 0;
            const attemptCap = 25;
            for (const candidateWord of wordsOfLen) {
              if (explored++ > maxExplore) break outer;
              if (attemptsHere++ > attemptCap) break;
              const used = canFormWord(candidateWord, rackCounts, fixedLetters);
              if (!used) continue;

              const placements = [];
              let uIdx = 0;
              for (let i = 0; i < wordLen; i++) {
                if (fixedLetters[i] !== undefined) continue;
                const r = startR + dr * i, c = startC + dc * i;
                const u = used[uIdx++];
                placements.push({ r, c, letter: u.letter, blank: u.blank });
              }
              if (placements.length === 0) continue;

              const shape = BS().validatePlacementShape(board, placements);
              if (!shape.ok) continue;

              const formed = BS().collectFormedWords(board, placements, shape.direction);
              const allValid = formed.every(w => isValidWord(w.text));
              if (!allValid) continue;

              const { totalScore } = BS().scoreWords(board, placements, formed);
              candidates.push({ placements, direction: shape.direction, score: totalScore, word: candidateWord, formed });

              // Basic bot / medium bot: stop after finding a handful of options per slot
              // to keep them from being unrealistically exhaustive; Henry explores more.
              if (candidates.length >= profile.searchDepth) break outer;
            }
          }
        }
      }
    }
    return candidates;
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
    findAnchors,
    ensureWordSet
  };
})(window);
