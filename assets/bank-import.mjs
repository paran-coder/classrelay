const OLE_MAGIC = [0xD0,0xCF,0x11,0xE0,0xA1,0xB1,0x1A,0xE1];
const FREE_SECTOR = 0xFFFFFFFF;
const END_OF_CHAIN = 0xFFFFFFFE;

function cleanText(value) {
  return String(value ?? '').replace(/\u0000/g, '').trim().replace(/\s+/g, ' ');
}

function parseAmount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  const cleaned = String(value ?? '').replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function textDecoder(bytes, encoding = 'utf-8') {
  try { return new TextDecoder(encoding).decode(bytes); }
  catch { return new TextDecoder('utf-8').decode(bytes); }
}

function decodeTextBytes(bytes) {
  let text = textDecoder(bytes, 'utf-8');
  const replacementCount = (text.match(/�/g) || []).length;
  if (replacementCount > 2) {
    try {
      const korean = textDecoder(bytes, 'euc-kr');
      if ((korean.match(/�/g) || []).length < replacementCount) text = korean;
    } catch {}
  }
  return text.replace(/^\uFEFF/, '');
}

function isOle(bytes) {
  return OLE_MAGIC.every((value, index) => bytes[index] === value);
}

function looksLikeHtml(text) {
  return /^\s*(?:<!doctype\s+html|<html\b)/i.test(text) || /ProgId\s+content\s*=\s*Excel\.Sheet/i.test(text);
}

function htmlDecode(value) {
  const entities = { amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:' ' };
  return String(value || '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => entities[name.toLowerCase()] ?? m);
}

function htmlCellText(cellHtml) {
  return cleanText(htmlDecode(String(cellHtml || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')));
}

function parseHtmlTables(text) {
  const tables = [];
  const sanitized = String(text || '').replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');
  const tableRegex = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;
  while ((tableMatch = tableRegex.exec(sanitized))) {
    const rows = [];
    const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(tableMatch[1]))) {
      const row = [];
      const cellRegex = /<(?:td|th)\b([^>]*)>([\s\S]*?)<\/(?:td|th)>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[1]))) {
        const attrs = cellMatch[1] || '';
        const value = htmlCellText(cellMatch[2]);
        const colspan = Number(attrs.match(/colspan\s*=\s*["']?(\d+)/i)?.[1] || 1);
        row.push(value);
        for (let i = 1; i < colspan; i += 1) row.push('');
      }
      if (row.some((value) => cleanText(value))) rows.push(row);
    }
    if (rows.length) tables.push({ name: `Sheet ${tables.length + 1}`, rows });
  }
  return tables;
}

function parseDelimited(text, delimiter) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cleanText(cell)); cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cleanText(cell)); cell = '';
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (cell.length || row.length) {
    row.push(cleanText(cell));
    if (row.some((value) => value !== '')) rows.push(row);
  }
  return rows;
}

function detectDelimiter(text) {
  const sample = text.split(/\r?\n/).slice(0, 8).join('\n');
  const candidates = [',', '\t', ';'];
  let best = ',';
  let bestScore = -1;
  for (const delimiter of candidates) {
    const rows = parseDelimited(sample, delimiter).slice(0, 5);
    if (!rows.length) continue;
    const widths = rows.map((row) => row.length);
    const avg = widths.reduce((a,b)=>a+b,0) / widths.length;
    const stable = widths.filter((width) => width === widths[0]).length;
    const score = avg + stable * 2;
    if (avg > 1 && score > bestScore) { best = delimiter; bestScore = score; }
  }
  return best;
}

