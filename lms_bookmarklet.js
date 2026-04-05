/**
 * AlloFlow LMS Accessibility Bookmarklet
 *
 * Works on ANY LMS page (Brightspace, Canvas, Moodle, Blackboard, Google Classroom).
 * Scans the page for PDF/document links, lets the user select files to audit,
 * and opens AlloFlow with the files pre-loaded.
 *
 * INSTALLATION:
 * Create a bookmark with this URL (minified version at bottom):
 * javascript:(function(){...})();
 *
 * USAGE:
 * 1. Navigate to any LMS course page
 * 2. Click the bookmarklet
 * 3. A panel appears listing all PDF/document links on the page
 * 4. Select files → "Audit in AlloFlow" opens them in the pipeline
 */
(function() {
  'use strict';

  // Prevent double-injection
  if (document.getElementById('alloflow-lms-panel')) {
    document.getElementById('alloflow-lms-panel').remove();
    return;
  }

  // Scan page for document links
  const links = Array.from(document.querySelectorAll('a[href]'));
  const docLinks = links.filter(a => {
    const href = a.href.toLowerCase();
    return href.endsWith('.pdf') || href.endsWith('.docx') || href.endsWith('.pptx') ||
           href.includes('/content/') || href.includes('/d2l/') || href.includes('/files/') ||
           href.includes('/download') || href.includes('viewContent') ||
           a.textContent.toLowerCase().includes('.pdf');
  }).map(a => ({
    url: a.href,
    text: a.textContent.trim().substring(0, 60) || a.href.split('/').pop(),
    type: a.href.toLowerCase().endsWith('.pdf') ? 'PDF' :
          a.href.toLowerCase().endsWith('.docx') ? 'DOCX' :
          a.href.toLowerCase().endsWith('.pptx') ? 'PPTX' : 'File',
  }));

  // Deduplicate by URL
  const unique = [];
  const seen = new Set();
  docLinks.forEach(d => { if (!seen.has(d.url)) { seen.add(d.url); unique.push(d); } });

  // Create floating panel
  const panel = document.createElement('div');
  panel.id = 'alloflow-lms-panel';
  panel.style.cssText = 'position:fixed;top:20px;right:20px;width:380px;max-height:80vh;background:white;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.3);z-index:999999;font-family:system-ui,sans-serif;overflow:hidden;animation:slideIn 0.3s ease-out';

  const style = document.createElement('style');
  style.textContent = '@keyframes slideIn{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}';
  document.head.appendChild(style);

  panel.innerHTML = `
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:16px 20px;color:white">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:800;font-size:15px">♿ AlloFlow Accessibility Scanner</div>
          <div style="font-size:11px;opacity:0.8">${unique.length} document${unique.length !== 1 ? 's' : ''} found on this page</div>
        </div>
        <button onclick="document.getElementById('alloflow-lms-panel').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:16px">×</button>
      </div>
    </div>
    <div style="padding:12px;max-height:50vh;overflow-y:auto">
      ${unique.length === 0 ? '<p style="color:#94a3b8;text-align:center;padding:20px;font-size:13px">No documents found on this page.<br><span style="font-size:11px">Try navigating to a course content page.</span></p>' :
        '<div style="margin-bottom:8px"><label style="display:flex;align-items:center;gap:6px;font-size:11px;color:#64748b;cursor:pointer"><input type="checkbox" id="alloflow-select-all" onchange="document.querySelectorAll(\'.alloflow-file-cb\').forEach(c=>c.checked=this.checked)"> Select All</label></div>' +
        unique.map((d, i) => `
          <label style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;cursor:pointer;font-size:12px;border:1px solid #e2e8f0;margin-bottom:4px;transition:background 0.15s" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
            <input type="checkbox" class="alloflow-file-cb" data-url="${d.url}" data-name="${d.text}" checked>
            <span style="background:${d.type === 'PDF' ? '#dc262620' : '#2563eb20'};color:${d.type === 'PDF' ? '#dc2626' : '#2563eb'};padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;flex-shrink:0">${d.type}</span>
            <span style="color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${d.text}</span>
          </label>
        `).join('')
      }
    </div>
    ${unique.length > 0 ? `
    <div style="padding:12px;border-top:1px solid #e2e8f0;display:flex;gap:8px">
      <button onclick="
        var files = Array.from(document.querySelectorAll('.alloflow-file-cb:checked')).map(c => ({url: c.dataset.url, name: c.dataset.name}));
        if (files.length === 0) { alert('Select at least one file'); return; }
        var urls = files.map(f => encodeURIComponent(f.url)).join(',');
        window.open('https://prismflow-911fe.web.app?audit_urls=' + urls, '_blank');
        document.getElementById('alloflow-lms-panel').remove();
      " style="flex:1;padding:10px;background:linear-gradient(135deg,#16a34a,#059669);color:white;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer">
        ♿ Audit Selected in AlloFlow
      </button>
      <button onclick="
        var files = Array.from(document.querySelectorAll('.alloflow-file-cb:checked'));
        if (files.length === 0) return;
        var report = '♿ AlloFlow LMS Document Scan\\n' + '═'.repeat(40) + '\\n';
        report += 'Page: ' + document.title + '\\n';
        report += 'URL: ' + location.href + '\\n';
        report += 'Date: ' + new Date().toLocaleDateString() + '\\n\\n';
        report += files.length + ' documents found:\\n';
        files.forEach((f, i) => { report += (i+1) + '. ' + f.dataset.name + '\\n   ' + f.dataset.url + '\\n'; });
        report += '\\nAudit these at: https://prismflow-911fe.web.app';
        navigator.clipboard.writeText(report).then(() => alert('Document list copied to clipboard!'));
      " style="padding:10px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;color:#64748b">
        📋
      </button>
    </div>` : ''}
  `;

  document.body.appendChild(panel);
})();

// ═══════════════════════════════════════════════════════════
// MINIFIED BOOKMARKLET (paste this as a bookmark URL):
// ═══════════════════════════════════════════════════════════
// javascript:void((function(){if(document.getElementById('alloflow-lms-panel')){document.getElementById('alloflow-lms-panel').remove();return}var links=Array.from(document.querySelectorAll('a[href]'));var docs=links.filter(function(a){var h=a.href.toLowerCase();return h.endsWith('.pdf')||h.endsWith('.docx')||h.includes('/content/')||h.includes('/files/')||a.textContent.toLowerCase().includes('.pdf')}).map(function(a){return{url:a.href,text:a.textContent.trim().substring(0,60)||a.href.split('/').pop(),type:a.href.toLowerCase().endsWith('.pdf')?'PDF':'File'}});var unique=[];var seen=new Set();docs.forEach(function(d){if(!seen.has(d.url)){seen.add(d.url);unique.push(d)}});var p=document.createElement('div');p.id='alloflow-lms-panel';p.style.cssText='position:fixed;top:20px;right:20px;width:380px;max-height:80vh;background:white;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.3);z-index:999999;font-family:system-ui;overflow:hidden';p.innerHTML='<div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:16px 20px;color:white"><div style="display:flex;justify-content:space-between"><div><div style="font-weight:800;font-size:15px">♿ AlloFlow Scanner</div><div style="font-size:11px;opacity:0.8">'+unique.length+' documents found</div></div><button onclick="this.closest(\'#alloflow-lms-panel\').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:6px;cursor:pointer;font-size:16px">×</button></div></div><div style="padding:12px;max-height:50vh;overflow-y:auto">'+unique.map(function(d,i){return'<label style="display:flex;align-items:center;gap:8px;padding:6px;border-radius:6px;cursor:pointer;font-size:12px;border:1px solid #e2e8f0;margin-bottom:3px"><input type=checkbox class=af-cb data-url="'+d.url+'" checked><span style="color:#dc2626;font-size:10px;font-weight:700">'+d.type+'</span><span>'+d.text+'</span></label>'}).join('')+'</div><div style="padding:12px;border-top:1px solid #e2e8f0"><button onclick="var f=Array.from(document.querySelectorAll(\'.af-cb:checked\')).map(function(c){return c.dataset.url});window.open(\'https://prismflow-911fe.web.app?audit_urls=\'+f.map(encodeURIComponent).join(\',\'),\'_blank\')" style="width:100%;padding:10px;background:#16a34a;color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer">♿ Audit in AlloFlow</button></div>';document.body.appendChild(p)})());
