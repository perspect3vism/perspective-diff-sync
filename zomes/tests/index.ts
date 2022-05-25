import { Orchestrator, Config, InstallAgentsHapps } from '@holochain/tryorama'
import { TransportConfigType, ProxyAcceptConfig, ProxyConfigType, NetworkType } from '@holochain/tryorama'
import path from 'path'
import faker from 'faker'

//const conductorConfig = Config.gen({network});
const conductorConfig = Config.gen();

const installation: InstallAgentsHapps = [
  // agent 0
  [
    // happ 0
    [path.join("../../workdir/social-context.dna")]
  ]
]

let orchestrator = new Orchestrator()

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

orchestrator.registerScenario("test committing, and updating latest & current revisions", async (s, t) => {
  const [alice] = await s.players([conductorConfig])
  const [[alice_sc_happ]] = await alice.installAgentsHapps(installation)

  let latest_revision = await alice_sc_happ.cells[0].call("social_context", "latest_revision");
  console.warn("latest_revision", latest_revision);

  let current_revision = await alice_sc_happ.cells[0].call("social_context", "current_revision");
  console.warn("current_revision", current_revision);

  let commit = await alice_sc_happ.cells[0].call("social_context", "commit", {additions: [], removals: []});
  console.warn("\ncommit", commit);

  await alice_sc_happ.cells[0].call("social_context", "update_latest_revision", commit);
  await alice_sc_happ.cells[0].call("social_context", "update_current_revision", commit);

  let latest_revision2 = await alice_sc_happ.cells[0].call("social_context", "latest_revision");
  console.warn("latest_revision2", latest_revision2);
  t.isEqual(commit.toString(), latest_revision2.toString())

  let current_revision2 = await alice_sc_happ.cells[0].call("social_context", "current_revision");
  console.warn("current_revision2", current_revision2);
  t.isEqual(commit.toString(), current_revision2.toString())

  let commit2 = await alice_sc_happ.cells[0].call("social_context", "commit", {additions: [], removals: []});
  console.warn("\ncommit2", commit2);

  await alice_sc_happ.cells[0].call("social_context", "update_latest_revision", commit2);
  await alice_sc_happ.cells[0].call("social_context", "update_current_revision", commit2);

  let latest_revision3 = await alice_sc_happ.cells[0].call("social_context", "latest_revision");
  console.warn("latest_revision3", latest_revision3);
  t.isEqual(commit2.toString(), latest_revision3.toString())

  let current_revision3 = await alice_sc_happ.cells[0].call("social_context", "current_revision");
  console.warn("current_revision3", current_revision3);
  t.isEqual(commit2.toString(), current_revision3.toString())
})

orchestrator = new Orchestrator()

orchestrator.registerScenario("test un-synced fetch", async (s, t) => {
  const [alice, bob] = await s.players([conductorConfig, conductorConfig])
  const [[alice_happ]] = await alice.installAgentsHapps(installation)
  const [[bob_happ]] = await alice.installAgentsHapps(installation)
  await s.shareAllNodes([alice, bob])

  let commit = await alice_happ.cells[0].call("social_context", "commit", {additions: [generate_link_expression("alice")], removals: []});
  console.warn("\ncommit", commit);

  await alice_happ.cells[0].call("social_context", "update_latest_revision", commit);
  await alice_happ.cells[0].call("social_context", "update_current_revision", commit);

  let pull_alice = await alice_happ.cells[0].call("social_context", "pull");
  console.warn("\npull alice", pull_alice);

  let pull_bob = await bob_happ.cells[0].call("social_context", "pull");
  console.warn("\npull bob", pull_bob);
  t.isEqual(pull_bob.length, 1);
})

orchestrator = new Orchestrator()

orchestrator.registerScenario("test merge fetch", async (s, t) => {
  const [alice, bob] = await s.players([conductorConfig, conductorConfig])
  const [[alice_happ]] = await alice.installAgentsHapps(installation)
  const [[bob_happ]] = await bob.installAgentsHapps(installation)

  //Create new commit whilst bob is not connected
  let link_data = generate_link_expression("alice");
  console.log("Alice posting link data", link_data);
  let commit = await alice_happ.cells[0].call("social_context", "commit", {additions: [link_data], removals: []});
  console.warn("\ncommit", commit.toString("base64"));
  await alice_happ.cells[0].call("social_context", "update_latest_revision", commit);
  await alice_happ.cells[0].call("social_context", "update_current_revision", commit);

  //Pull from bob and make sure he does not have the latest state
  let pull_bob = await bob_happ.cells[0].call("social_context", "pull");
  t.isEqual(pull_bob.additions.length, 0);

  //Bob to commit his data, and update the latest revision, causing a fork
  let bob_link_data = generate_link_expression("bob");
  console.log("Bob posting link data", bob_link_data);
  let commit_bob = await bob_happ.cells[0].call("social_context", "commit", {additions: [bob_link_data], removals: []});
  console.warn("\ncommit_bob", commit_bob.toString("base64"));
  await bob_happ.cells[0].call("social_context", "update_latest_revision", commit_bob);
  await bob_happ.cells[0].call("social_context", "update_current_revision", commit_bob);

  let pull_bob2 = await bob_happ.cells[0].call("social_context", "pull");
  t.isEqual(pull_bob2.additions.length, 0);

  //Connect nodes togther
  await s.shareAllNodes([alice, bob])
  //note; running this test on some machines may require more than 200ms wait
  await sleep(200)

  //Alice tries to merge
  let merge_alice = await alice_happ.cells[0].call("social_context", "pull");
  t.isEqual(merge_alice.additions.length, 1);
  t.isEqual(JSON.stringify(merge_alice.additions[0].data), JSON.stringify(bob_link_data.data));

  //note; running this test on some machines may require more than 200ms wait
  await sleep(200)

  let pull_bob3 = await bob_happ.cells[0].call("social_context", "pull");
  t.isEqual(pull_bob3.additions.length, 1);
  console.log(pull_bob3.additions[0].data);
  t.isEqual(JSON.stringify(pull_bob3.additions[0].data), JSON.stringify(link_data.data));
})

