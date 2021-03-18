import prettier from "prettier/standalone";
import babelParser from "prettier/parser-babel";
import {
  KeyInput,
  MouseClick,
  OptionType,
  OptionWithValue,
  Step,
  StepAction,
} from "../types";
import { isAnExtractionAction } from "../service/helperFunctions";

const utils = {
  infiniteScroll: false,
  toTitleCase: false,
};

export const generateScript = (
  steps: Step[],
  library: "puppeteer" | "playwright"
): string => {
  let hasData = false;
  let indexInLoop: number | undefined;
  let commands = steps
    .map((step: Step, idx: number) => {
      if (idx === 0) {
        return "";
      }
      if (
        (step.options?.findIndex(
          (option) => option?.type === OptionType.INFINITE_SCROLL
        ) || -1) !== -1
      ) {
        utils.infiniteScroll = true;
      }
      if (
        step.totalSelected &&
        step.totalSelected > 1 &&
        step.action === StepAction.NAVIGATE &&
        indexInLoop === undefined
      ) {
        indexInLoop = idx + 1;
        return parseLoopFromStep(step);
      }
      return parseSingleCommandFromStep(step, idx, {
        waitForSelector: true,
      });
    })
    .join(" ");
  if (indexInLoop !== undefined) {
    hasData = true;
    const stepsInLoop = steps.filter(
      (_, idx) => indexInLoop && idx >= indexInLoop
    );
    const object = `{${stepsInLoop.map((step, idx) => {
      const variableName =
        step.variableName && step.variableName !== ""
          ? step.variableName
          : "variable" + idx;
      let field = variableName;
      if (isAnExtractionAction(step.action)) {
        const formattedVariableName =
          variableName.charAt(0).toUpperCase() + variableName.slice(1);
        field = `${variableName}: formatted${formattedVariableName}`;
      }
      return field;
    })}}`;
    commands += `
    console.log(${object})
    if (!promptContinue) {
      const response = await prompts({
        type: 'confirm',
        name: 'value',
        message: 'Continue?',
        initial: true,
      });
      if (!response.value) {
        process.exit();
      }
      promptContinue = true;
    }
    data.push(${object})
    bar.tick()
  }
    `;
  }
  if (indexInLoop === undefined) {
    const object = `{${steps
      .map((step, idx) => {
        if (idx === 0 || step.action === StepAction.RECORD_CLICKS_KEYS) {
          return "";
        }
        hasData = true;
        const variableName =
          step.variableName && step.variableName !== ""
            ? step.variableName
            : "variable" + idx;
        let field = variableName;
        if (isAnExtractionAction(step.action) && step.totalSelected === 1) {
          const formattedVariableName =
            variableName.charAt(0).toUpperCase() + variableName.slice(1);
          field = `${variableName}: formatted${formattedVariableName}`;
        }
        return field + ",";
      })
      .join("")}}`;
    if (hasData) {
      commands += `
        console.log(${object});
        data = ${object}
      `;
    }
  }
  if (hasData) {
    commands += ` fs.writeFile(outputFilename || \`./\${new Date()}.json\`,
    prettier.format(JSON.stringify(data), {
      parser: 'json',
    }),
    (err) => {
      if (err) return console.log(err);
    }
  );`;
  }

  let script = `
  ${
    library === "puppeteer"
      ? `const puppeteer = require("puppeteer");`
      : `const { chromium } = require('playwright');`
  }
  const ProgressBar = require("progress");
  const prettier = require('prettier');
  const fs = require('fs');
  const prompts = require('prompts');
  
  (async () => {
    ${parseLibrarySettings(library)}
    let data;
    try {
      const outputFilename = "${window.location.host}.json";
      const page = await browser.newPage();
      await page.setDefaultNavigationTimeout(0); 
      await page.goto("${steps[0].content}");
      ${utils.infiniteScroll ? `await autoScroll(page)` : ``}
      ${commands}
      await browser.close();
    } catch (e) {
      await browser.close();
      throw e;
    }
  })();
  ${parseUtilsFunctions(utils)}
  `;
  try {
    script = prettier.format(script, {
      parser: "babel",
      plugins: [babelParser],
    });
  } catch (e) {
    console.error("Couldn't format script:", e);
    console.log("Steps:", steps);
  }
  return script;
};

