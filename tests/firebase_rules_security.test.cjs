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
  updateDoc,
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
      quizState: {
        responseReceipts: {},
        allResponses: {},
        responses: {},
        teams: {},
      },
    }));
    await assertSucceeds(getDoc(doc(guestDb, sessionPath("ABCDE"))));
    await assertFails(getDocs(collection(guestDb, "artifacts/" + appId + "/public/data/sessions")));

    const sessionRef = doc(guestDb, sessionPath("ABCDE"));
    await assertSucceeds(updateDoc(sessionRef, {
      "quizState.teams.guest-user": "Red",
    }));
    await assertFails(updateDoc(sessionRef, {
      "quizState.teams.stranger-user": "Blue",
    }));
    await assertFails(updateDoc(sessionRef, {
      "quizState.teams.guest-user": "red",
    }));
    await assertFails(updateDoc(sessionRef, {
      "quizState.teams.guest-user": { color: "Red" },
    }));
    await assertFails(updateDoc(sessionRef, {
      "quizState.teams.guest-user.color": "Red",
    }));

    const validReceipt = {
      activityId: "visual-quiz-1",
      questionIndex: 0,
      submittedAt: Date.now(),
      flow: "assessment",
    };
    await assertSucceeds(updateDoc(sessionRef, {
      "quizState.responseReceipts.guest-user": validReceipt,
    }));
    await assertFails(updateDoc(sessionRef, {
      "quizState.responseReceipts.stranger-user": validReceipt,
    }));
    await assertFails(updateDoc(sessionRef, {
      "quizState.responseReceipts.guest-user": { ...validReceipt, answer: "A" },
    }));
    await assertFails(updateDoc(sessionRef, {
      "quizState.responseReceipts.guest-user": { ...validReceipt, questionIndex: 10000 },
    }));
    await assertFails(updateDoc(sessionRef, {
      "quizState.responseReceipts.guest-user": { ...validReceipt, submittedAt: 0 },
    }));
    await assertFails(updateDoc(sessionRef, {
      "quizState.responseReceipts.guest-user": { ...validReceipt, flow: "boss" },
    }));
    await assertFails(updateDoc(sessionRef, {
      "quizState.allResponses.guest-user.0": "A",
    }));
    await assertFails(updateDoc(sessionRef, {
      "quizState.responses.guest-user": 1,
    }));
    await assertSucceeds(updateDoc(doc(hostDb, sessionPath("ABCDE")), {
      "quizState.responseReceipts": {},
      "quizState.allResponses": {},
      "quizState.responses": {},
      "quizState.teams": {},
    }));

    await assertSucceeds(setDoc(doc(hostDb, sessionPath("QUEST")), {
      hostId: "host-user",
      createdAt: new Date(),
      mode: "sync",
      roster: {},
      escapeRoomState: {
        mode: "concept-quest",
        isActive: true,
        teams: {},
        teamProgress: { All: { questVotes: {}, questActions: {}, questRoles: {} } },
        conceptQuest: { currentRoomId: "room-1", phase: "explore" },
      },
    }));
    const questRef = doc(guestDb, sessionPath("QUEST"));
    await assertSucceeds(updateDoc(questRef, { "escapeRoomState.teams.guest-user": "All" }));
    await assertSucceeds(updateDoc(questRef, {
      "escapeRoomState.teamProgress.All.questVotes.guest-user": "room-2",
      "escapeRoomState.teamProgress.All.questRoles.guest-user": "connector",
    }));
    await assertSucceeds(updateDoc(questRef, {
      "escapeRoomState.teamProgress.All.questActions.guest-user": {
        abilityId: "connect", roleId: "connector", answerIndex: 1, submittedAt: Date.now(),
        supportId: "guard", supportTargetUid: "classmate-user",
      },
    }));
    await assertFails(updateDoc(questRef, { "escapeRoomState.teamProgress.All.questVotes.stranger-user": "room-2" }));
    await assertFails(updateDoc(questRef, { "escapeRoomState.teamProgress.All.questRoles.guest-user": "boss" }));
    await assertFails(updateDoc(questRef, {
      "escapeRoomState.teamProgress.All.questActions.guest-user": {
        abilityId: "connect", roleId: "connector", answerIndex: 99, submittedAt: Date.now(),
      },
    }));
    await assertFails(updateDoc(questRef, {
      "escapeRoomState.teamProgress.All.questActions.guest-user": {
        abilityId: "connect", roleId: "connector", answerIndex: 1, submittedAt: Date.now(),
        supportId: "guard", supportTargetUid: "guest-user",
      },
    }));
    await assertFails(updateDoc(questRef, { "escapeRoomState.conceptQuest.phase": "complete" }));

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

    console.log("Firestore security behavior passed (owner, receipts, team enums, orphan, list, mastery, and quiz-signaling cases).");
  } finally {
    await env.cleanup();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
