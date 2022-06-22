import type { Address, Language, Interaction, HolochainLanguageDelegate, LanguageContext } from "@perspect3vism/ad4m";
import { LinkAdapter } from "./linksAdapter";
import { JuntoSettingsUI } from "./settingsUI";
import { DNA, DNA_NICK } from "./dna";

function interactions(expression: Address): Interaction[] {
  return [];
}

const activeAgentDurationSecs = 300;

export default async function create(context: LanguageContext): Promise<Language> {
  const Holochain = context.Holochain as HolochainLanguageDelegate;

  const linksAdapter = new LinkAdapter(context);
  const settingsUI = new JuntoSettingsUI();

  await Holochain.registerDNAs(
    [{ file: DNA, nick: DNA_NICK }],
    (signal) => { linksAdapter.handleHolochainSignal(signal) }
  );

  await linksAdapter.addActiveAgentLink(Holochain);
  setInterval(
    async () => await linksAdapter.addActiveAgentLink.bind(Holochain),
    activeAgentDurationSecs * 1000
  );

  return {
    name: "perspective-diff-sync",
    linksAdapter,
    settingsUI,
    interactions,
  } as Language;
}
