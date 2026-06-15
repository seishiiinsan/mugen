# Mugen — Design System (MASTER)

> Pronostics football au score exact. Direction : **premium minimaliste**,
> inspiration **Linear / Vercel**. **Thème clair**, sobre, précis. Un seul accent
> (**Viva Magenta**), des filets fins plutôt que des ombres, beaucoup d'air, des
> chiffres tabulaires. Stack : Next.js 16 (App Router) + Tailwind v4.
> Public francophone.

## 1. Principes

1. **Un seul accent.** Le Viva Magenta ne sert qu'aux actions et à l'état actif.
   Le reste est neutre. Pas d'arc-en-ciel.
2. **Filets, pas d'ombres.** La hiérarchie vient du contraste entre surfaces +
   bordures 1px. Les ombres sont réservées aux éléments flottants (popover).
3. **Clair mais pas plat.** Fond gris très léger, cartes blanches détourées d'un
   filet : la profondeur vient des bordures, pas des ombres. Pas de gris « sale ».
4. **L'espace est un composant.** Marges généreuses, alignements stricts,
   échelle d'espacement de 4px.
5. **Les chiffres comptent.** Scores, points, rangs en `font-mono` tabulaire,
   alignés à droite.
6. **Discrétion animée.** Transitions 150 ms ease-out sur couleur/bordure/fond ;
   `active:scale-[0.99]` sur le tap. Jamais de rebond ni de néon.
7. **Pas d'emoji décoratif.** Icônes en SVG trait (1.5px), `currentColor`.

## 2. Couleurs (thème clair)

| Rôle | Token | Hex |
|---|---|---|
| Fond app | `background` | `#fbfbfc` |
| Surface (cartes) | `surface` | `#ffffff` |
| Surface élevée (inputs, hover) | `surface-2` | `#f3f3f5` |
| Filet | `border` | `#eaeaec` |
| Filet renforcé (hover/focus) | `border-strong` | `#d6d6da` |
| Texte primaire | `foreground` | `#18181b` |
| Texte secondaire | `muted` | `#65656d` |
| Texte ténu (labels, méta) | `faint` | `#98989f` |
| Accent (Viva Magenta) | `accent` | `#be3455` |
| Accent (hover) | `accent-strong` | `#a52c49` |
| Texte sur accent | `accent-fg` | `#ffffff` |
| Anneau focus | `ring` | `#be3455` (35 % alpha) |
| Live / erreur | `danger` | `#dc2626` |
| Points / succès | `success` | `#16a34a` |
| Podium or / argent / bronze | `gold`/`silver`/`bronze` | `#b8860b` / `#8a8a93` / `#a9682f` |

Règles d'usage :
- **accent** : bouton primaire, onglet actif, ligne « c'est vous » du classement,
  liens. Rien d'autre.
- **danger** : uniquement le point + label « Live » et les messages d'erreur.
  Volontairement un rouge plus orangé que le magenta pour éviter la confusion.
- **success** : uniquement les points gagnés.
- **podium** : uniquement les rangs 1-2-3.
- Tout le reste est dans l'échelle neutre.

## 3. Typographie

- **Sans** : Geist Sans (déjà chargé) — UI et titres.
- **Mono** : Geist Mono — scores, points, rangs, minutes (tabular-nums).
- **Graisses** : 400 (corps), 500 (labels/boutons), 600 (titres). Jamais 700+.
- **Titres** : tracking serré `-0.02em`, `leading-tight`.
- **Échelle** : `text-xs` 12 / `sm` 14 / `base` 15-16 / `lg` 18 / `xl` 20 /
  `2xl` 24 / `3xl` 30. Titres de page = `xl`–`2xl` (pas plus : minimalisme).
- Labels méta (ligue, sections) : `text-xs`, `uppercase`, `tracking-wide`,
  couleur `faint`.

## 4. Espacement, rayons, bordures

- **Base 4px.** Échelle : 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- Padding carte : 16 (mobile) / 20 (confortable). Gap entre cartes : 8-12.
- Conteneur principal : `max-w-3xl`, padding latéral 16-24.
- **Rayons** : `sm` 6 · `md` 8 · `lg` 12 (cartes, boutons) · `xl` 16 (modales) ·
  `full` (pills, points). Cohérence absolue.
- **Bordures** : 1px `border` partout ; `border-strong` au hover/focus.

## 5. Élévation & motion

