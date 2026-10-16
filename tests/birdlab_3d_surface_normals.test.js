import { loadAvianFeatherArt } from './helpers/avian_feather_art_fixture.js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_bird.js', 'utf8');
const names = ['continuous-mantle-and-streaked-breast', 'sculpted-small-hawk-head'];
function fixture(originalNormals = false) {
  const context = {};
  for (const method of ['save','restore','translate','rotate','beginPath','closePath','clip',
    'fillRect','moveTo','lineTo','bezierCurveTo','quadraticCurveTo','stroke','fill']) context[method] = () => {};
  context.createLinearGradient = () => ({ addColorStop() {} });
  const canvas = () => ({ width:16,height:16,getContext:()=>context });
  const local = { AvianFeatherArt: { ...loadAvianFeatherArt(), createFlightFeatherCanvas:canvas,
    createVaneDetailCanvases:()=>({normal:canvas(),roughness:canvas()}) } };
  const code = originalNormals ? source.replace('smoothSphereNormals(bodyGeo);', 'bodyGeo.computeVertexNormals();')
    .replace('smoothSphereNormals(headGeo);', 'headGeo.computeVertexNormals();') : source;
  new Function('window','document',code)(local,{createElement:canvas});
  return local.BirdLab3DBird.create(THREE);
}

// Compare actual physical positions, independently of the production hash.
// No distinct sculpted neighbors are close enough to share this tolerance.
function coincidentGroups(g) {
  const points = Array.from({length:g.attributes.position.count}, (_,i) =>
    new THREE.Vector3().fromBufferAttribute(g.attributes.position,i));
  const groups = [];
  for (let index=0;index<points.length;index++) {
    const group = groups.find(indices=>points[index].distanceToSquared(points[indices[0]])<1e-24);
    if(group)group.push(index);else groups.push([index]);
  }
  return groups;
}

describe('BirdLab sculpted surface seam lighting', () => {
  it('gives every coincident longitude and pole vertex an identical normal', () => {
    const bird=fixture(),control=fixture(true),a=new THREE.Vector3(),b=new THREE.Vector3();
    try {
      for(const name of names) {
        const g=bird.root.getObjectByName(name).geometry, old=control.root.getObjectByName(name).geometry;
        const duplicates=coincidentGroups(g).filter(group=>group.length>1);
        expect(duplicates.length).toBeGreaterThan(20);
        expect(duplicates.filter(group=>group.length>20)).toHaveLength(2);
        let previousCrease=0;
        for(const group of duplicates)for(const index of group.slice(1)) {
          const first=group[0], n=g.attributes.normal, before=old.attributes.normal;
          expect([n.getX(index),n.getY(index),n.getZ(index)]).toEqual([n.getX(first),n.getY(first),n.getZ(first)]);
          previousCrease=Math.max(previousCrease,a.fromBufferAttribute(before,index).distanceTo(b.fromBufferAttribute(before,first)));
        }
        expect(previousCrease).toBeGreaterThan(.05);
      }
    } finally {bird.dispose();control.dispose();}
  });

  it('uses the area-weighted surface normal with finite outward normals at both poles', () => {
    const bird=fixture(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3();
    try {
      for(const name of names) {
        const g=bird.root.getObjectByName(name).geometry,p=g.attributes.position,n=g.attributes.normal;
        for(let vertex=0;vertex<p.count;vertex++) {
          normal.fromBufferAttribute(n,vertex);
          expect(normal.length()).toBeCloseTo(1,6);
          expect(normal.dot(a.fromBufferAttribute(p,vertex))).toBeGreaterThan(0);
        }
        for(const group of coincidentGroups(g).filter(indices=>indices.length>1)) {
          const members=new Set(group),expected=new THREE.Vector3();
          for(let face=0;face<g.index.count;face+=3) {
            const ia=g.index.getX(face),ib=g.index.getX(face+1),ic=g.index.getX(face+2);
            if(!members.has(ia)&&!members.has(ib)&&!members.has(ic))continue;
            a.fromBufferAttribute(p,ia);b.fromBufferAttribute(p,ib);c.fromBufferAttribute(p,ic);
            expected.add(b.sub(a).cross(c.sub(a)));
          }
          expected.normalize();
          expect(normal.fromBufferAttribute(n,group[0]).distanceTo(expected)).toBeLessThan(1e-7);
        }
      }
    } finally {bird.dispose();}
  });

  it('preserves every position, UV, color, index and non-seam normal exactly', () => {
    const bird=fixture(),control=fixture(true);
    try {
      for(const name of names) {
        const g=bird.root.getObjectByName(name).geometry,old=control.root.getObjectByName(name).geometry;
        for(const attribute of ['position','uv','color'])expect(g.attributes[attribute].array).toEqual(old.attributes[attribute].array);
        expect(g.index.array).toEqual(old.index.array);
        for(const group of coincidentGroups(g).filter(indices=>indices.length===1)) {
          const offset=group[0]*3;
          expect(g.attributes.normal.array.slice(offset,offset+3)).toEqual(old.attributes.normal.array.slice(offset,offset+3));
        }
        g.computeBoundingBox();old.computeBoundingBox();
        expect(g.boundingBox).toEqual(old.boundingBox);
      }
    } finally {bird.dispose();control.dispose();}
  });
});
