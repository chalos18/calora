/**
 * Start the API and the app together, in one terminal.
 *
 *   pnpm dev            # asks which target
 *   pnpm dev web|android|ios
 *
 * The two halves are started in order, not in parallel: the app is only
 * launched once the API answers /health, because on a cold start dev.ts spends
 * ~9s seeding the registry and an app that boots into that window shows a
 * failed request on its first screen.
 *
 * Metro keeps the terminal (stdio inherited) so its interactive keys - r, j,
 * the QR code - still work. The API's output is piped and prefixed instead, so
 * it is obvious which half is talking.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

type Target = "web" | "android" | "ios";

const TARGETS: Target[] = ["web", "android", "ios"];

const root = fileURLToPath(new URL("..", import.meta.url));
const mobile = fileURLToPath(new URL("../apps/mobile", import.meta.url));

const port = Number(process.env.PORT ?? 3000);

const dim = (text: string) => `\u001b[2m${text}\u001b[0m`;
const cyan = (text: string) => `\u001b[36m${text}\u001b[0m`;

const chooseTarget = async (): Promise<Target> => {
  const argument = process.argv[2];
  if (argument) {
    if (!TARGETS.includes(argument as Target)) {
      console.error(`Unknown target "${argument}". Use: ${TARGETS.join(", ")}`);
      process.exit(1);
    }
    return argument as Target;
  }

  // Non-interactive (CI, a pipe) has nobody to ask, so take the one target
  // that needs no emulator or simulator.
  if (!process.stdin.isTTY) return "web";

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (;;) {
      const answer = (
        await rl.question(
          "Start which app?  [1] web  [2] android  [3] ios  (default 1) ",
        )
      )
        .trim()
        .toLowerCase();
      if (answer === "" || answer === "1") return "web";
      if (answer === "2") return "android";
      if (answer === "3") return "ios";
      if (TARGETS.includes(answer as Target)) return answer as Target;
      console.log(`Pick 1, 2 or 3, or type ${TARGETS.join(" / ")}.`);
    }
  } finally {
    rl.close();
  }
};

const target = await chooseTarget();

// The Android emulator maps the host to 10.0.2.2; localhost there is the
// emulator itself, so the app would fail to reach the API. Web and iOS
// simulator both share the host's loopback. An explicit EXPO_PUBLIC_API_URL
// (a physical phone on the LAN, say) wins over both.
const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  (target === "android"
    ? `http://10.0.2.2:${port}`
    : `http://localhost:${port}`);

const children: ChildProcess[] = [];
let shuttingDown = false;

const shutdown = (code: number): never => {
  shuttingDown = true;
  for (const child of children) child.kill("SIGINT");
  process.exit(code);
};

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => shutdown(0));
}

const start = (
  name: string,
  command: string,
  args: string[],
  options: { cwd: string; prefix: boolean; env?: NodeJS.ProcessEnv },
): ChildProcess => {
  const child = spawn(command, args, {
    cwd: options.cwd,
    stdio: options.prefix ? ["ignore", "pipe", "pipe"] : "inherit",
    env: { ...process.env, ...options.env },
  });
  children.push(child);

  if (options.prefix) {
    const label = dim(`[${name}] `);
    const relay = (stream: NodeJS.ReadableStream, to: NodeJS.WriteStream) => {
      let buffered = "";
      stream.on("data", (chunk: Buffer) => {
        buffered += chunk.toString();
        const lines = buffered.split("\n");
        buffered = lines.pop() ?? "";
        for (const line of lines) to.write(`${label}${line}\n`);
      });
    };
    relay(child.stdout!, process.stdout);
    relay(child.stderr!, process.stderr);
  }

  child.on("exit", (code) => {
    if (shuttingDown) return;
    // Either half alone is useless, so the first one to fall over takes the
    // other with it rather than leaving a half-running dev environment.
    console.error(dim(`\n[${name}] exited (${code ?? 0}) - stopping`));
    shutdown(code ?? 0);
  });

  return child;
};

const waitForApi = async (): Promise<void> => {
  const deadline = Date.now() + 120_000;
  for (;;) {
    try {
      const response = await fetch(`http://localhost:${port}/health`);
      if (response.ok) return;
    } catch {
      // Not listening yet - still seeding, most likely.
    }
    if (Date.now() > deadline) {
      console.error(dim(`[dev] API did not come up on :${port} in 120s`));
      shutdown(1);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
};

start("api", "pnpm", ["exec", "tsx", "server/src/dev.ts"], {
  cwd: root,
  prefix: true,
});

console.log(dim(`[dev] waiting for the API on :${port}...`));
await waitForApi();
console.log(
  `${dim("[dev]")} API ready. Starting ${cyan(target)} against ${cyan(apiUrl)}\n`,
);

start("app", "pnpm", ["run", target], {
  cwd: mobile,
  prefix: false,
  env: { EXPO_PUBLIC_API_URL: apiUrl },
});
