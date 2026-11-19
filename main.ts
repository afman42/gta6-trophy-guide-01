// Leonida Ledger — the entry program for gta6-trophy-guide-01.
//
// What it does, nothing more: it takes this repository's guide (the static
// files under app/ and the screenshots under screenshots/) and hands them
// to the grader by writing them into the output directory, plus a
// dossier.json that the judge reads. It runs on Node 22 with the standard
// library only, and it needs no network: the only file it reads besides
// app/ and screenshots/ is the vendored make.fun dossier library, which
// must stay byte-for-byte the kit's copy.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader's container MAKEFUN_OUTPUT_DIR is unset and /output is used.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

// The directory this file lives in — the repository root.
const here = fileURLToPath(new URL(".", import.meta.url));

// The grader writes to /output; locally MAKEFUN_OUTPUT_DIR stands in.
const out = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

// Guard the entry before copying: the gate refuses more than four
// screenshots, so fail loudly here instead of handing in a bad entry.
const shotsDir = join(here, "screenshots");
const shotCount = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((name) => !name.startsWith(".")).length
  : 0;
if (shotCount < 3 || shotCount > 4) {
  throw new Error(
    `Leonida Ledger needs 3 or 4 screenshots, found ${shotCount}`,
  );
}

mkdirSync(out, { recursive: true });
cpSync(join(here, "app"), join(out, "app"), { recursive: true });
mkdirSync(join(out, "screenshots"), { recursive: true });
cpSync(shotsDir, join(out, "screenshots"), { recursive: true });

// The scorer's caps, from the kit's reference gate: the text cap shapes
// the dossier's bytes, and the other caps refuse an entry the scorer
// would refuse (screenshots over 256 KiB, app/ over 993 entries or
// 48 MiB — app/ shares /output's own 1000-entry, 64 MiB cap with the
// screenshots and the dossier, so there is room to spare).
writeFileSync(
  join(out, "dossier.json"),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
