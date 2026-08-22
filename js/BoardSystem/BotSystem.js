// BotSystem.js — CSW24 bot opponents (Basic ~1200, Medium ~1400, Henry ~1500)
(function (global) {
  'use strict';

  const BS = () => global.BoardSystems;
  const RM = () => global.RackManage;
  const WORDSET = () => global.CSW24_WORDSET; // built lazily, Set per length for O(1) validity checks

  function ensureWordSet() {
    // Guard against being called before words-data.js has finished loading/parsing
    // (e.g. race condition, cached stale script, or a prior JS error on the page).
    // If CSW24_BY_LENGTH isn't ready yet, don't cache an empty/partial set.
    if (global.CSW24_WORDSET && global.CSW24_WORDSET.size > 0) return;
    const byLen = global.CSW24_BY_LENGTH;
    if (!byLen || typeof byLen !== 'object' || Object.keys(byLen).length === 0) {
      console.error('[BotSystem] CSW24_BY_LENGTH is missing/empty — words-data.js did not load correctly.');
      global.CSW24_WORDSET = new Set(); // temporary empty set; will retry next call
      return;
    }
    const set = new Set();
    for (const len in byLen) byLen[len].forEach(w => set.add(w.toUpperCase()));
    global.CSW24_WORDSET = set;
  }

  function isValidWord(word) {
    ensureWordSet();
    if (!word) return false;
    return global.CSW24_WORDSET.has(String(word).trim().toUpperCase());
  }

  // "Simple/everyday word" filter for Basic Bot: avoids obscure short combos
  // and rare letters (J,Q,X,Z) so Basic plays words a beginner would actually
  // know, rather than obscure valid Scrabble words. Roughly approximates
  // word frequency without needing real frequency data: prefers words built
  // only from common letters and without unusual repeated-letter patterns.
  // NOTE: kept intentionally loose (word length + rare-letter check only) —
  // being too strict here was the single biggest cause of Basic Bot passing:
  // it would fail to find ANY word for its rack and fall back to Pass. If this
  // filter ever gets tightened again, make sure decideMove's fallback ladder
  // below still has real words to widen into.
  const RARE_LETTERS = /[JQXZ]/;
  function isSimpleWord(word) {
    if (word.length < 2 || word.length > 7) return false;
    if (RARE_LETTERS.test(word)) return false;
    return true;
  }

  let simpleWordSetCache = null;
  function ensureSimpleWordSet() {
    if (simpleWordSetCache) return simpleWordSetCache;
    ensureWordSet();
    simpleWordSetCache = new Set();
    for (const w of global.CSW24_WORDSET) {
      if (isSimpleWord(w)) simpleWordSetCache.add(w);
    }
    return simpleWordSetCache;
  }

  // Word pool a given bot profile should draw candidate words from.
  function wordPoolForProfile(profile, wordLen) {
    const all = global.CSW24_BY_LENGTH[wordLen] || [];
    if (!profile.simpleWordsOnly) return all;
    const simpleSet = ensureSimpleWordSet();
    return all.filter(w => simpleSet.has(w));
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
  // searchDepth also drives maxExplore (searchDepth * EXPLORE_MULT) in
  // generateCandidates — raised across the board so a real placement isn't
  // missed just because the exploration budget ran out first (this used to
  // be the main reason bots passed with legal moves still on the board).
  const PROFILES = {
    basic: {
      label: 'Basic Bot',
      rating: 1200,
      maxWordLenPreference: 7,   // everyday words, 2-7 letters
      simpleWordsOnly: true,     // avoid obscure words / rare letters (J,Q,X,Z)
      bingoChance: 0.10,         // rarely finds/plays bingos
      searchDepth: 120,
      rackManagementSkill: 0.2,  // poor at keeping good leaves
      mistakeChance: 0.25,       // sometimes skips a better word for a worse one
      thinkTimeMs: [4000, 10000],
      thinkTimeCapMs: 10000
    },
    medium: {
      label: 'Medium Bot',
      rating: 1400,
      maxWordLenPreference: 9,
      simpleWordsOnly: false,    // uses specialty words, including J/Q/X/Z
      bingoChance: 0.55,         // actively hunts high-probability bingos
      searchDepth: 180,
      rackManagementSkill: 0.55,
      mistakeChance: 0.10,
      thinkTimeMs: [2000, 11000],
      thinkTimeCapMs: 11000
    },
    henry: {
      label: 'Henry',
      rating: 1500,
      maxWordLenPreference: 10,
      simpleWordsOnly: false,    // same vocabulary range as Medium, but plays it better
      bingoChance: 0.7,
      searchDepth: 250,
      rackManagementSkill: 0.8,
      mistakeChance: 0.04,
      thinkTimeMs: [5000, 9000],
      thinkTimeCapMs: 9000
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
  // opts.forceFullPool: ignore profile.simpleWordsOnly for this search (used by
  // decideMove's fallback ladder so a bot never passes just because its
  // "personality" vocabulary filter happened to have no match, when a legal
  // move existed in the full dictionary).
  // opts.candidateCap: override profile.searchDepth as the stop-early cap.
  function generateCandidates(board, rack, profile, genStart, capMs, opts) {
    opts = opts || {};
    ensureWordSet();
    const anchors = findAnchors(board);
    const candidates = [];
    const rackCounts = rackToCounts(rack);
    const maxLen = Math.min(7, profile.maxWordLenPreference);
    const effectiveProfile = opts.forceFullPool ? Object.assign({}, profile, { simpleWordsOnly: false }) : profile;
    const candidateCap = opts.candidateCap || profile.searchDepth;
    let explored = 0;
    const maxExplore = Math.max(profile.searchDepth, candidateCap) * 20; // overall budget so it stays fast
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    // Leave headroom for the promised "thinking" delay: cap actual search work
    // at 80% of the profile's max think time so we never blow past it.
    const deadline = genStart !== undefined && capMs ? genStart + capMs * 0.8 : null;

    outer:
    for (const anchor of anchors) {
      for (const direction of ['H', 'V']) {
        const [dr, dc] = direction === 'H' ? [0, 1] : [1, 0];
        for (let wordLen = 2; wordLen <= maxLen; wordLen++) {
          if (deadline && (explored % 200 === 0) && now() > deadline) break outer;
          const wordsOfLen = wordPoolForProfile(effectiveProfile, wordLen);
          if (!wordsOfLen || wordsOfLen.length === 0) continue;
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
              if (candidates.length >= candidateCap) break outer;
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
  // opts.skipThinkDelay: if true, resolves immediately (no artificial delay) —
  // used when the player chooses not to wait for the bot's "thinking" animation.
  // Move generation itself is always bounded by profile.thinkTimeCapMs so the
  // bot can never actually take longer than its stated max thinking time,
  // regardless of board complexity.
  function decideMove(board, rack, level, opts) {
    const profile = getProfile(level);
    opts = opts || {};
    const cap = profile.thinkTimeCapMs || 10000;

    return new Promise(resolve => {
      const genStart = (typeof performance !== 'undefined' ? performance.now() : Date.now());

      // Fallback ladder: only pass when there is truly no legal placement
      // anywhere in the full dictionary, not just within this bot's
      // "personality" preferences (word length / simple-words filter /
      // exploration budget). Each rung below widens the search rather than
      // giving up, so Pass becomes a genuine last resort instead of a
      // frequent outcome caused by a bot's own vocabulary restrictions.
      let candidates = generateCandidates(board, rack, profile, genStart, cap);

      if (candidates.length === 0 && profile.simpleWordsOnly) {
        // Rung 1: same profile, but ignore the simple-word vocabulary filter.
        candidates = generateCandidates(board, rack, profile, genStart, cap, { forceFullPool: true });
      }

      if (candidates.length === 0) {
        // Rung 2: also relax the search-depth cap so a longer scan can run
        // (still bounded by the think-time deadline inside generateCandidates).
        candidates = generateCandidates(board, rack, profile, genStart, cap, {
          forceFullPool: true,
          candidateCap: Math.max(profile.searchDepth * 3, 300)
        });
      }

      const move = chooseMove(candidates, profile);

      if (opts.skipThinkDelay) {
        resolve(move);
        return;
      }
      const [minT, maxT] = profile.thinkTimeMs;
      const randomDelay = minT + Math.random() * (maxT - minT);
      const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - genStart;
      // Total time (generation + wait) never exceeds the profile's cap.
      const remainingDelay = Math.max(0, Math.min(randomDelay, cap - elapsed));
      setTimeout(() => resolve(move), remainingDelay);
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
