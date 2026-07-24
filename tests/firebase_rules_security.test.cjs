#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("../desktop/web-app/node_modules/@firebase/rules-unit-testing");
const {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} = require("../desktop/web-app/node_modules/firebase/firestore");

const projectId = "demo-alloflow";
const emulator = String(process.env.FIRESTORE_EMULATOR_HOST || "").split(":");
if (emulator.length !== 2) {
  console.error("Run this test through Firebase emulators:exec.");
  process.exit(2);
}

const rules = fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8");
const appId = "security-test";
const sessionPath = (code) => "artifacts/" + appId + "/public/data/sessions/" + code;
const assetPath = (id) => "artifacts/" + appId + "/public/data/session_assets/" + id;

(async () => {
  const env = await initializeTestEnvironment({
    projectId,
    firestore: { host: emulator[0], port: Number(emulator[1]), rules },
  });
  try {
    const hostDb = env.authenticatedContext("host-user").firestore();
    const guestDb = env.authenticatedContext("guest-user").firestore();
    const strangerDb = env.authenticatedContext("stranger-user").firestore();
    const unauthDb = env.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(unauthDb, sessionPath("ABCDE"))));
    await assertSucceeds(setDoc(doc(hostDb, sessionPath("ABCDE")), {
      hostId: "host-user",
      createdAt: new Date(),
      mode: "sync",
      roster: {},
    }));
    await assertSucceeds(getDoc(doc(guestDb, sessionPath("ABCDE"))));
    await assertFails(getDocs(collection(guestDb, "artifacts/" + appId + "/public/data/sessions")));

    const now = Date.now();
    const orphan = {
      kind: "sessionImage",
      data: "data:image/png;base64,AA==",
      ownerUid: "host-user",
      parentId: "ORPHAN",
      parentKind: "live",
      createdAt: new Date(now - 1000),
      expiresAt: new Date(now + 60 * 60 * 1000),
    };
    await assertSucceeds(setDoc(doc(hostDb, assetPath("img_ORPHAN_1")), orphan));
    await assertSucceeds(getDoc(doc(hostDb, assetPath("img_ORPHAN_1"))));
    await assertFails(getDoc(doc(strangerDb, assetPath("img_ORPHAN_1"))));
    await assertFails(setDoc(doc(strangerDb, assetPath("img_FORGED_1")), { ...orphan, parentId: "FORGED" }));
    await assertFails(setDoc(doc(strangerDb, assetPath("img_ORPHAN_1")), { ...orphan, ownerUid: "stranger-user" }));

    await assertSucceeds(setDoc(doc(hostDb, sessionPath("ORPHAN")), {
      hostId: "host-user",
      createdAt: new Date(),
      mode: "sync",
      roster: {},
    }));
    await assertSucceeds(getDoc(doc(strangerDb, assetPath("img_ORPHAN_1"))));
    await assertFails(getDocs(collection(strangerDb, "artifacts/" + appId + "/public/data/session_assets")));

    await assertFails(getDoc(doc(guestDb, "artifacts/" + appId + "/public/data/conceptMastery/guest-user")));
    await assertFails(setDoc(doc(guestDb, "artifacts/" + appId + "/public/data/conceptMastery/guest-user"), { score: 1 }));

    await assertSucceeds(setDoc(
      doc(guestDb, "artifacts/" + appId + "/public/data/quiz-signaling/ABCDE/peers/guest-user"),
      { offer: "test-offer", codename: "Calm Otter", createdAt: new Date(), expiresAt: new Date(now + 60000) }
    ));

    console.log("Firestore security behavior passed (owner, orphan, list, mastery, and quiz-signaling cases).");
  } finally {
    await env.cleanup();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
