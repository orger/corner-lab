# Corner Lab

The macOS desktop app and iPhone/web app share the implementation in `app/`.
Implement future user-facing features for both platforms and all applicable
trainers (2×2, 5×5 edges and 5×5 centres), unless the user explicitly limits scope.
Keep existing histories and older backups compatible when adding settings.

For behavior changes, run the relevant automated tests, check the phone layout,
and validate the native shell. Deliver updated Mac and web builds together.
Keep personal backups, supplied PDFs and temporary test data out of web releases.

After each completed new Corner Lab build, automatically publish the verified
web release to the existing GitHub Pages site at `cubing.orger.org`. The user
has authorized this as the default; do not wait for a separate publishing
request. Follow the deployment through completion and verify the live update.
