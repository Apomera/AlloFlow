/// <reference path="../pb_data/types.d.ts" />
// PocketBase JS migration enforcing owner-scoped FERPA isolation across all AlloFlow collections.
migrate((db) => {
  const dao = new Dao(db);
  const ownerRead = "@request.auth.id != '' && owner_id = @request.auth.id";
  const ownerCreate = "@request.auth.id != '' && @request.data.owner_id = @request.auth.id";
  const ownerUpdate = "@request.auth.id != '' && owner_id = @request.auth.id && @request.data.owner_id = @request.auth.id";

  const definitions = [
    {
      name: "sessions",
      type: "base",
      listRule: ownerRead,
      viewRule: ownerRead,
      createRule: ownerCreate,
      updateRule: ownerUpdate,
      deleteRule: ownerRead,
      schema: [
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
      createRule: "@request.auth.id != '' && @request.data.user_id = @request.auth.id",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id && @request.data.user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      schema: [
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
      schema: [
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
      schema: [
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
      schema: [
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

  for (const def of definitions) {
    let existing = null;
    try { existing = dao.findCollectionByNameOrId(def.name); } catch (_) { existing = null; }
    if (existing) {
      existing.listRule = def.listRule;
      existing.viewRule = def.viewRule;
      existing.createRule = def.createRule;
      existing.updateRule = def.updateRule;
      existing.deleteRule = def.deleteRule;
      dao.saveCollection(existing);
    } else {
      dao.saveCollection(new Collection(def));
    }
  }
}, (db) => {
  const dao = new Dao(db);
  for (const name of ["images", "student_progress", "session_assets", "teacher_history", "sessions"]) {
    try {
      const col = dao.findCollectionByNameOrId(name);
      if (col) dao.deleteCollection(col);
    } catch (_) {}
  }
});
