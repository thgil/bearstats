import { test } from "node:test";
import assert from "node:assert/strict";
import { timelineFor } from "../chart-line.js";

const fakeTimeline = {
  years_sightings: [2021, 2022, 2023, 2024, 2025],
  years_injuries:  [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
  years_captures:  [2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017,
                    2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
  metrics: {
    sightings: [12743, 11135, 24348, 20513, 50359],
    injuries:  [105, 108, 53, 157, 158, 88, 75, 219, 85, 1087],
    deaths:    [4, 2, 0, 1, 2, 5, 2, 6, 3, 23],
    captures_total: Array.from({ length: 18 }, () => 5000),
  },
};

test("timelineFor returns years + values for the selected metric", () => {
  const s = timelineFor(fakeTimeline, "sightings");
  assert.deepEqual(s.years, [2021, 2022, 2023, 2024, 2025]);
  assert.deepEqual(s.values, [12743, 11135, 24348, 20513, 50359]);
});

test("timelineFor works for deaths with the longer year axis", () => {
  const d = timelineFor(fakeTimeline, "deaths");
  assert.equal(d.years.length, 10);
  assert.equal(d.values[9], 23);
});

test("timelineFor throws on unknown metric", () => {
  assert.throws(() => timelineFor(fakeTimeline, "pumpkins"));
});
