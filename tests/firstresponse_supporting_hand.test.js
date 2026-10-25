import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import geometryDelta from './helpers/firstresponse_manikin_refinement_delta.cjs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modules = ['desktop/web-app/node_modules', 'node_modules'].map(path => resolve(path))
  .find(path => existsSync(resolve(path, 'react')));
const React = require(resolve(modules, 'react'));
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const { act } = require(resolve(modules, 'react-dom/test-utils'));
const source = readFileSync('stem_lab/stem_tool_firstresponse.js', 'utf8');
// Only the fixed complete-scene preservation cases use the historical builder.
// Framing, posed cheek context and lifecycle checks below still build raw current source.
const historicalSource = geometryDelta.revertManikinRefinement(source);
const THREE = {}, scenes = [], ages = ['adult', 'child', 'infant'];
new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(THREE, { exports: THREE });
const completed = ['check', 'arm', 'hand', 'knee', 'roll', 'airway', 'stable', 'watch'];
// Fixed complete-scene fingerprints captured from the source immediately
// before this camera-only enhancement. Both wrists, face surfaces, shaders,
// materials, transforms, guides, resource counts and picks are included.
// Baseline source SHA256: 642b337db93a4c13cdbb1f95040662f3db45cf50529e5fd333938cd3de86be99.
const baseline = {
  "adult:0:false": {
    "geometry": "92893a1fc752f0f62620af4246a4a20bddc224755c150ee9a91b4199e3c43613",
    "materials": "50765f986d27bbb3154b02fa61cd2f3184b4ea9fbfbe7c13a870f80567516feb",
    "resources": {
      "nodes": 211,
      "meshes": 144,
      "geometries": 142,
      "materials": 25,
      "picks": []
    }
  },
  "adult:0:true": {
    "geometry": "fb89ad71b9efc464244eb2619a9ca762dc53c7d171c8674f2a3b7a3fac192ed8",
    "materials": "e6cb454ca2f7545cd3dbaafbd9a87aac50a2bb10e32fbe4865c5c34ca3235c5a",
    "resources": {
      "nodes": 210,
      "meshes": 144,
      "geometries": 142,
      "materials": 26,
      "picks": []
    }
  },
  "adult:1:false": {
    "geometry": "92893a1fc752f0f62620af4246a4a20bddc224755c150ee9a91b4199e3c43613",
    "materials": "50765f986d27bbb3154b02fa61cd2f3184b4ea9fbfbe7c13a870f80567516feb",
    "resources": {
      "nodes": 211,
      "meshes": 144,
      "geometries": 142,
      "materials": 25,
      "picks": []
    }
  },
  "adult:1:true": {
    "geometry": "fb89ad71b9efc464244eb2619a9ca762dc53c7d171c8674f2a3b7a3fac192ed8",
    "materials": "e6cb454ca2f7545cd3dbaafbd9a87aac50a2bb10e32fbe4865c5c34ca3235c5a",
    "resources": {
      "nodes": 210,
      "meshes": 144,
      "geometries": 142,
      "materials": 26,
      "picks": []
    }
  },
  "adult:2:false": {
    "geometry": "73c6dade174d365cf6756c23f956277f4b0f5214c41bcc29e07dabc79b614faf",
    "materials": "a1808a4715537a7c52b0f17e32591e3a6ff85f81b0ddce1e61836ef2ea1fd024",
    "resources": {
      "nodes": 217,
      "meshes": 148,
      "geometries": 146,
      "materials": 28,
      "picks": []
    }
  },
  "adult:2:true": {
    "geometry": "6b4f697203632122b06e304f71d3da218d1f31dcc17c82b741f127ccae141ea2",
    "materials": "f84c40393c1bd4e2bb4f6c929b92739afeb12e673c7579886bea21d574b47ab9",
    "resources": {
      "nodes": 216,
      "meshes": 148,
      "geometries": 146,
      "materials": 29,
      "picks": []
    }
  },
  "adult:3:false": {
    "geometry": "283c1c371615340138cb5c8d8ab838069c8a8f8e9a5800ed876725e0d9391b09",
    "materials": "a1808a4715537a7c52b0f17e32591e3a6ff85f81b0ddce1e61836ef2ea1fd024",
    "resources": {
      "nodes": 217,
      "meshes": 148,
      "geometries": 146,
      "materials": 28,
      "picks": []
    }
  },
  "adult:3:true": {
    "geometry": "ef93c3b53044983bb92226ec7f95f92e4f80cfada80815c071456413986260e5",
    "materials": "f84c40393c1bd4e2bb4f6c929b92739afeb12e673c7579886bea21d574b47ab9",
    "resources": {
      "nodes": 216,
      "meshes": 148,
      "geometries": 146,
      "materials": 29,
      "picks": []
    }
  },
  "adult:4:false": {
    "geometry": "c85481eb534448d5d8a739c29b628c3c6bf472c9074dd810b70f1528c5351488",
    "materials": "a1808a4715537a7c52b0f17e32591e3a6ff85f81b0ddce1e61836ef2ea1fd024",
    "resources": {
      "nodes": 217,
      "meshes": 148,
      "geometries": 146,
      "materials": 28,
      "picks": []
    }
  },
  "adult:4:true": {
    "geometry": "690c7f81ae582d0a5c12549b0e2b8e16381a4d7d863ef95a2d8e95edb3e30f47",
    "materials": "f84c40393c1bd4e2bb4f6c929b92739afeb12e673c7579886bea21d574b47ab9",
    "resources": {
      "nodes": 216,
      "meshes": 148,
      "geometries": 146,
      "materials": 29,
      "picks": []
    }
  },
  "adult:5:false": {
    "geometry": "5440c9d2a9fc0bc7b2eaa19787cfb6cf698349f8fe629094a978eccf63b058d6",
    "materials": "a1808a4715537a7c52b0f17e32591e3a6ff85f81b0ddce1e61836ef2ea1fd024",
    "resources": {
      "nodes": 217,
      "meshes": 148,
      "geometries": 146,
      "materials": 28,
      "picks": []
    }
  },
  "adult:5:true": {
    "geometry": "4d8143fa34c637fdcbe9d8bae9e15cb428ae0f28315888769333ffe8d2640eb6",
    "materials": "f84c40393c1bd4e2bb4f6c929b92739afeb12e673c7579886bea21d574b47ab9",
    "resources": {
      "nodes": 216,
      "meshes": 148,
      "geometries": 146,
      "materials": 29,
      "picks": []
    }
  },
  "adult:6:false": {
    "geometry": "7572570248348aa739df70231da5bcfcda38bc1615dc4ed830decfc3f12a0c64",
    "materials": "a1808a4715537a7c52b0f17e32591e3a6ff85f81b0ddce1e61836ef2ea1fd024",
    "resources": {
      "nodes": 217,
      "meshes": 148,
      "geometries": 146,
      "materials": 28,
      "picks": []
    }
  },
  "adult:6:true": {
    "geometry": "607687f7d0a44ade130a05b80a15c475eadfbef70b7de156c578bebc5040dc74",
    "materials": "f84c40393c1bd4e2bb4f6c929b92739afeb12e673c7579886bea21d574b47ab9",
    "resources": {
      "nodes": 216,
      "meshes": 148,
      "geometries": 146,
      "materials": 29,
      "picks": []
    }
  },
  "adult:7:false": {
    "geometry": "ec15c35f5e03dafd055377f0442307b7273b1100a380ca7020f5f2963018cbef",
    "materials": "a1808a4715537a7c52b0f17e32591e3a6ff85f81b0ddce1e61836ef2ea1fd024",
    "resources": {
      "nodes": 217,
      "meshes": 148,
      "geometries": 146,
      "materials": 28,
      "picks": []
    }
  },
  "adult:7:true": {
    "geometry": "45ec8ce2afbb9510b2fc108f225910977b0f345848243c0aa4543ed8c0581c4a",
    "materials": "f84c40393c1bd4e2bb4f6c929b92739afeb12e673c7579886bea21d574b47ab9",
    "resources": {
      "nodes": 216,
      "meshes": 148,
      "geometries": 146,
      "materials": 29,
      "picks": []
    }
  },
  "adult:8:false": {
    "geometry": "ec15c35f5e03dafd055377f0442307b7273b1100a380ca7020f5f2963018cbef",
    "materials": "a1808a4715537a7c52b0f17e32591e3a6ff85f81b0ddce1e61836ef2ea1fd024",
    "resources": {
      "nodes": 217,
      "meshes": 148,
      "geometries": 146,
      "materials": 28,
      "picks": []
    }
  },
  "adult:8:true": {
    "geometry": "45ec8ce2afbb9510b2fc108f225910977b0f345848243c0aa4543ed8c0581c4a",
    "materials": "f84c40393c1bd4e2bb4f6c929b92739afeb12e673c7579886bea21d574b47ab9",
    "resources": {
      "nodes": 216,
      "meshes": 148,
      "geometries": 146,
      "materials": 29,
      "picks": []
    }
  },
  "child:0:false": {
    "geometry": "51212f379dd43c21ea14c3544cda14785328c954cea2505fae99e2bd7d6a35a2",
    "materials": "5bfdb5bf6dc22c80d631f2a0d0f880900fe85009f39e5922982f6f93e7eb983a",
    "resources": {
      "nodes": 210,
      "meshes": 143,
      "geometries": 141,
      "materials": 25,
      "picks": []
    }
  },
  "child:0:true": {
    "geometry": "29587c2d96b688ad0698c43cfd9d437af51e68efd2887dba553afd93b53e5a34",
    "materials": "c8aaa3afafcfc62beb4192adf64e34a72a86bbd4e629c84684f05125251756bb",
    "resources": {
      "nodes": 209,
      "meshes": 143,
      "geometries": 141,
      "materials": 26,
      "picks": []
    }
  },
  "child:1:false": {
    "geometry": "51212f379dd43c21ea14c3544cda14785328c954cea2505fae99e2bd7d6a35a2",
    "materials": "5bfdb5bf6dc22c80d631f2a0d0f880900fe85009f39e5922982f6f93e7eb983a",
    "resources": {
      "nodes": 210,
      "meshes": 143,
      "geometries": 141,
      "materials": 25,
      "picks": []
    }
  },
  "child:1:true": {
    "geometry": "29587c2d96b688ad0698c43cfd9d437af51e68efd2887dba553afd93b53e5a34",
    "materials": "c8aaa3afafcfc62beb4192adf64e34a72a86bbd4e629c84684f05125251756bb",
    "resources": {
      "nodes": 209,
      "meshes": 143,
      "geometries": 141,
      "materials": 26,
      "picks": []
    }
  },
  "child:2:false": {
    "geometry": "a5e8329997eced178c7fa4940834b4e92fcbb82151c0a64a2daa24463889d56f",
    "materials": "aaa7649c2aa605add74f98443631726c2aeab27dab3b298481188908e09e14fd",
    "resources": {
      "nodes": 216,
      "meshes": 147,
      "geometries": 145,
      "materials": 28,
      "picks": []
    }
  },
  "child:2:true": {
    "geometry": "7ee7e213734a12f990e280686a0e42564891476eeca3cb1923a3a5c5722375ea",
    "materials": "0ddd8e61e231139930ff9fde716e522f3d484ed803c8cfc8903dec88e9b93b48",
    "resources": {
      "nodes": 215,
      "meshes": 147,
      "geometries": 145,
      "materials": 29,
      "picks": []
    }
  },
  "child:3:false": {
    "geometry": "7e8dfc47128c8206dd38801911cfd708a528962401565370e82eaa5d8be4ea38",
    "materials": "aaa7649c2aa605add74f98443631726c2aeab27dab3b298481188908e09e14fd",
    "resources": {
      "nodes": 216,
      "meshes": 147,
      "geometries": 145,
      "materials": 28,
      "picks": []
    }
  },
  "child:3:true": {
    "geometry": "dfde18a9224e566940ab115c4bebd454d431328b4e92461e6f0ba9f5021ee439",
    "materials": "0ddd8e61e231139930ff9fde716e522f3d484ed803c8cfc8903dec88e9b93b48",
    "resources": {
      "nodes": 215,
      "meshes": 147,
      "geometries": 145,
      "materials": 29,
      "picks": []
    }
  },
  "child:4:false": {
    "geometry": "b3b5a7ac19e230b155578ff6a54dbc8a0104ad9150dd9e706914e4f46697e989",
    "materials": "aaa7649c2aa605add74f98443631726c2aeab27dab3b298481188908e09e14fd",
    "resources": {
      "nodes": 216,
      "meshes": 147,
      "geometries": 145,
      "materials": 28,
      "picks": []
    }
  },
  "child:4:true": {
    "geometry": "3a364ec3de84986a8b7566df25bce574a8bbcd10254b8d25da2ce2d50aa1c5be",
    "materials": "0ddd8e61e231139930ff9fde716e522f3d484ed803c8cfc8903dec88e9b93b48",
    "resources": {
      "nodes": 215,
      "meshes": 147,
      "geometries": 145,
      "materials": 29,
      "picks": []
    }
  },
  "child:5:false": {
    "geometry": "1728d07d82a707d948d23bd5df5309ac63647b7ac23415586ddc1657505c3845",
    "materials": "aaa7649c2aa605add74f98443631726c2aeab27dab3b298481188908e09e14fd",
    "resources": {
      "nodes": 216,
      "meshes": 147,
      "geometries": 145,
      "materials": 28,
      "picks": []
    }
  },
  "child:5:true": {
    "geometry": "bccd1509c8a74b1be5485b50230fa9b92b25676923e248e209e9559defd0b97c",
    "materials": "0ddd8e61e231139930ff9fde716e522f3d484ed803c8cfc8903dec88e9b93b48",
    "resources": {
      "nodes": 215,
      "meshes": 147,
      "geometries": 145,
      "materials": 29,
      "picks": []
    }
  },
  "child:6:false": {
    "geometry": "9ec0c1476cf6458bc4bce0bad03f005be906720eef634385af5e908ebd24a061",
    "materials": "aaa7649c2aa605add74f98443631726c2aeab27dab3b298481188908e09e14fd",
    "resources": {
      "nodes": 216,
      "meshes": 147,
      "geometries": 145,
      "materials": 28,
      "picks": []
    }
  },
  "child:6:true": {
    "geometry": "3dceb0ed9d2d2f03321a6ffab38b5eab0d5b9f09d6a4c81bcddfceddc1895f0e",
    "materials": "0ddd8e61e231139930ff9fde716e522f3d484ed803c8cfc8903dec88e9b93b48",
    "resources": {
      "nodes": 215,
      "meshes": 147,
      "geometries": 145,
      "materials": 29,
      "picks": []
    }
  },
  "child:7:false": {
    "geometry": "ea39aabb473499df496f1fa97eb39adca659e09ed4b32c9df5902f9cf18b1bf9",
    "materials": "aaa7649c2aa605add74f98443631726c2aeab27dab3b298481188908e09e14fd",
    "resources": {
      "nodes": 216,
      "meshes": 147,
      "geometries": 145,
      "materials": 28,
      "picks": []
    }
  },
  "child:7:true": {
    "geometry": "4c01a8a6fe455af5899f2f1e5888edaa077f40d5af997d19764ad06caf9c6652",
    "materials": "0ddd8e61e231139930ff9fde716e522f3d484ed803c8cfc8903dec88e9b93b48",
    "resources": {
      "nodes": 215,
      "meshes": 147,
      "geometries": 145,
      "materials": 29,
      "picks": []
    }
  },
  "child:8:false": {
    "geometry": "ea39aabb473499df496f1fa97eb39adca659e09ed4b32c9df5902f9cf18b1bf9",
    "materials": "aaa7649c2aa605add74f98443631726c2aeab27dab3b298481188908e09e14fd",
    "resources": {
      "nodes": 216,
      "meshes": 147,
      "geometries": 145,
      "materials": 28,
      "picks": []
    }
  },
  "child:8:true": {
    "geometry": "4c01a8a6fe455af5899f2f1e5888edaa077f40d5af997d19764ad06caf9c6652",
    "materials": "0ddd8e61e231139930ff9fde716e522f3d484ed803c8cfc8903dec88e9b93b48",
    "resources": {
      "nodes": 215,
      "meshes": 147,
      "geometries": 145,
      "materials": 29,
      "picks": []
    }
  },
  "infant:0:false": {
    "geometry": "b6aa676608735ff253ee35ebdb3b057327e1807a1c67ff3be1a08c53f9e221a9",
    "materials": "2a1d909ab1c652aa96a65d28814060e3a943853b1a59153aeaf87276dc80eab2",
    "resources": {
      "nodes": 181,
      "meshes": 125,
      "geometries": 123,
      "materials": 25,
      "picks": []
    }
  },
  "infant:0:true": {
    "geometry": "626daa08472111ac28d890ff8b1d5ee4ca94c18a573f7493212dbd38179ca835",
    "materials": "3d1af108f9190c0efbbe9f735cc4e3b24d7165afdb8d33290d2b5dc8c5fac74d",
    "resources": {
      "nodes": 180,
      "meshes": 125,
      "geometries": 123,
      "materials": 26,
      "picks": []
    }
  },
  "infant:1:false": {
    "geometry": "b6aa676608735ff253ee35ebdb3b057327e1807a1c67ff3be1a08c53f9e221a9",
    "materials": "2a1d909ab1c652aa96a65d28814060e3a943853b1a59153aeaf87276dc80eab2",
    "resources": {
      "nodes": 181,
      "meshes": 125,
      "geometries": 123,
      "materials": 25,
      "picks": []
    }
  },
  "infant:1:true": {
    "geometry": "626daa08472111ac28d890ff8b1d5ee4ca94c18a573f7493212dbd38179ca835",
    "materials": "3d1af108f9190c0efbbe9f735cc4e3b24d7165afdb8d33290d2b5dc8c5fac74d",
    "resources": {
      "nodes": 180,
      "meshes": 125,
      "geometries": 123,
      "materials": 26,
      "picks": []
    }
  },
  "infant:2:false": {
    "geometry": "cd42ad02703f790c0632398db5cf1f528f150dc3708d9b681b6e59042ef5dacf",
    "materials": "08ccf313de0c8cce7a843380307b35b84b3bd1afacb79ca5b437943a321a669a",
    "resources": {
      "nodes": 187,
      "meshes": 129,
      "geometries": 127,
      "materials": 28,
      "picks": []
    }
  },
  "infant:2:true": {
    "geometry": "c874010a204a2933132bd0429edd17ede110d188194a80754291e82ff9cc581a",
    "materials": "60a439e4d9b581f3bdbfcc1b4a871d3ac665d1dad18dab253e76605ab52a99d4",
    "resources": {
      "nodes": 186,
      "meshes": 129,
      "geometries": 127,
      "materials": 29,
      "picks": []
    }
  },
  "infant:3:false": {
    "geometry": "9d5acd85d92911e666388e6aa3ff1da111b5175389254a553cc0ae8e6a56f770",
    "materials": "08ccf313de0c8cce7a843380307b35b84b3bd1afacb79ca5b437943a321a669a",
    "resources": {
      "nodes": 187,
      "meshes": 129,
      "geometries": 127,
      "materials": 28,
      "picks": []
    }
  },
  "infant:3:true": {
    "geometry": "731bfccb919008e903f19ce5d499341652e6ce679e110538fb53b72b650633ae",
    "materials": "60a439e4d9b581f3bdbfcc1b4a871d3ac665d1dad18dab253e76605ab52a99d4",
    "resources": {
      "nodes": 186,
      "meshes": 129,
      "geometries": 127,
      "materials": 29,
      "picks": []
    }
  },
  "infant:4:false": {
    "geometry": "dd0dc65313d848b7c1a2a5f9ae96a444d2983e24a8b62a8f26186c23c9d018d1",
    "materials": "08ccf313de0c8cce7a843380307b35b84b3bd1afacb79ca5b437943a321a669a",
    "resources": {
      "nodes": 187,
      "meshes": 129,
      "geometries": 127,
      "materials": 28,
      "picks": []
    }
  },
  "infant:4:true": {
    "geometry": "bf817a5e916687230da0290fc5988806d7bd4b9891463eac775edeec4247ec9e",
    "materials": "60a439e4d9b581f3bdbfcc1b4a871d3ac665d1dad18dab253e76605ab52a99d4",
    "resources": {
      "nodes": 186,
      "meshes": 129,
      "geometries": 127,
      "materials": 29,
      "picks": []
    }
  },
  "infant:5:false": {
    "geometry": "ee4e64376dc10848ffa1ed219857d70331eed4ef9782b15b90794f8b22117918",
    "materials": "08ccf313de0c8cce7a843380307b35b84b3bd1afacb79ca5b437943a321a669a",
    "resources": {
      "nodes": 187,
      "meshes": 129,
      "geometries": 127,
      "materials": 28,
      "picks": []
    }
  },
  "infant:5:true": {
    "geometry": "30b13e02c68c4fb566eaf2b73822b8fe9495f40b9ba74101328f247036eb6c6e",
    "materials": "60a439e4d9b581f3bdbfcc1b4a871d3ac665d1dad18dab253e76605ab52a99d4",
    "resources": {
      "nodes": 186,
      "meshes": 129,
      "geometries": 127,
      "materials": 29,
      "picks": []
    }
  },
  "infant:6:false": {
    "geometry": "d2157aed1344874213ecff087898fdc55e86c8db15be06af7dbba24c15280582",
    "materials": "08ccf313de0c8cce7a843380307b35b84b3bd1afacb79ca5b437943a321a669a",
    "resources": {
      "nodes": 187,
      "meshes": 129,
      "geometries": 127,
      "materials": 28,
      "picks": []
    }
  },
  "infant:6:true": {
    "geometry": "3df94b4560d50cde69dbd2423d9e5cfc6de0e8eb783d4b44666006a3070eb0ee",
    "materials": "60a439e4d9b581f3bdbfcc1b4a871d3ac665d1dad18dab253e76605ab52a99d4",
    "resources": {
      "nodes": 186,
      "meshes": 129,
      "geometries": 127,
      "materials": 29,
      "picks": []
    }
  },
  "infant:7:false": {
    "geometry": "b6d66db6f51730854b2d4b8ce6451503ac008b722f0065fa7c917597a34fb7a7",
    "materials": "08ccf313de0c8cce7a843380307b35b84b3bd1afacb79ca5b437943a321a669a",
    "resources": {
      "nodes": 187,
      "meshes": 129,
      "geometries": 127,
      "materials": 28,
      "picks": []
    }
  },
  "infant:7:true": {
    "geometry": "c083c0da7981296683fc34c4f2a450cdc0e8d52a89df815ff0a4d945cf4b83a0",
    "materials": "60a439e4d9b581f3bdbfcc1b4a871d3ac665d1dad18dab253e76605ab52a99d4",
    "resources": {
      "nodes": 186,
      "meshes": 129,
      "geometries": 127,
      "materials": 29,
      "picks": []
    }
  },
  "infant:8:false": {
    "geometry": "b6d66db6f51730854b2d4b8ce6451503ac008b722f0065fa7c917597a34fb7a7",
    "materials": "08ccf313de0c8cce7a843380307b35b84b3bd1afacb79ca5b437943a321a669a",
    "resources": {
      "nodes": 187,
      "meshes": 129,
      "geometries": 127,
      "materials": 28,
      "picks": []
    }
  },
  "infant:8:true": {
    "geometry": "c083c0da7981296683fc34c4f2a450cdc0e8d52a89df815ff0a4d945cf4b83a0",
    "materials": "60a439e4d9b581f3bdbfcc1b4a871d3ac665d1dad18dab253e76605ab52a99d4",
    "resources": {
      "nodes": 186,
      "meshes": 129,
      "geometries": 127,
      "materials": 29,
      "picks": []
    }
  }
};
const fitCases = ages.flatMap(age => Array.from({ length: 6 }, (_, i) => i + 3)
  .flatMap(phase => [false, true].map(guides => ({ age, phase, guides }))));
