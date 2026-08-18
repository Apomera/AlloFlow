# Saving, loading, and managing storage

AlloFlow keeps your work on the device rather than in an account. That is what makes it usable without sign-in, rostering, or a district contract, and it is also the thing most likely to lose you a lesson if nobody explains it. This chapter explains where your work actually lives, how to save and reload it, and how to keep the device from filling up.

Read [Privacy and responsible AI](07-privacy-and-responsible-ai.md) for why the design is this way. This chapter is the operating manual.

## Where your work lives

Everything you generate is held in the browser's own storage on the machine you are using. Nothing is uploaded, which has three practical consequences worth stating plainly:

- **Your work does not follow you to another device.** A lesson built on the classroom desktop is not on your laptop at home.
- **Clearing browsing data erases it.** "Clear cookies and site data" removes AlloFlow's work along with everything else. On a managed fleet, a device wipe or a profile reset does the same.
- **Nobody else can see it**, including us. There is no server copy to recover from, which is the trade you are making for the privacy.

The fix for all three is the same, and it is the next section.

## Save Project: the file that survives everything

**Save Project** writes your entire session to a single file: the source material, every resource you generated, and the settings that produced them.

- You give it a filename. AlloFlow adds the `.json` extension itself.
- The file lands in your normal downloads location, so it can go to a school drive, a shared folder, or a USB stick like any other file.
- **Load Project** reads it back. The button sits in the Source Material row in the left column, next to Upload, Link and Generate.

This is the one habit worth building. If a lesson took you more than a few minutes to build, save the project. The file is device-independent, survives a browser wipe, and is how you move work between home and school.

> **In Gemini Canvas, this matters even more.** Nothing survives closing the tab except files you have downloaded. The project file *is* your save.

## Getting finished work out

Saving a project preserves your ability to keep working. Exporting produces the thing students or colleagues actually receive. They are different jobs and you usually want both.

The **Export** options include:

- A **finished copy** to print or save as PDF.
- A **worksheet** version, which is the same material with the answers removed.
- A **teacher copy**, which adds answer keys, fact checks, analyses and UDL advice. Its own header tells you to keep it separate from student packets, and that instruction is there because the two look similar once printed.
- **Copy Link for Students**, which hands over the student route rather than a file.

For the full treatment of formats, margins, and what prints well, see [Documents and printing](15-documents-and-printing.md).

## Storage and recovery

AlloFlow has a **Storage and recovery** panel, and on a device used all year you will eventually want it.

### Recovery

If the app cannot find your previous session it says so directly, reporting that no restorable workspace was found rather than opening silently empty. You can also choose to **work without device recovery**, which is the right choice on a shared or public machine where you do not want work persisting after you walk away.

Where a recovery key is offered, it is shown **once**. Write it down at the moment it appears, because it cannot be shown again.

### Storage presets

Because browser storage is finite, AlloFlow lets you choose how much of it to use:

| Preset | What it targets |
| --- | --- |
| **Standard** | About 20 workspaces, 150MB, and 50 offline resources. This is the normal behaviour. |
| **Compact** | About 4 workspaces, 50MB, and 20 offline resources. Older unpinned draft-only work may expire. |
| **Automatic** | Uses Standard normally, and drops to Compact when the device reports storage pressure. |

**Automatic is the sensible default for a school device.** Choose Compact deliberately on a Chromebook that is short of space, and understand what you are agreeing to: unpinned drafts you have not saved as projects can be dropped. Anything you have saved as a project file is unaffected, because that file is outside the browser.

If you ever see a message that a plan could not be archived because storage may be full, this panel is where you go.

### On-device speech models

Voice features download their models once and then keep them on the device, so speech works without sending audio anywhere.

- **Speech recognition (Whisper)** understands what you say.
- **Natural voice (Kokoro)** reads text aloud in a natural voice.

The panel shows each model's download size, whether it is already on this device, and the total model cache. These are the largest single thing AlloFlow stores, so if you need space back and you do not use voice features, this is the first place to look.

### Cached remediation work

If you have run a document through the accessibility remediation pipeline, the result is held on the device so you can reopen and review it. The panel offers to open those results directly. See [Make a document accessible](19-make-a-document-accessible.md) for that workflow.

## A storage routine that prevents the common losses

1. **Save Project whenever a lesson matters**, and name it something you will recognise in a downloads folder six weeks later.
2. **Export the student-facing copy** as soon as it is right, so the deliverable exists independently of the app.
3. **Set the storage preset to Automatic** and forget about it.
4. **Before a device refresh, an OS update, or handing back a loaner**, save your projects. IT will not know your work was in there.
5. **On a shared machine**, use "work without device recovery" and take your project file with you.

## If work has gone missing

Check these in order:

1. **Is it a different device or a different browser profile?** On-device means exactly that, and a different Chrome profile is a different device as far as storage is concerned.
2. **Was browsing data cleared?** By you, by an IT policy, or by a "clean up this device" tool.
3. **Is there a project file?** Load Project is the answer whenever there is one.
4. **Does the storage panel report a restorable workspace?** If it says none was found, there is nothing on this device to recover.

If none of those apply, [Troubleshooting](08-troubleshooting.md) covers the wider recovery sequence. And if the answer turns out to be that no project file was ever saved, that is the habit worth changing rather than a fault to chase.
