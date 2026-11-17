(function (root) {
  'use strict';
  const fields = [['SERMON TITLE','title',180],['DATE PREACHED','date',10],['SPEAKER','speaker',120],['SERVICE TYPE','category',80],['BIBLE PASSAGE','scripture',180],['SHORT SUMMARY','summary',5000],['FULL MESSAGE','body',100000]];
  function parseParagraphs(paragraphs) {
    if (!paragraphs.some(p => p.trim() === 'BOL SERMON TEMPLATE')) throw new Error('Use the BOL Word template downloaded from this editor.');
    const result = {}; let current = -1;
    for (const raw of paragraphs) {
      const line = raw.trim();
      const index = fields.findIndex(f => f[0] === line.replace(/:$/, ''));
      if (current < 6 && index >= 0) {
        if (index !== current + 1) throw new Error('Keep all seven template headings in their original order.');
        current = index; result[fields[current][1]] = ''; continue;
      }
      if (current >= 0 && !/^\[Replace:.*\]$/.test(line)) result[fields[current][1]] += raw + '\n';
    }
    if (current !== 6) throw new Error('The template is missing sections. Download a fresh template.');
    for (const [, key, max] of fields) {
      result[key] = result[key].trim();
      if (!['summary','body'].includes(key) && !result[key]) throw new Error('Please complete '+fields.find(f=>f[1]===key)[0]+' in Word.');
      if (result[key].length > max) throw new Error(key+' is too long (maximum '+max+' characters).');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(result.date) || !Number.isFinite(Date.parse(result.date+'T12:00:00Z')) || new Date(result.date+'T12:00:00Z').toISOString().slice(0,10) !== result.date) throw new Error('Use a real date in YYYY-MM-DD format, for example 2027-01-03.');
    const category = ['Sunday Service','Hour of Power','Thanksgiving'].find(c=>c.toLowerCase()===result.category.toLowerCase());
    if (!category) throw new Error('Service type must be Sunday Service, Hour of Power or Thanksgiving.');
    result.category = category; return result;
  }
  async function readDocx(buffer, Zip, Parser) {
    if (buffer.byteLength > 10*1024*1024) throw new Error('Choose a Word document under 10 MB.');
    const zip = await Zip.loadAsync(buffer);
    const entry = zip.file('word/document.xml');
    if (!entry) throw new Error('This is not a readable Word .docx document.');
    if (entry._data && entry._data.uncompressedSize > 2*1024*1024) throw new Error('This document is too large. Use a text-only copy of the template.');
    const xml = await entry.async('string');
    if (xml.length > 2*1024*1024 || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Unsupported Word document.');
    const doc = new Parser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('The Word document could not be read.');
    const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
    const paragraphs = Array.from(doc.getElementsByTagNameNS(ns,'p')).map(p => {
      let text = '';
      function visit(node) {
        if (node.namespaceURI===ns && node.localName==='del') return;
        if (node.namespaceURI===ns && node.localName==='t') { text += node.textContent; return; }
        if (node.namespaceURI===ns && ['br','cr'].includes(node.localName)) text += '\n';
        if (node.namespaceURI===ns && node.localName==='tab') text += '\t';
        for (let child=node.firstChild; child; child=child.nextSibling) visit(child);
      }
      visit(p); return text;
    });
    return parseParagraphs(paragraphs);
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports={parseParagraphs,readDocx}; return; }
  root.BOLSermonImport={parseParagraphs,readDocx};
  const input=document.getElementById('sermon-word');
  input.addEventListener('change', async () => {
    const file=input.files[0]; if(!file) return;
    const status=document.getElementById('import-status');
    status.textContent='Reading your Word document.'; status.classList.remove('error'); input.disabled=true;
    try {
      if(!/\.docx$/i.test(file.name)) throw new Error('Choose a .docx file. Older .doc and PDF files cannot be imported.');
      if(file.size>10*1024*1024) throw new Error('Choose a Word document under 10 MB.');
      const record=await readDocx(await file.arrayBuffer(),root.JSZip,root.DOMParser);
      if (['title','speaker','scripture','summary','body'].some(k=>document.getElementById('sermon-'+k).value.trim()) && !root.confirm('Replace the current message fields with this Word document? Your PDF link will be kept.')) { status.textContent='Import cancelled. Your draft is unchanged.'; return; }
      for(const [,key] of fields) document.getElementById('sermon-'+key).value=record[key];
      document.getElementById('sermon-form').dispatchEvent(new Event('input',{bubbles:true}));
      status.textContent='Imported. Review the fields, optionally add your PDF link, then choose Preview sermon. Text and paragraph breaks are imported; images and Word styling are not.';
    } catch(error) { status.textContent=error.message || 'Could not read the document. Save it as .docx and try again.'; status.classList.add('error'); }
    finally { input.disabled=false; input.value=''; }
  });
})(typeof window !== 'undefined' ? window : this);