class CfbReader {
  constructor(bytes) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (!isOle(bytes)) throw new Error('Excel 97-2003 .xls 파일이 아닙니다.');
    this.sectorSize = 1 << this.u16(0x1E);
    this.miniSectorSize = 1 << this.u16(0x20);
    this.numFatSectors = this.u32(0x2C);
    this.firstDirSector = this.u32(0x30);
    this.miniCutoff = this.u32(0x38);
    this.firstMiniFatSector = this.u32(0x3C);
    this.numMiniFatSectors = this.u32(0x40);
    this.firstDifatSector = this.u32(0x44);
    this.numDifatSectors = this.u32(0x48);
    this.fat = this.readFat();
    this.entries = this.readDirectory();
    this.root = this.entries[0];
    this.miniFat = this.readMiniFat();
    this.miniStream = this.root ? this.readRegularStream(this.root.startSector, this.root.size) : new Uint8Array();
  }
  u16(offset) { return this.view.getUint16(offset, true); }
  u32(offset) { return this.view.getUint32(offset, true); }
  sector(sectorId) {
    const start = 512 + sectorId * this.sectorSize;
    return this.bytes.subarray(start, Math.min(start + this.sectorSize, this.bytes.length));
  }
  chain(startSector, table = this.fat, limit = 200000) {
    const result = [];
    const seen = new Set();
    let sector = startSector;
    while (sector !== END_OF_CHAIN && sector !== FREE_SECTOR && sector < 0xFFFFFFF0 && !seen.has(sector) && result.length < limit) {
      if (sector >= table.length) break;
      seen.add(sector); result.push(sector); sector = table[sector];
    }
    return result;
  }
  readFat() {
    const difat = [];
    for (let i = 0; i < 109; i += 1) {
      const value = this.u32(0x4C + i * 4);
      if (value !== FREE_SECTOR && value !== END_OF_CHAIN) difat.push(value);
    }
    let sector = this.firstDifatSector;
    for (let d = 0; d < this.numDifatSectors && sector < 0xFFFFFFF0; d += 1) {
      const bytes = this.sector(sector);
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const count = Math.floor(this.sectorSize / 4) - 1;
      for (let i = 0; i < count; i += 1) {
        const value = view.getUint32(i * 4, true);
        if (value !== FREE_SECTOR && value !== END_OF_CHAIN) difat.push(value);
      }
      sector = view.getUint32(this.sectorSize - 4, true);
    }
    const fat = [];
    for (const fatSector of difat.slice(0, this.numFatSectors)) {
      const bytes = this.sector(fatSector);
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      for (let offset = 0; offset + 4 <= bytes.byteLength; offset += 4) fat.push(view.getUint32(offset, true));
    }
    return fat;
  }
  readRegularStream(startSector, size = Infinity) {
    const chunks = this.chain(startSector).map((sector) => this.sector(sector));
    const length = Math.min(Number.isFinite(size) ? size : chunks.reduce((sum, c) => sum + c.length, 0), chunks.reduce((sum,c)=>sum+c.length,0));
    const out = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      if (offset >= length) break;
      const slice = chunk.subarray(0, Math.min(chunk.length, length - offset));
      out.set(slice, offset); offset += slice.length;
    }
    return out;
  }
  readDirectory() {
    const bytes = this.readRegularStream(this.firstDirSector);
    const entries = [];
    for (let offset = 0; offset + 128 <= bytes.length; offset += 128) {
      const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 128);
      const nameLength = view.getUint16(64, true);
      let name = '';
      if (nameLength >= 2 && nameLength <= 64) {
        name = textDecoder(bytes.subarray(offset, offset + nameLength - 2), 'utf-16le');
      }
      entries.push({
        name,
        type: bytes[offset + 66],
        startSector: view.getUint32(116, true),
        size: view.getUint32(120, true),
      });
    }
    return entries;
  }
  readMiniFat() {
    const out = [];
    if (!this.numMiniFatSectors || this.firstMiniFatSector >= 0xFFFFFFF0) return out;
    for (const sector of this.chain(this.firstMiniFatSector).slice(0, this.numMiniFatSectors)) {
      const bytes = this.sector(sector);
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      for (let offset = 0; offset + 4 <= bytes.length; offset += 4) out.push(view.getUint32(offset, true));
    }
    return out;
  }
  readStream(entry) {
    if (!entry) return new Uint8Array();
    if (entry.type === 2 && entry.size < this.miniCutoff && this.miniFat.length) {
      const sectors = this.chain(entry.startSector, this.miniFat);
      const out = new Uint8Array(entry.size);
      let offset = 0;
      for (const miniSector of sectors) {
        const start = miniSector * this.miniSectorSize;
        const chunk = this.miniStream.subarray(start, start + this.miniSectorSize);
        const slice = chunk.subarray(0, Math.min(chunk.length, out.length - offset));
        out.set(slice, offset); offset += slice.length;
        if (offset >= out.length) break;
      }
      return out;
    }
    return this.readRegularStream(entry.startSector, entry.size);
  }
}

