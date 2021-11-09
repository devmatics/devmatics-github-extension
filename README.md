# Devmatics GitHub Extension
A Chrome extension for extending GitHub's features.

Currently only provides a button to create a linked issue in another repository, and automatically add a task list item to the current issue.

## Getting Started

1. `npm install`
2. `npm install --global yarn` (only needed if you haven't globalled yarn yet)
3. `yarn build`
4. Load the `build` folder as an unpacked extension in Chrome.

## Notes
Note that due to the way GitHub caches pages, you may need to open an issues page, and refresh the page again in order for this extension to be loaded.