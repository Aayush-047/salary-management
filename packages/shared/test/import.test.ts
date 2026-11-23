import { describe, expect, it } from "vitest";
import { IMPORT_COLUMNS, importTemplateCsv } from "../src/index.js";

describe("import columns", () => {
  it("match the fields of a new employee", () => {
    expect(IMPORT_COLUMNS.map((c) => c.name)).toEqual([
      "firstName",
      "lastName",
      "email",
      "country",
      "jobTitle",
      "level",
      "hireDate",
      "baseSalary",
      "targetBonus",
    ]);
  });

  it("produce a template with the header and one example row", () => {
    expect(importTemplateCsv()).toBe(
      "firstName,lastName,email,country,jobTitle,level,hireDate,baseSalary,targetBonus\n" +
        "Lena,Fischer,lena.fischer@example.com,DE,Data Scientist,3,2026-01-15,78000,7800\n",
    );
  });
});
