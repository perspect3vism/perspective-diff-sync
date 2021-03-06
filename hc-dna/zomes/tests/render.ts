import { addAllAgentsToAllConductors, cleanAllConductors } from "@holochain/tryorama";
import { sleep, generate_link_expression, createConductors} from "./utils";

//NOTE; these tests are dependant on the SNAPSHOT_INTERVAL in lib.rs being set to 2
//@ts-ignore
export async function render(t) {
    let installs = await createConductors(2);
    let aliceHapps = installs[0].agent_happ;
    let conductor1 = installs[0].conductor;
    let bobHapps = installs[1].agent_happ;
    let conductor2 = installs[1].conductor;
    await addAllAgentsToAllConductors([conductor1, conductor2]);
    
    let commit = await aliceHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "commit", 
        payload: {additions: [generate_link_expression("alice1")], removals: []}
    });
    console.warn("\ncommit", commit);
    
    await aliceHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "update_latest_revision",
        payload: commit
    });
    await aliceHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "update_current_revision", 
        payload: commit
    });

    let commit2 = await aliceHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "commit", 
        payload: {additions: [generate_link_expression("alice2")], removals: []}
    });
    console.warn("\ncommit", commit2);
    
    await aliceHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "update_latest_revision",
        payload: commit2
    });
    await aliceHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "update_current_revision", 
        payload: commit2
    });

    await sleep(1000);
    
    let bob_render = await bobHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "render"
    });
    console.warn("bob rendered with", bob_render);
    //@ts-ignore
    t.deepEqual(bob_render.links.length, 2);

    await bobHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "update_latest_revision",
        payload: commit2
    });
    await bobHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "update_current_revision", 
        payload: commit2
    });

    let commit4 = await bobHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "commit", 
        payload: {additions: [generate_link_expression("bob3")], removals: []}
    });
    console.warn("\ncommit", commit4);
    
    await bobHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "update_latest_revision",
        payload: commit4
    });
    await bobHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "update_current_revision", 
        payload: commit4
    });


    let commit5 = await bobHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "commit", 
        payload: {additions: [generate_link_expression("bob4")], removals: []}
    });
    console.warn("\ncommit", commit5);
    
    await bobHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "update_latest_revision",
        payload: commit5
    });
    await bobHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "update_current_revision", 
        payload: commit5
    });

    let alice_render = await aliceHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "render"
    });
    console.warn("Alice rendered with", alice_render);
    //@ts-ignore
    t.deepEqual(alice_render.links.length, 4);

    await conductor1.shutDown();
    await conductor2.shutDown();
    await cleanAllConductors();
};

//@ts-ignore
export async function renderMerges(t) {
    let installs = await createConductors(2);
    let aliceHapps = installs[0].agent_happ;
    let conductor1 = installs[0].conductor;
    let bobHapps = installs[1].agent_happ;
    let conductor2 = installs[1].conductor;
    
    console.log("commit1");
    let commit = await aliceHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "commit", 
        payload: {additions: [generate_link_expression("alice1")], removals: []}
    });
    console.warn("\ncommit", commit);
    
    await aliceHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "update_latest_revision",
        payload: commit
    });
    await aliceHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "update_current_revision", 
        payload: commit
    });

    console.log("commit2");
    let commit2 = await aliceHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "commit", 
        payload: {additions: [generate_link_expression("alice2")], removals: []}
    });
    console.warn("\ncommit", commit2);
    
    await aliceHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "update_latest_revision",
        payload: commit2
    });
    await aliceHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "update_current_revision", 
        payload: commit2
    });

    console.log("commit3");
    let commit3 = await bobHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "commit", 
        payload: {additions: [generate_link_expression("bob1")], removals: []}
    });
    console.warn("\ncommit", commit3);
    
    await bobHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "update_latest_revision",
        payload: commit3
    });
    await bobHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "update_current_revision", 
        payload: commit3
    });

    console.log("commit4");
    let commit4 = await bobHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "commit", 
        payload: {additions: [generate_link_expression("bob2")], removals: []}
    });
    console.warn("\ncommit", commit4);
    
    await bobHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "update_latest_revision",
        payload: commit4
    });
    await bobHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "update_current_revision", 
        payload: commit4
    });

    console.log("bob render");
    let bob_render = await bobHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "render"
    });
    console.warn("bob rendered with", bob_render);
    //@ts-ignore
    t.isEqual(bob_render.links.length, 2);

    console.log("alice render");
    let alice_render = await aliceHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "render"
    });
    console.warn("Alice rendered with", alice_render);
    //@ts-ignore
    t.isEqual(alice_render.links.length, 2);
    
    await addAllAgentsToAllConductors([conductor1, conductor2]);
    await sleep(500);

    //Test getting revision, should return bob's revision since that is the latest entry

    //Alice commit which will create a merge and another entry
    console.log("commit5");
    let commit5 = await aliceHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "commit", 
        payload: {additions: [generate_link_expression("alice3")], removals: []}
    });
    console.warn("\ncommit5", commit5);
    
    await aliceHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "update_latest_revision",
        payload: commit5
    });
    await aliceHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "update_current_revision", 
        payload: commit5
    });

    //Alice commit which should not create another snapshot
    console.log("commit6");
    let commit6 = await aliceHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "commit", 
        payload: {additions: [generate_link_expression("alice4")], removals: []}
    });
    console.warn("\ncommit6", commit6);
    
    await aliceHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "update_latest_revision",
        payload: commit6
    });
    await aliceHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "update_current_revision", 
        payload: commit6
    });
    await sleep(500)

    console.log("bob render");
    let bob_render2 = await bobHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "render"
    });
    console.warn("bob rendered with", bob_render2);
    //@ts-ignore
    t.isEqual(bob_render2.links.length, 6);

    console.log("alice render");
    let alice_render2 = await aliceHapps.cells[0].callZome({
        zome_name: "perspective_diff_sync", 
        fn_name: "render"
    });
    console.warn("Alice rendered with", alice_render2);
    //@ts-ignore
    t.isEqual(alice_render2.links.length, 6);

    await conductor1.shutDown();
    await conductor2.shutDown();
    await cleanAllConductors();
}