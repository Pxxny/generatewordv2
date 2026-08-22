// BoardSystems.js — 15x15 CSW24 Scrabble board: layout, placement, scoring
(function (global) {
  'use strict';

  const SIZE = 15;

  // Standard Scrabble premium-square layout
  function buildPremiumMap() {
    const map = Array.from({ length: SIZE }, () => Array(SIZE).fill(''));
    const TW = [[0,0],[0,7],[0,14],[7,0],[7,14],[14,0],[14,7],[14,14]];
    const DW = [[1,1],[2,2],[3,3],[4,4],[10,10],[11,11],[12,12],[13,13],
                [1,13],[2,12],[3,11],[4,10],[10,4],[11,3],[12,2],[13,1],[7,7]];
    const TL = [[1,5],[1,9],[5,1],[5,5],[5,9],[5,13],[9,1],[9,5],[9,9],[9,13],[13,5],[13,9]];
    const DL = [[0,3],[0,11],[2,6],[2,8],[3,0],[3,7],[3,14],[6,2],[6,6],[6,8],[6,12],
                [7,3],[7,11],[8,2],[8,6],[8,8],[8,12],[11,0],[11,7],[11,14],[12,6],[12,8],[14,3],[14,11]];
    TW.forEach(([r,c]) => map[r][c] = 'TW');
    DW.forEach(([r,c]) => { if (!map[r][c]) map[r][c] = 'DW'; });
    TL.forEach(([r,c]) => map[r][c] = 'TL');
    DL.forEach(([r,c]) => map[r][c] = 'DL');
    map[7][7] = 'DW'; // center star, counts as DW
    return map;
  }

  const PREMIUM = buildPremiumMap();

  function createEmptyBoard() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    // each cell: null | { letter, blank:boolean }
  }

  function inBounds(r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
  }

  function isCenter(r, c) {
    return r === 7 && c === 7;
  }

  // placements: [{r,c,letter,blank}] — tiles newly placed this turn
  function validatePlacementShape(board, placements) {
    if (placements.length === 0) return { ok: false, reason: 'no_tiles' };
    const rows = new Set(placements.map(p => p.r));
    const cols = new Set(placements.map(p => p.c));
    const sameRow = rows.size === 1;
    const sameCol = cols.size === 1;
    if (!sameRow && !sameCol) return { ok: false, reason: 'not_in_line' };

    const isFirstMove = board.flat().every(cell => cell === null);
    if (isFirstMove) {
      const touchesCenter = placements.some(p => isCenter(p.r, p.c));
      if (!touchesCenter) return { ok: false, reason: 'must_cover_center' };
    } else {
      const touchesExisting = placements.some(p => {
        return [[-1,0],[1,0],[0,-1],[0,1]].some(([dr,dc]) => {
          const rr = p.r + dr, cc = p.c + dc;
          return inBounds(rr, cc) && board[rr][cc];
        }) || boardHasNeighborOnLine(board, placements, p);
      });
      // simpler: at least one placed tile OR the line itself must connect to existing tile
      const anyAdjacency = placements.some(p =>
        [[-1,0],[1,0],[0,-1],[0,1]].some(([dr,dc]) => {
          const rr = p.r + dr, cc = p.c + dc;
          return inBounds(rr, cc) && board[rr][cc];
        })
      );
      if (!anyAdjacency && !fillsGapWithExisting(board, placements, sameRow)) {
        return { ok: false, reason: 'not_connected' };
      }
    }

    // check no gaps within the line (existing tiles can fill gaps)
    if (sameRow) {
      const r = [...rows][0];
      const cs = placements.map(p => p.c).sort((a, b) => a - b);
      for (let c = cs[0]; c <= cs[cs.length - 1]; c++) {
        const placed = placements.find(p => p.c === c);
        if (!placed && !board[r][c]) return { ok: false, reason: 'gap_in_line' };
      }
    } else {
      const c = [...cols][0];
      const rs = placements.map(p => p.r).sort((a, b) => a - b);
      for (let r = rs[0]; r <= rs[rs.length - 1]; r++) {
        const placed = placements.find(p => p.r === r);
        if (!placed && !board[r][c]) return { ok: false, reason: 'gap_in_line' };
      }
    }

    return { ok: true, direction: sameRow ? 'H' : 'V' };
  }

  function fillsGapWithExisting() { return false; }
  function boardHasNeighborOnLine() { return false; }

  // Extracts all words formed by this move (main word + any perpendicular words)
  function collectFormedWords(board, placements, direction) {
    const tempBoard = board.map(row => row.slice());
    placements.forEach(p => { tempBoard[p.r][p.c] = { letter: p.letter, blank: p.blank }; });

    const words = [];

    function extractLine(r, c, dr, dc) {
      let sr = r, sc = c;
      while (inBounds(sr - dr, sc - dc) && tempBoard[sr - dr][sc - dc]) { sr -= dr; sc -= dc; }
      const cells = [];
      let cr = sr, cc = sc;
      while (inBounds(cr, cc) && tempBoard[cr][cc]) { cells.push({ r: cr, c: cc }); cr += dr; cc += dc; }
      return cells;
    }

    // main word
    const [dr, dc] = direction === 'H' ? [0, 1] : [1, 0];
    const anyPlacement = placements[0];
    const mainCells = extractLine(anyPlacement.r, anyPlacement.c, dr, dc);
    if (mainCells.length > 1) words.push({ cells: mainCells, tempBoard });

    // perpendicular words for each newly placed tile
    const [pdr, pdc] = direction === 'H' ? [1, 0] : [0, 1];
    placements.forEach(p => {
      const cells = extractLine(p.r, p.c, pdr, pdc);
      if (cells.length > 1) words.push({ cells, tempBoard });
    });

    return words.map(w => ({
      text: w.cells.map(cell => w.tempBoard[cell.r][cell.c].letter).join(''),
      cells: w.cells
    }));
  }

  function scoreWords(board, placements, formedWords) {
    const newCoords = new Set(placements.map(p => `${p.r},${p.c}`));
    let totalScore = 0;
    const breakdown = [];

    formedWords.forEach(w => {
      let wordMultiplier = 1;
      let wordScore = 0;
      w.cells.forEach(cell => {
        const key = `${cell.r},${cell.c}`;
        const isNew = newCoords.has(key);
        const placement = placements.find(p => p.r === cell.r && p.c === cell.c);
        const letterVal = placement && placement.blank ? 0 : global.RackManage.tileValue(
          placement ? placement.letter : boardLetterAt(board, cell.r, cell.c)
        );
        let letterScore = letterVal;
        if (isNew) {
          const premium = PREMIUM[cell.r][cell.c];
          if (premium === 'DL') letterScore *= 2;
          if (premium === 'TL') letterScore *= 3;
          if (premium === 'DW') wordMultiplier *= 2;
          if (premium === 'TW') wordMultiplier *= 3;
        }
        wordScore += letterScore;
      });
      wordScore *= wordMultiplier;
      totalScore += wordScore;
      breakdown.push({ word: w.text, score: wordScore });
    });

    // Bingo bonus: used all 7 tiles
    if (placements.length === 7) totalScore += 50;

    return { totalScore, breakdown };
  }

  function boardLetterAt(board, r, c) {
    const cell = board[r][c];
    return cell ? cell.letter : '';
  }

  function applyPlacements(board, placements) {
    placements.forEach(p => { board[p.r][p.c] = { letter: p.letter, blank: !!p.blank }; });
  }

  function getPremium(r, c) {
    return PREMIUM[r][c] || '';
  }

  function cloneBoard(board) {
    return board.map(row => row.map(cell => cell ? { ...cell } : null));
  }

  function boardToKey(board) {
    return board.map(row => row.map(c => c ? c.letter : '.').join('')).join('|');
  }

  global.BoardSystems = {
    SIZE,
    PREMIUM,
    createEmptyBoard,
    inBounds,
    isCenter,
    validatePlacementShape,
    collectFormedWords,
    scoreWords,
    applyPlacements,
    getPremium,
    cloneBoard,
    boardToKey
  };
})(window);
