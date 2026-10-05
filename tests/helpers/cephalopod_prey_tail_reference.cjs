'use strict';
const assert=require('node:assert/strict');
// Permanent test helper: no report files, ignored snapshots or author-module dependency.
// Reverse only the exact final caudal block. Other factory source is intentionally retained.
const before=String.raw`  var root=[0,0,-0.018],upper=[[0,0.018,0.004],[0,0.044,-0.048],[0,0.079,-0.128],[0,0.100,-0.180],[0,0.046,-0.148],[0,0,-0.104]],tailRoots=[],tailEdge=[];
  for(var side=-1;side<=1;side+=2){tailRoots=[];tailEdge=[];for(var i=0;i<upper.length;i++){tailRoots.push(root.slice());tailEdge.push([0,side*upper[i][1],upper[i][2]]);}fin(tailRoots,tailEdge,'caudal'+(side<0?'-lower':'-upper'));}`;
const after=String.raw`  // A swept, rounded fork and shallow lateral camber soften the existing static tail membrane.
  var root=[0,0,-0.018],upper=[[0,0.018,0.004],[0.0010,0.043,-0.044],[0.0021,0.069,-0.103],[0.003115,0.089,-0.151],[0.003430,0.098,-0.173],[0.003500,0.100,-0.177],[0.003395,0.097,-0.180],[0.002695,0.077,-0.170],[0.001505,0.043,-0.145],[0,0,-0.104]],tailRoots=[],tailEdge=[];
  for(var side=-1;side<=1;side+=2){tailRoots=[];tailEdge=[];for(var i=0;i<upper.length;i++){tailRoots.push(root.slice());tailEdge.push([upper[i][0],side*upper[i][1],upper[i][2]]);}fin(tailRoots,tailEdge,'caudal'+(side<0?'-lower':'-upper'));}`;
function reversePreyTailFinish(source){
  assert.equal(typeof source,'string','Tail reference requires actual runtime text');
  const normalized=source.replace(/\r\n/g,'\n');
  assert.equal(normalized.split(after).length,2,'Exact final prey-tail block must occur once');
  const reference=normalized.replace(after,before);
  assert.equal(reference.split(before).length,2,'Original prey-tail block must occur once after reversal');
  assert.equal(reference.replace(before,after),normalized,'Tail reversal must round-trip every source byte');
  return reference;
}
module.exports={referenceSourceSha256:'ce0c01a8fc85d002bc970c5103fec84be77ff9d2fd42a295fbe629219c9e2182',before,after,reversePreyTailFinish};
