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
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} = require("../desktop/web-app/node_modules/firebase/firestore");

const projectId = process.env.FIREBASE_RULES_TEST_PROJECT_ID || "demo-alloflow";
if (!["demo-alloflow", "demo-alloflow-session-metadata"].includes(projectId)) {
  console.error("Use a local demo Firestore test project.");
  process.exit(2);
}
const emulator = String(process.env.FIRESTORE_EMULATOR_HOST || "").split(":");
if (emulator.length !== 2) {
  console.error("Run this test through Firebase emulators:exec.");
  process.exit(2);
}

const rules = fs.readFileSync(process.env.FIRESTORE_RULES_PATH
  ? path.resolve(process.env.FIRESTORE_RULES_PATH)
  : path.join(__dirname, "..", "firestore.rules"), "utf8");
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
    const hostQuestRef = doc(hostDb, sessionPath("QUEST"));
    await assertSucceeds(updateDoc(hostQuestRef, { "escapeRoomState.conceptQuest": { actionSchema: 1, turnKey: "2:room-2:abc", currentRoomId: "room-2", phase: "battle" } }));
    const scopedAction = { abilityId: "analyze", roleId: "analyst", answerIndex: 0, submittedAt: Date.now(), turnKey: "2:room-2:abc" };
    await assertSucceeds(updateDoc(questRef, { "escapeRoomState.teamProgress.All.questActions.guest-user": scopedAction }));
    await assertFails(updateDoc(questRef, { "escapeRoomState.teamProgress.All.questActions.guest-user": { ...scopedAction, turnKey: "1:room-1:old" } }));
    await assertFails(updateDoc(questRef, { "escapeRoomState.teamProgress.All.questActions.stranger-user": scopedAction }));
    await assertSucceeds(updateDoc(hostQuestRef, { "escapeRoomState.isPaused": true }));
    await assertFails(updateDoc(questRef, { "escapeRoomState.teamProgress.All.questActions.guest-user": { ...scopedAction, answerIndex: 1 } }));
    await assertSucceeds(updateDoc(hostQuestRef, { "escapeRoomState.isPaused": false, "escapeRoomState.conceptQuest.phase": "explore", "escapeRoomState.conceptQuest.turnKey": "3:room-2:abc" }));
    await assertFails(updateDoc(questRef, { "escapeRoomState.teamProgress.All.questActions.guest-user": { ...scopedAction, submittedAt: scopedAction.submittedAt + 1 } }));
    await assertSucceeds(updateDoc(questRef, { "escapeRoomState.teamProgress.All.questVotes.guest-user": "room-3", "escapeRoomState.teamProgress.All.questVoteTurns.guest-user": "3:room-2:abc" }));
    await assertFails(updateDoc(questRef, { "escapeRoomState.teamProgress.All.questVotes.guest-user": "room-1", "escapeRoomState.teamProgress.All.questVoteTurns.guest-user": "2:room-2:abc" }));
    await assertFails(updateDoc(questRef, { "escapeRoomState.teamProgress.All.questVoteTurns.stranger-user": "3:room-2:abc" }));


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

    // Arcade scores and class rewards pay tokens, so only the teacher may write them.
    await assertSucceeds(setDoc(doc(hostDb, sessionPath("ARCADE")), {
      hostId: "host-user",
      createdAt: new Date(),
      mode: "sync",
      roster: { "guest-user": { uid: "guest-user", name: "Calm Otter" } },
      realmBuilder: { status: "active", submissions: {} },
      conceptAtlas: { status: "active", submissions: {} },
      bossEncounter: { status: "active" },
    }));
    const arcadeRef = (db) => doc(db, sessionPath("ARCADE"));
    const forgedScore = { x: { tokens: 50, score: 20, participantId: "guest-user" } };
    for (const fields of [
      { realmBuilder: { teacherScores: forgedScore } },
      { conceptAtlas: { teacherScores: forgedScore } },
      { realmBuilder: { classRewardTokens: 50, classRewardKey: "forged" } },
      { conceptAtlas: { classRewardTokens: 50, classRewardKey: "forged" } },
      { bossEncounter: { classRewardTokens: 50, status: "completed", endedOutcome: "won" } },
    ]) {
      await assertFails(setDoc(arcadeRef(guestDb), fields, { merge: true }));
      await assertFails(setDoc(arcadeRef(strangerDb), fields, { merge: true }));
      await assertSucceeds(setDoc(arcadeRef(hostDb), fields, { merge: true }));
    }

    // Arcade class work: private per send, and the student cannot award themself anything.
    const classmateDb = env.authenticatedContext("classmate-user").firestore();
    await assertSucceeds(setDoc(arcadeRef(hostDb), { roster: { "classmate-user": { uid: "classmate-user", name: "Blue Fox" } } }, { merge: true }));
    const subRef = (db, id) => doc(db, sessionPath("ARCADE") + "/arcadeSubmissions/" + id);
    const subsCol = (db) => collection(db, sessionPath("ARCADE") + "/arcadeSubmissions");
    const expiresAt = new Date(now + 14 * 86400000);
    const work = { uid: "guest-user", activity: "realm", expiresAt, submittedAt: "2026-11-05T12:00:00.000Z", awaitingTeacher: true, nickname: "Calm Otter", cardName: "Water", verb: "place", justification: "my private reasoning", selfCheck: ["reason"] };
    await assertSucceeds(setDoc(subRef(guestDb, "guest-user_rs-1"), work));
    await assertSucceeds(setDoc(subRef(guestDb, "guest-user_rs-ai"), { ...work, score: 15 }));
    await assertSucceeds(getDoc(subRef(guestDb, "guest-user_rs-1")));
    await assertSucceeds(getDocs(query(subsCol(guestDb), where("uid", "==", "guest-user"))));
    await assertFails(getDoc(subRef(classmateDb, "guest-user_rs-1")));
    await assertFails(getDocs(subsCol(classmateDb)));
    await assertFails(getDocs(subsCol(guestDb)));
    await assertFails(getDoc(subRef(strangerDb, "guest-user_rs-1")));
    await assertFails(setDoc(subRef(guestDb, "classmate-user_rs-2"), { ...work, uid: "classmate-user" }));
    await assertFails(setDoc(subRef(guestDb, "classmate-user_rs-3"), work));
    await assertFails(setDoc(subRef(guestDb, "guest-user_rs-4"), { ...work, uid: "classmate-user" }));
    await assertFails(setDoc(subRef(guestDb, "guest-user_rs-5"), { ...work, teacherScore: { score: 20, tokens: 50 } }));
    await assertFails(setDoc(subRef(guestDb, "guest-user_rs-6"), { ...work, tokens: 50 }));
    await assertFails(setDoc(subRef(guestDb, "guest-user_rs-7"), { ...work, score: 21 }));
    await assertFails(setDoc(subRef(guestDb, "guest-user_rs-8"), { ...work, justification: "x".repeat(4001) }));
    await assertFails(setDoc(subRef(guestDb, "guest-user_rs-9"), { ...work, activity: "chess" }));
    await assertFails(setDoc(subRef(guestDb, "guest-user_rs-10"), { ...work, expiresAt: new Date(now + 90 * 86400000) }));
    await assertFails(setDoc(subRef(strangerDb, "stranger-user_rs-11"), { ...work, uid: "stranger-user" }));
    await assertFails(updateDoc(subRef(guestDb, "guest-user_rs-1"), { justification: "changed" }));
    await assertFails(updateDoc(subRef(guestDb, "guest-user_rs-1"), { teacherScore: { score: 20, tokens: 50 } }));
    await assertFails(deleteDoc(subRef(guestDb, "guest-user_rs-1")));
    await assertSucceeds(getDocs(subsCol(hostDb)));
    await assertSucceeds(updateDoc(subRef(hostDb, "guest-user_rs-1"), { teacherScore: { score: 14, tokens: 1, note: "Good reason" } }));
    await assertSucceeds(getDoc(subRef(guestDb, "guest-user_rs-1")));
    await assertSucceeds(deleteDoc(subRef(hostDb, "guest-user_rs-1")));

    // The module's own send path through the real SDK: what it writes must pass these rules.
    const fakeWindow = { AlloHavenArcade: { registerMode() {}, isRegistered: () => true } };
    new Function("window", fs.readFileSync(path.join(__dirname, "..", "arcade_mode_boss_encounter.js"), "utf8"))(fakeWindow);
    const channelFor = (db, uid) => {
      fakeWindow.__alloFirebase = { db, doc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs };
      return fakeWindow.AlloHavenArcade.classWork.channel({ firestoreDb: db, firestoreAppId: appId, sessionCode: "ARCADE", sessionParticipantId: uid });
    };
    const guestChannel = channelFor(guestDb, "guest-user");
    if (guestChannel.kind !== "private") throw new Error("expected the private channel, got " + guestChannel.kind);
    const realmSend = { subId: "rs-2", awaitingTeacher: true, nickname: "Calm Otter", participantId: "guest-user", cardId: 7, cardName: "Water", cardSource: "glossary", cardImageBase64: null, verb: "place", verbLabel: "Place", partnerCardId: null, partnerCardName: null, summary: "Water (Place)", justification: "x".repeat(5000), score: null, selfCheck: ["named", "reason"], selfCheckText: "I named the concept; I gave a reason", submittedAt: "2026-11-05T12:00:00.000Z" };
    await assertSucceeds(guestChannel.send("realm", "rs-2", realmSend));
    const atlasSend = { subId: "sub-3", nickname: "Calm Otter", fromCardId: "a", fromCardName: "Rain", fromCardImageBase64: "data:image/png;base64,AAAA", fromCardSource: "glossary", toCardId: "b", toCardName: "River", toCardImageBase64: "x".repeat(400001), toCardSource: null, verb: "connects", verbLabel: "Connects", justification: "Rain fills the river.", score: 15, ackText: "Nice", followUp: "Why?", submittedAt: "2026-11-05T12:00:00.000Z" };
    await assertSucceeds(guestChannel.send("atlas", "sub-3", atlasSend));
    const bossSend = { subId: "spark-1", nickname: "Calm Otter", cardName: "Rain", cardSource: "glossary", cardTier: "gold", verb: "Illuminate", justification: "Because the sun warms it.", score: 15, ackText: "Nice", followUp: "Why?", round: 2, encounterKey: "2026-11-05T12:00:00.000Z", submittedAt: "2026-11-05T12:00:00.000Z" };
    await assertSucceeds(guestChannel.send("boss", "spark-1", bossSend));
    const palaceJoin = { kind: "join", activityId: "palace-1", subId: "join-palace-1", nickname: "Calm Otter", submittedAt: "2026-11-05T12:00:00.000Z" };
    await assertSucceeds(guestChannel.send("palace", "join-palace-1", palaceJoin));
    const palaceSend = { kind: "contribution", activityId: "palace-1", subId: "pc-1", status: "pending", nickname: "Calm Otter", participantId: "guest-user", roomId: "r1", newRoomTitle: "", label: "Power plant", mnemonic: "Stores energy", groupId: "g1", role: "architect", contributorNickname: "Calm Otter", replaces: "guest-user_pc-0", submittedAt: "2026-11-05T12:00:00.000Z" };
    await assertSucceeds(guestChannel.send("palace", "pc-1", palaceSend));
    const palaceDoc = { uid: "guest-user", activity: "palace", expiresAt, submittedAt: "2026-11-05T12:00:00.000Z", kind: "contribution", label: "Power plant", mnemonic: "Stores energy" };
    await assertSucceeds(setDoc(subRef(guestDb, "guest-user_pc-ok"), palaceDoc));
    await assertFails(setDoc(subRef(guestDb, "guest-user_pc-2"), { ...palaceDoc, status: "approved" }));
    await assertFails(setDoc(subRef(guestDb, "guest-user_pc-3"), { ...palaceDoc, kind: "seat" }));
    await assertFails(setDoc(subRef(guestDb, "guest-user_pc-4"), { ...palaceDoc, feedback: "self" }));
    await assertFails(setDoc(subRef(guestDb, "guest-user_pc-5"), { ...palaceDoc, mnemonic: "x".repeat(361) }));
    await assertFails(setDoc(subRef(guestDb, "guest-user_spark-2"), { ...palaceDoc, activity: "boss", round: 100 }));
    await assertFails(setDoc(subRef(guestDb, "guest-user_spark-3"), { ...palaceDoc, activity: "boss", damage: 60 }));
    await assertFails(getDoc(subRef(classmateDb, "guest-user_spark-1")));
    await assertFails(getDoc(subRef(classmateDb, "guest-user_pc-1")));
    await assertFails(guestChannel.patch("guest-user_pc-1", { status: "approved" }));
    const hostChannel = channelFor(hostDb, "host-user");
    await assertSucceeds(hostChannel.patch("guest-user_pc-1", { status: "returned", feedback: "Name the room." }));
    await assertSucceeds(hostChannel.remove("guest-user_pc-ok"));
    await assertSucceeds(hostChannel.score("guest-user_rs-2", { score: 14, tokens: 1, note: "Good" }));
    await assertSucceeds(hostChannel.clear("realm"));
    const left = await getDocs(subsCol(hostDb));
    const leftIds = left.docs.map((item) => item.id);
    if (leftIds.includes("guest-user_rs-2") || !leftIds.includes("guest-user_sub-3")) throw new Error("clear() removed the wrong documents: " + leftIds.join());

    console.log("Firestore security behavior passed (owner, receipts, team enums, orphan, list, mastery, quiz-signaling, teacher-only arcade reward, and private arcade class work cases).");
  } finally {
    await env.cleanup();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
