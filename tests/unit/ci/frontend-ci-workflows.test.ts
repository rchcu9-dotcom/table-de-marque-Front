import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, "../../..");

interface WorkflowCase {
  file: string;
  buildStep: string;
  deployStep: string;
}

const workflows: WorkflowCase[] = [
  {
    file: "frontend-ci-cd-staging.yml",
    buildStep: "name: Build (staging)",
    deployStep: "name: Generate SAS",
  },
  {
    file: "frontend-ci-cd.yml",
    buildStep: "name: Build (uses prod secret)",
    deployStep: "name: Deploy to Firebase Hosting",
  },
];

describe.each(workflows)("$file — pnpm audit gate", ({ file, buildStep, deployStep }) => {
  const workflow = readFileSync(
    resolve(repoRoot, ".github/workflows", file),
    "utf-8",
  );

  it("runs `pnpm audit --prod --audit-level=high` against production dependencies", () => {
    expect(workflow).toMatch(/run:\s*pnpm audit --prod --audit-level=high/);
  });

  it("places the audit step after install and before lint, tests, build and deploy", () => {
    const installIndex = workflow.indexOf("name: Install dependencies");
    const auditIndex = workflow.indexOf("pnpm audit --prod --audit-level=high");
    const lintIndex = workflow.indexOf("name: Lint");
    const testsIndex = workflow.indexOf("name: Tests (Vitest)");
    const buildIndex = workflow.indexOf(buildStep);
    const deployIndex = workflow.indexOf(deployStep);

    [installIndex, auditIndex, lintIndex, testsIndex, buildIndex, deployIndex].forEach(
      (index) => expect(index).toBeGreaterThan(-1),
    );

    expect(auditIndex).toBeGreaterThan(installIndex);
    expect(auditIndex).toBeLessThan(lintIndex);
    expect(auditIndex).toBeLessThan(testsIndex);
    expect(auditIndex).toBeLessThan(buildIndex);
    expect(auditIndex).toBeLessThan(deployIndex);
  });
});
