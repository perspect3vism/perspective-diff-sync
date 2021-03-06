use hdk::prelude::*;
use perspective_diff_sync_integrity::{PerspectiveDiff, PerspectiveDiffEntryReference, Snapshot, LinkTypes, EntryTypes};

use crate::errors::{SocialContextError, SocialContextResult};

pub fn get_entries_since_snapshot(
    latest: HoloHash<holo_hash::hash_type::Action>,
) -> SocialContextResult<usize> {
    let mut search_position = latest;
    let mut depth = 0;
    let mut seen = HashSet::new();
    let mut unseen_parents = vec![];

    loop {
        let diff = get(search_position.clone(), GetOptions::latest())?
            .ok_or(SocialContextError::InternalError(
                "Could not find entry while populating search",
            ))?
            .entry()
            .to_app_option::<PerspectiveDiffEntryReference>()?
            .ok_or(SocialContextError::InternalError(
                "Expected element to contain app entry data",
            ))?;
        //Check if entry is already in graph
        if !seen.contains(&search_position) {
            seen.insert(search_position.clone());
            //Only increase depth if entry is not a merge entry?
            if diff.parents.is_some() {
                if diff.parents.clone().unwrap().len() < 2 {
                    depth += 1;
                }
            } else {
                depth += 1;
            }
        };
        let diff_entry_hash = hash_entry(&diff)?;
        let check_snapshot = get_links(diff_entry_hash, LinkTypes::Snapshot, Some(LinkTag::new("snapshot")))?;
        if check_snapshot.len() != 0 {
            depth -= 1;
            break;
        }

        if diff.parents.is_none() {
            //No parents, we have reached the end of the chain
            //Now move onto traversing parents
            if unseen_parents.len() == 0 {
                debug!("No more unseen items");
                break;
            } else {
                debug!("Moving onto unseen fork items");
                search_position = unseen_parents.remove(0);
            }
        } else {
            let mut parents = diff.parents.unwrap();
            //Check if all parents have already been seen, if so then break or move onto next unseen parents
            if parents.iter().all(|val| seen.contains(val)) {
                if unseen_parents.len() == 0 {
                    debug!("Reached end of graph");
                    break;
                } else {
                    search_position = unseen_parents.remove(0);
                };
            } else {
                search_position = parents.remove(0);
                unseen_parents.append(&mut parents);
            };
        }
    }
    Ok(depth)
}