orchestrator = new Orchestrator()

orchestrator.registerScenario("test complex merge", async (s, t) => {
  const [alice, bob, eric] = await s.players([conductorConfig, conductorConfig, conductorConfig])
  const [[alice_happ]] = await alice.installAgentsHapps(installation)
  const [[bob_happ]] = await bob.installAgentsHapps(installation)
  const [[eric_happ]] = await eric.installAgentsHapps(installation)

  // 1 -> alice_link (2)
  //Create new commit whilst bob is not connected
  let link_data = generate_link_expression("alice1");
  console.log("Alice posting link data", link_data);
  let commit = await alice_happ.cells[0].call("social_context", "commit", {additions: [link_data], removals: []});
  console.warn("\ncommit", commit.toString("base64"));
  await alice_happ.cells[0].call("social_context", "update_latest_revision", commit);
  await alice_happ.cells[0].call("social_context", "update_current_revision", commit);

  //1 -> bob_link (3)
  //Bob to commit his data, and update the latest revision, causing a fork
  let bob_link_data = generate_link_expression("bob1");
  console.log("Bob posting link data", bob_link_data);
  let commit_bob = await bob_happ.cells[0].call("social_context", "commit", {additions: [bob_link_data], removals: []});
  console.warn("\ncommit_bob", commit_bob.toString("base64"));
  await bob_happ.cells[0].call("social_context", "update_latest_revision", commit_bob);
  await bob_happ.cells[0].call("social_context", "update_current_revision", commit_bob);

  //Update bob to use latest revision as created by bob; bob and eric now in their own forked state
  //await eric_happ.cells[0].call("social_context", "update_latest_revision", commit_bob);
  await eric_happ.cells[0].call("social_context", "update_current_revision", commit_bob);

  //1 -> bob_link(3) -> eric_link(4)
  //Eric to commit his data, and update the latest revision, causing another fork on a fork
  let eric_link_data = generate_link_expression("eric1");
  console.log("eric posting link data, child of eric commit", eric_link_data);
  let commit_eric = await eric_happ.cells[0].call("social_context", "commit", {additions: [eric_link_data], removals: []});
  console.warn("\ncommit_eric", commit_eric.toString("base64"));
  await eric_happ.cells[0].call("social_context", "update_latest_revision", commit_eric);
  await eric_happ.cells[0].call("social_context", "update_current_revision", commit_eric);

  // let eric_pull = await eric_happ.cells[0].call("social_context", "pull");
  // console.log("eric pull result", eric_pull);

  //1 -> bob_link(3) -> eric_link(4)
  //                 -> bob_link(5)
  //1 -> alice_link(2) 
  let bob_link_data2 = generate_link_expression("bob2");
  console.log("Bob posting link data, child of bob last commit", bob_link_data2);
  let commit_bob2 = await bob_happ.cells[0].call("social_context", "commit", {additions: [bob_link_data2], removals: []});
  console.warn("\ncommit_bob2", commit_bob2.toString("base64"));
  await bob_happ.cells[0].call("social_context", "update_latest_revision", commit_bob2);
  await bob_happ.cells[0].call("social_context", "update_current_revision", commit_bob2);

  //1 -> bob_link(3) -> eric_link(4) -> eric_link(6)
  //                 -> bob_link(5)
  //1 -> alice_link(2) 
  //Eric to commit his data, and update the latest revision, causing another fork on a fork
  let eric_link_data2 = generate_link_expression("eric2");
  console.log("eric posting link data, child of eric last commit", eric_link_data2);
  let commit_eric2 = await eric_happ.cells[0].call("social_context", "commit", {additions: [eric_link_data2], removals: []});
  console.warn("\ncommit_eric2", commit_eric2.toString("base64"));
  await eric_happ.cells[0].call("social_context", "update_latest_revision", commit_eric2);
  await eric_happ.cells[0].call("social_context", "update_current_revision", commit_eric2);

  //Connect nodes togther
  await s.shareAllNodes([alice, bob, eric])
  //note; running this test on some machines may require more than 500ms wait
  await sleep(1000)

  let bob_merge = await bob_happ.cells[0].call("social_context", "pull");
  console.log("Bob merge result", bob_merge);
  //Should get two entries from Eric
  await sleep(200)

  let alice_merge = await alice_happ.cells[0].call("social_context", "pull");
  console.log("Alice merge result", alice_merge);
  //should get whole side of bob/eric graph
  await sleep(200)
  
  //Should get alice graph and one entry from bobs
  let eric_pull = await eric_happ.cells[0].call("social_context", "pull");
  console.log("Eric pull result", eric_pull);
})

function generate_link_expression(agent: string) {
  return {
    data: {source: faker.name.findName(), target: faker.name.findName(), predicate: faker.name.findName()},
    author: agent, 
    timestamp: new Date().toISOString(), 
    proof: {signature: "sig", key: "key"},
 }
}

// Run all registered scenarios as a final step, and gather the report,
// if you set up a reporter
const report = orchestrator.run()

// Note: by default, there will be no report
console.log(report)