# AlloFlow Leadership Hub — Drive backup (leader setup, one time, about three minutes)

This small script runs on **your school-managed Google Workspace for Education
account** — the account your district's data-privacy agreement already covers.
Once connected, the Leadership Hub automatically saves its backup file to a
Drive folder every time you open the hub and something has changed, so your
walkthroughs, timelines, screenings, and meeting records accumulate safely
even if your laptop is lost or reimaged.

Nothing is ever shared with anyone by this script. Files land in a folder only
you can open. When a record needs to go wherever your district officially
stores such things, download it from Drive and share it through your normal
district channel — deliberately, by hand.

## Setup

1. Signed into your **school-managed** Google account, open `script.new` in
   your browser.
2. Paste the contents of `Code.gs` over the starter code. Name the project
   "AlloFlow Leadership Hub Backup" and save.
3. In the editor, run the `setup` function once. Approve the permission
   prompt — the `drive.file` scope means the script can only touch files it
   creates itself, never the rest of your Drive. (Google may show an
   "unverified app" warning because this is your own unpublished script;
   continue only if you pasted this code yourself and recognize the account.)
4. Open the execution log: it prints your **backup token**. Treat it like a
   password.
5. Choose **Deploy → New deployment → Web app**, execute as **Me**, access
   **Anyone**, and deploy. Copy the web-app URL ending in `/exec`.
6. In AlloFlow: Educator Tools → Leadership Hub → **Back up this hub** →
   **Set up Drive backup**, paste the URL and token, and connect. The hub
   runs a self-test and shows the folder name when it works.

## What the token can and cannot do

The token authorizes exactly one thing: writing backup files into the folder
this script created. It cannot read your Drive, cannot share files, and cannot
touch anything the script did not create. If it ever leaks, run `rotateToken`
in the script editor and paste the new token into AlloFlow.

## Retention

The script keeps the newest 60 backups and trashes older ones (they remain in
Drive's trash on your account's normal schedule). Apply your district's
records-retention rules to the folder as you would to any working file.