const parseSingleCommandFromStep = (
  step: Step,
  idx: number,
  { waitForSelector }: { waitForSelector: boolean }
) => {
  const variableName =
    step.variableName && step.variableName !== ""
      ? step.variableName
      : "variable" + idx;
  let command = "";
  if (waitForSelector && step.action !== StepAction.RECORD_CLICKS_KEYS) {
    command += `
    try {
      await page.waitForSelector("${step.selector}")
    } catch{
      console.log("Couldn't find ${step.selector}")
    }
    `;
  }
  const regexOption = step.options.find(
    (option) => option?.type === OptionType.REGEX
  ) as OptionWithValue;

  const amountToExtract = getAmountToExtract(step);

  switch (step.action) {
    case StepAction.NAVIGATE: {
      command += `
      let url = await page.evaluate(() => {
        const element = document.querySelector("${step.selector}")
        return element.href || null;
      });
      await page.goto(url)
      `;
      break;
    }
    case StepAction.EXTRACT_TEXT: {
      if (
        step.totalSelected &&
        step.totalSelected > 1 &&
        amountToExtract !== "1"
      ) {
        command += `
        const ${variableName} = await page.evaluate(() => {
          const elements = document.querySelectorAll("${step.selector}")
          return [...elements].map(element => element.textContent.replace(/(\\r\\n|\\n|\\r)/gm, "").trim() || null).slice(0,${amountToExtract});
        });`;
      } else {
        command += `
        const ${variableName}Eval = () => {
          const element = document.querySelector("${step.selector}")
          return element.textContent.replace(/(\\r\\n|\\n|\\r)/gm, "").trim();
        }
        let ${variableName} = await page.evaluate(${variableName}Eval);
        if(${variableName} === null || ${variableName} === ""){
          // The content could be dynamically loaded. Waiting a bit...
          await page.waitForTimeout(4000)
          ${variableName} = await page.evaluate(${variableName}Eval);
        }
        let formatted${
          variableName.charAt(0).toUpperCase() + variableName.slice(1)
        } = ${variableName}
        `;
      }
      break;
    }
    case StepAction.EXTRACT_IMAGE_SRC: {
      if (
        step.totalSelected &&
        step.totalSelected > 1 &&
        amountToExtract !== "1"
      ) {
        command += `
        const ${variableName} = await page.evaluate(() => {
          const elements = document.querySelectorAll("${step.selector}")
          return [...elements].map(element => element.src || null).slice(0,${amountToExtract});
        });`;
      } else {
        command += `
        const ${variableName}Eval = () => {
          const element = document.querySelector("${step.selector}")
          return element.src || null;
        }
        let ${variableName} = await page.evaluate(${variableName}Eval);
        if(${variableName} === null || ${variableName} === ""){
          // The content could be dynamically loaded. Waiting a bit...
          await page.waitForTimeout(4000)
          ${variableName} = await page.evaluate(${variableName}Eval);
        }
        let formatted${
          variableName.charAt(0).toUpperCase() + variableName.slice(1)
        } = ${variableName}
        `;
      }
      break;
    }
    case StepAction.EXTRACT_HREF: {
      if (
        step.totalSelected &&
        step.totalSelected > 1 &&
        amountToExtract !== "1"
      ) {
        command += `
        const ${variableName} = await page.evaluate(() => {
          const elements = document.querySelectorAll("${step.selector}")
          return [...elements].map(element => element.href || null).slice(0,${amountToExtract});
        });`;
      } else {
        command += `
        const ${variableName}Eval = () => {
          const element = document.querySelector("${step.selector}")
          return element.href || null;
        }
        let ${variableName} = await page.evaluate(${variableName}Eval);
        if(${variableName} === null || ${variableName} === ""){
          // The content could be dynamically loaded. Waiting a bit...
          await page.waitForTimeout(4000)
          ${variableName} = await page.evaluate(${variableName}Eval);
        }
        let formatted${
          variableName.charAt(0).toUpperCase() + variableName.slice(1)
        } = ${variableName}
        `;
      }
      break;
    }
    case StepAction.RECORD_CLICKS_KEYS: {
      if (!step.recordedClicksAndKeys) return;
      command += `${parseRecordingCommands(step.recordedClicksAndKeys)}`;
      break;
    }
  }
  if (regexOption) {
    command += `const regex = new RegExp("${regexOption.value}", "gm");
    const matchedArray = [...${variableName}.matchAll(regex)];
    let match = ""
    try{
      match = matchedArray[0][1];
    } catch(e) {}
    if (match !== "") {
      formatted${
        variableName.charAt(0).toUpperCase() + variableName.slice(1)
      } = match
    }
    `;
  }
  return command;
};

const getAmountToExtract = (step: Step): string => {
  const optionIndex = step.options.findIndex(
    (option) => option?.type === OptionType.CUSTOM_AMOUNT_TO_EXTRACT
  );
  const stepHasCustomAmountToExtract = optionIndex !== -1;

  if (stepHasCustomAmountToExtract) {
    const option: OptionWithValue = step.options[
      optionIndex
    ] as OptionWithValue;
    return option.value;
  } else {
    return "";
  }
};

