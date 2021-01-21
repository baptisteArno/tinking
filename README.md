# Generate a puppeteer script with your mouse

[Watch a demo](https://cleanshot-cloud-fra.accelerator.net/media/8732/gyXl0WDpJ0jpHVN3ccd5sf5kOOlzdPpugDhhcQKv.mp4)

This is a very early version. The code is a mess and it's very buggy. See the todo-list below

# Getting started

The extension isn't available on the Google Chrome Webstore for now.

## Clone the repository

```sh
git clone https://github.com/baptisteArno/puppeteer-ui-extension.git
cd puppeteer-ui-extension
```

## Install and build the extension

Using `yarn`:

```sh
yarn
yarn build
```

Or using `npm`:

```sh
npm i
npm run build
```

## Integrate into Google Chrome (or any Chromium browser)

Navigate to:

```
chrome://extensions/
```

Check the "Developer Mode" and click on "Load an unpacked extension" and select the `build` folder of the project.

Now you should see the extension and you can start scrapping websites.
