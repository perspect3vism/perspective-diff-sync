import { AgentHapp, Conductor } from "@holochain/tryorama";
import faker from "faker";
import { dnas } from './common';
import { createConductor } from "@holochain/tryorama";

export function generate_link_expression(agent: string) {
    return {
      data: {source: faker.name.findName(), target: faker.name.findName(), predicate: faker.name.findName()},
      author: agent, 
      timestamp: new Date().toISOString(), 
      proof: {signature: "sig", key: "key"},
   }
}

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function createConductors(num: number): Promise<{agent_happ: AgentHapp, conductor: Conductor}[]> {
    let out = [] as {agent_happ: AgentHapp, conductor: Conductor}[];
    for (let n of Array(num).keys()) {
        let conductor = await createConductor();
        let [happ] = await conductor.installAgentsHapps({
            agentsDnas: [dnas],
        });
        out.push({
            agent_happ: happ,
            conductor
        })
    }
    return out
}