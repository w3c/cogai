/**
 * Takes a JS module generate by APG from an ABNF grammar and output the
 * equivalent EBNF grammar.
 */

const abnf = new (require('./apg-chunks.js'))();

const ALT = 1;
const CAT = 2;
const REP = 3;
const RNM = 4;
const TRG = 5;
const TBS = 6;
const TLS = 7;

function charFromCode(code) {
  const char = String.fromCharCode(code);
  if (char.match(/\s/)) {
    return '#x' + Number(code).toString(16);
  }
  else if (char.match(/[\u0024-\u005A]|[\u005E-\u007B]|\u007D|\u007E/)) {
    return char;
  }
  else {
    return '#x' + Number(code).toString(16);
  }
}


function strFromCodes(codes) {
  function strFromCode(code) {
    const char = String.fromCharCode(code);
    if (char.match(/\s/)) {
      if (char === ' ') {
        return ' ';
      }
      else {
        return '\\u' + Number(code).toString(16).padStart(4, '0');
      }
    }
    else if (char.match(/[\u0023-\u007E]/)) {
      return char;
    }
    else {
      return '\\u' + Number(code).toString(16).padStart(4, '0');
    }
  }

  if (codes.length === 1) {
    const char = strFromCode(codes[0]);
    if (char[0] === '\\') {
      return '#x' + Number(codes[0]).toString(16);
    }
    else {
      return '"' + char + '"';
    }
  }
  else {
    return '"' + codes.map(strFromCode).join('') + '"';
  }
}


function parseRules(rules) {
  function parseRule(rule) {
    return `${rule.name} ::= ${parseProductionRules(rule)}`;
  }

  function parseProductionRules(rule) {
    return parseOperations(rule.opcodes);
  }

  function parseOperations(ops) {
    function parseOperation(idx) {
      function wrap(str) {
        if (idx === 0) {
          return str;
        }
        else {
          return '(' + str + ')';
        }
      }

      const op = ops[idx];
      switch (op.type) {
        case ALT:
          return wrap(op.children.map(child => parseOperation(child)).join(' | '));

        case CAT:
          return wrap(op.children.map(child => parseOperation(child)).join(' '));

        case REP:
          if ((op.min === 0) && (op.max === Infinity)) {
            return parseOperation(idx + 1) + '*';
          }
          else if ((op.min === 0) && (op.max === 1)) {
            return parseOperation(idx + 1) + '?';
          }
          else if ((op.min === 1) && (op.max === Infinity)) {
            return parseOperation(idx + 1) + '+';
          }
          else if (op.min === op.max) {
            return [...Array(op.min).keys()]
              .map(k => parseOperation(idx + 1)).join(' ');
          }
          else if (op.max === Infinity) {
            throw new Error(`Repetition not supported (min: ${op.min}, max: ${op.max})`);
          }

        case RNM:
          return rules[op.index].name;

        case TRG:
          return '[' + charFromCode(op.min) + '-' + charFromCode(op.max) + ']';

        case TBS:
          return op.string
            .map(code => '#x' + Number(op.string[0]).toString(16))
            .join(' ');

        case TLS:
          return strFromCodes(op.string);

        default:
          throw new Error(`Operation type not supported: ${op.type}`);
      }
    }

    return parseOperation(0);
  }

  return rules.map(rule => parseRule(rule)).join('\n');
}

console.log(parseRules(abnf.rules));