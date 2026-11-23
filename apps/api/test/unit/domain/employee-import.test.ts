import { describe, expect, it } from "vitest";
import {
  readEmployeeCsv,
  toAmount,
  validateEmployeeRows,
  type ImportReference,
} from "../../../src/domain/employee-import.js";

const HEADER = "firstName,lastName,email,country,jobTitle,level,hireDate,baseSalary,targetBonus";
const LENA = "Lena,Fischer,lena@example.com,DE,Data Scientist,3,2026-01-15,78000,7800";
const csv = (...lines: string[]) => `${lines.join("\n")}\n`;

const REFERENCE: ImportReference = {
  countries: new Map([
    ["DE", "EUR"],
    ["US", "USD"],
  ]),
  jobTitles: new Set(["Data Scientist", "Software Engineer"]),
  existingEmails: new Map([["anna@example.com", "E00042"]]),
  latestAllowedDate: "2026-11-02",
};

/** Reads then validates, returning just the problems as "row/column: message". */
function problems(text: string): string[] {
  const read = readEmployeeCsv(text);
  const checked = validateEmployeeRows(read.rows, REFERENCE);
  return [...read.issues, ...checked.issues].map(
    (i) => `${i.row ?? "-"}/${i.column ?? "-"}: ${i.message}`,
  );
}

