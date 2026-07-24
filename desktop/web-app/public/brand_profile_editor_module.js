(function() {
'use strict';
if (window.AlloModules && window.AlloModules.BrandProfileEditor) { console.log('[CDN] BrandProfileEditor already loaded, skipping'); return; }
// brand_profile_editor_source.jsx — Brand Settings editor UI for AlloFlow
//
// The DATA layer lives in brand_profile_module.js (window.AlloModules.BrandProfile):
// CRUD + validation + WCAG contrast + CSS/HTML adapters, all localStorage-backed.
// This module is the UI that lets a teacher CREATE / edit / select brand
// profiles so the Document Builder + PDF export pipeline have something to read.
//
// Registered as window.AlloModules.BrandProfileEditor (a React component),
// opened from the Educator Hub via the standard CDNModuleGate pattern.
// build.js wraps this source in an IIFE + dedup guard (see COMPILE_PAIRS).
//
// Conventions: global React (hooks via React.useState etc.), Tailwind classes
// for chrome, INLINE styles for the brand PREVIEW (renders actual brand colors;
// React auto-escapes the text, so no XSS in the preview). All persistence goes
// through the data module's validated API — this file never touches localStorage.

const FONT_CHOICES = [{
  label: 'Inter / system sans',
  value: "'Inter', system-ui, sans-serif"
}, {
  label: 'Georgia serif',
  value: "Georgia, 'Times New Roman', serif"
}, {
  label: 'System serif',
  value: "ui-serif, Georgia, serif"
}, {
  label: 'Verdana (high legibility)',
  value: "Verdana, Geneva, sans-serif"
}, {
  label: 'Atkinson Hyperlegible',
  value: "'Atkinson Hyperlegible', system-ui, sans-serif"
}, {
  label: 'Monospace',
  value: "ui-monospace, 'Cascadia Code', monospace"
}];
const COLOR_FIELDS = [{
  key: 'heading',
  label: 'Heading'
}, {
  key: 'body',
  label: 'Body text'
}, {
  key: 'accent',
  label: 'Accent / links'
}, {
  key: 'bg',
  label: 'Page background'
}, {
  key: 'cardBg',
  label: 'Card background'
}, {
  key: 'cardBorder',
  label: 'Card border'
}];

// Access the data module lazily (load-order safe).
function BP() {
  return typeof window !== 'undefined' && window.AlloModules && window.AlloModules.BrandProfile || null;
}
function normHex(v) {
  let h = String(v || '').trim();
  if (h && h[0] !== '#') h = '#' + h;
  return h;
}
function BrandProfileEditor(props) {
  const onClose = props.onClose || function () {};
  const t = typeof props.t === 'function' ? props.t : function (k, d) {
    return d || k;
  };
  const addToast = typeof props.addToast === 'function' ? props.addToast : function () {};
  const api = BP();
  const blankDraft = React.useCallback(function () {
    const d = api ? api.DEFAULT_COLORS : {
      heading: '#1e3a5f',
      accent: '#2563eb',
      body: '#1f2937',
      bg: '#ffffff',
      cardBg: '#f8fafc',
      cardBorder: '#e2e8f0'
    };
    const f = api ? api.DEFAULT_FONTS : {
      body: "'Inter', system-ui, sans-serif",
      heading: null
    };
    return {
      id: null,
      name: '',
      colors: Object.assign({}, d),
      fonts: Object.assign({}, f),
      logo: null,
      header: {
        text: '',
        showLogo: false
      },
      footer: {
        text: '',
        showPageNumber: false
      }
    };
  }, [api]);
  const [profiles, setProfiles] = React.useState([]);
  const [activeId, setActiveId] = React.useState(null);
  const [draft, setDraft] = React.useState(blankDraft);
  const fileInputRef = React.useRef(null);
  const importInputRef = React.useRef(null);
  const dialogRef = React.useRef(null);
  const closeButtonRef = React.useRef(null);
  const deleteDialogRef = React.useRef(null);
  const deleteTriggerRef = React.useRef(null);
  const [deleteRequest, setDeleteRequest] = React.useState(null);
  React.useEffect(function () {
    if (!deleteRequest) return;
    const cancel = deleteDialogRef.current && deleteDialogRef.current.querySelector('[data-safe-default="true"]');
    if (cancel) cancel.focus();
  }, [deleteRequest]);
  React.useEffect(function () {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const previousFocus = document.activeElement;
    (closeButtonRef.current || dialog).focus();
    const getFocusable = function () {
      return Array.from(dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    };
    const onKeyDown = function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('keydown', onKeyDown);
    return function () {
      dialog.removeEventListener('keydown', onKeyDown);
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, [onClose]);
  const refresh = React.useCallback(function () {
    if (!api) return;
    try {
      setProfiles(api.listBrandProfiles());
      const active = api.getActiveBrandProfile();
      setActiveId(active ? active.id : null);
    } catch (e) {/* read failures already warn in the data module */}
  }, [api]);
  React.useEffect(function () {
    refresh();
    function onChange() {
      refresh();
    }
    window.addEventListener('alloflow:brand-profile-changed', onChange);
    return function () {
      window.removeEventListener('alloflow:brand-profile-changed', onChange);
    };
  }, [refresh]);

  // Live validation of the current draft (errors block save; warnings advise).
  const validation = React.useMemo(function () {
    if (!api) return {
      ok: true,
      errors: [],
      warnings: []
    };
    try {
      return api.validateBrandProfile(draft);
    } catch (e) {
      return {
        ok: false,
        errors: ['Validation failed: ' + e.message],
        warnings: []
      };
    }
  }, [api, draft]);
  function setColor(key, value) {
    setDraft(function (d) {
      return Object.assign({}, d, {
        colors: Object.assign({}, d.colors, {
          [key]: value
        })
      });
    });
  }
  function setField(key, value) {
    setDraft(function (d) {
      return Object.assign({}, d, {
        [key]: value
      });
    });
  }
  function setHeader(patch) {
    setDraft(function (d) {
      return Object.assign({}, d, {
        header: Object.assign({}, d.header, patch)
      });
    });
  }
  function setFooter(patch) {
    setDraft(function (d) {
      return Object.assign({}, d, {
        footer: Object.assign({}, d.footer, patch)
      });
    });
  }
  function editProfile(p) {
    setDraft(JSON.parse(JSON.stringify(p)));
  }
  function newProfile() {
    setDraft(blankDraft());
  }
  function autoFix() {
    if (!api) return;
    try {
      const res = api.autoFixBrandColors(draft, 4.5);
      setDraft(function (d) {
        return Object.assign({}, d, {
          colors: res.profile.colors
        });
      });
      if (res.fixes && res.fixes.length) {
        addToast(t('brand.autofix_applied', 'Adjusted ' + res.fixes.length + ' color(s) to meet contrast'), 'success');
      } else {
        addToast(t('brand.autofix_none', 'Colors already meet contrast'), 'info');
      }
    } catch (e) {
      addToast('Auto-fix failed: ' + e.message, 'error');
    }
  }
  function save() {
    if (!api) return;
    const res = api.saveBrandProfile(draft);
    if (res.ok) {
      addToast(t('brand.saved', 'Brand profile saved'), 'success');
      if (res.warnings && res.warnings.length) {
        addToast(res.warnings.length + ' contrast warning(s) — see editor', 'info');
      }
      setDraft(function (d) {
        return Object.assign({}, d, {
          id: res.id
        });
      });
      refresh();
    } else {
      addToast(res.errors && res.errors[0] || t('brand.save_failed', 'Could not save — fix the errors shown'), 'error');
    }
  }
  function makeActive(id) {
    if (!api) return;
    if (api.setActiveBrandProfile(id)) {
      addToast(t('brand.set_active', 'Active brand set'), 'success');
      refresh();
    }
  }
  function requestRemove(event, id, name) {
    deleteTriggerRef.current = event.currentTarget;
    setDeleteRequest({
      id: id,
      name: name || t('brand.unnamed', 'unnamed profile')
    });
  }
  function closeDeleteDialog() {
    setDeleteRequest(null);
    window.setTimeout(function () {
      const trigger = deleteTriggerRef.current;
      if (trigger && trigger.isConnected && typeof trigger.focus === 'function') trigger.focus();else if (closeButtonRef.current) closeButtonRef.current.focus();
    }, 0);
  }
  function confirmRemove() {
    if (!api || !deleteRequest) return;
    const id = deleteRequest.id;
    if (api.deleteBrandProfile(id)) {
      addToast(t('brand.deleted', 'Brand profile deleted'), 'success');
      if (draft.id === id) newProfile();
      refresh();
    }
    closeDeleteDialog();
  }
  function exportProfile(id) {
    if (!api) return;
    const json = api.exportBrandProfile(id);
    if (!json) {
      addToast(t('brand.export_failed', 'Nothing to export'), 'error');
      return;
    }
    try {
      const blob = new Blob([json], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (id || 'brand-profile') + '.alloflow-brand.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (e) {
      addToast('Export failed: ' + e.message, 'error');
    }
  }
  function onImportFile(e) {
    if (!api) return;
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      const res = api.importBrandProfile(String(reader.result || ''));
      if (res.ok) {
        addToast(t('brand.imported', 'Brand profile imported'), 'success');
        refresh();
        const imported = api.getBrandProfile(res.id);
        if (imported) editProfile(imported);
      } else {
        addToast(res.errors && res.errors[0] || t('brand.import_failed', 'Import failed'), 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }
  function onLogoFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 512 * 1024) {
      addToast(t('brand.logo_too_big', 'Logo is over 512 KB — please use a smaller image'), 'error');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = function () {
      setDraft(function (d) {
        return Object.assign({}, d, {
          logo: {
            src: String(reader.result || ''),
            alt: d.logo && d.logo.alt || '',
            width: null,
            height: null
          }
        });
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }
  function setLogoAlt(alt) {
    setDraft(function (d) {
      return Object.assign({}, d, {
        logo: d.logo ? Object.assign({}, d.logo, {
          alt: alt
        }) : {
          src: '',
          alt: alt
        }
      });
    });
  }
  function removeLogo() {
    setDraft(function (d) {
      return Object.assign({}, d, {
        logo: null,
        header: Object.assign({}, d.header, {
          showLogo: false
        })
      });
    });
  }
  const c = draft.colors || {};
  const headingFont = draft.fonts && draft.fonts.heading || draft.fonts && draft.fonts.body || 'inherit';
  const bodyFont = draft.fonts && draft.fonts.body || 'inherit';
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4",
    role: "presentation",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    ref: dialogRef,
    tabIndex: -1,
    className: "bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "brand-settings-title",
    "aria-hidden": deleteRequest ? 'true' : undefined,
    inert: deleteRequest ? '' : undefined,
    onClick: function (e) {
      e.stopPropagation();
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 shrink-0"
  }, /*#__PURE__*/React.createElement("h2", {
    id: "brand-settings-title",
    className: "text-lg font-bold text-slate-800 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83C\uDFA8"), " ", t('brand.title', 'Brand Settings')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    ref: closeButtonRef,
    onClick: onClose,
    "aria-label": t('common.close', 'Close'),
    className: "p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors text-xl leading-none"
  }, "\xD7")), !api ? /*#__PURE__*/React.createElement("div", {
    className: "p-8 text-center text-slate-600"
  }, t('brand.unavailable', 'Brand Profile module not loaded.')) : /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col lg:flex-row flex-1 min-h-0 overflow-y-auto lg:overflow-hidden"
  }, /*#__PURE__*/React.createElement("aside", {
    className: "w-full lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50 flex flex-col max-h-56 lg:max-h-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-3 flex flex-col gap-2 border-b border-slate-200"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: newProfile,
    className: "w-full px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
  }, "+ ", t('brand.new', 'New profile')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      importInputRef.current && importInputRef.current.click();
    },
    className: "w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100 transition-colors"
  }, "\u2B06 ", t('brand.import', 'Import JSON')), /*#__PURE__*/React.createElement("input", {
    ref: importInputRef,
    "aria-label": t('brand.import_file', 'Import brand profile JSON file'),
    type: "file",
    accept: ".json,application/json",
    onChange: onImportFile,
    className: "hidden"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto p-2"
  }, profiles.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-500 p-2"
  }, t('brand.empty', 'No brand profiles yet. Create one to brand your documents and PDFs.')) : profiles.map(function (p) {
    const isActive = p.id === activeId;
    const isEditing = p.id === draft.id;
    return /*#__PURE__*/React.createElement("div", {
      key: p.id,
      className: 'mb-1 rounded-lg border px-2 py-2 ' + (isEditing ? 'border-blue-400 bg-blue-50' : 'border-transparent hover:bg-white')
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between gap-1"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: function () {
        editProfile(p);
      },
      "aria-pressed": isEditing,
      className: "text-left text-sm font-semibold text-slate-800 truncate flex-1 min-h-6",
      title: p.name
    }, p.name || '(unnamed)'), isActive && /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] font-bold uppercase text-green-700 bg-green-100 px-1.5 py-0.5 rounded"
    }, t('brand.active', 'Active'))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mt-1"
    }, !isActive && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: function () {
        makeActive(p.id);
      },
      className: "inline-flex min-h-6 items-center text-[11px] text-blue-700 hover:underline"
    }, t('brand.use', 'Set active')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: function () {
        exportProfile(p.id);
      },
      className: "inline-flex min-h-6 items-center text-[11px] text-slate-600 hover:underline"
    }, t('brand.export', 'Export')), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: function (event) {
        requestRemove(event, p.id, p.name);
      },
      className: "inline-flex min-h-6 items-center text-[11px] text-red-600 hover:underline"
    }, t('brand.delete', 'Delete'))));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto p-5 min-w-0"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block mb-4"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold uppercase tracking-wide text-slate-500"
  }, t('brand.name', 'Profile name')), /*#__PURE__*/React.createElement("input", {
    value: draft.name,
    "aria-label": t('brand.name', 'Profile name'),
    onChange: function (e) {
      setField('name', e.target.value);
    },
    maxLength: 80,
    placeholder: t('brand.name_ph', 'e.g. King Middle School'),
    className: "mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-400 outline-none"
  })), /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold uppercase tracking-wide text-slate-500"
  }, t('brand.colors', 'Colors')), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2 mt-1"
  }, COLOR_FIELDS.map(function (f) {
    const val = normHex(c[f.key]);
    const valid = api.isValidHex(val);
    return /*#__PURE__*/React.createElement("div", {
      key: f.key,
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("input", {
      type: "color",
      "aria-label": f.label,
      value: valid ? val.length === 4 ? val : val.slice(0, 7) : '#000000',
      onChange: function (e) {
        setColor(f.key, e.target.value);
      },
      className: "w-8 h-8 rounded border border-slate-300 shrink-0 cursor-pointer"
    }), /*#__PURE__*/React.createElement("div", {
      className: "flex-1 min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-slate-600 truncate"
    }, f.label), /*#__PURE__*/React.createElement("input", {
      value: val,
      "aria-label": f.label + ' hex value',
      "aria-invalid": !valid,
      "aria-describedby": !valid ? 'brand-validation-status' : undefined,
      onChange: function (e) {
        setColor(f.key, e.target.value);
      },
      className: 'w-full px-1.5 py-0.5 border rounded text-xs font-mono ' + (valid ? 'border-slate-300 text-slate-800' : 'border-red-400 text-red-700')
    })));
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: autoFix,
    className: "mt-2 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold hover:bg-amber-200 transition-colors"
  }, "\u2728 ", t('brand.autofix', 'Auto-fix contrast'))), /*#__PURE__*/React.createElement("label", {
    className: "block mb-4"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold uppercase tracking-wide text-slate-500"
  }, t('brand.font', 'Body font')), /*#__PURE__*/React.createElement("select", {
    value: bodyFont,
    "aria-label": t('brand.font', 'Body font'),
    onChange: function (e) {
      setDraft(function (d) {
        return Object.assign({}, d, {
          fonts: Object.assign({}, d.fonts, {
            body: e.target.value
          })
        });
      });
    },
    className: "mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white outline-none focus:ring-2 focus:ring-blue-400"
  }, FONT_CHOICES.concat(FONT_CHOICES.some(function (x) {
    return x.value === bodyFont;
  }) ? [] : [{
    label: 'Current',
    value: bodyFont
  }]).map(function (f) {
    return /*#__PURE__*/React.createElement("option", {
      key: f.value,
      value: f.value
    }, f.label);
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold uppercase tracking-wide text-slate-500"
  }, t('brand.logo', 'Logo (optional)')), /*#__PURE__*/React.createElement("div", {
    className: "mt-1 flex items-start gap-3"
  }, draft.logo && draft.logo.src ? /*#__PURE__*/React.createElement("img", {
    src: draft.logo.src,
    alt: draft.logo.alt || '',
    className: "h-12 w-auto max-w-[96px] rounded border border-slate-200 bg-white object-contain"
  }) : null, /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      fileInputRef.current && fileInputRef.current.click();
    },
    className: "px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-100"
  }, draft.logo && draft.logo.src ? t('brand.logo_replace', 'Replace') : t('brand.logo_upload', 'Upload logo')), draft.logo && draft.logo.src && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: removeLogo,
    className: "px-3 py-1.5 rounded-lg text-red-600 text-xs font-medium hover:bg-red-50"
  }, t('brand.logo_remove', 'Remove')), /*#__PURE__*/React.createElement("input", {
    ref: fileInputRef,
    "aria-label": t('brand.logo_file', 'Upload logo image file'),
    type: "file",
    accept: "image/*",
    onChange: onLogoFile,
    className: "hidden"
  })), draft.logo && draft.logo.src && /*#__PURE__*/React.createElement("input", {
    "aria-label": t('brand.logo_alt', 'Logo alternative text'),
    value: draft.logo.alt || '',
    onChange: function (e) {
      setLogoAlt(e.target.value);
    },
    placeholder: t('brand.logo_alt_ph', 'Logo alt text (required) — describe the logo'),
    className: "mt-1 w-full px-2 py-1 border border-slate-300 rounded text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-400"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 gap-3 mb-2"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold uppercase tracking-wide text-slate-500"
  }, t('brand.header', 'Header band')), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('brand.header_text', 'Header text'),
    value: draft.header.text,
    onChange: function (e) {
      setHeader({
        text: e.target.value
      });
    },
    maxLength: 200,
    placeholder: t('brand.header_ph', 'Header text (e.g. school name)'),
    className: "mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-400"
  }), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 mt-1 text-xs text-slate-600"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!draft.header.showLogo,
    onChange: function (e) {
      setHeader({
        showLogo: e.target.checked
      });
    }
  }), " ", t('brand.header_logo', 'Show logo in header'))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold uppercase tracking-wide text-slate-500"
  }, t('brand.footer', 'Footer band')), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('brand.footer_text', 'Footer text'),
    value: draft.footer.text,
    onChange: function (e) {
      setFooter({
        text: e.target.value
      });
    },
    maxLength: 200,
    placeholder: t('brand.footer_ph', 'Footer text (e.g. © School 2026)'),
    className: "mt-1 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-400"
  }), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2 mt-1 text-xs text-slate-600"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!draft.footer.showPageNumber,
    onChange: function (e) {
      setFooter({
        showPageNumber: e.target.checked
      });
    }
  }), " ", t('brand.footer_page', 'Show page numbers'))))), /*#__PURE__*/React.createElement("aside", {
    className: "w-full lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto p-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold uppercase tracking-wide text-slate-500"
  }, t('brand.preview', 'Preview')), /*#__PURE__*/React.createElement("div", {
    className: "mt-1 rounded-lg overflow-hidden border border-slate-200",
    style: {
      background: c.bg,
      fontFamily: bodyFont
    }
  }, (draft.header.text || draft.header.showLogo && draft.logo && draft.logo.src) && /*#__PURE__*/React.createElement("div", {
    style: {
      background: c.heading,
      color: c.bg,
      padding: '8px 10px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }
  }, draft.header.showLogo && draft.logo && draft.logo.src && /*#__PURE__*/React.createElement("img", {
    src: draft.logo.src,
    alt: draft.logo.alt || '',
    style: {
      maxHeight: '24px',
      width: 'auto'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '12px',
      fontWeight: 700
    }
  }, draft.header.text)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: c.heading,
      fontFamily: headingFont,
      fontWeight: 800,
      fontSize: '15px'
    }
  }, t('brand.preview_heading', 'Sample Heading')), /*#__PURE__*/React.createElement("p", {
    style: {
      color: c.body,
      fontSize: '12px',
      margin: '4px 0'
    }
  }, t('brand.preview_body', 'Body text shows how readable your colors are.'), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: c.accent,
      textDecoration: 'underline'
    }
  }, t('brand.preview_link', 'a link')), "."), /*#__PURE__*/React.createElement("div", {
    style: {
      background: c.cardBg,
      border: '1px solid ' + c.cardBorder,
      borderRadius: '6px',
      padding: '6px',
      marginTop: '4px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: c.body,
      fontSize: '11px'
    }
  }, t('brand.preview_card', 'A card / callout box.')))), (draft.footer.text || draft.footer.showPageNumber) && /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid ' + c.cardBorder,
      color: c.body,
      padding: '6px 10px',
      fontSize: '10px',
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", null, draft.footer.text), draft.footer.showPageNumber && /*#__PURE__*/React.createElement("span", null, t('brand.preview_page', 'Page 1')))), /*#__PURE__*/React.createElement("div", {
    id: "brand-validation-status",
    className: "mt-3 space-y-1",
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "false"
  }, validation.errors.map(function (er, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: 'e' + i,
      className: "text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1"
    }, "\u26D4 ", er);
  }), validation.warnings.map(function (w, i) {
    return /*#__PURE__*/React.createElement("div", {
      key: 'w' + i,
      className: "text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1"
    }, "\u26A0\uFE0F ", w);
  }), validation.ok && validation.warnings.length === 0 && /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1"
  }, "\u2713 ", t('brand.passes', 'Meets WCAG AA contrast')))), /*#__PURE__*/React.createElement("div", {
    className: "p-3 border-t border-slate-200 bg-slate-50 flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: save,
    disabled: !validation.ok,
    className: 'w-full px-3 py-2 rounded-lg text-sm font-bold transition-colors ' + (validation.ok ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed')
  }, t('brand.save', 'Save profile')), draft.id && draft.id !== activeId && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      makeActive(draft.id);
    },
    className: "w-full px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors"
  }, t('brand.set_active', 'Set as active brand')))))), deleteRequest && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4",
    role: "presentation",
    onClick: function (event) {
      event.stopPropagation();
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: deleteDialogRef,
    role: "alertdialog",
    "aria-modal": "true",
    "aria-labelledby": "brand-delete-dialog-title",
    "aria-describedby": "brand-delete-dialog-description",
    onClick: function (event) {
      event.stopPropagation();
    },
    onKeyDown: function (event) {
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDeleteDialog();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(event.currentTarget.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    className: "w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
  }, /*#__PURE__*/React.createElement("h3", {
    id: "brand-delete-dialog-title",
    className: "text-lg font-bold text-slate-900"
  }, t('brand.delete_title', 'Delete brand profile?')), /*#__PURE__*/React.createElement("p", {
    id: "brand-delete-dialog-description",
    className: "mt-3 text-sm text-slate-700"
  }, t('brand.delete_confirm', 'Delete brand profile'), " \"", deleteRequest.name, "\"? ", t('brand.delete_permanent', 'This cannot be undone.')), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 flex justify-end gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-safe-default": "true",
    onClick: closeDeleteDialog,
    className: "min-h-11 rounded-lg border border-slate-400 px-4 py-2 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
  }, t('common.cancel', 'Cancel')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: confirmRemove,
    className: "min-h-11 rounded-lg bg-red-700 px-4 py-2 font-bold text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
  }, t('brand.delete', 'Delete'))))));
}
window.AlloModules = window.AlloModules || {};
window.AlloModules.BrandProfileEditor = BrandProfileEditor;
})();
