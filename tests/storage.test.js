const test = require("node:test");
const assert = require("node:assert/strict");
const { install } = require("./fake-browser");
const S = require("../shared/storage.js");

const P = S.CANVAS_PREFIX;
const drawing = (n = 1) => ({ version: "4.6.0", objects: Array.from({ length: n }, () => ({ type: "path" })) });

test("normalizeUrl modes", () => {
  const url = "https://Example.com/a/b?x=1#frag";
  assert.equal(S.normalizeUrl(url, "exact"), "https://example.com/a/b?x=1#frag");
  assert.equal(S.normalizeUrl(url, "page"), "https://example.com/a/b?x=1");
  assert.equal(S.normalizeUrl(url, "path"), "https://example.com/a/b");
  assert.equal(S.normalizeUrl("not a url", "page"), "not a url");
});

test("sanitizeSettings coerces legacy string values and bad input", () => {
  const s = S.sanitizeSettings({ penThickness: "12", eraseThickness: "999", theme: "neon", penColor: "red" });
  assert.equal(s.penThickness, 12);
  assert.equal(s.eraseThickness, 60);
  assert.equal(s.theme, "auto");
  assert.equal(s.penColor, S.DEFAULT_SETTINGS.penColor);
  assert.equal(s.pressure, true);
  assert.equal(s.autoOpen, false);
});

test("toRecord reads legacy JSON strings and v2 records", () => {
  const legacy = S.toRecord(JSON.stringify(drawing(2)), P + "https://a.test/");
  assert.equal(legacy.legacy, true);
  assert.equal(legacy.url, "https://a.test/");
  assert.equal(legacy.canvas.objects.length, 2);
  assert.equal(S.toRecord("{broken", P + "x"), null);
  const v2 = S.toRecord({ v: 2, canvas: drawing(), url: "https://b.test/" }, P + "https://b.test/");
  assert.equal(v2.url, "https://b.test/");
});

test("loadPage migrates a legacy exact-URL entry to the normalized key", async () => {
  const href = "https://a.test/page#section";
  const b = install({ [P + href]: JSON.stringify(drawing(3)) });
  const { key, record } = await S.loadPage(href, "page");
  assert.equal(key, P + "https://a.test/page");
  assert.equal(record.canvas.objects.length, 3);
  const data = b.storage.local.dump();
  assert.ok(data[P + "https://a.test/page"]);
  assert.equal(data[P + href], undefined);
});

test("savePage removes empty drawings instead of storing them", async () => {
  const b = install({ [P + "https://a.test/"]: { v: 2, canvas: drawing() } });
  const stored = await S.savePage(P + "https://a.test/", { v: 2, canvas: drawing(0) });
  assert.equal(stored, false);
  assert.equal(b.storage.local.dump()[P + "https://a.test/"], undefined);
});

test("listPages hides extension pages and sorts newest first", async () => {
  install({
    [P + "https://old.test/"]: { v: 2, canvas: drawing(), updated: 1 },
    [P + "https://new.test/"]: { v: 2, canvas: drawing(), updated: 5 },
    [P + "moz-extension://abc/whiteboard.html"]: JSON.stringify(drawing()),
    unrelated: 1,
  });
  const pages = await S.listPages();
  assert.deepEqual(pages.map((p) => p.url), ["https://new.test/", "https://old.test/"]);
});

test("deleteOlderThan removes only dated, stale drawings", async () => {
  const day = 24 * 60 * 60 * 1000;
  const now = 100 * day;
  const b = install({
    [P + "https://stale.test/"]: { v: 2, canvas: drawing(), updated: now - 40 * day },
    [P + "https://fresh.test/"]: { v: 2, canvas: drawing(), updated: now - 2 * day },
    [P + "https://legacy.test/"]: JSON.stringify(drawing()),
  });
  assert.equal(await S.deleteOlderThan(30, now), 1);
  assert.deepEqual(Object.keys(b.storage.local.dump()).sort(), [P + "https://fresh.test/", P + "https://legacy.test/"]);
  assert.equal(await S.deleteOlderThan(0, now), 0);
});

test("planImport validates the file and merges boards by id", () => {
  assert.throws(() => S.planImport({ hello: 1 }, []), /isn't a Web Marker export/);
  const plan = S.planImport(
    {
      format: "web-marker-export",
      version: 1,
      entries: {
        [P + "https://a.test/"]: { v: 2, canvas: drawing() },
        [P + "https://bad.test/"]: "{not json",
        [S.BOARD_PREFIX + "b1"]: { v: 2, canvas: drawing() },
        [S.BOARDS_INDEX]: [{ id: "b1", name: "Imported" }],
        somethingElse: 1,
      },
    },
    [{ id: "b0", name: "Mine" }, { id: "b1", name: "Old name" }]
  );
  assert.equal(plan.pages, 1);
  assert.equal(plan.boards, 1);
  assert.deepEqual(plan.update[S.BOARDS_INDEX].map((b) => b.name), ["Mine", "Imported"]);
  assert.equal(plan.update.somethingElse, undefined);
  assert.equal(plan.update[P + "https://bad.test/"], undefined);
});

test("boards: create, rename, delete, migrate legacy whiteboard", async () => {
  const wb = "moz-extension://abc/whiteboard.html";
  const b = install({ [P + wb]: JSON.stringify(drawing(4)) });
  const board = await S.createBoard("One");
  await S.updateBoard(board.id, { name: "Renamed" });
  assert.equal((await S.listBoards())[0].name, "Renamed");
  assert.equal(await S.migrateLegacyWhiteboard(wb, board.id), true);
  assert.equal((await S.loadBoard(board.id)).canvas.objects.length, 4);
  assert.equal(b.storage.local.dump()[P + wb], undefined);
  await S.deleteBoard(board.id);
  assert.deepEqual(await S.listBoards(), []);
  assert.equal(await S.loadBoard(board.id), null);
});