describe("readEmployeeCsv", () => {
  it("reads rows keyed by column, with spreadsheet row numbers", () => {
    const result = readEmployeeCsv(
      csv(
        HEADER,
        LENA,
        "",
        "Ben,Weber,ben@example.com,DE,Software Engineer,2,2024-03-01,50000,3500",
      ),
    );

    expect(result.issues).toEqual([]);
    expect(result.rows.map((r) => [r.row, r.values.firstName, r.values.country])).toEqual([
      [2, "Lena", "DE"],
      [4, "Ben", "DE"], // the blank line 3 is skipped but still counted
    ]);
  });

  it("accepts columns in any order and any letter case, and a byte-order mark", () => {
    const shuffled =
      "﻿EMAIL,firstname,LastName,Country,jobtitle,Level,HireDate,BaseSalary,TargetBonus";
    const result = readEmployeeCsv(
      csv(shuffled, "lena@example.com,Lena,Fischer,DE,Data Scientist,3,2026-01-15,78000,7800"),
    );

    expect(result.issues).toEqual([]);
    expect(result.rows[0]?.values).toMatchObject({ firstName: "Lena", email: "lena@example.com" });
  });

  it("keeps commas inside quoted values", () => {
    const result = readEmployeeCsv(
      csv(
        HEADER,
        '"Lena, Jr",Fischer,lena@example.com,DE,Data Scientist,3,2026-01-15,"78,000",7800',
      ),
    );
    expect(result.rows[0]?.values).toMatchObject({ firstName: "Lena, Jr", baseSalary: "78,000" });
  });

  it.each([
    { name: "an empty file", text: "  \n", expected: "The file is empty" },
    {
      name: "a header only",
      text: csv(HEADER),
      expected: "The file has no employee rows below the header",
    },
    {
      name: "missing columns",
      text: csv("firstName,lastName,email", "a,b,c"),
      expected: "Missing columns: country, jobTitle, level, hireDate, baseSalary, targetBonus",
    },
    {
      name: "an unknown column",
      text: csv(`${HEADER},salary`, `${LENA},1`),
      expected: 'Unknown column "salary"',
    },
    {
      name: "a duplicated column",
      text: csv(`${HEADER},email`, `${LENA},x`),
      expected: 'Column "email" appears twice',
    },
  ])("reports $name", ({ text, expected }) => {
    expect(readEmployeeCsv(text).issues.map((i) => i.message)).toContain(expected);
  });

  it("never turns header text into object keys (e.g. __proto__)", () => {
    const result = readEmployeeCsv(csv(`${HEADER},__proto__`, `${LENA},"{""polluted"":true}"`));

    expect(result.issues.map((i) => i.message)).toEqual(['Unknown column "__proto__"']);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("reports a row with the wrong number of values and keeps reading", () => {
    const result = readEmployeeCsv(csv(HEADER, "Lena,Fischer,lena@example.com", LENA));

    expect(result.issues).toEqual([
      { row: 2, column: null, message: "Expected 9 values but found 3" },
    ]);
    expect(result.rows).toHaveLength(1);
  });

  it("explains a misplaced quotation mark with its row", () => {
    const result = readEmployeeCsv(
      csv(HEADER, 'Le"na,Fischer,lena@example.com,DE,Data Scientist,3,2026-01-15,78000,7800'),
    );

    expect(result.issues[0]).toMatchObject({ row: 2 });
    expect(result.issues[0]?.message).toContain("quotation mark is misplaced");
  });
});

describe("toAmount", () => {
  it.each([
    { text: "78000", expected: 78_000 },
    { text: "78,000", expected: 78_000 },
    { text: "1,234,567", expected: 1_234_567 },
    { text: "-5", expected: -5 },
    { text: "78000.5", expected: "78000.5" },
    { text: "", expected: undefined },
    { text: "78.000", expected: "78.000" }, // 78 or 78 thousand? Never guessed.
    { text: "78k", expected: "78k" },
    { text: "7,80,000", expected: "7,80,000" }, // ambiguous grouping is left for validation
  ])("$text → $expected", ({ text, expected }) => {
    expect(toAmount(text)).toBe(expected);
  });
});

describe("validateEmployeeRows", () => {
  it("accepts a valid row", () => {
    const read = readEmployeeCsv(csv(HEADER, LENA));
    const result = validateEmployeeRows(read.rows, REFERENCE);

    expect(result.issues).toEqual([]);
    expect(result.valid).toEqual([
      {
        row: 2,
        input: {
          firstName: "Lena",
          lastName: "Fischer",
          email: "lena@example.com",
          countryCode: "DE",
          jobTitle: "Data Scientist",
          level: 3,
          hireDate: "2026-01-15",
          baseSalary: 78_000,
          targetBonus: 7_800,
        },
      },
    ]);
  });

  it("reports every problem in plain words with its row and column", () => {
    expect(
      problems(
        csv(
          HEADER,
          ",Fischer,not-an-email,XX,Astronaut,9,2026-13-01,abc,-1",
          "Ben,Weber,ben@example.com,CH,Astronaut,2,2027-01-01,50000,0",
          "Anna,Schmidt,ANNA@example.com,DE,Software Engineer,3,2020-01-01,70000,7000",
          "Lena,Fischer,lena@example.com,DE,Data Scientist,3,2026-01-15,78000,7800",
          "Lena,Fischer,lena@example.com,US,Data Scientist,3,2026-01-15,90000,9000",
        ),
      ),
    ).toEqual([
      "2/firstName: Required",
      "2/email: Enter a valid email address",
      "2/level: Choose a level from L1 to L6",
      "2/hireDate: Not a valid calendar date",
      "2/baseSalary: Enter an amount",
      "2/targetBonus: Can't be negative",
      '2/country: Unknown country "XX"',
      '2/jobTitle: Unknown job title "Astronaut"',
      '3/country: Unknown country "CH"',
      '3/jobTitle: Unknown job title "Astronaut"',
      "3/hireDate: Hire date 2027-01-01 is in the future",
      "4/email: Already in the system as E00042",
      "6/email: Same email as row 5",
    ]);
  });

  it("does not count a row as valid if it has any problem", () => {
    const read = readEmployeeCsv(
      csv(HEADER, LENA, "Ben,Weber,ben@example.com,DE,Data Scientist,3,2026-01-15,78000,abc"),
    );
    const result = validateEmployeeRows(read.rows, REFERENCE);

    expect(result.valid.map((v) => v.row)).toEqual([2]);
  });
});

describe("amounts with dots", () => {
  it("rejects them instead of guessing between 78 and 78 thousand", () => {
    expect(
      problems(
        csv(
          HEADER,
          "Lena,Fischer,lena@example.com,DE,Data Scientist,3.0,2026-01-15,78.000,7800.50",
        ),
      ),
    ).toEqual([
      "2/level: Use a whole number without dots (78000 or 78,000)",
      "2/baseSalary: Use a whole number without dots (78000 or 78,000)",
      "2/targetBonus: Use a whole number without dots (78000 or 78,000)",
    ]);
  });
});
