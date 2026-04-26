const container  = document.getElementById("Card_c");
const enemy_c    = document.getElementById("enemy_c");
const hit        = document.getElementById("hit");
const stand      = document.getElementById("stand");
const hide       = document.getElementById("HIDE");

const CardType   = ['spades', 'hearts', 'diamonds', 'clubs'];

let onstand      = false;
let totalWins    = 0;
let totalLosses  = 0;
let pendingRestart = null;

function randomize(array) {
    return Math.floor(Math.random() * array.length);
}

function wait(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}