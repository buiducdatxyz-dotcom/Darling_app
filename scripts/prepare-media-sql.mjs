import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [inputPath, outputPath] = process.argv.slice(2);
const uploadEndpoint = process.env.MEDIA_IMPORT_URL;
const uploadToken = process.env.MEDIA_IMPORT_TOKEN;
const dryRun = process.env.MEDIA_IMPORT_DRY_RUN === 'true';

if (!inputPath || !outputPath || (!dryRun && (!uploadEndpoint || !uploadToken))) {
  throw new Error('Usage: node scripts/prepare-media-sql.mjs <source.sql> <prepared.sql> with MEDIA_IMPORT_URL and MEDIA_IMPORT_TOKEN set, or MEDIA_IMPORT_DRY_RUN=true.');
}
if (resolve(inputPath) === resolve(outputPath)) throw new Error('The prepared SQL file must not overwrite the original dump.');

const input = readFileSync(inputPath, 'utf8');
const schemaColumns = new Map();
const createTablePattern = /CREATE TABLE(?: IF NOT EXISTS)?\s+`([^`]+)`\s*\(([\s\S]*?)\)\s*(?:ENGINE|;)/gi;
for (const match of input.matchAll(createTablePattern)) {
  const columns = [...match[2].matchAll(/^\s*`([^`]+)`\s+/gm)].map(column => column[1]);
  schemaColumns.set(match[1], columns);
}

function decodeSqlString(raw) {
  const value = raw.trim();
  if (value === 'NULL' || value === 'null') return null;
  if (value.length < 2 || value[0] !== "'" || value[value.length - 1] !== "'") return undefined;
  let output = '';
  for (let i = 1; i < value.length - 1; i += 1) {
    const character = value[i];
    if (character === "'" && value[i + 1] === "'") {
      output += "'";
      i += 1;
    } else if (character === '\\' && i + 1 < value.length - 1) {
      i += 1;
      const escaped = value[i];
      const escapes = { '0': '\0', b: '\b', n: '\n', r: '\r', t: '\t', Z: '\x1a', '\\': '\\', "'": "'", '"': '"' };
      output += Object.hasOwn(escapes, escaped) ? escapes[escaped] : escaped;
    } else {
      output += character;
    }
  }
  return output;
}

function encodeSqlString(value) {
  return `'${String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\0/g, '\\0')
    .replace(/\x08/g, '\\b')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\x1a/g, '\\Z')
    .replace(/'/g, "\\'")}'`;
}

function parseInsertHeader(line) {
  const match = /^(\s*INSERT\s+(?:IGNORE\s+)?INTO\s+`?([^`\s(]+)`?(?:\s*\(([^)]*)\))?\s+VALUES\s*)/i.exec(line);
  if (!match) return null;
  const explicitColumns = match[3]
    ? [...match[3].matchAll(/`([^`]+)`/g)].map(column => column[1])
    : null;
  return { prefix: match[1], table: match[2], columns: explicitColumns || schemaColumns.get(match[2]) || [], start: match[0].length };
}

function parseValueTuples(line, start) {
  let position = start;
  const tuples = [];
  let suffix = '';
  while (position < line.length) {
    while (/\s/.test(line[position] || '') && position < line.length) position += 1;
    if (line[position] !== '(') { suffix = line.slice(position); break; }
    position += 1;
    let fieldStart = position;
    let depth = 1;
    let quoted = false;
    let escaped = false;
    const fields = [];
    while (position < line.length && depth > 0) {
      const character = line[position];
      if (quoted) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === "'" && line[position + 1] === "'") position += 1;
        else if (character === "'") quoted = false;
      } else if (character === "'") {
        quoted = true;
      } else if (character === '(') {
        depth += 1;
      } else if (character === ')') {
        depth -= 1;
        if (depth === 0) fields.push(line.slice(fieldStart, position));
      } else if (character === ',' && depth === 1) {
        fields.push(line.slice(fieldStart, position));
        fieldStart = position + 1;
      }
      position += 1;
    }
    if (depth !== 0 || quoted) throw new Error('Could not safely parse a SQL INSERT row.');
    tuples.push(fields);
    while (/\s/.test(line[position] || '') && position < line.length) position += 1;
    if (line[position] === ',') { position += 1; continue; }
    suffix = line.slice(position);
    break;
  }
  if (!tuples.length) throw new Error('Could not find SQL INSERT rows.');
  return { tuples, suffix };
}

const mediaCache = new Map();
const stats = { uniqueAssets: 0, uniqueMediaBytes: 0, transformedValues: 0, byTable: {} };
const supportedTypes = new Map([
  ['image/jpeg', 'jpg'], ['image/jpg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'],
  ['image/gif', 'gif'], ['audio/wav', 'wav'], ['audio/mpeg', 'mp3'], ['audio/mp3', 'mp3'],
]);

