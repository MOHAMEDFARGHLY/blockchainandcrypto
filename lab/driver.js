"use strict";
// required npm install blind-signatures
const blindSignatures = require('blind-signatures');

const { Coin, COIN_RIS_LENGTH, IDENT_STR, BANK_STR } = require('./coin.js');
const utils = require('./utils.js');

// Details about the bank's key.
const BANK_KEY = blindSignatures.keyGeneration({ b: 2048 });
const N = BANK_KEY.keyPair.n.toString();
const E = BANK_KEY.keyPair.e.toString();

/**
 * Function signing the coin on behalf of the bank.
 * 
 * @param blindedCoinHash - the blinded hash of the coin.
 * 
 * @returns the signature of the bank for this coin.
 */
function signCoin(blindedCoinHash) {
  return blindSignatures.sign({
      blinded: blindedCoinHash,
      key: BANK_KEY,
  });
}

/**
 * Parses a string representing a coin, and returns the left/right identity string hashes.
 *
 * @param {string} s - string representation of a coin.
 * 
 * @returns {[[string]]} - two arrays of strings of hashes, committing the owner's identity.
 */
function parseCoin(s) {
  let [cnst, amt, guid, leftHashes, rightHashes] = s.split('-');
  if (cnst !== BANK_STR) {
    throw new Error(`Invalid identity string: ${cnst} received, but ${BANK_STR} expected`);
  }
  let lh = leftHashes.split(',');
  let rh = rightHashes.split(',');
  return [lh, rh];
}

/**
 * Procedure for a merchant accepting a token. The merchant randomly selects
 * the left or right halves of the identity string.
 * 
 * @param {Coin} coin - the coin that a purchaser wants to use.
 * 
 * @returns {[String]} - an array of strings, each holding half of the user's identity.
 */
function acceptCoin(coin) {
  // 1) Verify the signature
  const valid = blindSignatures.verify({
    unblinded: coin.signature,
    N: coin.n,
    E: coin.e,
    message: coin.toString(),
  });

  if (!valid) {
    throw new Error('Coin signature is invalid!');
  }

  // 2) Gather the RIS elements, verifying the hashes
  let [leftHashes, rightHashes] = parseCoin(coin.toString());
  let ris = [];

  for (let i = 0; i < leftHashes.length; i++) {
    const pickLeft = utils.randInt(2) === 0;
    const ident = coin.getRis(pickLeft, i);
    const hash = utils.hash(ident);

    if (pickLeft) {
      if (hash !== leftHashes[i]) {
        throw new Error(`Hash mismatch for left identity at index ${i}`);
      }
    } else {
      if (hash !== rightHashes[i]) {
        throw new Error(`Hash mismatch for right identity at index ${i}`);
      }
    }

    ris.push(ident.toString('hex'));
  }

  return ris;
}

/**
 * If a token has been double-spent, determine who is the cheater
 * and print the result to the screen.
 * 
 * @param guid - Globally unique identifier for coin.
 * @param ris1 - Identity string reported by first merchant.
 * @param ris2 - Identity string reported by second merchant.
 */
function determineCheater(guid, ris1, ris2) {
  for (let i = 0; i < ris1.length; i++) {
    const buf1 = Buffer.from(ris1[i], 'hex');
    const buf2 = Buffer.from(ris2[i], 'hex');

    const xorResult = Buffer.alloc(buf1.length);
    for (let j = 0; j < buf1.length; j++) {
      xorResult[j] = buf1[j] ^ buf2[j];
    }

    const decoded = xorResult.toString();

    if (decoded.startsWith(IDENT_STR)) {
      console.log(`Double-spender detected! Coin ${guid} was double-spent by ${decoded.split(':')[1]}`);
      return;
    }
  }

  console.log(`Merchant cheated for coin ${guid}!`);
}

// =============================
// Example Usage
// =============================

// Create a new coin for 'alice' worth 20 units
let coin = new Coin('alice', 20, N, E);

// Bank signs the coin
coin.signature = signCoin(coin.blinded);

// Coin holder unblinds the signature
coin.unblind();

// Merchant 1 accepts the coin
let ris1 = acceptCoin(coin);

// Merchant 2 accepts the same coin (double-spending simulation)
let ris2 = acceptCoin(coin);

// Bank detects the double-spending and identifies the cheater
determineCheater(coin.guid, ris1, ris2);

// Test case: same RIS twice (should detect merchant cheating)
console.log();
determineCheater(coin.guid, ris1, ris1);
