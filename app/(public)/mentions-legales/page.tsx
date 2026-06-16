import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales · Mugen",
  description: "Mentions légales du service Mugen.",
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

export default function MentionsLegalesPage() {
  return (
    <article className="mx-auto w-full max-w-2xl px-6 pb-20 pt-28 sm:pt-32">
      <h1 className="text-3xl font-bold tracking-tight">Mentions légales</h1>
      <p className="mt-3 text-sm text-faint">
        Dernière mise à jour : à compléter par l&apos;éditeur.
      </p>

      <Block title="Éditeur">
        <p>
          Mugen est édité par BeProject. Pour toute question, contactez{" "}
          <a
            href="mailto:webmaster@beproject.fr"
            className="font-medium text-accent hover:underline"
          >
            webmaster@beproject.fr
          </a>
          .
        </p>
        <p className="text-faint">
          Raison sociale, forme juridique, capital, RCS et adresse postale : à
          renseigner.
        </p>
      </Block>

      <Block title="Directeur de la publication">
        <p>À renseigner par l&apos;éditeur.</p>
      </Block>

      <Block title="Hébergement">
        <p>
          L&apos;application est hébergée par son fournisseur d&apos;infrastructure
          (front) et par Supabase (base de données et authentification). Les noms
          et adresses des hébergeurs sont à compléter selon le déploiement.
        </p>
      </Block>

      <Block title="Propriété intellectuelle">
        <p>
          L&apos;ensemble des éléments du service (marque, interface, textes,
          visuels) est protégé. Les données de matchs proviennent de fournisseurs
          tiers et restent la propriété de leurs ayants droit respectifs.
        </p>
      </Block>

      <Block title="Responsabilité">
        <p>
          Mugen est un jeu de pronostics gratuit et sans enjeu financier. Les
          informations affichées (matchs, scores, classements) sont fournies à
          titre indicatif et peuvent comporter des erreurs ou des retards de mise
          à jour.
        </p>
      </Block>
    </article>
  );
}