const parseLoopFromStep = (step: Step) => {
  const paginationOption = step.options?.find(
    (option) => option?.type === OptionType.PAGINATION
  ) as OptionWithValue | undefined;

  const amountToExtract = getAmountToExtract(step);

  let urlsExtractionCommand;
  if (paginationOption) {
    urlsExtractionCommand = `
      await page.waitForSelector("${step.selector}")
      let urls = []
      urls = await page.evaluate(() => {
        return [...document.querySelectorAll("${
          step.selector
        }")].map((node) => node.href);
      });
      if(${
        amountToExtract === "" ? "false" : `urls.length >= ${amountToExtract}`
      }){
        urls = urls.slice(0, ${amountToExtract})
      } else {
        let i = 0
        console.log("Extracting URLs");
        const paginationBar = new ProgressBar(" scrapping [:bar] :rate/bps :percent :etas", {
          complete: "=",
          incomplete: " ",
          width: 20,
          total: 1000
        });
        let firstLinkInCurrentPage = urls[0]
        while(i <= 1000){
          paginationBar.tick()
          i += 1
          const nodes = await page.$$("${paginationOption?.value}");
          await nodes.pop().click();
          await page.waitForTimeout(1000);
          try{
            await page.waitForSelector("${step.selector}")
          }catch{
            break;
          }
          let firstLinkInNewPage = await page.evaluate(() => {return document.querySelector("${
            step.selector
          }").href});
          if (firstLinkInNewPage === firstLinkInCurrentPage) {
            // There is some kind of loading state we need to wait for
            await page.waitForTimeout(4000);
            firstLinkInNewPage = await page.evaluate(() => {return document.querySelector("${
              step.selector
            }").href});
            if (firstLinkInNewPage === firstLinkInCurrentPage) {
              break;
            }
          }
          const newUrls = await page.evaluate(() => {
            return [...document.querySelectorAll("${
              step.selector
            }")].map(node => node.href);
          })
          urls = urls.concat(newUrls)
          if (${
            amountToExtract === ""
              ? "false"
              : `urls.length >= ${amountToExtract}`
          }) {
            urls = urls.slice(0, ${amountToExtract})
            break;
          }
          firstLinkInCurrentPage = newUrls[0]
        }
      }
    `;
  } else {
    urlsExtractionCommand = `let urls = await page.evaluate(() => {
      return [...document.querySelectorAll("${step.selector}")].map(node => node.href);
    });`;
  }

  switch (step.action) {
    case StepAction.NAVIGATE: {
      return `
      ${urlsExtractionCommand}
      const bar = new ProgressBar(' scrapping [:bar] :rate/bps :percent :etas', {
        complete: '=',
        incomplete: ' ',
        width: 20,
        total: urls.length,
      });
      let promptContinue = false;
      console.log('Found ' + urls.length + ' urls.');
      data = []
      for(let url of urls){
        await page.goto(url)
      `;
    }
  }
};

const parseUtilsFunctions = (utils: {
  toTitleCase: boolean;
  infiniteScroll: boolean;
}) => {
  let functions = ``;
  if (utils.toTitleCase) {
    functions += `const toTitleCase = (phrase) => {
      if (!phrase) {
      return null;
      }
      return phrase
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    };`;
  }
  if (utils.infiniteScroll) {
    functions += `async function autoScroll(page) {
      await page.evaluate(async () => {
        await new Promise((resolve, _) => {
          var totalHeight = 0;
          var distance = 100;
          var timer = setInterval(() => {
            var scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
    
            if (totalHeight >= scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      });}`;
  }
  return functions;
};

const parseLibrarySettings = (library: "puppeteer" | "playwright") => {
  if (library === "puppeteer") {
    return `const browser = await puppeteer.launch({
      // Uncomment this line to open the browser 👇
      // headless: false,
      defaultViewport: null,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--window-size=1300,1024"
      ],
    });`;
  }
  return `const browser = await chromium.launch({
    // Uncomment this line to open the browser 👇
    // headless: false
  });`;
};

const parseRecordingCommands = (recording: (KeyInput | MouseClick)[]) => {
  let commands = ``;
  for (const record of recording) {
    if ("selector" in record) {
      commands += `await page.waitForSelector("${record.selector}");
      await page.click("${record.selector}")
      `;
    } else {
      commands += `await page.keyboard.type('${record.input}', {delay: 100})
      `;
    }
  }
  return commands;
};
