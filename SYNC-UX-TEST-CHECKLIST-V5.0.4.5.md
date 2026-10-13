# MORPHORA V5.0.4.5 — Sync UX Test Checklist

- Sign in and confirm Sync Center displays **Everything is synced** with all counters at zero.
- Go offline, create/edit a note or drawing, and confirm the Sync Center reports Offline without blocking local work.
- Reconnect and press **Sync now**; confirm pending items clear.
- Force or simulate a failed queue item and confirm **Retry** is available.
- Force a revision conflict from two devices and confirm both **Keep this device** and **Use cloud version** actions appear.
- Use **Keep this device** and confirm the local version is retried against the latest remote revision.
- Use **Use cloud version** and confirm the remote data is restored into the relevant local surface.
- Confirm User A's queue items never appear while User B is signed into the same browser.
- Confirm English and Spanish Sync Center strings render correctly.
- Confirm Sync Center is usable on a narrow/mobile viewport.