const preservedCases = ages.flatMap(age => Array.from({ length: 9 }, (_, phase) => phase)
  .flatMap(phase => [false, true].map(contrast => ({ age, phase, contrast }))));
let previous, build, historicalBuild, config, viewer, focus, reset, nudge, viewerStatus, lastSync,
  host, root, state, patch, contrastMode;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; localStorage.clear();
  previous = window.StemLab; delete window.__alloflowFirstResponse;
  viewerStatus = 'ready'; lastSync = null; contrastMode = false;
  focus = vi.fn(() => true); reset = vi.fn(); nudge = vi.fn();
  window.StemLab = { _registry: {}, isRegistered: () => false,
    registerTool(id, tool) { this._registry[id] = tool; },
    makeBayViewer(options) {
      config = options; build = options.buildScene;
      return viewer = { attach() {}, sync(props) { lastSync = props; }, focus,
        reset, nudge, zoom() {}, status: () => viewerStatus };
    } };
  new Function(historicalSource)(); historicalBuild = build;
  new Function(source)();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => {
  if (root) act(() => root.unmount()); host.remove(); window.StemLab = previous;
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  const geometries = new Set(), materials = new Set();
  for (const scene of scenes.splice(0)) scene.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material) materials.add(material);
    }
  });
  geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
});

