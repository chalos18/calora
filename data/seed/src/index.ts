import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { buildReferenceDb } from "./build-sqlite.js";
import { parseCsv, toSeedFoods, type CsvRow } from "./transform.js";

const run = promisify(execFile);

const here = dirname(fileURLToPath(import.meta.url));
const seedRoot = join(here, "..");
const downloadDir = join(seedRoot, "downloads");
const outputPath = join(seedRoot, "reference.sqlite");

/**
 * USDA publishes dated filenames, so these are resolved from the download page
 * rather than hardcoded. Override with USDA_FOUNDATION_URL / USDA_SR_LEGACY_URL
 * when a specific release is wanted.
 */
const DATASETS = [
  {
    name: "foundation",
    envVar: "USDA_FOUNDATION_URL",
    fallback:
      "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_csv_2025-04-24.zip",
  },
  {
    name: "sr_legacy",
    envVar: "USDA_SR_LEGACY_URL",
    fallback:
      "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip",
  },
] as const;

const download = async (url: string, destination: string): Promise<void> => {
  if (existsSync(destination)) {
    console.log(`  already present: ${destination}`);
    return;
  }

  console.log(`  fetching ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status} ${response.statusText}`);
  }

  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
};

/** Locate a CSV by name anywhere under the extracted tree. */
const findCsv = async (root: string, fileName: string): Promise<string[]> => {
  const found: string[] = [];

  const walk = async (dir: string): Promise<void> => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.name === fileName) found.push(path);
    }
  };

  await walk(root);
  return found;
};

const readAllCsv = async (root: string, fileName: string): Promise<CsvRow[]> => {
  const paths = await findCsv(root, fileName);
  const rows: CsvRow[] = [];

  for (const path of paths) {
    // Appended one at a time rather than spread: food_nutrient.csv runs to
    // millions of rows, and `push(...rows)` passes each as an argument, which
    // overflows the call stack.
    for (const row of parseCsv(await readFile(path, "utf8"))) {
      rows.push(row);
    }
  }

  return rows;
};

const main = async (): Promise<void> => {
  await mkdir(downloadDir, { recursive: true });

  for (const dataset of DATASETS) {
    const url = process.env[dataset.envVar] ?? dataset.fallback;
    const zipPath = join(downloadDir, `${dataset.name}.zip`);
    const extractDir = join(downloadDir, dataset.name);

    console.log(`${dataset.name}:`);
    await download(url, zipPath);

    if (!existsSync(extractDir)) {
      await mkdir(extractDir, { recursive: true });
      await run("unzip", ["-q", "-o", zipPath, "-d", extractDir]);
    }
  }

  console.log("parsing CSVs...");
  const [foodRows, nutrientRows, portionRows] = await Promise.all([
    readAllCsv(downloadDir, "food.csv"),
    readAllCsv(downloadDir, "food_nutrient.csv"),
    readAllCsv(downloadDir, "food_portion.csv"),
  ]);

  console.log(
    `  ${foodRows.length} foods, ${nutrientRows.length} nutrient rows, ` +
      `${portionRows.length} portions`,
  );

  const foods = toSeedFoods({ foodRows, nutrientRows, portionRows });
  console.log(`  kept ${foods.length} Foundation/SR Legacy foods`);

  buildReferenceDb(outputPath, foods);
  console.log(`written: ${outputPath}`);
};

await main();
