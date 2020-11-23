import prettier from "prettier/standalone";
import parserTypeScript from "prettier/parser-typescript";
import { Step, StepAction } from "./helperFunctions";

const parseSingleCommandFromStep = (step: Step, idx: number) => {
  switch (step.action) {
    case StepAction.NAVIGATE: {
      return `let url = await page.evaluate(() => {
        return document.querySelector("${step.selector}")
          .href;
      });
      await page.goto(url)
      `;
    }
    case StepAction.EXTRACT_TEXT: {
      return `const ${
        step.variableName ?? "variable" + idx
      } = await page.evaluate(() => {
        return document.querySelector("${step.selector}")
          .textContent;
      });`;
    }
    case StepAction.EXTRACT_IMAGE_SRC: {
      return `const ${
        step.variableName ?? "variable" + idx
      } = await page.evaluate(() => {
        return document.querySelector("${step.selector}")
          .src;
      });`;
    }
    case StepAction.EXTRACT_HREF: {
      return `const ${
        step.variableName ?? "variable" + idx
      } = await page.evaluate(() => {
        return document.querySelector("${step.selector}")
          .href;
      });`;
    }
    // case StepAction.CLICK: {
    //   return `const ${
    //     step.variableName ?? "variable"
    //   } = await page.evaluate(() => {
    //     return document.querySelector("${step.selector}")
    //       .href;
    //   });`
    // }
  }
};

const parseLoopFromStep = (step: Step) => {
  switch (step.action) {
    case StepAction.NAVIGATE: {
      return `let urls = await page.evaluate(() => {
        return [...document.querySelectorAll("${step.selector}")].map((node: HTMLAnchorElement) => node.href);
      });
      for(let url of urls){
        await page.goto(url)
      `;
    }
  }
};

export const generateScript = (steps: Step[]) => {
  let generatedLoop = false;
  let commands = steps
    .map((step: Step, idx: number) => {
      if (idx === 0) {
        return "";
      }
      if (step.total > 1) {
        generatedLoop = true;
        return parseLoopFromStep(step);
      }
      return parseSingleCommandFromStep(step, idx);
    })
    .join(" ");
  if (generatedLoop) {
    commands += `}`;
  }
  return prettier.format(
    `
  const puppeteer = require("puppeteer");
  
  (async () => {
    const browser = await puppeteer.launch({
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });
    try {
      const page = await browser.newPage();
      await page.goto("${steps[0].content}");
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