class SegmentReader {
  constructor(segments, firstOffset = 0) { this.segments = segments; this.segment = 0; this.offset = firstOffset; }
  remaining() { return (this.segments[this.segment]?.length || 0) - this.offset; }
  advance() { this.segment += 1; this.offset = 0; return this.segment < this.segments.length; }
  readByte() {
    if (this.remaining() <= 0 && !this.advance()) throw new Error('SST 문자열이 잘렸습니다.');
    return this.segments[this.segment][this.offset++];
  }
  readRaw(length) {
    const out = new Uint8Array(length); let written = 0;
    while (written < length) {
      if (this.remaining() <= 0 && !this.advance()) throw new Error('SST 데이터가 잘렸습니다.');
      const take = Math.min(this.remaining(), length - written);
      out.set(this.segments[this.segment].subarray(this.offset, this.offset + take), written);
      this.offset += take; written += take;
    }
    return out;
  }
  u16() { const b=this.readRaw(2); return b[0] | (b[1] << 8); }
  u32() { const b=this.readRaw(4); return (b[0] | (b[1]<<8) | (b[2]<<16) | (b[3]<<24)) >>> 0; }
  readChars(count, initialWide) {
    let wide = initialWide;
    let remainingChars = count;
    let result = '';
    while (remainingChars > 0) {
      if (this.remaining() <= 0) {
        if (!this.advance()) throw new Error('SST 문자 데이터가 잘렸습니다.');
        wide = Boolean(this.readByte() & 0x01);
      }
      const bytesPerChar = wide ? 2 : 1;
      let charsHere = Math.floor(this.remaining() / bytesPerChar);
      if (charsHere <= 0) {
        if (!this.advance()) throw new Error('SST 문자 데이터가 잘렸습니다.');
        wide = Boolean(this.readByte() & 0x01);
        continue;
      }
      charsHere = Math.min(charsHere, remainingChars);
      const bytes = this.segments[this.segment].subarray(this.offset, this.offset + charsHere * bytesPerChar);
      this.offset += bytes.length;
      result += wide ? textDecoder(bytes, 'utf-16le') : String.fromCharCode(...bytes);
      remainingChars -= charsHere;
    }
    return result;
  }
}

function collectBiffRecords(workbook) {
  const records = [];
  const view = new DataView(workbook.buffer, workbook.byteOffset, workbook.byteLength);
  let offset = 0;
  while (offset + 4 <= workbook.length) {
    const id = view.getUint16(offset, true);
    const length = view.getUint16(offset + 2, true);
    if (offset + 4 + length > workbook.length) break;
    records.push({ id, offset, data: workbook.subarray(offset + 4, offset + 4 + length) });
    offset += 4 + length;
  }
  return records;
}

function parseSst(records) {
  const start = records.findIndex((record) => record.id === 0x00FC);
  if (start < 0) return [];
  const segments = [records[start].data];
  for (let index = start + 1; index < records.length && records[index].id === 0x003C; index += 1) segments.push(records[index].data);
  const reader = new SegmentReader(segments, 0);
  reader.u32();
  const uniqueCount = reader.u32();
  const strings = [];
  for (let i = 0; i < uniqueCount; i += 1) {
    const charCount = reader.u16();
    const flags = reader.readByte();
    const rich = Boolean(flags & 0x08);
    const extended = Boolean(flags & 0x04);
    const wide = Boolean(flags & 0x01);
    const runCount = rich ? reader.u16() : 0;
    const extLength = extended ? reader.u32() : 0;
    strings.push(reader.readChars(charCount, wide));
    if (runCount) reader.readRaw(runCount * 4);
    if (extLength) reader.readRaw(extLength);
  }
  return strings;
}

function decodeRk(value) {
  const divide100 = Boolean(value & 0x01);
  const isInteger = Boolean(value & 0x02);
  let result;
  if (isInteger) {
    let integer = value >>> 2;
    if (integer & 0x20000000) integer -= 0x40000000;
    result = integer;
  } else {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setUint32(0, 0, true);
    view.setUint32(4, value & 0xFFFFFFFC, true);
    result = view.getFloat64(0, true);
  }
  return divide100 ? result / 100 : result;
}

