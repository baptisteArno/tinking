# 🧶 Tinking

## Extract data from any website without code, just clicks

A chrome extension that sits on top of a page and allow you to create a scrapping recipe by directly selecting page's elements.

<img src="https://user-images.githubusercontent.com/16015833/106378952-d4c0e900-63a8-11eb-936b-18dead5e6e97.png" width="300px"/>

[Watch a video demo](https://cleanshot-cloud-fra.accelerator.net/media/8732/gyXl0WDpJ0jpHVN3ccd5sf5kOOlzdPpugDhhcQKv.mp4)

_This is a new tool. The code is a mess and it's very buggy. PRs are very welcome!_

👇

# Getting started

The extension isn't available on the Google Chrome Webstore for now.

## 1. Clone the repository

```sh
git clone https://github.com/baptisteArno/puppeteer-ui-extension.git
```

## 2. Install and build the extension

Using `yarn`:

```sh
cd puppeteer-ui-extension
yarn
yarn build
```

Or using `npm`:

```sh
npm i
npm run build
```

## 3. Integrate into Google Chrome (or any Chromium browser)

Navigate to:

```text
chrome://extensions/
```

Check the "Developer Mode" and click on "Load an unpacked extension" and select the `build` folder of the project.

Now you should see the extension and you can start scrapping websites.

_For now, you can only generates a puppeteer script written in Typescript. But I'm planning on making it friendlier_

# To-Do

- [x] Scrap
- [x] Infinite Scroll
- [x] Pagination
- [ ] Regex (In progress)
- [ ] Drag'n'drop steps

# You couldn't scrap a specific website?

The goal of this tool is to be the most universal.

Please fill in an issue and we'll take a look at what can be fixed and improved.
