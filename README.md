# Campus Explorer

A lightweight, responsive campus exploration website built with plain HTML, CSS, and vanilla JavaScript. Progress and theme preference are saved in the browser's local storage. No build step, server, or dependencies are required.

## Run locally

Open `index.html` in a modern browser. The Google Font is optional; system font fallbacks are included.

## Publish with GitHub Pages

1. Create a GitHub repository.
2. Upload or push `index.html`, `style.css`, `script.js`, and `README.md` to the repository.
3. Open the repository's **Settings**.
4. Select **Pages** in the sidebar.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select the `main` branch and the `/ (root)` folder.
7. Click **Save** and wait for GitHub Pages to publish the site.

## Updating the floor plans later

The temporary campus layout is one inline SVG in `index.html`, with `rooftop-section`, `floor7-section`, `floor6-section`, and `auditorium-section` in vertical order. Replace or rearrange the placeholder SVG shapes and labels with the real arrangement. Keep every `data-location-id` exactly as it is; JavaScript uses IDs to synchronize the map and list, so functionality does not depend on room coordinates. The location names and groups are in the `campusData` object near the top of `script.js`. The map currently contains 50 places.

## Campus Layout Designer

Open `designer.html` to arrange rooms, corridors, areas, and floor labels on a 1000 × 2200 logical canvas. Save a draft in the browser, then export JSON, SVG, or a text layout description to bring the final arrangement back into Campus Explorer.
