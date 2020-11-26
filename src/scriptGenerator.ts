import prettier from "prettier/standalone";
import parserTypeScript from "prettier/parser-typescript";
import { Step, StepAction } from "./helperFunctions";

const parseSingleCommandFromStep = (step: Step, idx: number) => {
  switch (step.action) {
    case StepAction.NAVIGATE: {
      return `
      let url = await page.evaluate(() => {
        const element = (document.querySelector("${step.selector}") as HTMLAnchorElement)
        return element?.href ?? null;
      });
      await page.goto(url)
      `;
    }
    case StepAction.EXTRACT_TEXT: {
      let suppCommand = "";
      if (step.variableName === "name") {
        suppCommand += `const toTitleCase = (phrase) => {
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
      return (
        suppCommand +
        `
      const ${
        step.variableName ?? "variable" + idx
      } = await page.evaluate(() => {
        const element = document.querySelector("${
          step.selector
        }") as HTMLElement
        return element?.innerText.replace(/(\\r\\n|\\n|\\r)/gm, '')
        .replace(/ +(?= )/g, '')
        // .replace(/text/gm, '')
        .trim() ?? null;
      });`
      );
    }
    case StepAction.EXTRACT_IMAGE_SRC: {
      if (step.total > 1) {
        return `
        const ${
          step.variableName ?? "variable" + idx
        } = await page.evaluate(() => {
          const elements = (document.querySelectorAll("${
            step.selector
          }") as NodeListOf<HTMLImageElement>)
          return [...elements].map(element => element.src ?? null);
        });`;
      }
      return `
      const ${
        step.variableName ?? "variable" + idx
      } = await page.evaluate(() => {
        const element = (document.querySelector("${
          step.selector
        }") as HTMLImageElement)
        return element?.src ?? null;
      });`;
    }
    case StepAction.EXTRACT_HREF: {
      return `
      const ${
        step.variableName ?? "variable" + idx
      } = await page.evaluate(() => {
        const element = (document.querySelector("${
          step.selector
        }") as HTMLAnchorElement)
        return element?.href ?? null;
      });`;
    }
    case StepAction.CLICK: {
      return `await page.click("${step.selector}");`;
    }
  }
};

const parseLoopFromStep = (step: Step) => {
  switch (step.action) {
    case StepAction.NAVIGATE: {
      return `
      let urls = await page.evaluate(() => {
        return [...document.querySelectorAll("${step.selector}")].map((node: HTMLAnchorElement) => node.href);
      });
      const bar = new ProgressBar(' scrapping [:bar] :rate/bps :percent :etas', {
        complete: '=',
        incomplete: ' ',
        width: 20,
        total: urls.length,
      });
      const data = [];
      let promptContinue = false;
      for(let url of urls){
        await page.goto(url)
      `;
    }
  }
};

export const generateScript = (steps: Step[]) => {
  let indexInLoop: number | undefined;
  let commands = steps
    .map((step: Step, idx: number) => {
      if (idx === 0) {
        return "";
      }
      if (step.total > 1 && indexInLoop === undefined) {
        indexInLoop = idx + 1;
        return parseLoopFromStep(step);
      }
      return parseSingleCommandFromStep(step, idx);
    })
    .join(" ");
  if (indexInLoop !== undefined) {
    const stepsInLoop = steps.filter((_, idx) => idx >= indexInLoop!);
    const object = `{${stepsInLoop
      .filter((step) => step.action !== StepAction.CLICK)
      .map((stepInLoop, idx) => {
        return `${stepInLoop.variableName ?? `variable${idx}`}`;
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
  commands += ` fs.writeFile(\`./\${new Date()}.json\`,
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
    try {
      const page = await browser.newPage();
      await page.setDefaultNavigationTimeout(0); 
      await page.goto("${steps[0].content}");
      await page.waitForSelector("${steps[1].selector}")
      ${commands}
      await browser.close();
    } catch (e) {
      await browser.close();
      throw e;
    }
  })();
  `,
    {
      parser: "typescript",
      plugins: [parserTypeScript],
    }
  );
};
