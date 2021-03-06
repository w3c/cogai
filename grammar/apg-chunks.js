// Generated by JavaScript APG, Version [`apg-js2`](https://github.com/ldthomas/apg-js2)
module.exports = function(){
"use strict";
  //```
  // SUMMARY
  //      rules = 40
  //       udts = 0
  //    opcodes = 231
  //        ---   ABNF original opcodes
  //        ALT = 16
  //        CAT = 35
  //        REP = 39
  //        RNM = 85
  //        TLS = 30
  //        TBS = 19
  //        TRG = 7
  //        ---   SABNF superset opcodes
  //        UDT = 0
  //        AND = 0
  //        NOT = 0
  //        BKA = 0
  //        BKN = 0
  //        BKR = 0
  //        ABG = 0
  //        AEN = 0
  // characters = [9 - 1114111]
  //```
  /* OBJECT IDENTIFIER (for internal parser use) */
  this.grammarObject = 'grammarObject';

  /* RULES */
  this.rules = [];
  this.rules[0] = {name: 'chunksDoc', lower: 'chunksdoc', index: 0, isBkr: false};
  this.rules[1] = {name: 'statements', lower: 'statements', index: 1, isBkr: false};
  this.rules[2] = {name: 'comment', lower: 'comment', index: 2, isBkr: false};
  this.rules[3] = {name: 'chunk', lower: 'chunk', index: 3, isBkr: false};
  this.rules[4] = {name: 'compact-rule', lower: 'compact-rule', index: 4, isBkr: false};
  this.rules[5] = {name: 'compact-link', lower: 'compact-link', index: 5, isBkr: false};
  this.rules[6] = {name: 'type', lower: 'type', index: 6, isBkr: false};
  this.rules[7] = {name: 'id', lower: 'id', index: 7, isBkr: false};
  this.rules[8] = {name: 'properties', lower: 'properties', index: 8, isBkr: false};
  this.rules[9] = {name: 'property', lower: 'property', index: 9, isBkr: false};
  this.rules[10] = {name: 'property-name', lower: 'property-name', index: 10, isBkr: false};
  this.rules[11] = {name: 'property-value', lower: 'property-value', index: 11, isBkr: false};
  this.rules[12] = {name: 'name', lower: 'name', index: 12, isBkr: false};
  this.rules[13] = {name: 'reserved-name', lower: 'reserved-name', index: 13, isBkr: false};
  this.rules[14] = {name: 'negated', lower: 'negated', index: 14, isBkr: false};
  this.rules[15] = {name: 'variable', lower: 'variable', index: 15, isBkr: false};
  this.rules[16] = {name: 'inner-name', lower: 'inner-name', index: 16, isBkr: false};
  this.rules[17] = {name: 'value', lower: 'value', index: 17, isBkr: false};
  this.rules[18] = {name: 'number', lower: 'number', index: 18, isBkr: false};
  this.rules[19] = {name: 'decimal-point', lower: 'decimal-point', index: 19, isBkr: false};
  this.rules[20] = {name: 'digit1-9', lower: 'digit1-9', index: 20, isBkr: false};
  this.rules[21] = {name: 'e', lower: 'e', index: 21, isBkr: false};
  this.rules[22] = {name: 'exp', lower: 'exp', index: 22, isBkr: false};
  this.rules[23] = {name: 'frac', lower: 'frac', index: 23, isBkr: false};
  this.rules[24] = {name: 'int', lower: 'int', index: 24, isBkr: false};
  this.rules[25] = {name: 'minus', lower: 'minus', index: 25, isBkr: false};
  this.rules[26] = {name: 'plus', lower: 'plus', index: 26, isBkr: false};
  this.rules[27] = {name: 'zero', lower: 'zero', index: 27, isBkr: false};
  this.rules[28] = {name: 'string', lower: 'string', index: 28, isBkr: false};
  this.rules[29] = {name: 'char', lower: 'char', index: 29, isBkr: false};
  this.rules[30] = {name: 'escape', lower: 'escape', index: 30, isBkr: false};
  this.rules[31] = {name: 'quotation-mark', lower: 'quotation-mark', index: 31, isBkr: false};
  this.rules[32] = {name: 'unescaped', lower: 'unescaped', index: 32, isBkr: false};
  this.rules[33] = {name: 'ws', lower: 'ws', index: 33, isBkr: false};
  this.rules[34] = {name: 'sep', lower: 'sep', index: 34, isBkr: false};
  this.rules[35] = {name: 'begin-properties', lower: 'begin-properties', index: 35, isBkr: false};
  this.rules[36] = {name: 'end-properties', lower: 'end-properties', index: 36, isBkr: false};
  this.rules[37] = {name: 'ALPHA', lower: 'alpha', index: 37, isBkr: false};
  this.rules[38] = {name: 'DIGIT', lower: 'digit', index: 38, isBkr: false};
  this.rules[39] = {name: 'HEXDIG', lower: 'hexdig', index: 39, isBkr: false};

  /* UDTS */
  this.udts = [];

  /* OPCODES */
  /* chunksDoc */
  this.rules[0].opcodes = [];
  this.rules[0].opcodes[0] = {type: 2, children: [1,3,5]};// CAT
  this.rules[0].opcodes[1] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[0].opcodes[2] = {type: 4, index: 33};// RNM(ws)
  this.rules[0].opcodes[3] = {type: 3, min: 0, max: 1};// REP
  this.rules[0].opcodes[4] = {type: 4, index: 1};// RNM(statements)
  this.rules[0].opcodes[5] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[0].opcodes[6] = {type: 4, index: 33};// RNM(ws)

  /* statements */
  this.rules[1].opcodes = [];
  this.rules[1].opcodes[0] = {type: 2, children: [1,3]};// CAT
  this.rules[1].opcodes[1] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[1].opcodes[2] = {type: 4, index: 33};// RNM(ws)
  this.rules[1].opcodes[3] = {type: 1, children: [4,10,14,18]};// ALT
  this.rules[1].opcodes[4] = {type: 2, children: [5,6]};// CAT
  this.rules[1].opcodes[5] = {type: 4, index: 2};// RNM(comment)
  this.rules[1].opcodes[6] = {type: 3, min: 0, max: 1};// REP
  this.rules[1].opcodes[7] = {type: 2, children: [8,9]};// CAT
  this.rules[1].opcodes[8] = {type: 6, string: [10]};// TBS
  this.rules[1].opcodes[9] = {type: 4, index: 1};// RNM(statements)
  this.rules[1].opcodes[10] = {type: 2, children: [11,12]};// CAT
  this.rules[1].opcodes[11] = {type: 4, index: 3};// RNM(chunk)
  this.rules[1].opcodes[12] = {type: 3, min: 0, max: 1};// REP
  this.rules[1].opcodes[13] = {type: 4, index: 1};// RNM(statements)
  this.rules[1].opcodes[14] = {type: 2, children: [15,16]};// CAT
  this.rules[1].opcodes[15] = {type: 4, index: 4};// RNM(compact-rule)
  this.rules[1].opcodes[16] = {type: 3, min: 0, max: 1};// REP
  this.rules[1].opcodes[17] = {type: 4, index: 1};// RNM(statements)
  this.rules[1].opcodes[18] = {type: 2, children: [19,20]};// CAT
  this.rules[1].opcodes[19] = {type: 4, index: 5};// RNM(compact-link)
  this.rules[1].opcodes[20] = {type: 3, min: 0, max: 1};// REP
  this.rules[1].opcodes[21] = {type: 2, children: [22,23]};// CAT
  this.rules[1].opcodes[22] = {type: 4, index: 33};// RNM(ws)
  this.rules[1].opcodes[23] = {type: 4, index: 1};// RNM(statements)

  /* comment */
  this.rules[2].opcodes = [];
  this.rules[2].opcodes[0] = {type: 2, children: [1,2]};// CAT
  this.rules[2].opcodes[1] = {type: 7, string: [35]};// TLS
  this.rules[2].opcodes[2] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[2].opcodes[3] = {type: 4, index: 29};// RNM(char)

  /* chunk */
  this.rules[3].opcodes = [];
  this.rules[3].opcodes[0] = {type: 2, children: [1,2,6,7,9]};// CAT
  this.rules[3].opcodes[1] = {type: 4, index: 6};// RNM(type)
  this.rules[3].opcodes[2] = {type: 3, min: 0, max: 1};// REP
  this.rules[3].opcodes[3] = {type: 2, children: [4,5]};// CAT
  this.rules[3].opcodes[4] = {type: 4, index: 33};// RNM(ws)
  this.rules[3].opcodes[5] = {type: 4, index: 7};// RNM(id)
  this.rules[3].opcodes[6] = {type: 4, index: 35};// RNM(begin-properties)
  this.rules[3].opcodes[7] = {type: 3, min: 0, max: 1};// REP
  this.rules[3].opcodes[8] = {type: 4, index: 8};// RNM(properties)
  this.rules[3].opcodes[9] = {type: 4, index: 36};// RNM(end-properties)

  /* compact-rule */
  this.rules[4].opcodes = [];
  this.rules[4].opcodes[0] = {type: 2, children: [1,3,4,5,6]};// CAT
  this.rules[4].opcodes[1] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[4].opcodes[2] = {type: 7, string: [33]};// TLS
  this.rules[4].opcodes[3] = {type: 4, index: 3};// RNM(chunk)
  this.rules[4].opcodes[4] = {type: 7, string: [61,62]};// TLS
  this.rules[4].opcodes[5] = {type: 4, index: 3};// RNM(chunk)
  this.rules[4].opcodes[6] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[4].opcodes[7] = {type: 2, children: [8,9]};// CAT
  this.rules[4].opcodes[8] = {type: 7, string: [44]};// TLS
  this.rules[4].opcodes[9] = {type: 4, index: 3};// RNM(chunk)

  /* compact-link */
  this.rules[5].opcodes = [];
  this.rules[5].opcodes[0] = {type: 2, children: [1,2,3,4,5]};// CAT
  this.rules[5].opcodes[1] = {type: 4, index: 7};// RNM(id)
  this.rules[5].opcodes[2] = {type: 4, index: 33};// RNM(ws)
  this.rules[5].opcodes[3] = {type: 4, index: 10};// RNM(property-name)
  this.rules[5].opcodes[4] = {type: 4, index: 33};// RNM(ws)
  this.rules[5].opcodes[5] = {type: 4, index: 7};// RNM(id)

  /* type */
  this.rules[6].opcodes = [];
  this.rules[6].opcodes[0] = {type: 2, children: [1,3]};// CAT
  this.rules[6].opcodes[1] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[6].opcodes[2] = {type: 4, index: 33};// RNM(ws)
  this.rules[6].opcodes[3] = {type: 1, children: [4,5]};// ALT
  this.rules[6].opcodes[4] = {type: 7, string: [42]};// TLS
  this.rules[6].opcodes[5] = {type: 4, index: 12};// RNM(name)

  /* id */
  this.rules[7].opcodes = [];
  this.rules[7].opcodes[0] = {type: 4, index: 12};// RNM(name)

  /* properties */
  this.rules[8].opcodes = [];
  this.rules[8].opcodes[0] = {type: 2, children: [1,2]};// CAT
  this.rules[8].opcodes[1] = {type: 4, index: 9};// RNM(property)
  this.rules[8].opcodes[2] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[8].opcodes[3] = {type: 2, children: [4,5]};// CAT
  this.rules[8].opcodes[4] = {type: 4, index: 34};// RNM(sep)
  this.rules[8].opcodes[5] = {type: 4, index: 9};// RNM(property)

  /* property */
  this.rules[9].opcodes = [];
  this.rules[9].opcodes[0] = {type: 2, children: [1,2,3]};// CAT
  this.rules[9].opcodes[1] = {type: 4, index: 10};// RNM(property-name)
  this.rules[9].opcodes[2] = {type: 4, index: 33};// RNM(ws)
  this.rules[9].opcodes[3] = {type: 4, index: 11};// RNM(property-value)

  /* property-name */
  this.rules[10].opcodes = [];
  this.rules[10].opcodes[0] = {type: 1, children: [1,2]};// ALT
  this.rules[10].opcodes[1] = {type: 4, index: 12};// RNM(name)
  this.rules[10].opcodes[2] = {type: 4, index: 13};// RNM(reserved-name)

  /* property-value */
  this.rules[11].opcodes = [];
  this.rules[11].opcodes[0] = {type: 2, children: [1,2]};// CAT
  this.rules[11].opcodes[1] = {type: 4, index: 17};// RNM(value)
  this.rules[11].opcodes[2] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[11].opcodes[3] = {type: 2, children: [4,5]};// CAT
  this.rules[11].opcodes[4] = {type: 7, string: [44]};// TLS
  this.rules[11].opcodes[5] = {type: 4, index: 17};// RNM(value)

  /* name */
  this.rules[12].opcodes = [];
  this.rules[12].opcodes[0] = {type: 2, children: [1,3,4]};// CAT
  this.rules[12].opcodes[1] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[12].opcodes[2] = {type: 4, index: 33};// RNM(ws)
  this.rules[12].opcodes[3] = {type: 4, index: 16};// RNM(inner-name)
  this.rules[12].opcodes[4] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[12].opcodes[5] = {type: 4, index: 33};// RNM(ws)

  /* reserved-name */
  this.rules[13].opcodes = [];
  this.rules[13].opcodes[0] = {type: 2, children: [1,3,4,5]};// CAT
  this.rules[13].opcodes[1] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[13].opcodes[2] = {type: 4, index: 33};// RNM(ws)
  this.rules[13].opcodes[3] = {type: 7, string: [64]};// TLS
  this.rules[13].opcodes[4] = {type: 4, index: 16};// RNM(inner-name)
  this.rules[13].opcodes[5] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[13].opcodes[6] = {type: 4, index: 33};// RNM(ws)

  /* negated */
  this.rules[14].opcodes = [];
  this.rules[14].opcodes[0] = {type: 2, children: [1,2]};// CAT
  this.rules[14].opcodes[1] = {type: 7, string: [33]};// TLS
  this.rules[14].opcodes[2] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[14].opcodes[3] = {type: 1, children: [4,5]};// ALT
  this.rules[14].opcodes[4] = {type: 4, index: 16};// RNM(inner-name)
  this.rules[14].opcodes[5] = {type: 4, index: 15};// RNM(variable)

  /* variable */
  this.rules[15].opcodes = [];
  this.rules[15].opcodes[0] = {type: 2, children: [1,2]};// CAT
  this.rules[15].opcodes[1] = {type: 7, string: [63]};// TLS
  this.rules[15].opcodes[2] = {type: 4, index: 16};// RNM(inner-name)

  /* inner-name */
  this.rules[16].opcodes = [];
  this.rules[16].opcodes[0] = {type: 3, min: 1, max: Infinity};// REP
  this.rules[16].opcodes[1] = {type: 1, children: [2,3,4,5,6,7,8]};// ALT
  this.rules[16].opcodes[2] = {type: 4, index: 37};// RNM(ALPHA)
  this.rules[16].opcodes[3] = {type: 4, index: 38};// RNM(DIGIT)
  this.rules[16].opcodes[4] = {type: 7, string: [46]};// TLS
  this.rules[16].opcodes[5] = {type: 7, string: [95]};// TLS
  this.rules[16].opcodes[6] = {type: 7, string: [45]};// TLS
  this.rules[16].opcodes[7] = {type: 7, string: [47]};// TLS
  this.rules[16].opcodes[8] = {type: 7, string: [58]};// TLS

  /* value */
  this.rules[17].opcodes = [];
  this.rules[17].opcodes[0] = {type: 2, children: [1,3,12]};// CAT
  this.rules[17].opcodes[1] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[17].opcodes[2] = {type: 4, index: 33};// RNM(ws)
  this.rules[17].opcodes[3] = {type: 1, children: [4,5,6,7,8,9,10,11]};// ALT
  this.rules[17].opcodes[4] = {type: 7, string: [42]};// TLS
  this.rules[17].opcodes[5] = {type: 7, string: [102,97,108,115,101]};// TLS
  this.rules[17].opcodes[6] = {type: 7, string: [116,114,117,101]};// TLS
  this.rules[17].opcodes[7] = {type: 4, index: 16};// RNM(inner-name)
  this.rules[17].opcodes[8] = {type: 4, index: 15};// RNM(variable)
  this.rules[17].opcodes[9] = {type: 4, index: 14};// RNM(negated)
  this.rules[17].opcodes[10] = {type: 4, index: 18};// RNM(number)
  this.rules[17].opcodes[11] = {type: 4, index: 28};// RNM(string)
  this.rules[17].opcodes[12] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[17].opcodes[13] = {type: 4, index: 33};// RNM(ws)

  /* number */
  this.rules[18].opcodes = [];
  this.rules[18].opcodes[0] = {type: 2, children: [1,3,4,6]};// CAT
  this.rules[18].opcodes[1] = {type: 3, min: 0, max: 1};// REP
  this.rules[18].opcodes[2] = {type: 4, index: 25};// RNM(minus)
  this.rules[18].opcodes[3] = {type: 4, index: 24};// RNM(int)
  this.rules[18].opcodes[4] = {type: 3, min: 0, max: 1};// REP
  this.rules[18].opcodes[5] = {type: 4, index: 23};// RNM(frac)
  this.rules[18].opcodes[6] = {type: 3, min: 0, max: 1};// REP
  this.rules[18].opcodes[7] = {type: 4, index: 22};// RNM(exp)

  /* decimal-point */
  this.rules[19].opcodes = [];
  this.rules[19].opcodes[0] = {type: 7, string: [46]};// TLS

  /* digit1-9 */
  this.rules[20].opcodes = [];
  this.rules[20].opcodes[0] = {type: 5, min: 49, max: 57};// TRG

  /* e */
  this.rules[21].opcodes = [];
  this.rules[21].opcodes[0] = {type: 1, children: [1,2]};// ALT
  this.rules[21].opcodes[1] = {type: 6, string: [101]};// TBS
  this.rules[21].opcodes[2] = {type: 6, string: [69]};// TBS

  /* exp */
  this.rules[22].opcodes = [];
  this.rules[22].opcodes[0] = {type: 2, children: [1,2,6]};// CAT
  this.rules[22].opcodes[1] = {type: 4, index: 21};// RNM(e)
  this.rules[22].opcodes[2] = {type: 3, min: 0, max: 1};// REP
  this.rules[22].opcodes[3] = {type: 1, children: [4,5]};// ALT
  this.rules[22].opcodes[4] = {type: 4, index: 25};// RNM(minus)
  this.rules[22].opcodes[5] = {type: 4, index: 26};// RNM(plus)
  this.rules[22].opcodes[6] = {type: 3, min: 1, max: Infinity};// REP
  this.rules[22].opcodes[7] = {type: 4, index: 38};// RNM(DIGIT)

  /* frac */
  this.rules[23].opcodes = [];
  this.rules[23].opcodes[0] = {type: 2, children: [1,2]};// CAT
  this.rules[23].opcodes[1] = {type: 4, index: 19};// RNM(decimal-point)
  this.rules[23].opcodes[2] = {type: 3, min: 1, max: Infinity};// REP
  this.rules[23].opcodes[3] = {type: 4, index: 38};// RNM(DIGIT)

  /* int */
  this.rules[24].opcodes = [];
  this.rules[24].opcodes[0] = {type: 1, children: [1,2]};// ALT
  this.rules[24].opcodes[1] = {type: 4, index: 27};// RNM(zero)
  this.rules[24].opcodes[2] = {type: 2, children: [3,4]};// CAT
  this.rules[24].opcodes[3] = {type: 4, index: 20};// RNM(digit1-9)
  this.rules[24].opcodes[4] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[24].opcodes[5] = {type: 4, index: 38};// RNM(DIGIT)

  /* minus */
  this.rules[25].opcodes = [];
  this.rules[25].opcodes[0] = {type: 7, string: [45]};// TLS

  /* plus */
  this.rules[26].opcodes = [];
  this.rules[26].opcodes[0] = {type: 7, string: [43]};// TLS

  /* zero */
  this.rules[27].opcodes = [];
  this.rules[27].opcodes[0] = {type: 7, string: [48]};// TLS

  /* string */
  this.rules[28].opcodes = [];
  this.rules[28].opcodes[0] = {type: 2, children: [1,2,4]};// CAT
  this.rules[28].opcodes[1] = {type: 4, index: 31};// RNM(quotation-mark)
  this.rules[28].opcodes[2] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[28].opcodes[3] = {type: 4, index: 29};// RNM(char)
  this.rules[28].opcodes[4] = {type: 4, index: 31};// RNM(quotation-mark)

  /* char */
  this.rules[29].opcodes = [];
  this.rules[29].opcodes[0] = {type: 1, children: [1,2]};// ALT
  this.rules[29].opcodes[1] = {type: 4, index: 32};// RNM(unescaped)
  this.rules[29].opcodes[2] = {type: 2, children: [3,4]};// CAT
  this.rules[29].opcodes[3] = {type: 4, index: 30};// RNM(escape)
  this.rules[29].opcodes[4] = {type: 1, children: [5,6,7,8,9,10,11,12,13]};// ALT
  this.rules[29].opcodes[5] = {type: 6, string: [34]};// TBS
  this.rules[29].opcodes[6] = {type: 6, string: [92]};// TBS
  this.rules[29].opcodes[7] = {type: 6, string: [47]};// TBS
  this.rules[29].opcodes[8] = {type: 6, string: [98]};// TBS
  this.rules[29].opcodes[9] = {type: 6, string: [102]};// TBS
  this.rules[29].opcodes[10] = {type: 6, string: [110]};// TBS
  this.rules[29].opcodes[11] = {type: 6, string: [114]};// TBS
  this.rules[29].opcodes[12] = {type: 6, string: [116]};// TBS
  this.rules[29].opcodes[13] = {type: 2, children: [14,15]};// CAT
  this.rules[29].opcodes[14] = {type: 6, string: [117]};// TBS
  this.rules[29].opcodes[15] = {type: 3, min: 4, max: 4};// REP
  this.rules[29].opcodes[16] = {type: 4, index: 39};// RNM(HEXDIG)

  /* escape */
  this.rules[30].opcodes = [];
  this.rules[30].opcodes[0] = {type: 6, string: [92]};// TBS

  /* quotation-mark */
  this.rules[31].opcodes = [];
  this.rules[31].opcodes[0] = {type: 6, string: [34]};// TBS

  /* unescaped */
  this.rules[32].opcodes = [];
  this.rules[32].opcodes[0] = {type: 1, children: [1,2,3]};// ALT
  this.rules[32].opcodes[1] = {type: 5, min: 32, max: 33};// TRG
  this.rules[32].opcodes[2] = {type: 5, min: 35, max: 91};// TRG
  this.rules[32].opcodes[3] = {type: 5, min: 93, max: 1114111};// TRG

  /* ws */
  this.rules[33].opcodes = [];
  this.rules[33].opcodes[0] = {type: 1, children: [1,2,3,4]};// ALT
  this.rules[33].opcodes[1] = {type: 6, string: [32]};// TBS
  this.rules[33].opcodes[2] = {type: 6, string: [9]};// TBS
  this.rules[33].opcodes[3] = {type: 6, string: [10]};// TBS
  this.rules[33].opcodes[4] = {type: 6, string: [13]};// TBS

  /* sep */
  this.rules[34].opcodes = [];
  this.rules[34].opcodes[0] = {type: 2, children: [1,3,6]};// CAT
  this.rules[34].opcodes[1] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[34].opcodes[2] = {type: 4, index: 33};// RNM(ws)
  this.rules[34].opcodes[3] = {type: 1, children: [4,5]};// ALT
  this.rules[34].opcodes[4] = {type: 7, string: [59]};// TLS
  this.rules[34].opcodes[5] = {type: 6, string: [10]};// TBS
  this.rules[34].opcodes[6] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[34].opcodes[7] = {type: 4, index: 33};// RNM(ws)

  /* begin-properties */
  this.rules[35].opcodes = [];
  this.rules[35].opcodes[0] = {type: 2, children: [1,3,4]};// CAT
  this.rules[35].opcodes[1] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[35].opcodes[2] = {type: 4, index: 33};// RNM(ws)
  this.rules[35].opcodes[3] = {type: 7, string: [123]};// TLS
  this.rules[35].opcodes[4] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[35].opcodes[5] = {type: 4, index: 33};// RNM(ws)

  /* end-properties */
  this.rules[36].opcodes = [];
  this.rules[36].opcodes[0] = {type: 2, children: [1,3,4]};// CAT
  this.rules[36].opcodes[1] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[36].opcodes[2] = {type: 4, index: 33};// RNM(ws)
  this.rules[36].opcodes[3] = {type: 7, string: [125]};// TLS
  this.rules[36].opcodes[4] = {type: 3, min: 0, max: Infinity};// REP
  this.rules[36].opcodes[5] = {type: 4, index: 33};// RNM(ws)

  /* ALPHA */
  this.rules[37].opcodes = [];
  this.rules[37].opcodes[0] = {type: 1, children: [1,2]};// ALT
  this.rules[37].opcodes[1] = {type: 5, min: 65, max: 90};// TRG
  this.rules[37].opcodes[2] = {type: 5, min: 97, max: 122};// TRG

  /* DIGIT */
  this.rules[38].opcodes = [];
  this.rules[38].opcodes[0] = {type: 5, min: 48, max: 57};// TRG

  /* HEXDIG */
  this.rules[39].opcodes = [];
  this.rules[39].opcodes[0] = {type: 1, children: [1,2,3,4,5,6,7]};// ALT
  this.rules[39].opcodes[1] = {type: 4, index: 38};// RNM(DIGIT)
  this.rules[39].opcodes[2] = {type: 7, string: [97]};// TLS
  this.rules[39].opcodes[3] = {type: 7, string: [98]};// TLS
  this.rules[39].opcodes[4] = {type: 7, string: [99]};// TLS
  this.rules[39].opcodes[5] = {type: 7, string: [100]};// TLS
  this.rules[39].opcodes[6] = {type: 7, string: [101]};// TLS
  this.rules[39].opcodes[7] = {type: 7, string: [102]};// TLS

  // The `toString()` function will display the original grammar file(s) that produced these opcodes.
  this.toString = function(){
    var str = "";
    str += "; A chunks document is composed of a series of statements that are\r\n";
    str += "; either chunks, compact notations for rules or links, or comments.\r\n";
    str += "; Spaces can be inserted about anywhere, but are only mandatory to separate\r\n";
    str += "; tokens. In particular, spaces between statements are not mandatory, except\r\n";
    str += "; after a compact link statement.\r\n";
    str += "chunksDoc = *ws [statements] *ws\r\n";
    str += "statements = *ws (\r\n";
    str += "  comment [%x0A statements] /\r\n";
    str += "  chunk [statements] /\r\n";
    str += "  compact-rule [statements] /\r\n";
    str += "  compact-link [ws statements])\r\n";
    str += "\r\n";
    str += "; Comments start with \"#\" and last until the end of the line or file\r\n";
    str += "comment = \"#\" *char\r\n";
    str += "\r\n";
    str += "; A chunk has a type, an optional ID and a set of properties.\r\n";
    str += "; The set of properties may be empty.\r\n";
    str += "chunk = type [ws id] begin-properties [properties] end-properties\r\n";
    str += "\r\n";
    str += "; Compact rules associate a condition chunk with action chunks\r\n";
    str += "compact-rule = *\"!\" chunk \"=>\" chunk *(\",\" chunk)\r\n";
    str += "\r\n";
    str += "; Compact links (subject predicate object)\r\n";
    str += "compact-link = id ws property-name ws id\r\n";
    str += "\r\n";
    str += "; Chunk type\r\n";
    str += "type = *ws (\"*\" / name)\r\n";
    str += "\r\n";
    str += "; Chunk IDs are regular names\r\n";
    str += "id = name\r\n";
    str += "\r\n";
    str += "; Chunk properties\r\n";
    str += "properties = property *(sep property)\r\n";
    str += "property = property-name ws property-value\r\n";
    str += "property-name = name / reserved-name\r\n";
    str += "property-value = value *(\",\" value)\r\n";
    str += "\r\n";
    str += "; Names\r\n";
    str += "name = *ws inner-name *ws\r\n";
    str += "reserved-name = *ws \"@\" inner-name *ws\r\n";
    str += "negated = \"!\" *(inner-name / variable)\r\n";
    str += "variable = \"?\" inner-name\r\n";
    str += "inner-name = 1*(ALPHA / DIGIT / \".\" / \"_\" / \"-\" / \"/\" / \":\")\r\n";
    str += "\r\n";
    str += "; Property values\r\n";
    str += "value = *ws (\"*\" / \"false\" / \"true\" / inner-name / variable / negated / number / string) *ws\r\n";
    str += "\r\n";
    str += "; Numbers (same as in JSON)\r\n";
    str += "number = [ minus ] int [ frac ] [ exp ]\r\n";
    str += "decimal-point = \".\"\r\n";
    str += "digit1-9 = %x31-39\r\n";
    str += "e = %x65 / %x45\r\n";
    str += "exp = e [ minus / plus ] 1*DIGIT\r\n";
    str += "frac = decimal-point 1*DIGIT\r\n";
    str += "int = zero / ( digit1-9 *DIGIT )\r\n";
    str += "minus = \"-\"\r\n";
    str += "plus = \"+\"\r\n";
    str += "zero = \"0\"\r\n";
    str += "\r\n";
    str += "; Strings (same as in JSON)\r\n";
    str += "string = quotation-mark *char quotation-mark\r\n";
    str += "char = unescaped / escape (\r\n";
    str += "  %x22 /          ; \"    quotation mark\r\n";
    str += "  %x5C /          ; \\    reverse solidus\r\n";
    str += "  %x2F /          ; /    solidus\r\n";
    str += "  %x62 /          ; b    backspace\r\n";
    str += "  %x66 /          ; f    form feed\r\n";
    str += "  %x6E /          ; n    line feed\r\n";
    str += "  %x72 /          ; r    carriage return\r\n";
    str += "  %x74 /          ; t    tab\r\n";
    str += "  %x75 4HEXDIG )  ; uXXXX\r\n";
    str += "escape = %x5C\r\n";
    str += "quotation-mark = %x22      ; \"\r\n";
    str += "unescaped = %x20-21 / %x23-5B / %x5D-10FFFF\r\n";
    str += "\r\n";
    str += "; White space characters:\r\n";
    str += "; space, horizontal tab, line feed, carriage return\r\n";
    str += "ws = %x20 / %x09 / %x0A / %x0D\r\n";
    str += "\r\n";
    str += "; Semi-colon or new line to separate chunk properties\r\n";
    str += "sep = *ws (\";\" / %x0A) *ws\r\n";
    str += "\r\n";
    str += "; Curly braces to enclose chunk properties\r\n";
    str += "begin-properties = *ws \"{\" *ws\r\n";
    str += "end-properties = *ws \"}\" *ws\r\n";
    str += "\r\n";
    str += "; Core definitions from the original RFC\r\n";
    str += "ALPHA = %x41-5A / %x61-7A   ; A-Z / a-z\r\n";
    str += "DIGIT = %x30-39             ; 0-9\r\n";
    str += "HEXDIG = DIGIT / \"A\" / \"B\" / \"C\" / \"D\" / \"E\" / \"F\"\n";
    return str;
  }
}
