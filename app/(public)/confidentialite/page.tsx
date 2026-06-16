import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confidentialité · Mugen",
  description: "Politique de confidentialité et gestion des données de Mugen.",
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted">
        {children}
      </div>
    </section>
  );
}

export default function ConfidentialitePage() {
  return (
    <article className="mx-auto w-full max-w-2xl px-6 pb-20 pt-28 sm:pt-32">
      <h1 className="text-3xl font-bold tracking-tight">Confidentialité</h1>
      <p className="mt-3 text-sm text-faint">
        Dernière mise à jour : à compléter par l&apos;éditeur.
      </p>

      <Block title="Données collectées">
        <p>Pour faire fonctionner le jeu, Mugen traite :</p>
        <ul className="list-disc space-y-1 pl-5 marker:text-faint">
          <li>
            ton compte : adresse e-mail (ou identifiant du fournisseur de
            connexion), pseudo et, le cas échéant, avatar ;
          </li>
          <li>
            ton activité de jeu : pronostics, points, pièces, succès, niveau,
            objets cosmétiques et appartenance à des groupes ;
          </li>
          <li>
            tes signalements (bugs, suggestions) lorsque tu en envoies, associés à
            ton compte.
          </li>
        </ul>
      </Block>

      <Block title="Finalités">
        <p>
          Ces données servent uniquement à fournir le service : authentification,
          classement, économie du jeu, et traitement de tes signalements. Aucune
          revente de données à des tiers.
        </p>
      </Block>

      <Block title="Hébergement & sous-traitants">
        <p>
          L&apos;authentification et la base de données sont assurées par Supabase.
          Les données de matchs proviennent d&apos;un fournisseur tiers. Ces
          prestataires agissent comme sous-traitants techniques.
        </p>
      </Block>

      <Block title="Cookies">
        <p>
          Mugen utilise uniquement des cookies strictement nécessaires au maintien
          de ta session connectée. Aucun cookie publicitaire ni de pistage tiers.
        </p>
      </Block>

      <Block title="Tes droits">
        <p>
          Conformément au RGPD, tu disposes d&apos;un droit d&apos;accès, de
          rectification et de suppression de tes données. Pour l&apos;exercer,
          écris à{" "}
          <a
            href="mailto:webmaster@beproject.fr"
            className="font-medium text-accent hover:underline"
          >
            webmaster@beproject.fr
          </a>
          .
        </p>
      </Block>

      <Block title="Conservation">
        <p>
          Tes données sont conservées tant que ton compte existe. À sa suppression,
          elles sont effacées ou anonymisées, sauf obligation légale de
          conservation.
        </p>
      </Block>
    </article>
  );
}
