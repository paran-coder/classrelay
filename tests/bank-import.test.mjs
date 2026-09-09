import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBankFileBytes, suggestHeaderRow, suggestColumnMapping, templateFromSelection,
  validateBankTemplate, validateTemplateStructure, normalizePaymentRows,
} from '../assets/bank-import.mjs';

function record(id, data = new Uint8Array()) {
  const out = new Uint8Array(4 + data.length);
  const view = new DataView(out.buffer);
  view.setUint16(0, id, true);
  view.setUint16(2, data.length, true);
  out.set(data, 4);
  return out;
}
function concat(parts) {
  const size = parts.reduce((sum,p)=>sum+p.length,0);
  const out = new Uint8Array(size); let offset=0;
  parts.forEach((part)=>{ out.set(part,offset); offset+=part.length; });
  return out;
}
function u16(value) { const b=new Uint8Array(2); new DataView(b.buffer).setUint16(0,value,true); return b; }
function u32(value) { const b=new Uint8Array(4); new DataView(b.buffer).setUint32(0,value,true); return b; }
function f64(value) { const b=new Uint8Array(8); new DataView(b.buffer).setFloat64(0,value,true); return b; }
function unicodeString(value) {
  const chars = new TextEncoder(); // only used for length below
  const encoded = new Uint8Array(value.length * 2);
  const view = new DataView(encoded.buffer);
  [...value].forEach((char,index)=>view.setUint16(index*2,char.charCodeAt(0),true));
  return concat([u16(value.length), new Uint8Array([1]), encoded]);
}
function labelSst(row,col,index) { return record(0x00FD, concat([u16(row),u16(col),u16(0),u32(index)])); }
function numberCell(row,col,value) { return record(0x0203, concat([u16(row),u16(col),u16(0),f64(value)])); }

function makeSyntheticXls() {
  const strings = ['입금일시','입금자명','입금액','2026-09-09 10:30','김민수'];
  const sstBody = concat([u32(strings.length),u32(strings.length),...strings.map(unicodeString)]);
  const bof = record(0x0809, new Uint8Array(16));
  const eof = record(0x000A);
  const sheetName = '입금내역';
  const sheetNameBytes = new Uint8Array(sheetName.length*2);
  const snv = new DataView(sheetNameBytes.buffer);
  [...sheetName].forEach((char,index)=>snv.setUint16(index*2,char.charCodeAt(0),true));
  const boundPlaceholder = concat([u32(0),new Uint8Array([0,0,sheetName.length,1]),sheetNameBytes]);
  const globalBeforeSheet = [bof, record(0x0085,boundPlaceholder), record(0x00FC,sstBody), eof];
  const sheetOffset = globalBeforeSheet.reduce((sum,p)=>sum+p.length,0);
  const bound = concat([u32(sheetOffset),new Uint8Array([0,0,sheetName.length,1]),sheetNameBytes]);
  const sheet = concat([
    bof,
    labelSst(0,0,0), labelSst(0,1,1), labelSst(0,2,2),
    labelSst(1,0,3), labelSst(1,1,4), numberCell(1,2,39000),
    eof,
  ]);
  let workbook = concat([bof, record(0x0085,bound), record(0x00FC,sstBody), eof, sheet]);
  if (workbook.length < 4608) {
    const padded = new Uint8Array(4608); padded.set(workbook); workbook = padded;
  }

  const sectorSize = 512;
  const workbookSectors = Math.ceil(workbook.length / sectorSize);
  const totalSectors = 2 + workbookSectors; // FAT + directory + workbook
  assert.ok(totalSectors < 128);
  const file = new Uint8Array(512 + totalSectors * sectorSize);
  const hv = new DataView(file.buffer,0,512);
  file.set(Uint8Array.from([0xD0,0xCF,0x11,0xE0,0xA1,0xB1,0x1A,0xE1]),0);
  hv.setUint16(0x1C,0xFFFE,true); // byte order
  hv.setUint16(0x1E,9,true); // sector 512
  hv.setUint16(0x20,6,true); // mini sector 64
  hv.setUint32(0x2C,1,true); // FAT sectors
  hv.setUint32(0x30,1,true); // directory sector
  hv.setUint32(0x38,4096,true);
  hv.setUint32(0x3C,0xFFFFFFFE,true);
  hv.setUint32(0x40,0,true);
  hv.setUint32(0x44,0xFFFFFFFE,true);
  hv.setUint32(0x48,0,true);
  for (let i=0;i<109;i+=1) hv.setUint32(0x4C+i*4,0xFFFFFFFF,true);
  hv.setUint32(0x4C,0,true); // FAT sector id

  const fatOffset = 512;
  const fv = new DataView(file.buffer,fatOffset,sectorSize);
  for (let i=0;i<128;i+=1) fv.setUint32(i*4,0xFFFFFFFF,true);
  fv.setUint32(0,0xFFFFFFFD,true); // FAT sector
  fv.setUint32(4,0xFFFFFFFE,true); // directory end
  for (let i=0;i<workbookSectors;i+=1) fv.setUint32((2+i)*4, i===workbookSectors-1?0xFFFFFFFE:3+i,true);

  const dirOffset = 512 + sectorSize;
  const writeDir = (entryOffset,name,type,start,size) => {
    const encoded = new Uint8Array((name.length+1)*2);
    const view = new DataView(encoded.buffer);
    [...name].forEach((char,index)=>view.setUint16(index*2,char.charCodeAt(0),true));
    file.set(encoded,dirOffset+entryOffset);
    const dv = new DataView(file.buffer,dirOffset+entryOffset,128);
    dv.setUint16(64,encoded.length,true); file[dirOffset+entryOffset+66]=type;
    dv.setUint32(116,start,true); dv.setUint32(120,size,true); dv.setUint32(124,0,true);
  };
  writeDir(0,'Root Entry',5,0xFFFFFFFE,0);
  writeDir(128,'Workbook',2,2,workbook.length);
  file.set(workbook,512+(2*sectorSize));
  return file;
}