function mount(seed = {}) {
  function Harness() {
    const [data, setData] = React.useState({ consentAccepted: true, view: 'body3d',
      b3dTab: 'recovery', b3dStatus: 'ready', b3dRec: completed, b3dRecView: 4, ...seed });
    state = data; patch = values => setData(previousState => ({ ...previousState, ...values }));
    return window.StemLab._registry.firstResponse.render({ React,
      toolData: { firstResponse: data }, update: (_, key, value) => patch({ [key]: value }),
      updateMulti: (_, values) => patch(values), t: (_, fallback) => fallback,
      addToast() {}, gradeBand: 'g68', isContrast: contrastMode });
  }
  act(() => root.render(React.createElement(Harness)));
}
function button(label) {
  const result = [...host.querySelectorAll('button')].find(element => element.textContent === label);
  expect(result, label).toBeTruthy(); return result;
}
function click(label) { act(() => button(label).click()); }
function model(age = 'adult', phase = 4, guides = false, contrast = false, tab = 'recovery', sceneBuilder = build) {
  const scene = new THREE.Scene(); scenes.push(scene);
  const content = sceneBuilder(THREE, { scene, phase, dark: true, contrast, wantShadow: false,
    trim: (color, shininess) => new THREE.MeshPhongMaterial({ color,
      shininess: shininess == null ? 30 : shininess, specular: 0x6b7688 }),
    sceneProps: { age, tab, recoveryGuides: guides } });
  const sample = () => { content.frame(0, {}, true); scene.updateMatrixWorld(true); };
  sample(); return { scene, content, sample };
}
function part(scene, name) {
  const result = scene.getObjectByName(name); expect(result, name).toBeTruthy(); return result;
}
function handVertices(hand) {
  const result = [];
  hand.traverse(mesh => {
    if (!mesh.geometry) return;
    const position = mesh.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) result.push(new THREE.Vector3()
      .fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld));
  });
  return result;
}
function assertMetadata(scene, content, phase) {
  const target = content.meshes.supportingHand, hand = part(scene, 'fr-patient-right-hand');
  expect(target, 'existing hand group is the focus target').toBe(hand);
  expect(target.isGroup).toBe(true); expect(content.picks.includes(target)).toBe(false);
  expect(target.userData.partId).toBeUndefined();
  const info = target.userData.inspection; expect(info).toBeTruthy();
  for (const key of ['center', 'normal', 'forward']) {
    expect(info[key], key).toHaveLength(3);
    expect(info[key].every(value => typeof value === 'number' && Number.isFinite(value))).toBe(true);
  }
  expect(typeof info.radius).toBe('number'); expect(Number.isFinite(info.radius)).toBe(true);
  expect(info.radius).toBeGreaterThan(0);
  expect(info.context).toHaveLength(5);
  for (const point of info.context) {
    expect(point).toHaveLength(3);
    expect(point.every(value => typeof value === 'number' && Number.isFinite(value))).toBe(true);
  }
  const normal = new THREE.Vector3().fromArray(info.normal), forward = new THREE.Vector3().fromArray(info.forward);
  expect(normal.length()).toBeCloseTo(1, 8); expect(forward.length()).toBeCloseTo(1, 8);
  expect(normal.dot(forward)).toBeCloseTo(0, 8);
  expect(normal.distanceTo(new THREE.Vector3(0, 1, 0).transformDirection(hand.matrixWorld))).toBeLessThan(1e-8);
  expect(forward.distanceTo(new THREE.Vector3(0, 0, 1).transformDirection(hand.matrixWorld))).toBeLessThan(1e-8);
  const cheek = new THREE.Vector3().fromArray(info.context[0]);
  const tangent = info.context.slice(1).map(point => new THREE.Vector3().fromArray(point).sub(cheek));
  for (const point of tangent) {
    expect(Math.abs(point.dot(normal))).toBeLessThan(1e-8);
    expect(point.length()).toBeGreaterThan(.02); expect(point.length()).toBeLessThan(.2);
  }
  expect(tangent[0].clone().add(tangent[1]).length()).toBeLessThan(1e-8);
  expect(tangent[2].clone().add(tangent[3]).length()).toBeLessThan(1e-8);
  expect(Math.abs(tangent[0].clone().normalize().dot(tangent[2].clone().normalize()))).toBeLessThan(1e-8);
  const bounds = new THREE.Box3().setFromObject(hand);
  for (const point of info.context) bounds.expandByPoint(new THREE.Vector3().fromArray(point));
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  expect(new THREE.Vector3().fromArray(info.center).distanceTo(sphere.center)).toBeLessThan(1e-7);
  expect(Math.abs(info.radius - sphere.radius)).toBeLessThan(1e-7);
  // The cheek point and its four tangents travel with the posed head. They
  // must remain close to the actual head instead of drifting toward world origin.
  const head = part(scene, 'fr-manikin-head');
  const headBounds = new THREE.Box3().setFromObject(head).expandByScalar(.16);
  for (const point of info.context) expect(headBounds.containsPoint(new THREE.Vector3().fromArray(point)),
    'cheek context belongs beside the posed head at phase ' + phase).toBe(true);
  return info;
}
// Use the shared viewer's public reset/nudge/focus contract to reconstruct its
// translated orbital camera, independently of the product's fitting formula.
function inspectionCamera(aspect, expectedId = 'supportingHand') {
  const [id, options] = focus.mock.calls.at(-1); expect(id).toBe(expectedId);
  expect(options.immediate).toBe(true); expect(options.padding).toBeUndefined();
  expect(Number.isFinite(options.distance)).toBe(true);
  expect(options.distance).toBeGreaterThanOrEqual(.8 - 1e-9);
  expect(options.distance).toBeLessThanOrEqual(config.home.dist);
  const [yawDelta, pitchDelta] = nudge.mock.calls.at(-1);
  const yaw = config.home.yaw + yawDelta;
  const minPitch = typeof config.minPitch === 'number' ? Math.max(-1.35, Math.min(.12, config.minPitch)) : .12;
  const pitch = Math.max(minPitch, Math.min(1.35, config.home.pitch + pitchDelta));
  const distance = Math.max(config.minDistance, Math.min(config.home.dist, options.distance));
  const target = new THREE.Vector3(options.target.x, options.target.y, options.target.z);
  const home = new THREE.Vector3(config.home.target.x, config.home.target.y, config.home.target.z);
  const camera = new THREE.PerspectiveCamera(42, aspect, .1, 100);
  camera.position.copy(target).sub(home).add(new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch) * distance, Math.sin(pitch) * distance,
    Math.cos(yaw) * Math.cos(pitch) * distance));
  camera.lookAt(target); camera.updateMatrixWorld(true); return { camera, target };
}
function assertFaceFrame(scene, info) {
  expect(info.faceFrame).toBeTruthy();
  expect(info.faceFrame.center).toHaveLength(3);
  expect(info.faceFrame.center.every(value => typeof value === 'number' && Number.isFinite(value))).toBe(true);
  expect(typeof info.faceFrame.radius).toBe('number');
  expect(Number.isFinite(info.faceFrame.radius)).toBe(true);
  expect(info.faceFrame.radius).toBeGreaterThanOrEqual(info.radius);
  const center = new THREE.Vector3().fromArray(info.faceFrame.center);
  const points = handVertices(part(scene, 'fr-patient-right-hand'))
    .concat(handVertices(part(scene, 'fr-manikin-head-pivot')),
      info.context.map(point => new THREE.Vector3().fromArray(point)));
  let farthest = 0;
  for (const point of points) farthest = Math.max(farthest, point.distanceTo(center));
  expect(farthest, 'narrow frame contains the actual head, hand and cheek context')
    .toBeLessThanOrEqual(info.faceFrame.radius + 1e-7);
}
function assertFraming(scene, content, aspect) {
  const info = content.meshes.supportingHand.userData.inspection;
  const { camera, target } = inspectionCamera(aspect);
  assertFaceFrame(scene, info);
  const narrow = aspect < 1.15;
  expect(target.distanceTo(new THREE.Vector3().fromArray(narrow ? info.faceFrame.center : info.center))).toBeLessThan(1e-7);
  const points = handVertices(part(scene, 'fr-patient-right-hand'))
    .concat(info.context.map(point => new THREE.Vector3().fromArray(point)),
      narrow ? handVertices(part(scene, 'fr-manikin-head-pivot')) : []);
  let x = 0, y = 0, nearest = -Infinity, lowZ = Infinity, highZ = -Infinity;
  for (const point of points) {
    nearest = Math.max(nearest, point.clone().applyMatrix4(camera.matrixWorldInverse).z);
    const projected = point.clone().project(camera);
    x = Math.max(x, Math.abs(projected.x)); y = Math.max(y, Math.abs(projected.y));
    lowZ = Math.min(lowZ, projected.z); highZ = Math.max(highZ, projected.z);
  }
  expect(nearest, 'whole hand, cheek and narrow-view head clear the near plane').toBeLessThan(-.105);
  expect(x, 'complete hand, cheek and narrow-view head stay inside the horizontal frame').toBeLessThan(.94);
  expect(y, 'complete hand, cheek and narrow-view head stay inside the vertical frame').toBeLessThan(.94);
  expect(lowZ).toBeGreaterThan(-1); expect(highZ).toBeLessThan(1);
  expect(camera.position.clone().sub(target).normalize()
    .dot(new THREE.Vector3().fromArray(info.normal)), 'camera sees the supporting surface').toBeGreaterThan(.8);
}
function untouched(before) {
  const { b3dRecView: ignoredBefore, ...restBefore } = before;
  const { b3dRecView: ignoredAfter, ...restAfter } = state;
  expect(restAfter).toEqual(restBefore);
  for (const key of Object.keys(restBefore)) expect(restAfter[key], key + ' retains identity').toBe(restBefore[key]);
}
function resourceSnapshot(scene, content) {
  const geometries = new Set(), materials = new Set(); let nodes = 0, meshes = 0;
  scene.traverse(object => {
    nodes++; if (object.isMesh) meshes++;
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) materials.add(material);
  });
  return { nodes, meshes, geometries: geometries.size, materials: materials.size,
    picks: content.picks.map(object => object.name) };
}
function geometryFingerprint(scene) {
  const hash = createHash('sha256');
  function visit(object, path) {
    hash.update(JSON.stringify([path, object.type, object.name, object.visible,
      object.matrix.toArray(), object.matrixWorld.toArray(), object.castShadow, object.receiveShadow,
      object.renderOrder, object.layers.mask]));
    if (object.geometry) {
      const geometry = object.geometry; hash.update(JSON.stringify([geometry.type, geometry.drawRange, geometry.groups]));
      for (const key of Object.keys(geometry.attributes).sort()) {
        const attribute = geometry.attributes[key], bytes = attribute.array;
        hash.update(JSON.stringify([key, attribute.itemSize, attribute.normalized, bytes.constructor.name]));
        hash.update(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
      }
      if (geometry.index) {
        const bytes = geometry.index.array; hash.update(bytes.constructor.name);
        hash.update(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
      }
    }
    object.children.forEach((child, index) => visit(child, path + '.' + index));
  }
  visit(scene, 'scene'); return hash.digest('hex');
}
function materialParameters(material) {
  const result = {};
  for (const key of ['type', 'name', 'transparent', 'opacity', 'depthTest', 'depthWrite', 'side',
    'shininess', 'wireframe', 'vertexColors', 'flatShading', 'alphaTest', 'blending', 'blendSrc',
    'blendDst', 'blendEquation', 'premultipliedAlpha', 'dithering', 'toneMapped', 'fog',
    'polygonOffset', 'polygonOffsetFactor', 'polygonOffsetUnits', 'linewidth', 'dashSize', 'gapSize', 'scale']) {
    if (material[key] !== undefined) result[key] = material[key];
  }
  for (const key of ['color', 'specular', 'emissive']) if (material[key]) result[key] = material[key].toArray();
  result.userData = material.userData; result.onBeforeCompile = String(material.onBeforeCompile);
  result.customProgramCacheKey = material.customProgramCacheKey(); return result;
}

function legacyPatientFinish(parameters, material, patientSkin) {
  // Retain the fixed pre-finish hashes. Only the two intended fields on the
  // single shared normal patient skin are mapped back; all other parameters,
  // shader hooks and every unrelated material remain in the fingerprint.
  if (material === patientSkin && material.isMeshPhongMaterial) {
    expect(material.color.toArray()).toEqual(new THREE.Color(0xc09478).multiplyScalar(.86).toArray());
    expect(material.specular.getHexString()).toBe('060606');
    parameters.color = new THREE.Color(0xc09478).toArray();
    parameters.specular = new THREE.Color(0x25313b).toArray();
  }
  return parameters;
}
function materialFingerprint(scene) {
  const hash = createHash('sha256'), patientSkin = part(scene, 'fr-manikin-head').material;
  function visit(object, path) {
    if (object.material) hash.update(JSON.stringify([path, object.type, object.name,
      (Array.isArray(object.material) ? object.material : [object.material]).map(material =>
        legacyPatientFinish(materialParameters(material), material, patientSkin))]));
    object.children.forEach((child, index) => visit(child, path + '.' + index));
  }
  visit(scene, 'scene'); return hash.digest('hex');
}

describe('supporting hand complete-scene preservation', () => {
  it.each(preservedCases)('preserves every $age scene surface and resource at pose $phase contrast=$contrast', ({ age, phase, contrast }) => {
    const { scene, content, sample } = model(age, phase, true, contrast, 'recovery', historicalBuild);
    const expected = baseline[age + ':' + phase + ':' + contrast]; expect(expected).toBeTruthy();
    expect(geometryFingerprint(scene)).toBe(expected.geometry);
    expect(materialFingerprint(scene)).toBe(expected.materials);
    expect(resourceSnapshot(scene, content)).toEqual(expected.resources);
    if (phase >= 3) assertMetadata(scene, content, phase);
    else expect(content.meshes.supportingHand).toBeUndefined();
    const metadata = content.meshes.supportingHand?.userData.inspection;
    const metadataArrays = metadata && ['center', 'normal', 'forward', 'context'].map(key => metadata[key]);
    const metadataValues = metadata && JSON.parse(JSON.stringify(metadata));
    const contextPoints = metadata && metadata.context.slice();
    const references = [];
    scene.traverse(object => references.push([object, object.geometry, object.material,
      object.geometry?.attributes.position?.array, object.geometry?.attributes.normal?.array,
      object.geometry?.index?.array]));
    sample(); sample();
    for (const [object, geometry, material, positions, normals, indices] of references) {
      expect(object.geometry).toBe(geometry); expect(object.material).toBe(material);
      expect(object.geometry?.attributes.position?.array).toBe(positions);
      expect(object.geometry?.attributes.normal?.array).toBe(normals);
      expect(object.geometry?.index?.array).toBe(indices);
    }
    expect(geometryFingerprint(scene)).toBe(expected.geometry);
    expect(materialFingerprint(scene)).toBe(expected.materials);
    if (metadata) {
      expect(content.meshes.supportingHand.userData.inspection).toBe(metadata);
      expect(metadata).toEqual(metadataValues);
      for (const [index, key] of ['center', 'normal', 'forward', 'context'].entries()) {
        expect(metadata[key]).toBe(metadataArrays[index]);
      }
      for (const [index, point] of metadata.context.entries()) expect(point).toBe(contextPoints[index]);
    }
  });
});

describe('supporting hand geometry and camera', () => {
  it.each(fitCases)('frames the complete $age supporting hand and cheek, including the whole head on phone, at pose $phase with guides=$guides', ({ age, phase, guides }) => {
    const inquiry = { peak: 'same', release: 'b' }, depth = { age, depth: 5.6, lean: .8, motion: 'inspect', phase: 50 };
    mount({ b3dAge: age, b3dRecView: phase, b3dRecoveryGuides: guides,
      b3dDepthInquiry: inquiry, b3dDepthLab: depth });
    const node = { clientWidth: 560, clientHeight: 420 }; viewer.attach(node);
    const { scene, content, sample } = model(age, phase, guides); assertMetadata(scene, content, phase);
    const before = state; click('Supporting hand close-up');
    expect(reset).toHaveBeenCalledTimes(1); expect(nudge).toHaveBeenCalledTimes(1); expect(focus).toHaveBeenCalledTimes(1);
    expect(reset.mock.invocationCallOrder[0]).toBeLessThan(nudge.mock.invocationCallOrder[0]);
    expect(nudge.mock.invocationCallOrder[0]).toBeLessThan(focus.mock.invocationCallOrder[0]);
    assertFraming(scene, content, node.clientWidth / node.clientHeight);
    expect(state).toBe(before); sample(); sample(); expect(focus).toHaveBeenCalledTimes(1);
    node.clientWidth = 290; node.clientHeight = 280; sample(); expect(focus).toHaveBeenCalledTimes(2);
    assertFraming(scene, content, node.clientWidth / node.clientHeight);
    sample(); expect(focus).toHaveBeenCalledTimes(2); expect(state).toBe(before);
  });
});

describe('supporting hand lifecycle and camera compatibility', () => {
  it('registers a camera-only part and adds its alias only while recovery support is positioned', () => {
    expect(config.parts.filter(entry => entry.id === 'supportingHand')).toHaveLength(1);
    for (const phase of [0, 1, 2]) expect(model('adult', phase).content.meshes.supportingHand).toBeUndefined();
    for (const tab of ['depth', 'place', 'coach', 'aed', 'call']) {
      expect(model('adult', 5, false, false, tab).content.meshes.supportingHand).toBeUndefined();
    }
    const available = model('adult', 3); assertMetadata(available.scene, available.content, 3);
  }, 30000 /* exhaustive geometry/replay assertions; not a wall-clock performance test */);

  it('refits once after posed, age, contrast and guide rebuilds and once after each real resize', () => {
    mount(); const node = { clientWidth: 560, clientHeight: 420 }; viewer.attach(node);
    model(); click('Supporting hand close-up'); let count = focus.mock.calls.length;
    for (const [age, phase, guides, contrast] of [['adult', 5, true, false], ['child', 5, true, false],
      ['child', 5, true, true], ['child', 5, false, true], ['infant', 8, false, true]]) {
      contrastMode = contrast;
      act(() => patch({ b3dAge: age, b3dRecView: phase, b3dRecoveryGuides: guides }));
      const current = model(age, phase, guides, contrast);
      expect(focus).toHaveBeenCalledTimes(++count); current.sample(); current.sample();
      expect(focus).toHaveBeenCalledTimes(count); assertFraming(current.scene, current.content, node.clientWidth / node.clientHeight);
    }
    const current = model('infant', 8, false, true); count++;
    for (const width of [260, 760, 290]) {
      node.clientWidth = width; current.sample(); expect(focus).toHaveBeenCalledTimes(++count);
      assertFraming(current.scene, current.content, node.clientWidth / node.clientHeight);
      current.sample(); expect(focus).toHaveBeenCalledTimes(count);
    }
  });

  it.each(['reset', 'detach', 'unmount'])('clears active supporting inspection on %s without reviving it on later frames', kind => {
    mount(); const node = { clientWidth: 560, clientHeight: 420 }; viewer.attach(node);
    const current = model(); click('Supporting hand close-up'); const count = focus.mock.calls.length;
    if (kind === 'reset') viewer.reset();
    else if (kind === 'detach') { viewer.attach(null); viewer.attach(node); }
    else { act(() => root.unmount()); root = null; }
    node.clientWidth = 220; current.sample(); const later = model('child', 5, true); later.sample();
    expect(focus).toHaveBeenCalledTimes(count);
  });

  it.each(['early pose', 'different tab'])('clears active supporting inspection when a rebuild switches to %s', kind => {
    mount(); viewer.attach({ clientWidth: 560, clientHeight: 420 }); model(); click('Supporting hand close-up');
    const count = focus.mock.calls.length;
    const missing = kind === 'early pose' ? model('adult', 2) : model('adult', 5, true, false, 'depth');
    expect(missing.content.meshes.supportingHand).toBeUndefined();
    const later = model('infant', 5, true); later.sample(); expect(focus).toHaveBeenCalledTimes(count);
    expect(reset).toHaveBeenCalledTimes(2);
  });

  it('leaves the existing palm detail and heel side cameras available with their original target contracts', () => {
    mount(); viewer.attach({ clientWidth: 560, clientHeight: 420 });
    const current = model('adult', 5, true); click('Palm detail view');
    expect(focus.mock.calls.at(-1)[0]).toBe('nearPalm'); expect(focus.mock.calls.at(-1)[1].padding).toBeUndefined();
    const palmCenter = current.content.meshes.nearPalm.userData.inspection.center;
    expect(Object.values(focus.mock.calls.at(-1)[1].target)).toEqual(palmCenter);
    act(() => patch({ b3dTab: 'depth' })); model('adult', 0, false, false, 'depth');
    click('Heel side view'); expect(focus.mock.calls.at(-1)[0]).toBe('handContact');
    expect(focus.mock.calls.at(-1)[1].immediate).toBe(true);
  });
});

describe('supporting hand visual observation and pose comparison', () => {
  it('enables close-up only after the supporting arm is positioned', () => {
    mount({ b3dRecView: 2 }); expect(button('Supporting hand close-up').disabled).toBe(true);
    expect(button('Supporting hand close-up').hasAttribute('aria-pressed')).toBe(false);
    expect([...host.querySelectorAll('summary')].some(element => element.textContent === 'Check supporting-hand observation')).toBe(false);
    act(() => patch({ b3dRecView: 3 })); expect(button('Supporting hand close-up').disabled).toBe(false);
    expect([...host.querySelectorAll('summary')].some(element => element.textContent === 'Check supporting-hand observation')).toBe(true);
    act(() => patch({ b3dRecView: 1 })); expect(button('Supporting hand close-up').disabled).toBe(true);
  });

  it.each(['failed', 'idle', 'loading'])('keeps camera controls disabled and completed pose review available with viewer=%s', status => {
    viewerStatus = status === 'failed' ? 'failed' : 'ready'; mount({ b3dStatus: status });
    expect(button('Supporting hand close-up').disabled).toBe(true);
    expect(button('Inspect support before turn').disabled).toBe(false);
    expect(button('Inspect support after turn').disabled).toBe(false);
    const before = state; click('Inspect support after turn');
    expect(state.b3dRecView).toBe(5); untouched(before); expect(focus).not.toHaveBeenCalled();
  });

  it('gates support comparisons to completed poses without completing or crediting another step', () => {
    const firstThree = completed.slice(0, 3); mount({ b3dRec: firstThree, b3dRecView: 3, skills: { recovery: 2 } });
    expect(button('Inspect support before turn').disabled).toBe(true);
    expect(button('Inspect support after turn').disabled).toBe(true);
    const before = state; click('Inspect support before turn'); expect(state).toBe(before);
    const firstFour = completed.slice(0, 4); act(() => patch({ b3dRec: firstFour, b3dRecView: 4 }));
    expect(button('Inspect support before turn').disabled).toBe(false);
    expect(button('Inspect support after turn').disabled).toBe(true);
    const halfway = state; click('Inspect support after turn'); expect(state).toBe(halfway);
    const firstFive = completed.slice(0, 5); act(() => patch({ b3dRec: firstFive, b3dRecView: 5 }));
    expect(button('Inspect support after turn').disabled).toBe(false); const ready = state;
    click('Inspect support before turn'); expect(state.b3dRecView).toBe(4); untouched(ready);
  });

  it.each([0, 2, 8])('queues support comparison from pose %s and focuses same-pose review immediately', initialPhase => {
    const inquiry = { peak: 'same', release: 'b', note: 'Keep my observations.' };
    const depth = { age: 'adult', depth: 5.5, lean: 1, motion: 'inspect', phase: 50 };
    const reference = { age: 'adult', depth: 5.5, lean: 0 };
    const observation = { explanation: 'The support stays beside the cheek.' };
    mount({ b3dRecView: initialPhase, b3dDepthLab: depth, b3dDepthInquiry: inquiry,
      b3dDepthReference: reference, b3dRecoveryObservation: observation, skills: { recovery: 3 },
      progress: { firstResponse: 17 } });
    const node = { clientWidth: 560, clientHeight: 420 }; viewer.attach(node); model('adult', initialPhase);
    const before = state; click('Inspect support before turn');
    expect(state.b3dRecView).toBe(4); expect(lastSync.phase).toBe(4); untouched(before);
    expect(button('Inspect support before turn').getAttribute('aria-pressed')).toBe('true');
    expect(button('Inspect support after turn').getAttribute('aria-pressed')).toBe('false');
    expect(focus).not.toHaveBeenCalled();
    const posedBefore = model('adult', 4); expect(focus).toHaveBeenCalledTimes(1);
    assertFraming(posedBefore.scene, posedBefore.content, node.clientWidth / node.clientHeight);
    const samePose = state; click('Inspect support before turn'); expect(state).toBe(samePose);
    expect(focus).toHaveBeenCalledTimes(2);
    click('Inspect support after turn'); expect(state.b3dRecView).toBe(5); untouched(before);
    expect(button('Inspect support before turn').getAttribute('aria-pressed')).toBe('false');
    expect(button('Inspect support after turn').getAttribute('aria-pressed')).toBe('true');
    expect(lastSync.phase).toBe(5); expect(focus).toHaveBeenCalledTimes(2);
    const posedAfter = model('adult', 5); expect(focus).toHaveBeenCalledTimes(3);
    assertFraming(posedAfter.scene, posedAfter.content, node.clientWidth / node.clientHeight);
    const sameAfter = state; click('Inspect support after turn'); expect(state).toBe(sameAfter);
    expect(focus).toHaveBeenCalledTimes(4);
  });

  it('keeps the observation explanation a disclosure with no graded input or saved-state mutation', () => {
    mount(); const before = state;
    const summary = [...host.querySelectorAll('summary')]
      .find(element => element.textContent === 'Check supporting-hand observation');
    expect(summary).toBeTruthy(); const details = summary.closest('details'); expect(details).toBeTruthy();
    expect(details.textContent.toLowerCase()).toContain('cheek');
    expect(details.querySelectorAll('input, textarea, select, button')).toHaveLength(0);
    act(() => summary.click()); expect(state).toBe(before);
    expect(focus).not.toHaveBeenCalled(); expect(reset).not.toHaveBeenCalled();
  });

  it('offers supporting controls only in recovery', () => {
    mount({ b3dTab: 'depth' });
    for (const tab of ['depth', 'place', 'coach', 'gate', 'aed', 'call']) {
      act(() => patch({ b3dTab: tab }));
      for (const label of ['Supporting hand close-up', 'Inspect support before turn', 'Inspect support after turn']) {
        expect([...host.querySelectorAll('button')].some(element => element.textContent === label)).toBe(false);
      }
    }
  });

  it('handles a missing scene target or rejected focus without changing learner state', () => {
    mount(); viewer.attach({ clientWidth: 560, clientHeight: 420 });
    const before = state; click('Supporting hand close-up'); expect(state).toBe(before);
    expect(focus).not.toHaveBeenCalled(); model(); focus.mockReturnValue(false);
    click('Supporting hand close-up'); expect(state).toBe(before); expect(focus).toHaveBeenCalledTimes(1);
    const count = focus.mock.calls.length; const next = model('child', 5); next.sample();
    expect(focus).toHaveBeenCalledTimes(count);
  });
});
