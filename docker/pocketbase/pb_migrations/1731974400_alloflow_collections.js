/// <reference path="../pb_data/types.d.ts" />
// PocketBase JS migration enforcing owner-scoped FERPA isolation across all AlloFlow collections.
// Supports PocketBase v0.23+ (app API, fields, @request.body) with fallback for legacy v0.22 (Dao, schema, @request.data).
migrate((db) => {
  const isV23 = Boolean(db && typeof db.findCollectionByNameOrId === "function" && typeof db.save === "function");
  const dao = isV23 ? null : new Dao(db);
  const reqField = isV23 ? "@request.body" : "@request.data";
  const ownerRead = "@request.auth.id != '' && owner_id = @request.auth.id";
  const ownerCreate = "@request.auth.id != '' && " + reqField + ".owner_id = @request.auth.id";
  const ownerUpdate = "@request.auth.id != '' && owner_id = @request.auth.id && (" + reqField + ".owner_id:isset = false || " + reqField + ".owner_id = @request.auth.id)";

  const definitions = [
    {
      name: "sessions",
      type: "base",
      listRule: ownerRead,
      viewRule: ownerRead,
      createRule: ownerCreate,
      updateRule: ownerUpdate,
      deleteRule: ownerRead,
      fields: [
        { name: "owner_id", type: "text", required: true },
        { name: "app_id", type: "text", required: true },
        { name: "code", type: "text", required: true },
        { name: "mode", type: "text" },
        { name: "content", type: "json" },
        { name: "quizState", type: "json" },
        { name: "escapeRoomState", type: "json" },
        { name: "roster", type: "json" },
        { name: "bridgePayload", type: "json" },
        { name: "bridgeChat", type: "json" },
        { name: "metadata", type: "json" }
      ],
      indexes: [
        "CREATE INDEX idx_sessions_code ON sessions (code)",
        "CREATE INDEX idx_sessions_app ON sessions (app_id)",
        "CREATE INDEX idx_sessions_owner ON sessions (owner_id)"
      ]
    },
    {
      name: "teacher_history",
      type: "base",
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != '' && " + reqField + ".user_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id && (" + reqField + ".user_id:isset = false || " + reqField + ".user_id = @request.auth.id)",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        { name: "app_id", type: "text", required: true },
        { name: "user_id", type: "text", required: true },
        { name: "entries", type: "json" }
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_th_user ON teacher_history (app_id, user_id)"
      ]
    },
    {
      name: "session_assets",
      type: "base",
      listRule: ownerRead,
      viewRule: ownerRead,
      createRule: ownerCreate,
      updateRule: ownerUpdate,
      deleteRule: ownerRead,
      fields: [
        { name: "owner_id", type: "text", required: true },
        { name: "app_id", type: "text", required: true },
        { name: "asset_id", type: "text", required: true },
        { name: "data", type: "json" }
      ],
      indexes: [
        "CREATE INDEX idx_sa_app ON session_assets (app_id)",
        "CREATE INDEX idx_sa_owner ON session_assets (owner_id)"
      ]
    },
    {
      name: "student_progress",
      type: "base",
      listRule: ownerRead,
      viewRule: ownerRead,
      createRule: ownerCreate + " && session_code != '' && student_id != ''",
      updateRule: ownerUpdate,
      deleteRule: ownerRead,
      fields: [
        { name: "owner_id", type: "text", required: true },
        { name: "session_code", type: "text", required: true },
        { name: "student_id", type: "text", required: true },
        { name: "progress_data", type: "json" }
      ],
      indexes: [
        "CREATE INDEX idx_sp_session ON student_progress (session_code)",
        "CREATE INDEX idx_sp_owner ON student_progress (owner_id)"
      ]
    },
    {
      name: "images",
      type: "base",
      listRule: ownerRead,
      viewRule: ownerRead,
      createRule: ownerCreate,
      updateRule: null,
      deleteRule: ownerRead,
      fields: [
        { name: "owner_id", type: "text", required: true },
        { name: "app_id", type: "text" },
        { name: "prompt", type: "text" },
        { name: "image_data", type: "text" }
      ],
      indexes: [
        "CREATE INDEX idx_img_app ON images (app_id)",
        "CREATE INDEX idx_img_owner ON images (owner_id)"
      ]
    }
  ];

  const createV23Field = (f) => {
    if (f.type === "json" && typeof JSONField === "function") return new JSONField(f);
    if (f.type === "text" && typeof TextField === "function") return new TextField(f);
    if (typeof Field === "function") return new Field(f);
    return f;
  };

  const extractIndexName = (sql) => {
    const m = String(sql || "").match(/INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"'\[]?([a-z0-9_]+)[`"'\]]?/i);
    return m ? m[1].toLowerCase() : String(sql || "").trim().toLowerCase();
  };

  const ensureFieldsAndIndexes = (collection, def) => {
    if (isV23 && collection.fields && typeof collection.fields.getByName === "function") {
      for (const f of def.fields) {
        if (!collection.fields.getByName(f.name)) {
          collection.fields.add(createV23Field(f));
        }
      }
    } else if (collection.schema && typeof collection.schema.getFieldByName === "function") {
      for (const f of def.fields) {
        if (!collection.schema.getFieldByName(f.name)) {
          collection.schema.addField(new SchemaField(f));
        }
      }
    }
    if (Array.isArray(def.indexes)) {
      const existingIndexes = Array.isArray(collection.indexes) ? collection.indexes : [];
      const existingNames = new Set(existingIndexes.map(extractIndexName));
      for (const idx of def.indexes) {
        const idxName = extractIndexName(idx);
        if (!existingNames.has(idxName)) {
          existingIndexes.push(idx);
          existingNames.add(idxName);
        }
      }
      collection.indexes = existingIndexes;
    }
  };

  for (const def of definitions) {
    let existing = null;
    try {
      existing = isV23 ? db.findCollectionByNameOrId(def.name) : dao.findCollectionByNameOrId(def.name);
    } catch (_) {
      existing = null;
    }
    if (existing) {
      ensureFieldsAndIndexes(existing, def);
      existing.listRule = def.listRule;
      existing.viewRule = def.viewRule;
      existing.createRule = def.createRule;
      existing.updateRule = def.updateRule;
      existing.deleteRule = def.deleteRule;
      if (isV23) db.save(existing);
      else dao.saveCollection(existing);
    } else if (isV23) {
      db.save(new Collection(def));
    } else {
      const legacyDef = Object.assign({}, def, { schema: def.fields });
      delete legacyDef.fields;
      dao.saveCollection(new Collection(legacyDef));
    }
  }
}, (db) => {
  const isV23 = Boolean(db && typeof db.findCollectionByNameOrId === "function" && typeof db.delete === "function");
  const dao = isV23 ? null : new Dao(db);
  for (const name of ["images", "student_progress", "session_assets", "teacher_history", "sessions"]) {
    try {
      const col = isV23 ? db.findCollectionByNameOrId(name) : dao.findCollectionByNameOrId(name);
      if (col) {
        if (isV23) db.delete(col);
        else dao.deleteCollection(col);
      }
    } catch (_) {}
  }
});
