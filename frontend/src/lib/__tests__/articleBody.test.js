// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { renderArticleBody } from "../articleBody";

describe("renderArticleBody", () => {
  test("linkifies URLs in existing plain-text articles", () => {
    const html = renderArticleBody("Read more at https://example.com/guide");

    expect(html).toContain('<a href="https://example.com/guide"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  test("renders direct image and Google Drive URLs as inline images", () => {
    const html = renderArticleBody([
      "https://images.example.com/guide.png",
      "https://drive.google.com/file/d/abc123/view?usp=sharing",
    ].join("\n"));

    expect(html).toContain('src="https://images.example.com/guide.png"');
    expect(html).toContain('src="https://drive.google.com/uc?export=view&amp;id=abc123"');
  });

  test("removes unsafe markup from rich article HTML", () => {
    const html = renderArticleBody('<p onclick="alert(1)">Safe <script>alert(1)</script></p>');

    expect(html).toContain("Safe");
    expect(html).not.toContain("script");
    expect(html).not.toContain("onclick");
  });
});