pub fn generate_snapshot(
    latest: HoloHash<holo_hash::hash_type::Action>,
) -> SocialContextResult<Snapshot> {
    let mut search_position = latest;
    let mut seen = HashSet::new();
    let mut diffs = vec![];

    let mut snapshot_diff = PerspectiveDiff {
        additions: vec![],
        removals: vec![],
    };

    loop {
        let diff = get(search_position.clone(), GetOptions::latest())?
            .ok_or(SocialContextError::InternalError(
                "Could not find entry while populating search",
            ))?
            .entry()
            .to_app_option::<PerspectiveDiffEntryReference>()?
            .ok_or(SocialContextError::InternalError(
                "Expected element to contain app entry data",
            ))?;
        let mut snapshot_links = get_links(hash_entry(&diff)?, LinkTypes::Snapshot, Some(LinkTag::new("snapshot")))?;
        if snapshot_links.len() > 0 {
            //get snapshot and add elements to out
            let mut snapshot = get(snapshot_links.remove(0).target, GetOptions::latest())?
                .ok_or(SocialContextError::InternalError(
                    "Could not find diff entry for given diff entry reference",
                ))?
                .entry()
                .to_app_option::<Snapshot>()?
                .ok_or(SocialContextError::InternalError(
                    "Expected element to contain app entry data",
                ))?;
            let diff = get(snapshot.diff, GetOptions::latest())?
                .ok_or(SocialContextError::InternalError(
                    "Could not find diff entry for given diff entry reference",
                ))?
                .entry()
                .to_app_option::<PerspectiveDiff>()?
                .ok_or(SocialContextError::InternalError(
                    "Expected element to contain app entry data",
                ))?;
            snapshot_diff.additions.append(&mut diff.additions.clone());
            snapshot_diff.removals.append(&mut diff.removals.clone());
            diffs.append(&mut snapshot.diff_graph);
            debug!("Breaking at snapshot");
            break;
        } else {
            //Check if entry is already in graph
            if !seen.contains(&search_position) {
                seen.insert(search_position.clone());
                diffs.push((search_position.clone(), diff.clone()));
                let diff_entry = get(diff.diff.clone(), GetOptions::latest())?
                    .ok_or(SocialContextError::InternalError(
                        "Could not find diff entry for given diff entry reference",
                    ))?
                    .entry()
                    .to_app_option::<PerspectiveDiff>()?
                    .ok_or(SocialContextError::InternalError(
                        "Expected element to contain app entry data",
                    ))?;
                snapshot_diff
                    .additions
                    .append(&mut diff_entry.additions.clone());
                snapshot_diff
                    .removals
                    .append(&mut diff_entry.removals.clone());
            };
        }

        if diff.parents.is_none() {
            break;
        } else {
            let mut parents = diff.parents.unwrap();
            //Check if all parents have already been seen, if so then break or move onto next unseen parents
            if parents.iter().all(|val| seen.contains(val)) {
                break;
            } else {
                search_position = parents.remove(0);
            };
        }
    }

    let diff_create = create_entry(EntryTypes::PerspectiveDiff(snapshot_diff))?;
    let snapshot = Snapshot {
        diff: diff_create,
        diff_graph: diffs,
    };

    Ok(snapshot)
}

pub fn get_latest_snapshot(
    latest: HoloHash<holo_hash::hash_type::Action>,
) -> SocialContextResult<PerspectiveDiff> {
    let mut search_position = latest;
    let mut seen = HashSet::new();

    let mut out = PerspectiveDiff {
        additions: vec![],
        removals: vec![],
    };

    loop {
        let diff = get(search_position.clone(), GetOptions::latest())?
            .ok_or(SocialContextError::InternalError(
                "Could not find entry while populating search",
            ))?
            .entry()
            .to_app_option::<PerspectiveDiffEntryReference>()?
            .ok_or(SocialContextError::InternalError(
                "Expected element to contain app entry data",
            ))?;
        if !seen.contains(&search_position) {
            seen.insert(search_position.clone());
            let diff_entry_hash = hash_entry(&diff)?;
            let mut snapshot_links = get_links(diff_entry_hash, LinkTypes::Snapshot, Some(LinkTag::new("snapshot")))?;
            if snapshot_links.len() != 0 {
                //get snapshot and add elements to out
                let snapshot = get(snapshot_links.remove(0).target, GetOptions::latest())?
                    .ok_or(SocialContextError::InternalError(
                        "Could not find diff entry for given diff entry reference",
                    ))?
                    .entry()
                    .to_app_option::<Snapshot>()?
                    .ok_or(SocialContextError::InternalError(
                        "Expected element to contain app entry data",
                    ))?;
                let diff = get(snapshot.diff, GetOptions::latest())?
                    .ok_or(SocialContextError::InternalError(
                        "Could not find diff entry for given diff entry reference",
                    ))?
                    .entry()
                    .to_app_option::<PerspectiveDiff>()?
                    .ok_or(SocialContextError::InternalError(
                        "Expected element to contain app entry data",
                    ))?;
                out.additions.append(&mut diff.additions.clone());
                out.removals.append(&mut diff.removals.clone());
                debug!("Breaking at snapshot");
                break;
            }
        }

        if diff.parents.is_none() {
            //TODO; add fork traversing
            break;
        } else {
            let mut parents = diff.parents.unwrap();
            //Check if all parents have already been seen, if so then break or move onto next unseen parents
            if parents.iter().all(|val| seen.contains(val)) {
                break;
            } else {
                search_position = parents.remove(0);
            };
        }
    }

    Ok(out)
}
