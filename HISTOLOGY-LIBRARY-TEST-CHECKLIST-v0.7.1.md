# Histology Library v0.7.1 Test Checklist

## Desktop viewport hotfix
- [ ] At 1920×1080, the Histology header and viewer fit inside the browser viewport with no page-level vertical overflow.
- [ ] At ~1366×768 / other short laptop heights, the left workspace bottom is reachable by scrolling inside the sidebar.
- [ ] The sidebar right/bottom borders remain visually aligned with the viewer workspace.
- [ ] The final Learning progress content has visible bottom breathing room rather than being clipped.
- [ ] The viewer top bar, WSI stage, navigator and bottom toolbar remain inside the viewport.
- [ ] Resizing browser height does not require a refresh to regain the bottom of the sidebar.

## Interaction regression
- [ ] Notes opens/closes and persists.
- [ ] Draw remains non-modal and draws on the WSI.
- [ ] My Labels can create/edit colored point and region annotations.
- [ ] Study, Quiz and Locate operate normally.
- [ ] Histology Studio point/region authoring still works.
- [ ] Developer/local PMA setup panel remains reachable on short windows.
- [ ] Cloud status/manual sync remains functional when signed in.

## Responsive regression
- [ ] Below 820 px width, the page returns to normal document scrolling.
- [ ] Sidebar is not trapped in a fixed-height desktop scroll container on mobile.
- [ ] Header controls, drawers and viewer retain their existing responsive behavior.

## Data/release
- [ ] No SQL migration required.
- [ ] Existing v0.7 local/cloud Histology workspaces remain compatible.
- [ ] Full V5 regression and release checks pass.
