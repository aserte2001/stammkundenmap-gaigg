# gotchas.md — Lessons Learned

Werkbank-Notizen aus dem autonomen Build. Jeder Eintrag: Trigger, Symptom, Fix, Prevention.

## #001 — npm naming restriction bei Ordnern mit Leerzeichen

**Trigger**: `npx create-next-app@latest .` im Ordner `Experiment StammKundenMap/`.
**Symptom**: `name can only contain URL-friendly characters; name can no longer contain capital letters`.
**Fix**: Subfolder mit url-safe Name (`stammkundenmap-gaigg`) anlegen und dort scaffolden.
**Prevention**: Bei Windows-Workspaces mit Marketing-Namen immer einen url-safe Subfolder für den Code anlegen.

## #002 — @lumaai/luma-web Peer-Conflict mit aktuellem @types/three

**Trigger**: `npm install` mit `@types/three@latest` und `@lumaai/luma-web@^0.2`.
**Symptom**: `ERESOLVE could not resolve. peer @types/three@"^0.157.2" from @lumaai/luma-web`.
**Fix**: `.npmrc` mit `legacy-peer-deps=true` in Project-Root. Funktional kein Problem — Luma Web ist Typen-tolerant gegenüber Three-Updates.
**Prevention**: Bei jedem Splat/3D-Library-Upgrade peerDep-Checks. Wenn Luma-Web ein Minor-Update kriegt, peer-deps neu prüfen.
