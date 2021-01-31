import prettier from "prettier/standalone";
import parserTypeScript from "prettier/parser-typescript";
import { OptionType, OptionWithValue, Step, StepAction } from "../types";

const parseSingleCommandFromStep = (
  step: Step,
  idx: number,
  { waitForSelector }: { waitForSelector: boolean }
) => {
  let command = "";
  if (waitForSelector) {
    command += `
    try {
      await page.waitForSelector("${step.selector}")
    } catch{
      console.log("Couldn't find ${step.selector}")
    }
    `;
  }
  switch (step.action) {
    case StepAction.NAVIGATE: {
      command += `
      let url = await page.evaluate(() => {
        const element = (document.querySelector("${step.selector}") as HTMLAnchorElement)
        return element?.href ?? null;
      });
      await page.goto(url)
      `;
      break;
    }
    case StepAction.EXTRACT_TEXT: {
      const variableName = step.variableName ?? "variable" + idx;
      if (step.totalSelected && step.totalSelected > 1) {
        command += `
        const ${variableName} = await page.evaluate(() => {
          const elements = (document.querySelectorAll("${step.selector}") as NodeListOf<HTMLImageElement>)
          return [...elements].map(element => element.textContent ?? null);
        });`;
      } else {
        command += `const ${variableName} = await page.evaluate(() => {
          const element = document.querySelector("${
            step.selector
          }") as HTMLElement
          return element?.textContent;
        });
        const formatted${
          variableName.charAt(0).toUpperCase() + variableName.slice(1)
        } = ${variableName}?.replace(/(\\r\\n|\\n|\\r)/gm, '')
        .replace(/ +(?= )/g, '')
        // .replace(/text/gm, '')
        .trim() ?? null
        `;
      }
      break;
    }
    case StepAction.EXTRACT_IMAGE_SRC: {
      if (step.totalSelected && step.totalSelected > 1) {
        command += `
        const ${
          step.variableName ?? "variable" + idx
        } = await page.evaluate(() => {
          const elements = (document.querySelectorAll("${
            step.selector
          }") as NodeListOf<HTMLImageElement>)
          return [...elements].map(element => element.src ?? null);
        });`;
      } else {
        command += `
        const ${
          step.variableName ?? "variable" + idx
        } = await page.evaluate(() => {
          const element = (document.querySelector("${
            step.selector
          }") as HTMLImageElement)
          return element?.src ?? null;
        });`;
      }
      break;
    }
    case StepAction.EXTRACT_HREF: {
      command += `
      const ${
        step.variableName ?? "variable" + idx
      } = await page.evaluate(() => {
        const element = (document.querySelector("${
          step.selector
        }") as HTMLAnchorElement)
        return element?.href ?? null;
      });`;
    }
  }
  return command;
};

const parseLoopFromStep = (step: Step) => {
  console.log(step);
  const paginationOption = step.options?.find(
    (option) => option?.type === OptionType.PAGINATION
  ) as OptionWithValue | undefined;

  let urlsExtractionCommand;
  if (paginationOption) {
    urlsExtractionCommand = `
      let urls = []
      urls = await page.evaluate(() => {
        return [...document.querySelectorAll("${step.selector}")].map((node: HTMLAnchorElement) => node.href);
      });
      let i = 0
      // 1000 pages max
      console.log("Extracting URLs");
      const paginationBar = new ProgressBar(" scrapping [:bar] :rate/bps :percent :etas", {
        complete: "=",
        incomplete: " ",
        width: 20,
      });
      while(i <= 1000){
        paginationBar.tick()
        i += 1
        const nextPageUrl = await page.evaluate(() => {
          const elements = [
            ...document.querySelectorAll(
              '${paginationOption?.value}'
            ),
          ];
          return (elements.pop() as HTMLAnchorElement)?.href ?? null;
        });
        await page.goto(nextPageUrl);
        try{
          await page.waitForSelector("${step.selector}")
        }catch{
          break;
        }
        urls = urls.concat(await page.evaluate(() => {
          return [...document.querySelectorAll("${step.selector}")].map((node: HTMLAnchorElement) => node.href);
        }))
      }
    `;
  } else {
    urlsExtractionCommand = `let urls = await page.evaluate(() => {
      return [...document.querySelectorAll("${step.selector}")].map((node: HTMLAnchorElement) => node.href);
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

export const generateScript = (steps: Step[]): string => {
  const utils = {
    infiniteScroll: false,
    toTitleCase: false,
  };
  let indexInLoop: number | undefined;
  let commands = steps
    .map((step: Step, idx: number) => {
      if (idx === 0) {
        return "";
      }
      if (
        (step.options?.findIndex(
          (option) => option?.type === OptionType.INFINITE_SCROLL
        ) ?? -1) !== -1
      ) {
        utils.infiniteScroll = true;
        return "";
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
        waitForSelector: indexInLoop === idx,
      });
    })
    .join(" ");
  if (indexInLoop !== undefined) {
    const stepsInLoop = steps.filter(
      (_, idx) => indexInLoop && idx >= indexInLoop
    );
    const object = `{${stepsInLoop.map((step, idx) => {
      const variableName = step.variableName ?? `variable${idx}`;
      let field = variableName;
      if (step.action === StepAction.EXTRACT_TEXT) {
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
        if (idx === 0) {
          return "";
        }
        const variableName = step.variableName ?? `variable${idx}`;
        let field = variableName;
        if (
          step.action === StepAction.EXTRACT_TEXT &&
          step.totalSelected === 1
        ) {
          const formattedVariableName =
            variableName.charAt(0).toUpperCase() + variableName.slice(1);
          field = `${variableName}: formatted${formattedVariableName}`;
        }
        return field + ",";
      })
      .join("")}}`;
    commands += `
    console.log(${object})
    data = ${object}
    `;
  }
  commands += ` fs.writeFile(outputFilename ?? \`./\${new Date()}.json\`,
    prettier.format(JSON.stringify(data), {
      parser: 'json',
    }),
    (err) => {
      if (err) return console.log(err);
    }
  );`;
  return prettier.format(
    `
  const puppeteer = require("puppeteer");
  const ProgressBar = require("progress");
  import prettier from 'prettier';
  const fs = require('fs');
  const prompts = require('prompts');
  
  (async () => {
    const browser = await puppeteer.launch({
      // headless: false,
      defaultViewport: null,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });
    let data;

    try {
      const outputFilename = "${window.location.host}.json";
      const page = await browser.newPage();
      await page.setDefaultNavigationTimeout(0); 
      await page.goto("${steps[0].content}");
      await page.waitForSelector("${steps[1].selector}")
      ${utils.infiniteScroll ? `await autoScroll(page)` : ``}
      ${commands}
      await browser.close();
    } catch (e) {
      await browser.close();
      throw e;
    }
  })();

  ${
    utils.infiniteScroll
      ? `async function autoScroll(page) {
    await page.evaluate(async () => {
      await new Promise<void>((resolve, _) => {
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
    });}`
      : ``
  }

  ${
    utils.toTitleCase
      ? `const toTitleCase = (phrase) => {
    if (!phrase) {
      return null;
    }
    return phrase
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };`
      : ``
  }
  
  `,
    {
      parser: "typescript",
      plugins: [parserTypeScript],
    }
  );
};
