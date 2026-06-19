-- ---------------------------------------------------------------------------
-- 0033 — Documentation : min_level est un garde-fou UX, pas une barrière.
--
-- AUCUN changement de comportement. On attache (COMMENT ON FUNCTION) une note
-- durable aux RPC d'adhésion pour acter — et rendre introspectable côté base —
-- un compromis de conception :
--
-- join_group / join_public_group vérifient max_members côté base (autoritatif,
-- anti-course) mais PAS min_level. Le palier de niveau n'est imposé que côté app
-- (Server Action blockedByGate → getMyLevel), parce que le barème d'XP (XP par
-- succès + levelFromXp) vit dans lib/domain/economy.ts et n'est volontairement
-- jamais stocké en base (cf. 0022 : « l'XP n'est jamais stockée, l'app détient
-- le barème »). Ces RPC étant `authenticated` (appelables directement avec la
-- clé anon + un JWT), un joueur sous le niveau requis peut techniquement
-- contourner le palier en appelant la RPC sans passer par l'app.
--
-- Compromis assumé : l'enjeu est faible (appartenance à un groupe — ni argent
-- ni classement). Pour en faire une vraie barrière autoritative, il faudrait
-- mirrorer le barème en SQL (table achievement_xp seedée depuis ACHIEVEMENTS +
-- fonction level_from_xp) puis imposer le niveau dans ces deux RPC.
-- À exécuter dans le SQL Editor APRÈS 0032 (idempotent, relançable).
-- ---------------------------------------------------------------------------

comment on function public.join_group(text) is
  'Adhésion par code. max_members imposé côté base ; min_level NON vérifié ici — garde-fou UX côté app (blockedByGate), contournable par appel direct à la RPC. Voir migrations 0029/0033 + lib/domain/economy.ts.';

comment on function public.join_public_group(uuid) is
  'Adhésion à un groupe public. max_members imposé côté base ; min_level NON vérifié ici — garde-fou UX côté app (blockedByGate), contournable par appel direct à la RPC. Voir migrations 0029/0033 + lib/domain/economy.ts.';