function decodeBoundSheet(record) {
  const data = record.data;
  if (data.length < 8) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const offset = view.getUint32(0, true);
  const charCount = data[6];
  const wide = Boolean(data[7] & 0x01);
  const nameBytes = data.subarray(8, 8 + charCount * (wide ? 2 : 1));
  const name = wide ? textDecoder(nameBytes, 'utf-16le') : String.fromCharCode(...nameBytes);
  return { offset, name: cleanText(name) || 'Sheet' };
}

function parseBiffWorkbook(bytes) {
  const cfb = new CfbReader(bytes);
  const workbookEntry = cfb.entries.find((entry) => entry.name === 'Workbook' || entry.name === 'Book');
  if (!workbookEntry) throw new Error('Excel 파일에서 Workbook 데이터를 찾지 못했습니다.');
  const workbook = cfb.readStream(workbookEntry);
  const records = collectBiffRecords(workbook);
  const sst = parseSst(records);
  const sheets = records.filter((record) => record.id === 0x0085).map(decodeBoundSheet).filter(Boolean);
  const workbookView = new DataView(workbook.buffer, workbook.byteOffset, workbook.byteLength);
  const parsedSheets = [];

  for (const sheet of sheets) {
    const rowMap = new Map();
    let offset = sheet.offset;
    const setCell = (row, col, value) => {
      if (!rowMap.has(row)) rowMap.set(row, new Map());
      rowMap.get(row).set(col, typeof value === 'string' ? cleanText(value) : value);
    };
    while (offset + 4 <= workbook.length) {
      const id = workbookView.getUint16(offset, true);
      const length = workbookView.getUint16(offset + 2, true);
      if (offset + 4 + length > workbook.length) break;
      const data = workbook.subarray(offset + 4, offset + 4 + length);
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      if (id === 0x00FD && data.length >= 10) {
        const index = view.getUint32(6, true);
        setCell(view.getUint16(0, true), view.getUint16(2, true), sst[index] ?? '');
      } else if (id === 0x0203 && data.length >= 14) {
        setCell(view.getUint16(0, true), view.getUint16(2, true), view.getFloat64(6, true));
      } else if (id === 0x027E && data.length >= 10) {
        setCell(view.getUint16(0, true), view.getUint16(2, true), decodeRk(view.getUint32(6, true)));
      } else if (id === 0x00BD && data.length >= 10) {
        const row = view.getUint16(0, true);
        const firstCol = view.getUint16(2, true);
        const lastCol = view.getUint16(data.length - 2, true);
        let cursor = 4;
        for (let col = firstCol; col <= lastCol && cursor + 6 <= data.length - 2; col += 1) {
          setCell(row, col, decodeRk(view.getUint32(cursor + 2, true)));
          cursor += 6;
        }
      } else if (id === 0x0204 && data.length >= 8) {
        const count = view.getUint16(6, true);
        setCell(view.getUint16(0, true), view.getUint16(2, true), String.fromCharCode(...data.subarray(8, 8 + count)));
      } else if (id === 0x0006 && data.length >= 14) {
        const numeric = view.getFloat64(6, true);
        if (Number.isFinite(numeric)) setCell(view.getUint16(0, true), view.getUint16(2, true), numeric);
      }
      offset += 4 + length;
      if (id === 0x000A) break;
    }
    const maxRow = rowMap.size ? Math.max(...rowMap.keys()) : -1;
    const rows = [];
    for (let row = 0; row <= maxRow; row += 1) {
      const cells = rowMap.get(row) || new Map();
      const maxCol = cells.size ? Math.max(...cells.keys()) : -1;
      const values = [];
      for (let col = 0; col <= maxCol; col += 1) values.push(cells.has(col) ? cells.get(col) : '');
      rows.push(values);
    }
    parsedSheets.push({ name: sheet.name, rows });
  }
  if (!parsedSheets.length) throw new Error('Excel 파일에서 읽을 수 있는 시트를 찾지 못했습니다.');
  return parsedSheets;
}

