# QR

A single-page GitHub Pages app for QR codes.

## Features

- Generate a QR code from text or a URL as you type.
- Download the generated QR code as a PNG.
- Decode a QR code from a local image by dragging and dropping it onto the upload zone or by clicking the zone to choose a file.
- Runs entirely client-side in the browser.
- Responsive layout optimized for desktop and usable on mobile.

## Run locally

Open `index.html` directly in a browser, or serve the folder with any static file server.

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## GitHub Pages

Enable GitHub Pages for the repository and publish from the `main` branch root. The site will serve `index.html` as the app entry point.