test('CSV/TSV 파일을 표 형태로 읽고 헤더 행을 추천한다', () => {
  const bytes = new TextEncoder().encode('안내\n입금일시,입금자명,입금액\n2026-09-09 10:30,김민수,"39,000"\n');
  const parsed = parseBankFileBytes(bytes,'sample.csv');
  assert.equal(parsed.kind,'csv');
  const suggestion = suggestHeaderRow(parsed.sheets[0].rows);
  assert.equal(suggestion.rowNumber,2);
  assert.equal(suggestion.mapping.date,0);
  assert.equal(suggestion.mapping.payerName,1);
  assert.equal(suggestion.mapping.amount,2);
});

test('Excel 97-2003 OLE .xls에서 BIFF 시트와 셀을 읽는다', () => {
  const parsed = parseBankFileBytes(makeSyntheticXls(),'sample.xls');
  assert.equal(parsed.kind,'xls');
  assert.deepEqual(parsed.sheets[0].rows[0],['입금일시','입금자명','입금액']);
  assert.equal(parsed.sheets[0].rows[1][1],'김민수');
  assert.equal(parsed.sheets[0].rows[1][2],39000);
});

test('HTML .xls가 외부 sheet 파일만 참조하면 잘못 파싱하지 않는다', () => {
  const html = '<html><head><meta name="ProgId" content="Excel.Sheet"><link href="bank.files/sheet001.htm"></head><body></body></html>';
  assert.throws(() => parseBankFileBytes(new TextEncoder().encode(html),'bank.xls'), (error) => error.code === 'EXTERNAL_HTML_SHEET');
});

test('날짜와 시간이 분리된 매핑을 하나의 입금일시로 정규화한다', () => {
  const sheet = { name:'입금', rows:[['입금일자','입금시간','입금자명','입금액'],['2026-09-09','14:03:22','김민수','39,000']] };
  const headers=sheet.rows[0];
  const template=templateFromSelection({name:'신한 개인',sheetName:'입금',headerRow:1,headers,mapping:{date:0,time:1,payerName:2,amount:3,transactionId:-1}});
  assert.equal(validateBankTemplate(template),'');
  assert.deepEqual(normalizePaymentRows(sheet,template),[{sourceRow:2,transactionId:'',date:'2026-09-09 14:03:22',payerName:'김민수',amount:39000}]);
});

test('저장 템플릿과 매핑한 헤더 구조가 달라지면 재확인을 요구한다', () => {
  const template=templateFromSelection({name:'KB 개인',sheetName:'입금',headerRow:1,headers:['입금일시','입금자명','입금액'],mapping:{date:0,time:-1,payerName:1,amount:2,transactionId:-1}});
  const changed={name:'입금',rows:[['입금일시','보낸사람','입금액'],['2026-09-09','김민수','39000']]};
  const check=validateTemplateStructure(changed,template);
  assert.equal(check.ok,false);
  assert.match(check.message,/파일 구조가 다릅니다/);
});

test('선택 필드까지 저장한 템플릿은 시간/은행 고유번호 헤더 변경도 감지한다', () => {
  const headers=['입금일자','입금시간','입금자명','입금액','은행번호'];
  const template=templateFromSelection({name:'분리형',sheetName:'입금',headerRow:1,headers,mapping:{date:0,time:1,payerName:2,amount:3,transactionId:4}});
  const changed={name:'입금',rows:[['입금일자','처리시간','입금자명','입금액','은행번호'],['2026-09-09','10:00','김민수','39000','A1']]};
  const check=validateTemplateStructure(changed,template);
  assert.equal(check.ok,false);
  assert.equal(check.field,'time');
});