async function uploadDataUrl(dataUrl) {
  const match = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i.exec(dataUrl);
  if (!match) {
    if (/^data:(?:image|audio)\//i.test(dataUrl)) throw new Error('An image or audio item uses an unsupported data URL format.');
    return dataUrl;
  }
  const contentType = match[1].toLowerCase();
  const extension = supportedTypes.get(contentType);
  if (!extension) throw new Error(`Unsupported media type in SQL dump: ${contentType}.`);
  const encoded = match[2].replace(/\s/g, '');
  const bytes = Buffer.from(encoded, 'base64');
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new Error('A media file is empty or larger than 8 MB.');
  const hash = createHash('sha256').update(bytes).digest('hex');
  const cacheKey = `${contentType}:${hash}`;
  if (mediaCache.has(cacheKey)) return mediaCache.get(cacheKey);

  if (dryRun) {
    const mediaRef = `s3://media/import/dry-${hash}.${extension}`;
    mediaCache.set(cacheKey, mediaRef);
    stats.uniqueAssets += 1;
    stats.uniqueMediaBytes += bytes.length;
    return mediaRef;
  }

  const response = await fetch(new URL('/api/internal/media-import', uploadEndpoint), {
    method: 'POST',
    headers: {
      'content-type': 'application/octet-stream',
      'x-media-content-type': contentType,
      'x-media-import-token': uploadToken,
    },
    body: new Uint8Array(bytes),
    signal: AbortSignal.timeout(120_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success || typeof payload.mediaRef !== 'string') {
    throw new Error(`Object storage rejected an item (HTTP ${response.status}).`);
  }
  mediaCache.set(cacheKey, payload.mediaRef);
  stats.uniqueAssets += 1;
  stats.uniqueMediaBytes += bytes.length;
  return payload.mediaRef;
}

async function transformDeep(value) {
  if (typeof value === 'string') return uploadDataUrl(value);
  if (Array.isArray(value)) return Promise.all(value.map(transformDeep));
  if (value && typeof value === 'object') {
    const entries = await Promise.all(Object.entries(value).map(async ([key, child]) => [key, await transformDeep(child)]));
    return Object.fromEntries(entries);
  }
  return value;
}

const mediaColumnByTable = new Map([
  ['user_images', new Set(['image_url'])], ['moments', new Set(['image_url'])],
  ['user_songs', new Set(['song_data'])], ['advertisements', new Set(['image_url'])],
]);

function getColumnIndexes(table, columns) {
  const mediaColumns = mediaColumnByTable.get(table);
  const indexes = new Set();
  if (mediaColumns) columns.forEach((column, index) => { if (mediaColumns.has(column)) indexes.add(index); });
  if (table === 'users' && columns.includes('profile_data')) indexes.add(columns.indexOf('profile_data'));
  return indexes;
}

async function transformInsertLine(line) {
  const header = parseInsertHeader(line);
  if (!header) return line;
  const targetIndexes = getColumnIndexes(header.table, header.columns);
  if (!targetIndexes.size) return line;
  const { tuples, suffix } = parseValueTuples(line, header.start);
  let changed = false;
  for (const tuple of tuples) {
    for (const index of targetIndexes) {
      if (index >= tuple.length) throw new Error(`INSERT column count does not match the ${header.table} schema.`);
      const decoded = decodeSqlString(tuple[index]);
      if (typeof decoded !== 'string') continue;
      let transformed;
      if (header.table === 'users' && header.columns[index] === 'profile_data') {
        try {
          const profile = JSON.parse(decoded);
          const updatedProfile = await transformDeep(profile);
          transformed = JSON.stringify(updatedProfile);
        } catch (error) {
          if (error instanceof SyntaxError) continue;
          throw error;
        }
      } else if (/^data:/i.test(decoded)) {
        transformed = await uploadDataUrl(decoded);
      } else {
        continue;
      }
      if (transformed !== decoded) {
        tuple[index] = encodeSqlString(transformed);
        changed = true;
        stats.transformedValues += 1;
        stats.byTable[header.table] = (stats.byTable[header.table] || 0) + 1;
      }
    }
  }
  if (!changed) return line;
  return `${header.prefix}${tuples.map(tuple => `(${tuple.join(',')})`).join(',')}${suffix}`;
}

async function main() {
  const lines = input.match(/[^\n]*\n|[^\n]+$/g) || [];
  const output = [];
  for (const line of lines) output.push(await transformInsertLine(line));
  writeFileSync(outputPath, output.join(''), 'utf8');
  console.log(JSON.stringify({
    dryRun,
    outputPath: resolve(outputPath),
    uniqueAssets: stats.uniqueAssets,
    uniqueMediaMB: Number((stats.uniqueMediaBytes / 1048576).toFixed(2)),
    transformedValues: stats.transformedValues,
    transformedValuesByTable: stats.byTable,
  }));
}

await main();

