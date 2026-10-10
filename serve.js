#!/usr/bin/env node
/**
 * Tiny static + live-config server for the Wedding Invitation.
 *
 * Run: node serve.js
 * It serves the project folder on http://localhost:3000 and injects
 * data/config.json into the page so you can edit config.json and just
 * refresh the browser to see changes.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const ROOT = path.resolve(__dirname);

// In-memory cache for config, invalidated on reload via ?t=...
let config = null;
let configMtime = 0;

function readConfig() {
  const cfgPath = path.join(ROOT, 'data', 'config.json');
  try {
    const stat = fs.statSync(cfgPath);
    if (stat.mtimeMs > configMtime) {
      config = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      configMtime = stat.mtimeMs;
    }
  } catch (e) {
    // If config.json is missing or invalid, keep last good config (or empty).
    if (!config) config = {};
  }
  return config || {};
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
};

function ext(name) {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

const server = http.createServer((req, res) => {
  // Normalize
  let url = req.url.split('?')[0];
  if (url === '/') url = '/index.html';
  if (url === '/config.js') {
    // Serve a JS blob that sets window.__WEDDING_CONFIG__ from config.json
    const cfg = readConfig();
    const body = 'window.__WEDDING_CONFIG__ = ' + JSON.stringify(cfg) + ';\n';
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(body);
    return;
  }
  if (url === '/wedding.ics') {
    // Generated live so the dev server matches the built site. Served as a
    // real file with the calendar MIME type - this is the whole point of the
    // change, since iOS refuses to do anything useful with a data: URI.
    const ics = require('./js/ics.js');
    res.writeHead(200, {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="wedding.ics"',
      'Cache-Control': 'no-store',
    });
    res.end(ics.buildIcs(readConfig()));
    return;
  }

  // Security: only serve inside ROOT
  let filePath = path.normalize(path.join(ROOT, url.replace(/^\//, '')));
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found: ' + url);
      return;
    }
    const type = MIME[ext(filePath)] || 'application/octet-stream';
    const headers = { 'Content-Type': type };
    // Disable caching for HTML so config changes are visible on reload
    if (ext(filePath) === '.html') {
      headers['Cache-Control'] = 'no-store';
    }
    res.writeHead(200, headers);
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('Wedding invitation serving at: http://localhost:' + PORT);
  console.log('Edit data/config.json and refresh to update the card.');
});
