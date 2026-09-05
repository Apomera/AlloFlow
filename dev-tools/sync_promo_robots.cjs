#!/usr/bin/env node
'use strict';
// Prepare the existing project policy for its actual host-root location.
// --check verifies the reviewed artifact. --live also verifies exact deployment.
// This is an exact-policy check, not a general-purpose robots.txt parser.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));
if ([...args].some(arg => !['--check','--live'].includes(arg))) throw new Error('Usage: node dev-tools/sync_promo_robots.cjs [--check] [--live]');
const live = args.has('--live');
const check = args.has('--check') || live;
const canonical = fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<link rel="canonical" href="([^"]+)"/)[1];
const site = new URL(canonical);
if (site.protocol !== 'https:' || site.pathname !== '/AlloFlow/') throw new Error('Review host-root scope before changing the canonical site');
const source = fs.readFileSync(path.join(root,'robots.txt'),'utf8').replace(/\r\n/g,'\n');
if (!source.includes('Sitemap: '+new URL('sitemap.xml',site).href)) throw new Error('Project sitemap declaration does not match the canonical site');
// Keep exclusions within this project; sibling sites on the same host stay untouched.
const expected = '# Install at '+new URL('/robots.txt',site).href+'; generated from AlloFlow/robots.txt.\n'
    + source.replace(/^Disallow:[ \t]*\/[ \t]*$/gm, 'Disallow: /AlloFlow/\nDisallow: /AlloFlow$');
const destination = path.join(root,'deployment/github-pages-root/robots.txt');
const normalize = text => text.replace(/^\uFEFF/, '').split(/\r?\n/).map(line => line.replace(/#.*$/, '').trim()).filter(Boolean).join('\n');
async function main() {
    if(check) {
        if(!fs.existsSync(destination) || normalize(fs.readFileSync(destination,'utf8')) !== normalize(expected)) throw new Error('Root robots artifact is stale. Run node dev-tools/sync_promo_robots.cjs and review it.');
        console.log('Root robots artifact: current; training exclusions scoped to /AlloFlow/.');
    } else {
        fs.mkdirSync(path.dirname(destination),{recursive:true});
        fs.writeFileSync(destination,expected);
        console.log('Prepared deployment/github-pages-root/robots.txt. No live changes made.');
    }
    if(live) {
        const url = new URL('/robots.txt',site).href;
        const response = await fetch(url,{signal:AbortSignal.timeout(15000),redirect:'error'});
        if(response.status !== 200) throw new Error(url+' returned HTTP '+response.status+'. The project-subdirectory robots file cannot replace this host-root file.');
        if(!/text\/plain/i.test(response.headers.get('content-type') || '')) throw new Error('Root response must be served as text/plain');
        if(normalize(await response.text()) !== normalize(expected)) throw new Error('Live root policy differs from the reviewed artifact. Review and merge host policies before deployment.');
        console.log('Live host-root policy: matches the reviewed artifact.');
    }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