export function parseBankFileBytes(input, fileName = '') {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const lowerName = String(fileName || '').toLowerCase();
  if (lowerName.endsWith('.xlsx')) {
    const error = new Error('현재 .xlsx는 지원하지 않습니다. 은행에서 .xls 또는 CSV로 내려받아 주세요.');
    error.code = 'XLSX_UNSUPPORTED'; throw error;
  }
  if (isOle(bytes)) return { kind: 'xls', sheets: parseBiffWorkbook(bytes) };

  const text = decodeTextBytes(bytes);
  if (looksLikeHtml(text)) {
    const sheets = parseHtmlTables(text);
    if (sheets.length) return { kind: 'html-xls', sheets };
    const external = text.match(/(?:href|HRef)\s*=\s*["']?([^"'\s>]*\.files\/sheet\d+\.htm)/i)?.[1] || '';
    const error = new Error(external
      ? `이 .xls 파일에는 입금내역 표가 들어 있지 않고 외부 시트(${external})만 참조하고 있습니다. 은행에서 CSV 또는 실제 표가 포함된 .xls 형식으로 다시 내려받아 주세요. 다른 다운로드 형식이 없다면 이 파일을 Excel/한셀에서 열어 내역이 보이는 경우 CSV로 다시 저장한 뒤 사용할 수 있습니다.`
      : '이 HTML 형식 .xls 파일에서 입금내역 표를 찾지 못했습니다.');
    error.code = external ? 'EXTERNAL_HTML_SHEET' : 'HTML_TABLE_NOT_FOUND';
    error.externalSheet = external;
    throw error;
  }

  const delimiter = detectDelimiter(text);
  const rows = parseDelimited(text, delimiter);
  if (!rows.length) throw new Error('파일에서 읽을 수 있는 입금내역 표를 찾지 못했습니다.');
  return { kind: delimiter === '\t' ? 'tsv' : 'csv', sheets: [{ name: '거래내역', rows }] };
}

const HEADER_ALIASES = {
  date: ['거래일시','거래일자','거래일','일자','날짜','입금일','처리일시'],
  time: ['거래시간','시간','처리시간'],
  payerName: ['입금자명','입금자','보낸분/받는분','보낸분','보낸사람','의뢰인','적요','내용','거래내용'],
  amount: ['입금액','입금(원)','입금','받은금액','거래금액','금액'],
  transactionId: ['거래번호','거래ID','거래 ID','거래고유번호','거래 고유번호','참조번호','거래일련번호'],
};

function normalizeHeader(value) { return cleanText(value).replace(/[\s()（）_\-/.]/g, '').toLowerCase(); }

function headerScore(value, aliases) {
  const header = normalizeHeader(value);
  if (!header) return 0;
  let best = 0;
  for (const alias of aliases) {
    const normalized = normalizeHeader(alias);
    if (header === normalized) best = Math.max(best, 100);
    else if (header.includes(normalized) || normalized.includes(header)) best = Math.max(best, 75);
  }
  return best;
}

export function suggestHeaderRow(rows = [], maxRows = 30) {
  let best = { rowNumber: 1, score: -1, mapping: {} };
  rows.slice(0, maxRows).forEach((row, index) => {
    const mapping = suggestColumnMapping(row);
    const score = ['date','payerName','amount'].reduce((sum, key) => sum + (mapping[key] >= 0 ? 1 : 0), 0) * 100
      + row.filter((value) => cleanText(value)).length;
    if (score > best.score) best = { rowNumber: index + 1, score, mapping };
  });
  return best;
}

export function suggestColumnMapping(headers = []) {
  const result = { date: -1, time: -1, payerName: -1, amount: -1, transactionId: -1 };
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    let bestIndex = -1; let bestScore = 0;
    headers.forEach((header, index) => {
      const score = headerScore(header, aliases);
      if (score > bestScore) { bestScore = score; bestIndex = index; }
    });
    if (bestScore >= 70) result[key] = bestIndex;
  }
  return result;
}

function pad(value) { return String(value).padStart(2, '0'); }

function excelSerialToText(serial, includeTime = true) {
  if (!Number.isFinite(serial)) return '';
  const whole = Math.floor(serial);
  const fraction = serial - whole;
  const epoch = Date.UTC(1899, 11, 30);
  const date = new Date(epoch + whole * 86400000 + Math.round(fraction * 86400000));
  const dateText = `${date.getUTCFullYear()}-${pad(date.getUTCMonth()+1)}-${pad(date.getUTCDate())}`;
  if (!includeTime || Math.abs(fraction) < 1e-9) return dateText;
  return `${dateText} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

function timeValueToText(value) {
  if (value === '' || value == null) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    const fraction = ((value % 1) + 1) % 1;
    const seconds = Math.round(fraction * 86400) % 86400;
    return `${pad(Math.floor(seconds/3600))}:${pad(Math.floor((seconds%3600)/60))}:${pad(seconds%60)}`;
  }
  return cleanText(value);
}

function dateValueToText(value) {
  if (value === '' || value == null) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 1000) return excelSerialToText(value, true);
    return cleanText(value);
  }
  return cleanText(value);
}

export function templateFromSelection({ id = '', name = '', sheetIndex = 0, sheetName = '', headerRow = 1, headers = [], mapping = {} } = {}) {
  const fields = {};
  for (const key of ['date','time','payerName','amount','transactionId']) {
    const index = Number(mapping[key]);
    fields[key] = Number.isInteger(index) && index >= 0 ? { index, header: cleanText(headers[index]) } : null;
  }
  return {
    id: id || `banktpl_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    name: cleanText(name),
    sheetIndex: Math.max(0, Number(sheetIndex) || 0),
    sheetName: cleanText(sheetName),
    headerRow: Math.max(1, Number(headerRow) || 1),
    fields,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function validateBankTemplate(template) {
  if (!cleanText(template?.name)) return '템플릿 이름을 입력해주세요.';
  if (!template?.fields?.payerName || template.fields.payerName.index < 0) return '입금자명 열을 선택해주세요.';
  if (!template?.fields?.amount || template.fields.amount.index < 0) return '입금액 열을 선택해주세요.';
  if (!template?.fields?.date || template.fields.date.index < 0) return '입금 날짜 열을 선택해주세요.';
  return '';
}

export function resolveTemplateSheet(parsed, template) {
  if (!parsed?.sheets?.length) return null;
  if (template?.sheetName) {
    const byName = parsed.sheets.find((sheet) => cleanText(sheet.name) === cleanText(template.sheetName));
    if (byName) return byName;
  }
  return parsed.sheets[Math.min(Math.max(0, Number(template?.sheetIndex) || 0), parsed.sheets.length - 1)] || parsed.sheets[0];
}

export function validateTemplateStructure(sheet, template) {
  if (!sheet) return { ok: false, message: '입금내역 시트를 찾지 못했습니다.' };
  const headerIndex = Math.max(0, (Number(template?.headerRow) || 1) - 1);
  const headers = sheet.rows[headerIndex] || [];
  for (const key of ['date','time','payerName','amount','transactionId']) {
    const field = template?.fields?.[key];
    if (!field || field.index < 0) continue;
    const actual = cleanText(headers[field.index]);
    const expected = cleanText(field.header);
    if (expected && normalizeHeader(actual) !== normalizeHeader(expected)) {
      return { ok: false, message: `저장된 템플릿과 파일 구조가 다릅니다. ${expected || key} 열 위치를 다시 지정해주세요.`, field: key, expected, actual };
    }
  }
  return { ok: true, headers };
}

export function normalizePaymentRows(sheet, template, { limit = Infinity } = {}) {
  if (!sheet) return [];
  const headerIndex = Math.max(0, (Number(template?.headerRow) || 1) - 1);
  const fields = template?.fields || {};
  const get = (row, key) => {
    const field = fields[key];
    return field && field.index >= 0 ? row[field.index] ?? '' : '';
  };
  const result = [];
  for (let index = headerIndex + 1; index < sheet.rows.length && result.length < limit; index += 1) {
    const row = sheet.rows[index] || [];
    const payerName = cleanText(get(row, 'payerName'));
    const amount = parseAmount(get(row, 'amount'));
    if (!payerName || amount <= 0) continue;
    const dateText = dateValueToText(get(row, 'date'));
    const timeText = timeValueToText(get(row, 'time'));
    let date = dateText;
    if (timeText && dateText) {
      const bareDate = dateText.match(/^\d{4}-\d{2}-\d{2}$/) || !/\d{1,2}:\d{2}/.test(dateText);
      if (bareDate) date = `${dateText} ${timeText}`.trim();
    }
    result.push({
      sourceRow: index + 1,
      transactionId: cleanText(get(row, 'transactionId')),
      date: cleanText(date),
      payerName,
      amount,
    });
  }
  return result;
}

export function headerRowOptions(rows = [], maxRows = 30) {
  return rows.slice(0, maxRows).map((row, index) => ({
    rowNumber: index + 1,
    label: `${index + 1}행 · ${row.filter((value)=>cleanText(value)).slice(0,6).map(cleanText).join(' | ') || '(빈 행)'}`,
  }));
}
