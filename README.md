# 🧶 Tinking

## Extract data from any website without code, just clicks

A Chrome extension that allows you to create a scraping recipe by directly selecting a page's elements with your mouse.

<img src="https://user-images.githubusercontent.com/16015833/106378952-d4c0e900-63a8-11eb-936b-18dead5e6e97.png" alt="Tinkering allows you to define stepwise rules for scraping a website's content." width="300px"/>

[Watch a video demo](https://cleanshot-cloud-fra.accelerator.net/media/8732/gyXl0WDpJ0jpHVN3ccd5sf5kOOlzdPpugDhhcQKv.mp4)

_This tool is under active development. The code could use some cleanup, and there may be bugs. PRs are very welcome!_

👇

# Getting Started

Tinkering is not yet available on the Chrome Web Store. Follow these steps to run the extension locally:

## 1. Fork and clone the repository

HTTPS:

```sh
git clone https://github.com/baptisteArno/puppeteer-ui-extension.git
```

SSH:

```sh
git clone git@github.com:YourUsername/Tinkering.git
```

## 2. Install dependencies and build the extension

Using `yarn`:

```sh
cd puppeteer-ui-extension
yarn && yarn build
```

Or using `npm`:

```sh
npm i && npm run build
```

## 3. Install the extension in Google Chrome (or any Chromium browser)

Navigate to the following URL in Chrome:

```text
chrome://extensions/
```

Make sure `Developer Mode` is turned on, and click the `Load unpacked` button. Select the `build` folder of the project.

You should now see Tinkering listed among any other extensions that you have installed, and you can begin using it to scrape websites.

_For now, you can only generate a Puppeteer script that's written in TypeScript. The plan is to make this easier to use in the future._

# To-Do

- [x] Basic scraping
- [x] Infinite scroll
- [x] Pagination
- [ ] Regex scraping (in progress)
- [ ] Drag-and-drop steps

# Couldn't scrape a particular website?

While Tinkering aims to be a universal tool, it's still a work in progress, and you may run into issues scraping certain websites.

Please [submit an issue](https://github.com/baptisteArno/tinking/issues/new), and we'll look into a potential fix.
