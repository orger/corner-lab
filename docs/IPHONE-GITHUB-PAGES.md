# Corner Lab on iPhone and GitHub Pages

Web releases target `cubing.orger.org`. Use the update steps for the existing site, or the publishing steps for a fresh repository. The `maths.orger.org` site keeps its own repository and settings.

## Update an existing installation

Desktop and iPhone use the same feature code. After a new release, replace the
changed source files in the existing GitHub repository and commit to **main**.
The supplied workflow tests and publishes the updated site automatically.
Keep the existing `.github/workflows/pages.yml`, Pages settings and DNS record.
On the iPhone, reconnect and reopen Corner Lab; when **Update ready** appears,
choose **Update** while no timer is running. The update keeps the device's data.
For the Mac version, close Corner Lab and reopen the newly built app bundle.

## Publish the trainer

1. Put this project in its own GitHub repository, including `.github/workflows/pages.yml`. Do not upload personal backup files or the Mac application's data. A public repository works with GitHub Free; private-repository Pages requires an eligible paid plan.
2. In that repository, open **Settings → Pages** and select **GitHub Actions** as the publishing source.
3. Push the project to **main**, the branch used by the supplied workflow. The workflow tests the trainer, builds the web files, and publishes them. Its progress appears under **Actions**; it can also be started manually there. If your default branch has another name, update the workflow's branch setting first.
4. In **Settings → Pages → Custom domain**, enter **cubing.orger.org** and save it **before** changing DNS. GitHub Actions deployments require this repository setting; including a `CNAME` file alone does not set the custom domain.
5. At the DNS provider for `orger.org`, add this record:

   | Type | Name | Destination |
   | --- | --- | --- |
   | CNAME | `cubing` | `YOUR-GITHUB-USERNAME.github.io` |

   Replace the destination with your actual GitHub Pages hostname. It will usually be the same destination as `maths` if both repositories belong to the same account. Use the hostname without `https://` or a repository path. Leave the existing `maths` record in place.
6. When GitHub's domain check and certificate provisioning finish, enable **Enforce HTTPS** in the Pages settings. DNS changes and certificate issuance may take some time. Check the published address over HTTPS before installing it on the phone.

These steps follow GitHub's guides for [publishing with GitHub Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site), and [HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).

## Build or preview locally

With Node.js 22 or later installed, run these commands from the project folder:

```sh
npm test
npm run build:web
python3 -m http.server 8765 --bind 127.0.0.1 --directory dist/web
```

Open `http://127.0.0.1:8765` on the Mac to preview the web build. Use a local web server rather than opening `index.html` as a file. The output is in `dist/web`; building it does not replace `dist/Corner Lab.app`.

Run `npm run package:web` to build and prepare two ZIP files:

- **`dist/Corner-Lab-GitHub-Pages.zip`** contains the project source for your repository, including the deployment workflow. Extract it before adding the files to GitHub; include the hidden `.github` folder. It excludes personal backups, supplied PDFs, and temporary files.
- **`dist/Corner-Lab-Web.zip`** contains only the published website files for manual hosting. Extract its contents into the publishing branch or web directory.

If you prefer branch-based Pages publishing, copy the **contents** of `dist/web`, including its `CNAME` and `.nojekyll` files, to the root of a separate publishing branch and select that branch in Pages settings. Keep the full project source in the repository. Use either this method or the supplied Actions deployment.

## Install on iPhone and use offline

1. Open the published [cubing.orger.org](https://cubing.orger.org) address in Safari while online.
2. Open Safari's **Share** menu, choose **Add to Home Screen**, and enable **Open as Web App** if offered. Add Corner Lab. [Apple's installation guide](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios) shows the current controls.
3. Launch Corner Lab from its new icon while still online and wait for **Ready offline**. This saves the app and all three trainers on the phone. Without a connection, the status reads **Offline · ready to practise**.
4. Try opening it with the connection disabled before relying on it away from home. The first load and downloading future versions require internet access.

Tap the large timer or use the on-screen buttons for inspection and solving. **Cancel** stops timing without recording a result. Switching away from the app or locking the phone also cancels an unfinished attempt; it does not resume automatically. The app asks the browser to keep the screen awake during timing where supported.

When **Update ready** appears, choose **Update** when convenient. Updating is disabled while timing, so a newly published version does not interrupt an active solve.

## Keep or transfer training history

Results, preferred algorithms, selections, and saved practices stay in that browser or installed app on that device. They are not uploaded to GitHub, shared with other visitors, or automatically synced with the Mac. Different addresses and browsers can have separate histories, so use the final `cubing.orger.org` address consistently.

To transfer Mac data, choose **Settings → Export full backup** in the Mac app. Send the JSON file to the iPhone using AirDrop or save it somewhere accessible through Files. In Corner Lab on the phone, choose **Settings → Import backup** and select that file. Review the replacement confirmation: importing restores the backup's history and settings rather than merging independent histories.

Export a full backup regularly, including before reinstalling the Home Screen app or clearing Safari website data. Browser storage and offline files can be removed by the user or the operating system. Cached app files are not a backup of training results.