- Ombres : aucune sur les cartes. Popover/menu : `0 8px 24px rgba(0,0,0,.08)`.
- Transition par défaut : `transition-colors duration-150 ease-out`.
- Hover carte : `border` → `border-strong`, fond `surface` → `surface-2`.
- Tap : `active:scale-[0.99]` (classe `.press`). Focus visible : `ring-2 ring-ring`.
- Live : point `danger` avec pulsation douce (`animate-pulse`, lente).

## 6. Composants

### Navigation — EN HAUT
- Barre horizontale **sticky en haut**, sous l'en-tête (logo + mois), fond
  `surface/95 backdrop-blur`, filet bas.
- Onglets en ligne : icône SVG trait + label. **Actif** = texte `accent` +
  **soulignement `accent`** (filet bas 2px). **Inactif** = `muted` → hover
  `foreground`. Défilement horizontal si débordement sur petit écran.
- `aria-current="page"` sur l'onglet actif. **Pas d'emoji.**

### Boutons
- **Primary** : `bg-accent text-accent-fg`, `rounded-lg`, `font-medium`,
  hover `bg-accent-strong`, focus ring, `active:scale-[0.99]`,
  `disabled:opacity-50`.
- **Secondary** : `bg-surface border border-border` → hover `border-strong` +
  `bg-surface-2`.
- **Ghost** : transparent → hover `bg-surface-2`. Pour icônes/steppers.

### Carte de match (écran prioritaire)
- `bg-surface border border-border rounded-lg p-4`, hover comme §5.
- **Ligne 1** : ligue (`faint`, `text-xs uppercase tracking-wide`, tronquée) —
  à gauche ; badge de statut à droite.
- **Corps** : deux lignes équipe — nom à gauche (`text-sm`, tronqué), score à
  droite (`font-mono tabular-nums`, masqué si à venir). Vainqueur en
  `foreground`/`font-medium`, perdant atténué en `muted`.
- **Heure** (si à venir) : colonne droite séparée d'un filet, `muted`, `text-sm`.
- **Footer prono** (si pronostiqué) : filet haut, « Votre prono X-Y » (mono) à
  gauche + pill points `success` à droite si réglé.

### Badge de statut
- Pill `rounded-full text-xs px-2 py-0.5`.
- `À venir` / `Terminé` / `Reporté` / `Annulé` : `bg-surface-2 text-muted`.
- `Live` : `text-danger` + point `danger` `animate-pulse` + minute `font-mono`.

### Sélecteur de score (stepper)
- Bloc centré : libellé équipe (`faint`, `text-xs`, tronqué), puis `[−] N [+]`.
- Chiffre : `font-mono text-3xl tabular-nums`, largeur fixe.
- Boutons ± : ghost, carré `size-10`, `rounded-md`, `border border-border` →
  hover `bg-surface-2`, `active:scale-95`. Bornes 0–20.

### Classement (lignes)
- Ligne : `flex items-center gap-3 rounded-lg p-3 border border-border`.
- Rang : `font-mono w-8 text-center`. Top 3 : chiffre coloré
  `gold`/`silver`/`bronze` (pas d'emoji médaille).
- Pseudo (`font-medium`) + méta `faint`. Points à droite `font-mono`.
- **Vous** : `bg-accent/8 border-accent/40` + label « vous » en `accent`.

### Stats de profil
- Cartes `bg-surface border rounded-lg p-4` : grande valeur `font-mono text-2xl`,
  label `faint text-xs`. Grille 2 colonnes.

### États
- **Vide** : bloc centré `border-dashed`, texte `muted`, CTA éventuel.
- **Chargement** : skeletons `bg-surface-2` (pas de spinner) reproduisant la
  forme des cartes ; via `loading.tsx`.
- **Verrouillé** : carte `surface`, icône cadenas `faint`, texte `muted`,
  rappel du prono verrouillé.

## 7. Accessibilité
- Contraste AA mini : `muted` sur `surface` OK ; éviter `faint` pour du texte
  important.
- Focus toujours visible (`ring-2 ring-ring`).
- Cibles tactiles ≥ 40px. `aria-current="page"` sur l'onglet actif.
- Le statut ne repose pas que sur la couleur (toujours un libellé texte).

## 8. Anti-patterns (à bannir)
1. Ombres portées marquées / cartes « qui flottent ».
2. Plusieurs couleurs d'accent ou dégradés.
3. Gris « sale » ou blanc sur blanc sans filet de séparation.
4. Emojis comme iconographie (nav, médailles) → SVG trait.
5. Gros rayons « bulle » et tailles de titre démesurées.
6. Espacements arbitraires hors échelle de 4px.
