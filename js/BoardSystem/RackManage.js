// RackManage.js — CSW24 tile bag & rack system (real tournament distribution)
(function (global) {
  'use strict';

  // Official Scrabble (English) tile distribution — 100 tiles incl. 2 blanks
  const TILE_DISTRIBUTION = {
    A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1,
    K: 1, L: 4, M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6,
    U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1, '?': 2
  };

  const TILE_VALUES = {
    A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8,
    K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1,
    U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10, '?': 0
  };

  function createBag() {
    const bag = [];
    for (const letter in TILE_DISTRIBUTION) {
      for (let i = 0; i < TILE_DISTRIBUTION[letter]; i++) bag.push(letter);
    }
    return shuffle(bag);
  }

  // Fisher-Yates — real fair shuffle, every tile has equal chance each draw
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function drawTiles(bag, count) {
    const drawn = [];
    for (let i = 0; i < count && bag.length > 0; i++) {
      drawn.push(bag.pop());
    }
    return drawn;
  }

  function returnTiles(bag, tiles) {
    for (const t of tiles) bag.push(t);
    // reshuffle in place so returned tiles mix back randomly
    const shuffled = shuffle(bag);
    bag.length = 0;
    for (const t of shuffled) bag.push(t);
  }

  function tileValue(letter) {
    return TILE_VALUES[letter] || 0;
  }

  function bagCount(bag) {
    return bag.length;
  }

  global.RackManage = {
    TILE_DISTRIBUTION,
    TILE_VALUES,
    createBag,
    shuffle,
    drawTiles,
    returnTiles,
    tileValue,
    bagCount
  };
})(window);
